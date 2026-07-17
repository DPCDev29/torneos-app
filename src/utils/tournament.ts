import type { Participant, Match, MatchSet, Group, Standing, Stage } from '../types'
import { db } from '../db'

export function isMatchFinished(match: Match): boolean {
  return Boolean(match.sets && match.sets.length > 0 && match.sets.every((s) => s.home !== undefined && s.away !== undefined))
}

export type FirstRoundSlot = 'home' | 'away'

export function isManuallyEditableFirstRoundMatch(match: Match): boolean {
  return (match.stage === 'knockout' || match.stage === 'winners')
    && match.round === 1
    && !match.isBye
    && Boolean(match.homeParticipantId && match.awayParticipantId)
}

export function canManuallyArrangeFirstRound(matches: Match[]): boolean {
  return !matches.some((match) => !match.isBye && (Boolean(match.winnerParticipantId) || Boolean(match.sets?.length)))
}

export function swapFirstRoundParticipants(
  matches: Match[],
  sourceMatchId: string,
  sourceSlot: FirstRoundSlot,
  targetMatchId: string,
  targetSlot: FirstRoundSlot,
): Match[] | null {
  if (!canManuallyArrangeFirstRound(matches)) return null
  const source = matches.find((match) => match.id === sourceMatchId)
  const target = matches.find((match) => match.id === targetMatchId)
  if (!source || !target || !isManuallyEditableFirstRoundMatch(source) || !isManuallyEditableFirstRoundMatch(target)) return null
  if (source.id === target.id && sourceSlot === targetSlot) return matches

  const sourceParticipantId = source[`${sourceSlot}ParticipantId`]
  const targetParticipantId = target[`${targetSlot}ParticipantId`]
  if (!sourceParticipantId || !targetParticipantId) return null

  return matches.map((match) => {
    if (match.id === source.id) return { ...match, [`${sourceSlot}ParticipantId`]: targetParticipantId }
    if (match.id === target.id) return { ...match, [`${targetSlot}ParticipantId`]: sourceParticipantId }
    return match
  })
}

export function countSetsWon(sets: MatchSet[] | undefined, side: 'home' | 'away'): number {
  if (!sets) return 0
  return sets.reduce((acc, s) => {
    // Solo contar sets que estén completamente terminados
    if (!isSetFinished(s)) return acc
    
    if (side === 'home' && s.home > s.away) return acc + 1
    if (side === 'away' && s.away > s.home) return acc + 1
    return acc
  }, 0)
}

export function isSetFinished(set: MatchSet): boolean {
  return (set.home >= 15 || set.away >= 15) && Math.abs(set.home - set.away) >= 2
}

export function getSetWinner(set: MatchSet): 'home' | 'away' | null {
  if (!isSetFinished(set)) return null
  return set.home > set.away ? 'home' : 'away'
}

export function getMatchWinner(match: Match, setsToWin?: number): string | undefined {
  const home = countSetsWon(match.sets, 'home')
  const away = countSetsWon(match.sets, 'away')
  
  // Si se proporciona setsToWin, verificar que se alcanzó ese número
  if (setsToWin !== undefined) {
    if (home >= setsToWin) return match.homeParticipantId
    if (away >= setsToWin) return match.awayParticipantId
    return undefined
  }
  
  // Comportamiento legacy: retornar quien tenga más sets (para compatibilidad)
  if (home > away) return match.homeParticipantId
  if (away > home) return match.awayParticipantId
  return undefined
}

const DEFAULT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef',
  '#f43f5e', '#64748b'
]

export function getDefaultColor(index: number): string {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length]
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size))
  }
  return result
}

export function createBalancedGroups(participants: Participant[], groupCount: number): Group[] {
  const groups: Group[] = []
  for (let i = 0; i < groupCount; i++) {
    groups.push({
      id: generateId(),
      tournamentId: participants[0]?.tournamentId || '',
      name: `Grupo ${String.fromCharCode(65 + i)}`,
      participantIds: [],
    })
  }
  // Distribución aleatoria serpentina para balance
  shuffle(participants).forEach((p, idx) => {
    const groupIndex = idx % groupCount
    groups[groupIndex].participantIds.push(p.id)
  })
  return groups
}

export function generateLeagueMatches(tournamentId: string, participantIds: string[]): Match[] {
  const matches: Match[] = []
  const shuffled = shuffle(participantIds)
  for (let i = 0; i < shuffled.length; i++) {
    for (let j = i + 1; j < shuffled.length; j++) {
      matches.push({
        id: generateId(),
        tournamentId,
        stage: 'league',
        groupId: 'league',
        round: 0,
        position: matches.length,
        scheduledAt: '',
        courtName: '',
        homeParticipantId: shuffled[i],
        awayParticipantId: shuffled[j],
      })
    }
  }
  return matches
}

export function buildLeagueSchedule(
  matches: Match[],
  startDate: string,
  endDate: string,
  durationMinutes: number,
  courtNames: string[],
): Match[] {
  if (!matches.length || !courtNames.length) return matches
  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)
  const dayCount = Math.max(1, Math.floor((end.getTime() - start.getTime()) / 86400000) + 1)
  const basePerDay = Math.ceil(matches.length / dayCount)
  let matchIndex = 0
  let currentTime = new Date(`${startDate}T00:00:00`)
  currentTime.setHours(8, 0, 0, 0)
  let courtIndex = 0

  matches.forEach((match) => {
    if (matchIndex > 0 && matchIndex % basePerDay === 0) {
      currentTime.setDate(currentTime.getDate() + 1)
      currentTime.setHours(8, 0, 0, 0)
      courtIndex = 0
    }
    match.scheduledAt = currentTime.toISOString()
    match.courtName = courtNames[courtIndex]
    courtIndex = (courtIndex + 1) % courtNames.length
    if (courtIndex === 0) {
      currentTime = new Date(currentTime.getTime() + durationMinutes * 60000)
    }
    matchIndex++
  })
  return matches
}

export function calculateStandingsForParticipantIds(participantIds: string[], matches: Match[]): Standing[] {
  const fakeGroup: Group = {
    id: 'league',
    tournamentId: matches[0]?.tournamentId || '',
    name: 'Liga',
    participantIds,
  }
  return calculateStandings(
    fakeGroup,
    matches.filter((m) => m.stage === 'league'),
  )
}

export function generateGroupMatches(groups: Group[]): Match[] {
  const matches: Match[] = []
  groups.forEach((group) => {
    const ids = group.participantIds
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        matches.push({
          id: generateId(),
          tournamentId: group.tournamentId,
          stage: 'group',
          groupId: group.id,
          round: 0,
          position: matches.length,
          scheduledAt: '',
          courtName: '',
          homeParticipantId: ids[i],
          awayParticipantId: ids[j],
        })
      }
    }
  })
  return matches
}

export function getKnockoutRounds(participantCount: number): number {
  return Math.ceil(Math.log2(participantCount))
}

export function generateKnockoutMatches(
  tournamentId: string,
  participantIds: string[],
  startRound = 1,
): Match[] {
  const count = participantIds.length
  const rounds = getKnockoutRounds(count)
  const matches: Match[] = []
  let matchesByRound: Match[][] = []

  for (let r = 0; r < rounds; r++) {
    const roundNumber = startRound + r
    const roundMatches: Match[] = []
    const matchCount = Math.pow(2, rounds - r - 1)
    for (let i = 0; i < matchCount; i++) {
      roundMatches.push({
        id: generateId(),
        tournamentId,
        stage: 'knockout',
        round: roundNumber,
        position: i,
        scheduledAt: '',
        courtName: '',
        homeParticipantId: '',
        awayParticipantId: '',
      })
    }
    matchesByRound.push(roundMatches)
    matches.push(...roundMatches)
  }

  // Conectar llaves: pares con pares, impares con impares
  // Ej: W1(pos 0) y W3(pos 2) → partido 0 siguiente ronda (home y away)
  //     W2(pos 1) y W4(pos 3) → partido 1 siguiente ronda (home y away)
  for (let r = 0; r < matchesByRound.length - 1; r++) {
    const current = matchesByRound[r]
    const next = matchesByRound[r + 1]
    
    // Separar en pares e impares
    const evens = current.filter((_, i) => i % 2 === 0)  // 0, 2, 4, 6...
    const odds = current.filter((_, i) => i % 2 === 1)   // 1, 3, 5, 7...
    
    // Emparejar pares entre sí
    evens.forEach((m, i) => {
      const nextMatchIndex = Math.floor(i / 2)
      m.nextMatchId = next[nextMatchIndex].id
      m.nextMatchSlot = i % 2 === 0 ? 'home' : 'away'
    })
    
    // Emparejar impares entre sí
    odds.forEach((m, i) => {
      const nextMatchIndex = Math.floor(evens.length / 2) + Math.floor(i / 2)
      m.nextMatchId = next[nextMatchIndex].id
      m.nextMatchSlot = i % 2 === 0 ? 'home' : 'away'
    })
  }

  // Asignar participantes a la primera ronda respetando byes
  if (matchesByRound.length > 0) {
    const firstRound = matchesByRound[0]
    const slotCount = firstRound.length * 2
    const slots: (string | null)[] = Array(slotCount).fill(null)
    participantIds.forEach((id, i) => {
      slots[i] = id
    })

    for (let i = 0; i < slotCount; i += 2) {
      const m = firstRound[i / 2]
      m.homeParticipantId = slots[i] || ''
      m.awayParticipantId = slots[i + 1] || ''
      if (!m.homeParticipantId || !m.awayParticipantId) {
        m.isBye = true
        m.winnerParticipantId = m.homeParticipantId || m.awayParticipantId || undefined
        if (m.winnerParticipantId) advanceWinner(m, matches)
      }
    }
  }

  return matches
}

export function advanceWinner(match: Match, allMatches: Match[]): void {
  if (!match.nextMatchId || !match.winnerParticipantId) return
  const next = allMatches.find((m) => m.id === match.nextMatchId)
  if (!next) return
  const slot = match.nextMatchSlot || (match.position % 2 === 0 ? 'home' : 'away')
  next[`${slot}ParticipantId`] = match.winnerParticipantId
}

export function advanceLoser(match: Match, allMatches: Match[]): void {
  if (!match.loserNextMatchId || !match.winnerParticipantId) return
  const loserId = match.winnerParticipantId === match.homeParticipantId
    ? match.awayParticipantId
    : match.homeParticipantId
  if (!loserId) return
  const next = allMatches.find((m) => m.id === match.loserNextMatchId)
  if (!next) return
  const slot = match.loserNextMatchSlot || (match.position % 2 === 0 ? 'home' : 'away')
  next[`${slot}ParticipantId`] = loserId
}

export function resolveBracketByes(matches: Match[]): void {
  let changed = true
  while (changed) {
    changed = false
    matches.forEach((match) => {
      if (match.winnerParticipantId || match.isBye) return
      const participantIds = [match.homeParticipantId, match.awayParticipantId].filter(Boolean)
      const feeders = matches.filter((source) => source.nextMatchId === match.id || source.loserNextMatchId === match.id)
      if (!feeders.length || !feeders.every((source) => Boolean(source.winnerParticipantId) || Boolean(source.isBye))) return
      if (participantIds.length === 0) {
        match.isBye = true
        changed = true
        return
      }
      if (participantIds.length !== 1) return
      match.isBye = true
      match.winnerParticipantId = participantIds[0]
      advanceWinner(match, matches)
      changed = true
    })
  }
}

export function generateKnockoutSkeleton(
  tournamentId: string,
  participantCount: number,
  startRound = 1,
  stage: Stage = 'knockout',
): Match[] {
  const rounds = getKnockoutRounds(participantCount)
  const matches: Match[] = []
  const matchesByRound: Match[][] = []

  for (let r = 0; r < rounds; r++) {
    const roundNumber = startRound + r
    const roundMatches: Match[] = []
    const matchCount = Math.pow(2, rounds - r - 1)
    for (let i = 0; i < matchCount; i++) {
      roundMatches.push({
        id: generateId(),
        tournamentId,
        stage,
        round: roundNumber,
        position: i,
        scheduledAt: '',
        courtName: '',
        homeParticipantId: '',
        awayParticipantId: '',
      })
    }
    matchesByRound.push(roundMatches)
    matches.push(...roundMatches)
  }

  for (let r = 0; r < matchesByRound.length - 1; r++) {
    const current = matchesByRound[r]
    const next = matchesByRound[r + 1]
    current.forEach((m, i) => {
      m.nextMatchId = next[Math.floor(i / 2)].id
    })
  }

  return matches
}

function getBracketSize(participantCount: number): number {
  return Math.pow(2, Math.ceil(Math.log2(Math.max(2, participantCount))))
}

function getSeedSlotIndexes(bracketSize: number): number[] {
  const preferred = [0, bracketSize - 1, (bracketSize / 2) - 1, bracketSize / 2]
  const remaining = Array.from({ length: bracketSize }, (_, index) => index)
    .filter((index) => !preferred.includes(index))
  return [...preferred, ...remaining]
}

export function buildBalancedBracketSlots(participants: Participant[]): string[] {
  const bracketSize = getBracketSize(participants.length)
  const slots = Array<string>(bracketSize).fill('')
  const levelWeight = { advanced: 3, intermediate: 2, amateur: 1 }
  const orderedSeeds = participants
    .filter((participant) => participant.isSeeded)
    .sort((a, b) => (a.ranking ?? Number.MAX_SAFE_INTEGER) - (b.ranking ?? Number.MAX_SAFE_INTEGER)
      || (levelWeight[b.level || 'amateur'] - levelWeight[a.level || 'amateur'])
      || a.name.localeCompare(b.name))
  const seedIndexes = getSeedSlotIndexes(bracketSize)
  const firstRoundMatchCount = bracketSize / 2
  const desiredFirstRoundMatches = Math.max(2, 2 * Math.floor(Math.floor(participants.length / 2) / 2))
  const automaticAdvanceCount = participants.length - (desiredFirstRoundMatches * 2)

  orderedSeeds.slice(0, bracketSize).forEach((participant, index) => {
    slots[seedIndexes[index]] = participant.id
  })

  const matchIndexesForSeed = orderedSeeds.slice(0, bracketSize).map((_, index) => Math.floor(seedIndexes[index] / 2))
  const automaticMatchIndexes = new Set<number>()
  matchIndexesForSeed.forEach((matchIndex) => {
    const matchSlots = [slots[matchIndex * 2], slots[(matchIndex * 2) + 1]].filter(Boolean)
    if (automaticMatchIndexes.size < automaticAdvanceCount && matchSlots.length === 1) automaticMatchIndexes.add(matchIndex)
  })

  const activeMatchIndexes = new Set<number>()
  matchIndexesForSeed.forEach((matchIndex) => {
    if (!automaticMatchIndexes.has(matchIndex)) activeMatchIndexes.add(matchIndex)
  })
  for (let matchIndex = 0; activeMatchIndexes.size < desiredFirstRoundMatches && matchIndex < firstRoundMatchCount; matchIndex++) {
    if (!automaticMatchIndexes.has(matchIndex)) activeMatchIndexes.add(matchIndex)
  }

  const soloMatchIndexes = Array.from({ length: firstRoundMatchCount }, (_, matchIndex) => matchIndex)
    .filter((matchIndex) => !activeMatchIndexes.has(matchIndex) && !slots[matchIndex * 2] && !slots[(matchIndex * 2) + 1])
    .slice(0, automaticAdvanceCount)
  const remainingParticipants = participants
    .filter((participant) => !orderedSeeds.some((seed) => seed.id === participant.id))
    .sort((a, b) => (levelWeight[b.level || 'amateur'] - levelWeight[a.level || 'amateur']) || a.name.localeCompare(b.name))
  const quadrantSize = bracketSize / 4
  const quadrantCounts = Array.from({ length: 4 }, () => ({ advanced: 0, intermediate: 0, amateur: 0 }))
  slots.forEach((participantId, index) => {
    const participant = participants.find((item) => item.id === participantId)
    if (participant) quadrantCounts[Math.min(3, Math.floor(index / quadrantSize))][participant.level || 'amateur'] += 1
  })

  const activeSlots = slots
    .map((participantId, index) => ({ participantId, index }))
    .filter(({ participantId, index }) => !participantId && activeMatchIndexes.has(Math.floor(index / 2)))
  const activeParticipantCount = activeSlots.length
  const competitiveParticipants = remainingParticipants.slice(0, activeParticipantCount)
  const automaticParticipants = remainingParticipants.slice(activeParticipantCount)

  competitiveParticipants.forEach((participant) => {
    const level = participant.level || 'amateur'
    const selected = activeSlots
      .filter(({ index }) => !slots[index])
      .sort((a, b) => {
        const quadrantA = Math.min(3, Math.floor(a.index / quadrantSize))
        const quadrantB = Math.min(3, Math.floor(b.index / quadrantSize))
        const opponentA = slots[a.index % 2 === 0 ? a.index + 1 : a.index - 1]
        const opponentB = slots[b.index % 2 === 0 ? b.index + 1 : b.index - 1]
        const opponentALevel = participants.find((item) => item.id === opponentA)?.level
        const opponentBLevel = participants.find((item) => item.id === opponentB)?.level
        const avoidA = level === 'advanced' && opponentALevel === 'advanced' ? 1 : 0
        const avoidB = level === 'advanced' && opponentBLevel === 'advanced' ? 1 : 0
        if (avoidA !== avoidB) return avoidA - avoidB
        const levelBalance = quadrantCounts[quadrantA][level] - quadrantCounts[quadrantB][level]
        if (levelBalance !== 0) return levelBalance
        return a.index - b.index
      })[0]
    if (!selected) return
    slots[selected.index] = participant.id
    quadrantCounts[Math.min(3, Math.floor(selected.index / quadrantSize))][level] += 1
  })

  automaticParticipants.forEach((participant, index) => {
    const matchIndex = soloMatchIndexes[index]
    if (matchIndex === undefined) return
    const slotIndex = slots[matchIndex * 2] ? (matchIndex * 2) + 1 : matchIndex * 2
    slots[slotIndex] = participant.id
  })

  return slots
}

export function generateDoubleEliminationMatches(
  tournamentId: string,
  participants: Participant[],
  includeGrandFinal: boolean,
): { winners: Match[]; losers: Match[]; final?: Match } {
  const winners = generateKnockoutMatches(tournamentId, buildBalancedBracketSlots(participants), 1)
  winners.forEach((match) => {
    match.stage = 'winners'
  })

  const winnerRounds = getKnockoutRounds(getBracketSize(participants.length))
  const firstWinnersRound = winners
    .filter((match) => match.round === 1 && !match.isBye)
    .sort((a, b) => a.position - b.position)
  const losers = generateKnockoutSkeleton(tournamentId, firstWinnersRound.length, 1, 'losers')
  const firstLosersRound = losers.filter((match) => match.round === 1).sort((a, b) => a.position - b.position)

  firstWinnersRound.forEach((match, index) => {
    const destination = firstLosersRound[Math.floor(index / 2)]
    if (!destination) return
    match.loserNextMatchId = destination.id
    match.loserNextMatchSlot = index % 2 === 0 ? 'home' : 'away'
  })

  if (!includeGrandFinal) {
    resolveBracketByes([...winners, ...losers])
    return { winners, losers }
  }

  const winnersFinal = winners.find((match) => match.round === winnerRounds && match.position === 0)
  const losersFinal = losers.find((match) => !match.nextMatchId)
  const finalMatch: Match = {
    id: generateId(),
    tournamentId,
    stage: 'final',
    round: Math.max(winnerRounds, getKnockoutRounds(firstWinnersRound.length)) + 1,
    position: 0,
    scheduledAt: '',
    courtName: '',
    homeParticipantId: '',
    awayParticipantId: '',
  }
  if (winnersFinal) {
    winnersFinal.nextMatchId = finalMatch.id
    winnersFinal.nextMatchSlot = 'home'
  }
  if (losersFinal) {
    losersFinal.nextMatchId = finalMatch.id
    losersFinal.nextMatchSlot = 'away'
  }

  resolveBracketByes([...winners, ...losers, finalMatch])
  return { winners, losers, final: finalMatch }
}

export function buildDoubleEliminationSchedule(
  matches: Match[],
  startDate: string,
  startTime: string,
  durationMinutes: number,
  courtNames: string[],
): Match[] {
  if (!matches.length || !courtNames.length) return matches
  const stageOrder: Record<string, number> = { winners: 0, losers: 1, final: 2 }
  const sorted = matches
    .filter((m) => !m.isBye)
    .sort((a, b) => {
      const stageDifference = (stageOrder[a.stage] || 0) - (stageOrder[b.stage] || 0)
      if (stageDifference !== 0) return stageDifference
      return a.round - b.round
    })
  const [baseHours, baseMinutes] = startTime.split(':').map(Number)
  let current = new Date(`${startDate}T${String(baseHours).padStart(2, '0')}:${String(baseMinutes).padStart(2, '0')}:00`)
  let courtIndex = 0
  sorted.forEach((match) => {
    match.scheduledAt = current.toISOString()
    match.courtName = courtNames[courtIndex]
    courtIndex = (courtIndex + 1) % courtNames.length
    if (courtIndex === 0) {
      current = new Date(current.getTime() + durationMinutes * 60000)
    }
  })
  return matches
}

export function buildSchedule(
  matches: Match[],
  startDate: string,
  startTime: string,
  durationMinutes: number,
  courtNames: string[],
): Match[] {
  if (!matches.length || !courtNames.length) return matches
  const [baseHours, baseMinutes] = startTime.split(':').map(Number)
  let current = new Date(`${startDate}T${String(baseHours).padStart(2, '0')}:${String(baseMinutes).padStart(2, '0')}:00`)
  let courtIndex = 0
  matches
    .filter((m) => !m.isBye)
    .sort((a, b) => {
      if (a.stage !== b.stage) return a.stage === 'group' ? -1 : 1
      if (a.round !== b.round) return a.round - b.round
      return a.position - b.position
    })
    .forEach((match) => {
      match.scheduledAt = current.toISOString()
      match.courtName = courtNames[courtIndex]
      courtIndex = (courtIndex + 1) % courtNames.length
      if (courtIndex === 0) {
        current = new Date(current.getTime() + durationMinutes * 60000)
      }
    })
  return matches
}

export function calculateStandings(group: Group, matches: Match[]): Standing[] {
  const standings = new Map<string, Standing>()
  group.participantIds.forEach((pid) => {
    standings.set(pid, {
      participantId: pid,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      setsFor: 0,
      setsAgainst: 0,
      setDifference: 0,
      points: 0,
    })
  })

  matches
    .filter((m) => m.groupId === group.id && isMatchFinished(m))
    .forEach((m) => {
      const home = standings.get(m.homeParticipantId)
      const away = standings.get(m.awayParticipantId)
      if (!home || !away) return
      const homeSets = countSetsWon(m.sets, 'home')
      const awaySets = countSetsWon(m.sets, 'away')
      home.played++
      away.played++
      home.setsFor += homeSets
      home.setsAgainst += awaySets
      away.setsFor += awaySets
      away.setsAgainst += homeSets

      if (homeSets > awaySets) {
        home.won++
        home.points += 3
        away.lost++
      } else if (homeSets < awaySets) {
        away.won++
        away.points += 3
        home.lost++
      } else {
        home.drawn++
        away.drawn++
        home.points += 1
        away.points += 1
      }
    })

  const result = Array.from(standings.values())
  result.forEach((s) => {
    s.setDifference = s.setsFor - s.setsAgainst
  })
  result.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.setDifference !== a.setDifference) return b.setDifference - a.setDifference
    return b.setsFor - a.setsFor
  })
  return result
}

export async function regenerateTournamentSchedule(tournamentId: string): Promise<void> {
  const tournament = await db.tournaments.get(tournamentId)
  const participants = await db.participants.where('tournamentId').equals(tournamentId).toArray()
  if (!tournament || participants.length < 2) return

  // Preservar resultados existentes de grupos
  const existingMatches = await db.matches.where('tournamentId').equals(tournamentId).toArray()
  const resultsByPair = new Map<string, { sets: MatchSet[]; winnerParticipantId?: string | null }>()
  existingMatches.forEach((m) => {
    if (m.stage === 'group' && isMatchFinished(m)) {
      resultsByPair.set(`${m.homeParticipantId}-${m.awayParticipantId}`, {
        sets: m.sets || [],
        winnerParticipantId: m.winnerParticipantId,
      })
    }
  })

  // Eliminar partidos actuales
  await db.matches.where('tournamentId').equals(tournamentId).delete()
  await db.groups.where('tournamentId').equals(tournamentId).delete()

  let groups: Group[] = []
  let groupMatches: Match[] = []
  let leagueMatches: Match[] = []
  let doubleMatches: Match[] = []
  let knockoutMatches: Match[] = []
  let knockoutParticipants: string[] = []

  if (tournament.format === 'league') {
    leagueMatches = generateLeagueMatches(tournamentId, participants.map((p) => p.id))
    buildLeagueSchedule(leagueMatches, tournament.startDate, tournament.endDate, tournament.matchDurationMinutes, tournament.courtNames)
  } else if (tournament.format === 'groups-knockout') {
    const groupCount = participants.length <= 6 ? 2 : Math.ceil(participants.length / 4)
    groups = createBalancedGroups(participants, groupCount)
    groupMatches = generateGroupMatches(groups)

    // Restaurar resultados de grupos si coinciden los emparejamientos
    groupMatches.forEach((m) => {
      const key = `${m.homeParticipantId}-${m.awayParticipantId}`
      const existing = resultsByPair.get(key)
      if (existing) {
        m.sets = existing.sets
        m.winnerParticipantId = existing.winnerParticipantId
      }
    })

    // Si todos los grupos ya tienen resultados, avanzar ganadores a la eliminatoria
    const allGroupsFinished = groups.every((g) => {
      const gm = groupMatches.filter((m) => m.groupId === g.id)
      return gm.length > 0 && gm.every((m) => isMatchFinished(m))
    })
    if (allGroupsFinished) {
      const winners = groups
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((g) => calculateStandings(g, groupMatches)[0]?.participantId)
        .filter((id): id is string => Boolean(id))
      knockoutParticipants = shuffle(winners)
    }
  } else if (tournament.format === 'double-elimination') {
    const { winners, losers, final } = generateDoubleEliminationMatches(tournamentId, participants, tournament.includeGrandFinal !== false)
    doubleMatches = final ? [...winners, ...losers, final] : [...winners, ...losers]
    buildDoubleEliminationSchedule(doubleMatches, tournament.startDate, '08:00', tournament.matchDurationMinutes, tournament.courtNames)
  } else {
    knockoutParticipants = shuffle(participants.map((p) => p.id))
  }

  if (tournament.format !== 'double-elimination') {
    const baseSlotCount = tournament.format === 'groups-knockout' ? Math.max(1, groups.length) : Math.max(1, knockoutParticipants.length)
    const knockoutSize = Math.max(2, Math.pow(2, Math.ceil(Math.log2(baseSlotCount))))
    const bracketIds = knockoutParticipants.length
      ? knockoutParticipants.slice(0, knockoutSize)
      : Array(knockoutSize).fill('')
    knockoutMatches = generateKnockoutMatches(tournamentId, bracketIds, 1)
  }

  const allMatches = [...groupMatches, ...leagueMatches, ...doubleMatches, ...knockoutMatches]
  if (tournament.format !== 'league' && tournament.format !== 'double-elimination') {
    const startTime = '08:00'
    buildSchedule(allMatches, tournament.startDate, startTime, tournament.matchDurationMinutes, tournament.courtNames)
  }

  await db.transaction('rw', [db.groups, db.matches], async () => {
    if (groups.length) await db.groups.bulkPut(groups)
    await db.matches.bulkPut(allMatches)
  })
}

export async function fillKnockoutWithGroupWinners(tournamentId: string): Promise<void> {
  const tournament = await db.tournaments.get(tournamentId)
  if (!tournament || tournament.format !== 'groups-knockout') return

  const allMatches = await db.matches.where('tournamentId').equals(tournamentId).toArray()
  const groups = await db.groups.where('tournamentId').equals(tournamentId).toArray()
  if (!groups.length) return

  const groupMatches = allMatches.filter((m) => m.stage === 'group')
  const firstRound = allMatches
    .filter((m) => m.stage === 'knockout' && m.round === 1)
    .sort((a, b) => a.position - b.position)
  if (!firstRound.length) return

  const sortedGroups = groups.slice().sort((a, b) => a.name.localeCompare(b.name))
  const winners = shuffle(
    sortedGroups
      .map((g) => {
        const gm = groupMatches.filter((m) => m.groupId === g.id)
        const finished = gm.length > 0 && gm.every((m) => isMatchFinished(m))
        if (!finished) return null
        return calculateStandings(g, groupMatches)[0]?.participantId || null
      })
      .filter((id): id is string => Boolean(id)),
  )

  if (!winners.length) return

  // Asignar ganadores a los slots de la primera ronda en orden
  const slotCount = firstRound.length * 2
  const slots: (string | null)[] = Array(slotCount).fill(null)
  winners.forEach((id, i) => {
    if (i < slotCount) slots[i] = id
  })

  let changed = false
  for (let i = 0; i < slotCount; i += 2) {
    const m = firstRound[i / 2]
    const newHome = slots[i] || ''
    const newAway = slots[i + 1] || ''
    if (m.homeParticipantId !== newHome || m.awayParticipantId !== newAway) {
      m.homeParticipantId = newHome
      m.awayParticipantId = newAway
      changed = true
    }
    if (!m.homeParticipantId || !m.awayParticipantId) {
      const winner = m.homeParticipantId || m.awayParticipantId || undefined
      if (winner && m.winnerParticipantId !== winner) {
        m.isBye = true
        m.winnerParticipantId = winner
        advanceWinner(m, allMatches)
        changed = true
      }
    }
  }

  if (changed) {
    await db.matches.bulkPut(allMatches)
  }
}
