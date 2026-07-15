import Dexie, { type EntityTable } from 'dexie'
import type { Tournament, Participant, Match, Group } from '../types'

class TorneosDatabase extends Dexie {
  tournaments!: EntityTable<Tournament, 'id'>
  participants!: EntityTable<Participant, 'id'>
  matches!: EntityTable<Match, 'id'>
  groups!: EntityTable<Group, 'id'>

  constructor() {
    super('torneos-db')
    this.version(1).stores({
      tournaments: 'id, name, createdAt',
      participants: 'id, tournamentId, name',
      matches: 'id, tournamentId, stage, groupId, round, position, scheduledAt',
      groups: 'id, tournamentId, name',
    })
  }
}

export const db = new TorneosDatabase()

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
