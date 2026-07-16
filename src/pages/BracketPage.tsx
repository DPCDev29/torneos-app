import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { db } from '../db'
import type { Tournament, Participant, Match, Group } from '../types'
import { calculateStandings, canManuallyArrangeFirstRound, countSetsWon, isManuallyEditableFirstRoundMatch, isMatchFinished, swapFirstRoundParticipants, type FirstRoundSlot } from '../utils/tournament'

export function BracketPage() {
  const { id: tournamentId } = useParams<{ id: string }>()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [draggedSlot, setDraggedSlot] = useState<{ matchId: string; slot: FirstRoundSlot } | null>(null)

  useEffect(() => {
    if (!tournamentId) return
    const loadBracket = () => {
      Promise.all([
        db.tournaments.get(tournamentId),
        db.participants.where('tournamentId').equals(tournamentId).toArray(),
        db.matches.where('tournamentId').equals(tournamentId).toArray(),
        db.groups.where('tournamentId').equals(tournamentId).toArray(),
      ]).then(([t, p, m, g]) => {
        setTournament(t || null)
        setParticipants(p)
        setMatches(m)
        setGroups(g)
      })
    }
    loadBracket()
    return db.subscribeToTournament(tournamentId, loadBracket)
  }, [tournamentId])

  const participantName = (id: string) => participants.find((p) => p.id === id)?.name || '—'
  const participantColor = (id: string) => participants.find((p) => p.id === id)?.color

  const formatTime = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const getMatchId = (match: Match) => {
    const stagePrefix = match.stage === 'winners' ? 'W' : match.stage === 'losers' ? 'L' : 'F'
    const allStageMatches = matches
      .filter(m => m.stage === match.stage && !m.isBye)
      .sort((a, b) => {
        if (a.round !== b.round) return a.round - b.round
        return a.position - b.position
      })
    const index = allStageMatches.findIndex(m => m.id === match.id)
    return `${stagePrefix}${index + 1}`
  }

  const canArrangeFixture = canManuallyArrangeFirstRound(matches)

  const handleDrop = async (targetMatch: Match, targetSlot: FirstRoundSlot) => {
    if (!draggedSlot) return
    const updated = swapFirstRoundParticipants(matches, draggedSlot.matchId, draggedSlot.slot, targetMatch.id, targetSlot)
    setDraggedSlot(null)
    if (!updated) return
    await db.matches.bulkPut(updated)
    setMatches(updated)
  }

  const renderParticipant = (id: string, winner?: string, match?: Match, slot?: FirstRoundSlot) => {
    const isWinner = winner === id && Boolean(winner)
    const isDraggable = Boolean(match && slot && canArrangeFixture && isManuallyEditableFirstRoundMatch(match))
    return (
      <div
        draggable={isDraggable}
        onDragStart={() => {
          if (match && slot) setDraggedSlot({ matchId: match.id, slot })
        }}
        onDragOver={(event) => {
          if (isDraggable) event.preventDefault()
        }}
        onDrop={() => {
          if (match && slot) handleDrop(match, slot)
        }}
        onDragEnd={() => setDraggedSlot(null)}
        className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${isWinner ? 'bg-green-50 font-semibold text-green-800' : 'text-gray-700'} ${isDraggable ? 'cursor-grab hover:bg-blue-50' : ''}`}
      >
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: participantColor(id) }} />
        <span className="truncate">{participantName(id)}</span>
      </div>
    )
  }

  const renderPending = (match: Match, slot: 'home' | 'away') => {
    // Find matches that feed into this match
    const sourceMatches = matches.filter(m => m.nextMatchId === match.id)
    
    // When nextMatchSlot is null, infer from position: even positions go to home, odd to away
    let sourceMatch: Match | undefined
    if (sourceMatches.length > 0) {
      sourceMatch = sourceMatches.find(m => {
        if (m.nextMatchSlot) {
          return m.nextMatchSlot === slot
        }
        // Infer slot from position when nextMatchSlot is null
        const inferredSlot = m.position % 2 === 0 ? 'home' : 'away'
        return inferredSlot === slot
      })
    }
    
    if (sourceMatch) {
      return (
        <div className="rounded bg-amber-50 px-2 py-1 text-sm text-amber-700">
          🏆 Ganador {getMatchId(sourceMatch)}
        </div>
      )
    }
    
    // Check if it comes from loser bracket
    const loserSourceMatches = matches.filter(m => m.loserNextMatchId === match.id)
    let loserSourceMatch: Match | undefined
    if (loserSourceMatches.length > 0) {
      loserSourceMatch = loserSourceMatches.find(m => {
        if (m.loserNextMatchSlot) {
          return m.loserNextMatchSlot === slot
        }
        // Infer slot from position when loserNextMatchSlot is null
        const inferredSlot = m.position % 2 === 0 ? 'home' : 'away'
        return inferredSlot === slot
      })
    }
    
    if (loserSourceMatch) {
      return (
        <div className="rounded bg-orange-50 px-2 py-1 text-sm text-orange-700">
          💔 Perdedor {getMatchId(loserSourceMatch)}
        </div>
      )
    }
    
    return <div className="rounded px-2 py-1 text-sm text-gray-400">Por definir</div>
  }

  const renderBracket = (stage: 'knockout' | 'winners' | 'losers' | 'final', title: string) => {
    const stageMatches = matches.filter((m) => m.stage === stage && !m.isBye)
    if (!stageMatches.length) return null
    const stageRounds = Array.from(new Set(stageMatches.map((m) => m.round))).sort((a, b) => a - b)
    return (
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-6">
            {stageRounds.map((round) => (
              <div key={round} className="flex w-56 flex-col gap-4">
                <h3 className="text-center text-sm font-semibold text-gray-600">
                  {stage === 'final' ? 'Final' : getRoundName(round, stageRounds.length)}
                </h3>
                {stageMatches
                  .filter((m) => m.round === round)
                  .sort((a, b) => a.position - b.position)
                  .map((m) => (
                    <div key={m.id} className="card relative p-3">
                      <div className="absolute right-2 top-2 rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                        {getMatchId(m)}
                      </div>
                      <div className="mb-2 flex flex-col gap-1">
                        <div className="text-sm font-bold text-gray-700">📅 {formatTime(m.scheduledAt)}</div>
                        <div className="text-sm font-bold text-blue-600">🏟️ {m.courtName}</div>
                      </div>
                      {m.homeParticipantId ? renderParticipant(m.homeParticipantId, m.winnerParticipantId, m, 'home') : renderPending(m, 'home')}
                      <div className="my-1 text-center text-xs text-gray-400">vs</div>
                      {m.awayParticipantId ? renderParticipant(m.awayParticipantId, m.winnerParticipantId, m, 'away') : renderPending(m, 'away')}
                      {isMatchFinished(m) && (
                        <div className="mt-2 text-center font-mono text-sm font-semibold">
                          {countSetsWon(m.sets, 'home')} - {countSetsWon(m.sets, 'away')}
                          <span className="block text-xs font-normal text-gray-500">
                            {m.sets?.map((s, i) => (
                              <span key={i} className="ml-1">{s.home}:{s.away}</span>
                            ))}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <Link to={`/tournaments/${tournamentId}`} className="btn-secondary gap-2">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Cuadro del torneo</h1>
      {canArrangeFixture && matches.some(isManuallyEditableFirstRoundMatch) && <p className="text-sm text-gray-600">Puedes arrastrar participantes entre partidos de la primera ronda antes de registrar resultados.</p>}

      {tournament?.format === 'groups-knockout' && groups.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-800">Fase de grupos</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {groups.map((g) => {
              const groupMatches = matches.filter((m) => m.groupId === g.id && !m.isBye)
              const standings = calculateStandings(g, matches)
              return (
                <div key={g.id} className="card space-y-3">
                  <h3 className="font-semibold text-gray-900">{g.name}</h3>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b text-gray-500">
                        <th className="py-1">Equipo</th>
                        <th className="py-1 text-center">PJ</th>
                        <th className="py-1 text-center">Pts</th>
                        <th className="py-1 text-center">DS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s) => (
                        <tr key={s.participantId} className="border-b border-gray-100">
                          <td className="py-1">{renderParticipant(s.participantId)}</td>
                          <td className="py-1 text-center">{s.played}</td>
                          <td className="py-1 text-center font-semibold">{s.points}</td>
                          <td className="py-1 text-center">{s.setDifference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="space-y-1">
                    {groupMatches.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded bg-gray-50 px-2 py-1 text-xs">
                        <span className="truncate">{participantName(m.homeParticipantId)}</span>
                        <span className="mx-1 font-mono">
                          {isMatchFinished(m)
                            ? `${countSetsWon(m.sets, 'home')}-${countSetsWon(m.sets, 'away')}`
                            : '-:-'}
                        </span>
                        <span className="truncate">{participantName(m.awayParticipantId)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {renderBracket('knockout', 'Eliminatoria')}
      {renderBracket('winners', 'Bracket de ganadores')}
      {renderBracket('losers', 'Bracket de perdedores')}
      {renderBracket('final', 'Final general')}
    </div>
  )
}

function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return 'Final'
  if (round === totalRounds - 1) return 'Semifinal'
  if (round === totalRounds - 2) return 'Cuartos'
  return `Ronda ${round}`
}
