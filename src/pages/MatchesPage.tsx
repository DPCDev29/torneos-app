import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Save, UserCheck } from 'lucide-react'
import { db } from '../db'
import type { Match, MatchSet, Participant, Tournament } from '../types'
import { advanceLoser, advanceWinner, canManuallyArrangeFirstRound, fillKnockoutWithGroupWinners, getMatchWinner, isManuallyEditableFirstRoundMatch, resolveBracketByes, swapFirstRoundParticipants } from '../utils/tournament'
import { RefereeModal } from '../components/RefereeModal'

export function MatchesPage() {
  const { id: tournamentId } = useParams<{ id: string }>()
  const [matches, setMatches] = useState<Match[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [matchSets, setMatchSets] = useState<Record<string, MatchSet[]>>({})
  const [refereeMatch, setRefereeMatch] = useState<Match | null>(null)

  useEffect(() => {
    if (!tournamentId) return
    const loadMatches = () => {
      Promise.all([
        db.matches.where('tournamentId').equals(tournamentId).toArray(),
        db.participants.where('tournamentId').equals(tournamentId).toArray(),
        db.tournaments.get(tournamentId),
      ]).then(([m, p, t]) => {
        setMatches(m)
        setParticipants(p)
        setTournament(t || null)
        const init: Record<string, MatchSet[]> = {}
        m.forEach((match) => {
          const legacy = match as unknown as { homeScore?: number; awayScore?: number }
          if ((!match.sets || match.sets.length === 0) && legacy.homeScore !== undefined && legacy.awayScore !== undefined) {
            init[match.id] = [{ home: legacy.homeScore, away: legacy.awayScore }]
          } else {
            init[match.id] = match.sets && match.sets.length > 0
              ? match.sets.map((s) => ({ home: s.home, away: s.away, usedBreakHome: s.usedBreakHome, usedBreakAway: s.usedBreakAway }))
              : [{ home: 0, away: 0 }]
          }
        })
        setMatchSets(init)
      })
    }
    loadMatches()
    return db.subscribeToTournament(tournamentId, loadMatches)
  }, [tournamentId])

  const participantName = (id: string) => participants.find((p) => p.id === id)?.name || '—'
  const participantColor = (id: string) => participants.find((p) => p.id === id)?.color

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

  const getMatchReference = (match: Match, slot: 'home' | 'away') => {
    // Find matches that feed into this match
    const sourceMatches = matches.filter(m => m.nextMatchId === match.id)
    
    let sourceMatch: Match | undefined
    if (sourceMatches.length > 0) {
      sourceMatch = sourceMatches.find(m => {
        if (m.nextMatchSlot) {
          return m.nextMatchSlot === slot
        }
        const inferredSlot = m.position % 2 === 0 ? 'home' : 'away'
        return inferredSlot === slot
      })
    }
    
    if (sourceMatch) {
      return `🏆 Ganador ${getMatchId(sourceMatch)}`
    }
    
    // Check loser bracket
    const loserSourceMatches = matches.filter(m => m.loserNextMatchId === match.id)
    let loserSourceMatch: Match | undefined
    if (loserSourceMatches.length > 0) {
      loserSourceMatch = loserSourceMatches.find(m => {
        if (m.loserNextMatchSlot) {
          return m.loserNextMatchSlot === slot
        }
        const inferredSlot = m.position % 2 === 0 ? 'home' : 'away'
        return inferredSlot === slot
      })
    }
    
    if (loserSourceMatch) {
      return `💔 Perdedor ${getMatchId(loserSourceMatch)}`
    }
    
    return null
  }

  const addSet = (matchId: string) => {
    setMatchSets((prev) => ({
      ...prev,
      [matchId]: [...(prev[matchId] || []), { home: 0, away: 0 }],
    }))
  }

  const removeSet = (matchId: string, index: number) => {
    setMatchSets((prev) => {
      const current = [...(prev[matchId] || [])]
      current.splice(index, 1)
      return { ...prev, [matchId]: current.length ? current : [{ home: 0, away: 0 }] }
    })
  }

  const updateSet = (matchId: string, index: number, side: 'home' | 'away', value: string) => {
    const num = Number(value)
    if (Number.isNaN(num) || num < 0) return
    setMatchSets((prev) => {
      const current = [...(prev[matchId] || [])]
      current[index] = { ...current[index], [side]: num }
      return { ...prev, [matchId]: current }
    })
  }

  const handleSaveSets = async (match: Match, sets: MatchSet[]) => {
    if (!match.homeParticipantId || !match.awayParticipantId || sets.length === 0 || sets.some((s) => Number.isNaN(s.home) || Number.isNaN(s.away))) return

    const winner = getMatchWinner({ ...match, sets })

    await db.matches.update(match.id, {
      sets,
      winnerParticipantId: winner,
    })

    if ((match.stage === 'knockout' || match.stage === 'winners' || match.stage === 'losers' || match.stage === 'final') && winner) {
      const all = await db.matches.where('tournamentId').equals(match.tournamentId).toArray()
      const completedMatch = { ...match, winnerParticipantId: winner }
      advanceWinner(completedMatch, all)
      if (match.stage === 'winners') advanceLoser(completedMatch, all)
      resolveBracketByes(all)
      await db.matches.bulkPut(all)
    }

    // Si el grupo acaba de completarse, avanzar sus ganadores al bracket
    if (match.stage === 'group' && match.groupId) {
      await fillKnockoutWithGroupWinners(match.tournamentId)
    }

    // En liga no hay bracket que avanzar; solo recargamos la tabla de posiciones implícitamente

    const updated = await db.matches.where('tournamentId').equals(match.tournamentId).toArray()
    setMatches(updated)
    setMatchSets((prev) => ({ ...prev, [match.id]: sets.map((s) => ({ ...s })) }))
  }

  // Handler para actualizaciones en vivo (punto por punto)
  const handleLiveUpdate = async (match: Match, sets: MatchSet[]) => {
    if (!match.homeParticipantId || !match.awayParticipantId || sets.length === 0) return

    // Solo actualizar los sets, sin calcular ganador ni avanzar bracket
    await db.matches.update(match.id, {
      sets,
    })

    // Actualizar estado local
    setMatchSets((prev) => ({ ...prev, [match.id]: sets.map((s) => ({ ...s })) }))
  }

  const saveMatch = async (match: Match) => {
    const sets = matchSets[match.id] || []
    await handleSaveSets(match, sets)
  }

  const formatDate = (iso: string) => {
    if (!iso) return 'Sin fecha'
    const d = new Date(iso)
    return d.toLocaleString('es-ES', { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  }

  const stageMatches = (stage: 'group' | 'knockout' | 'league' | 'winners' | 'losers' | 'final') => {
    return matches
      .filter((m) => m.stage === stage && !m.isBye)
      .sort((a, b) => {
        // First sort by round
        if (a.round !== b.round) return a.round - b.round
        // Then by position within the round
        return a.position - b.position
      })
  }

  const toDateTimeLocal = (iso: string) => {
    if (!iso) return ''
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const handleDateChange = async (match: Match, value: string) => {
    if (!value) return
    await db.matches.update(match.id, { scheduledAt: new Date(value).toISOString() })
    const updated = await db.matches.where('tournamentId').equals(match.tournamentId).toArray()
    setMatches(updated)
  }

  const handleCourtChange = async (match: Match, courtName: string) => {
    if (!courtName) return
    await db.matches.update(match.id, { courtName })
    const updated = await db.matches.where('tournamentId').equals(match.tournamentId).toArray()
    setMatches(updated)
  }

  const editableFirstRoundMatches = matches
    .filter(isManuallyEditableFirstRoundMatch)
    .sort((a, b) => a.position - b.position)
  const canArrangeFixture = canManuallyArrangeFirstRound(matches)
  const editableParticipantIds = editableFirstRoundMatches.flatMap((match) => [match.homeParticipantId, match.awayParticipantId])

  const handleManualParticipantChange = async (targetMatch: Match, targetSlot: 'home' | 'away', participantId: string) => {
    const sourceMatch = editableFirstRoundMatches.find((match) => match.homeParticipantId === participantId || match.awayParticipantId === participantId)
    if (!sourceMatch) return
    const sourceSlot = sourceMatch.homeParticipantId === participantId ? 'home' : 'away'
    const updated = swapFirstRoundParticipants(matches, sourceMatch.id, sourceSlot, targetMatch.id, targetSlot)
    if (!updated) {
      alert('No se puede modificar el fixture después de registrar resultados.')
      return
    }
    await db.matches.bulkPut(updated)
    setMatches(updated)
  }

  return (
    <div className="space-y-4">
      <Link to={`/tournaments/${tournamentId}`} className="btn-secondary gap-2">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Partidos</h1>

      {editableFirstRoundMatches.length > 0 && (
        <section className="card space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Armar primera ronda manualmente</h2>
            <p className="text-sm text-gray-600">Selecciona participantes para intercambiarlos entre partidos de la primera ronda.</p>
          </div>
          {!canArrangeFixture && <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">El fixture está bloqueado porque ya existen resultados registrados.</p>}
          <div className="grid gap-3 lg:grid-cols-2">
            {editableFirstRoundMatches.map((match) => (
              <div key={match.id} className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-sm font-medium text-gray-700">Partido {match.position + 1}</p>
                <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                  <select
                    value={match.homeParticipantId}
                    onChange={(e) => handleManualParticipantChange(match, 'home', e.target.value)}
                    disabled={!canArrangeFixture}
                    className="input"
                  >
                    {editableParticipantIds.map((participantId) => <option key={participantId} value={participantId}>{participantName(participantId)}</option>)}
                  </select>
                  <span className="text-center text-sm text-gray-400">vs</span>
                  <select
                    value={match.awayParticipantId}
                    onChange={(e) => handleManualParticipantChange(match, 'away', e.target.value)}
                    disabled={!canArrangeFixture}
                    className="input"
                  >
                    {editableParticipantIds.map((participantId) => <option key={participantId} value={participantId}>{participantName(participantId)}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {stageMatches('group').length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Fase de grupos</h2>
          <div className="space-y-2">
            {stageMatches('group').map((m) => renderMatchRow(m))}
          </div>
        </section>
      )}

      {stageMatches('league').length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Liga</h2>
          <div className="space-y-2">
            {stageMatches('league').map((m) => renderMatchRow(m))}
          </div>
        </section>
      )}

      {stageMatches('winners').length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Bracket de ganadores</h2>
          <div className="space-y-2">
            {stageMatches('winners').map((m) => renderMatchRow(m))}
          </div>
        </section>
      )}

      {stageMatches('losers').length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Bracket de perdedores</h2>
          <div className="space-y-2">
            {stageMatches('losers').map((m) => renderMatchRow(m))}
          </div>
        </section>
      )}

      {stageMatches('final').length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Final general</h2>
          <div className="space-y-2">
            {stageMatches('final').map((m) => renderMatchRow(m))}
          </div>
        </section>
      )}

      {stageMatches('knockout').length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Eliminatoria</h2>
          <div className="space-y-2">
            {stageMatches('knockout').map((m) => renderMatchRow(m))}
          </div>
        </section>
      )}

      {refereeMatch && tournament && (
        <RefereeModal
          match={refereeMatch}
          participants={participants}
          setsToWin={tournament.setsToWin}
          onClose={() => setRefereeMatch(null)}
          onSave={handleSaveSets}
          onLiveUpdate={handleLiveUpdate}
        />
      )}
    </div>
  )

  function renderMatchRow(m: Match) {
    const homeColor = participantColor(m.homeParticipantId)
    const awayColor = participantColor(m.awayParticipantId)
    const sets = matchSets[m.id] || []
    const hasParticipants = Boolean(m.homeParticipantId && m.awayParticipantId)
    const homeRef = !m.homeParticipantId ? getMatchReference(m, 'home') : null
    const awayRef = !m.awayParticipantId ? getMatchReference(m, 'away') : null
    
    return (
      <div key={m.id} className="card space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">{getMatchId(m)}</span>
              <span>📅 {formatDate(m.scheduledAt)}</span>
              <span className="text-blue-600">🏟️ {m.courtName}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm font-medium">
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: homeColor }} />
              <span className="flex-1">
                {m.homeParticipantId ? participantName(m.homeParticipantId) : (
                  homeRef ? <span className="text-amber-600">{homeRef}</span> : '—'
                )}
              </span>
              <span className="text-gray-400">vs</span>
              <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: awayColor }} />
              <span className="flex-1">
                {m.awayParticipantId ? participantName(m.awayParticipantId) : (
                  awayRef ? <span className="text-amber-600">{awayRef}</span> : '—'
                )}
              </span>
            </div>
            {!hasParticipants && !homeRef && !awayRef && (
              <div className="mt-1 text-xs text-amber-600">⚠ Esperando participantes</div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={toDateTimeLocal(m.scheduledAt)}
              onChange={(e) => handleDateChange(m, e.target.value)}
              className="input text-xs"
            />
            <select
              value={m.courtName}
              onChange={(e) => handleCourtChange(m, e.target.value)}
              className="input text-xs"
            >
              {tournament?.courtNames.map((court) => (
                <option key={court} value={court}>{court}</option>
              ))}
            </select>
            <button 
              type="button" 
              onClick={() => addSet(m.id)} 
              className="btn-secondary text-xs"
              disabled={!hasParticipants}
            >
              + Set
            </button>
            <button
              type="button"
              onClick={() => setRefereeMatch(m)}
              className="btn-secondary gap-1 text-xs"
              disabled={!hasParticipants}
            >
              <UserCheck className="h-4 w-4" />
              Árbitro
            </button>
            <button 
              onClick={() => saveMatch(m)} 
              className="btn-primary gap-1"
              disabled={!hasParticipants}
            >
              <Save className="h-4 w-4" />
              Guardar
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sets.map((s, idx) => (
            <div key={idx} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1">
              <span className="text-xs text-gray-500">Set {idx + 1}</span>
              <input
                type="number"
                min={0}
                value={s.home}
                onChange={(e) => updateSet(m.id, idx, 'home', e.target.value)}
                className="input w-14 px-1 py-1 text-center text-sm"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                min={0}
                value={s.away}
                onChange={(e) => updateSet(m.id, idx, 'away', e.target.value)}
                className="input w-14 px-1 py-1 text-center text-sm"
              />
              {sets.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeSet(m.id, idx)}
                  className="ml-1 text-xs text-red-600 hover:text-red-800"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }
}
