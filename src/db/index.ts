import type { Group, Match, Participant, Tournament } from '../types'
import { supabase } from '../supabase/client'

type TableName = 'tournaments' | 'participants' | 'matches' | 'groups'
type DomainEntity = Tournament | Participant | Match | Group
type PartialEntity = Partial<DomainEntity>

const columnNames: Record<string, string> = {
  tournamentId: 'tournament_id',
  startDate: 'start_date',
  endDate: 'end_date',
  courtNames: 'court_names',
  matchDurationMinutes: 'match_duration_minutes',
  setsToWin: 'sets_to_win',
  includeGrandFinal: 'include_grand_final',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  groupId: 'group_id',
  scheduledAt: 'scheduled_at',
  courtName: 'court_name',
  homeParticipantId: 'home_participant_id',
  awayParticipantId: 'away_participant_id',
  winnerParticipantId: 'winner_participant_id',
  nextMatchId: 'next_match_id',
  nextMatchSlot: 'next_match_slot',
  loserNextMatchId: 'loser_next_match_id',
  loserNextMatchSlot: 'loser_next_match_slot',
  isBye: 'is_bye',
  participantIds: 'participant_ids',
  isSeeded: 'is_seeded',
}

function databaseColumn(column: string): string {
  return columnNames[column] || column.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
}

function toDatabase(entity: PartialEntity): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  Object.entries(entity).forEach(([key, value]) => {
    if (value !== undefined) result[databaseColumn(key)] = value
  })
  return result
}

function toDomain(row: Record<string, unknown>): DomainEntity {
  const result: Record<string, unknown> = {}
  Object.entries(row).forEach(([key, value]) => {
    const domainKey = Object.entries(columnNames).find(([, column]) => column === key)?.[0] || key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    result[domainKey] = value
  })
  return result as unknown as DomainEntity
}

class Query<T extends DomainEntity> {
  private predicate: (entity: T) => boolean = () => true

  constructor(private readonly table: RemoteTable<T>, private readonly column: string, private readonly value: unknown) {}

  and(predicate: (entity: T) => boolean): Query<T> {
    const current = this.predicate
    this.predicate = (entity) => current(entity) && predicate(entity)
    return this
  }

  async toArray(): Promise<T[]> {
    const entities = await this.table.findBy(this.column, this.value)
    return entities.filter(this.predicate)
  }

  async count(): Promise<number> {
    return (await this.toArray()).length
  }

  async delete(): Promise<void> {
    const entities = await this.toArray()
    await Promise.all(entities.map((entity) => this.table.delete(entity.id)))
  }
}

class OrderedQuery<T extends DomainEntity> {
  constructor(private readonly table: RemoteTable<T>, private readonly column: string, private readonly ascending: boolean) {}

  reverse(): OrderedQuery<T> {
    return new OrderedQuery(this.table, this.column, !this.ascending)
  }

  toArray(): Promise<T[]> {
    return this.table.list(this.column, this.ascending)
  }
}

class RemoteTable<T extends DomainEntity> {
  constructor(private readonly table: TableName) {}

  async get(id: string): Promise<T | undefined> {
    const { data, error } = await supabase.from(this.table).select().eq('id', id).maybeSingle()
    if (error) throw error
    return data ? toDomain(data as Record<string, unknown>) as T : undefined
  }

  async put(entity: T): Promise<void> {
    const existing = await this.get(entity.id)
    if (existing) {
      await this.update(entity.id, entity)
      return
    }
    const { error } = await supabase.from(this.table).insert(toDatabase(entity))
    if (error) throw error
  }

  async bulkPut(entities: T[]): Promise<void> {
    if (!entities.length) return
    if (this.table === 'tournaments') {
      await Promise.all(entities.map((entity) => this.put(entity)))
      return
    }
    const { error } = await supabase.from(this.table).upsert(entities.map((entity) => toDatabase(entity)))
    if (error) throw error
  }

  async update(id: string, changes: Partial<T>): Promise<void> {
    const { error } = await supabase.from(this.table).update(toDatabase(changes)).eq('id', id)
    if (error) throw error
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id)
    if (error) throw error
  }

  where(column: string): { equals: (value: unknown) => Query<T> } {
    return { equals: (value) => new Query(this, column, value) }
  }

  orderBy(column: string): OrderedQuery<T> {
    return new OrderedQuery(this, column, true)
  }

  async findBy(column: string, value: unknown): Promise<T[]> {
    const { data, error } = await supabase.from(this.table).select().eq(databaseColumn(column), value)
    if (error) throw error
    return (data || []).map((row) => toDomain(row as Record<string, unknown>) as T)
  }

  async list(column?: string, ascending = true): Promise<T[]> {
    let query = supabase.from(this.table).select()
    if (column) query = query.order(databaseColumn(column), { ascending })
    const { data, error } = await query
    if (error) throw error
    return (data || []).map((row) => toDomain(row as Record<string, unknown>) as T)
  }
}

export const db = {
  tournaments: new RemoteTable<Tournament>('tournaments'),
  participants: new RemoteTable<Participant>('participants'),
  matches: new RemoteTable<Match>('matches'),
  groups: new RemoteTable<Group>('groups'),
  transaction: async (_mode: string, _tables: unknown[], callback: () => Promise<void>) => callback(),
  subscribeToTournaments: (callback: () => void) => {
    const channel = supabase
      .channel('tournaments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, callback)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
  subscribeToTournament: (tournamentId: string, callback: () => void) => {
    const channel = supabase
      .channel(`tournament-${tournamentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments', filter: `id=eq.${tournamentId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `tournament_id=eq.${tournamentId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'groups', filter: `tournament_id=eq.${tournamentId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `tournament_id=eq.${tournamentId}` }, callback)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  },
}

export async function exportTournament(tournamentId: string): Promise<string> {
  const [tournament, participants, matches, groups] = await Promise.all([
    db.tournaments.get(tournamentId),
    db.participants.where('tournamentId').equals(tournamentId).toArray(),
    db.matches.where('tournamentId').equals(tournamentId).toArray(),
    db.groups.where('tournamentId').equals(tournamentId).toArray(),
  ])
  if (!tournament) throw new Error('Torneo no encontrado')
  return JSON.stringify({ tournament, participants, matches, groups }, null, 2)
}

export async function importTournament(json: string): Promise<string> {
  const data = JSON.parse(json)
  const { tournament, participants, matches, groups } = data
  await db.transaction('rw', [db.tournaments, db.participants, db.matches, db.groups], async () => {
    await db.tournaments.put(tournament)
    if (participants?.length) await db.participants.bulkPut(participants)
    if (matches?.length) await db.matches.bulkPut(matches)
    if (groups?.length) await db.groups.bulkPut(groups)
  })
  return tournament.id as string
}
