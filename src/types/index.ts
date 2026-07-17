export type TournamentFormat = 'groups-knockout' | 'knockout-only' | 'league' | 'double-elimination'

export interface Tournament {
  id: string
  name: string
  startDate: string
  endDate: string
  venue: string
  format: TournamentFormat
  courtNames: string[]
  matchDurationMinutes: number
  setsToWin: number
  includeGrandFinal?: boolean
  publicToken?: string
  createdAt: string
  updatedAt: string
}

export type ParticipantLevel = 'amateur' | 'intermediate' | 'advanced'

export interface Participant {
  id: string
  tournamentId: string
  name: string
  contact?: string
  representative?: string
  color: string
  level?: ParticipantLevel
  ranking?: number
  isSeeded?: boolean
  createdAt: string
}

export type Stage = 'group' | 'knockout' | 'league' | 'winners' | 'losers' | 'final'

export interface MatchSet {
  home: number
  away: number
  usedBreakHome?: boolean
  usedBreakAway?: boolean
}

export interface Match {
  id: string
  tournamentId: string
  stage: Stage
  groupId?: string
  round: number
  position: number
  scheduledAt: string
  courtName: string
  homeParticipantId: string
  awayParticipantId: string
  sets?: MatchSet[]
  winnerParticipantId?: string | null
  nextMatchId?: string
  nextMatchSlot?: 'home' | 'away'
  loserNextMatchId?: string
  loserNextMatchSlot?: 'home' | 'away'
  isBye?: boolean
}

export interface Group {
  id: string
  tournamentId: string
  name: string
  participantIds: string[]
}

export interface Standing {
  participantId: string
  played: number
  won: number
  drawn: number
  lost: number
  setsFor: number
  setsAgainst: number
  setDifference: number
  points: number
}
