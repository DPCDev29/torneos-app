import { useEffect, useState } from 'react'
import { useParams, useSearchParams, useLocation } from 'react-router-dom'
import { Trophy } from 'lucide-react'
import { createPublicClient } from '../supabase/publicClient'
import type { Tournament, Participant, Match } from '../types'
import { countSetsWon, isMatchFinished } from '../utils/tournament'

export function PublicBracketPage() {
  const { id: paramId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  
  // Extract tournament ID from URL path if not in params
  const tournamentId = paramId || location.pathname.split('/').pop() || ''
  const token = searchParams.get('token')
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [error, setError] = useState('')

  // Transform snake_case to camelCase helper
  const transformToCamel = (obj: any): any => {
    if (!obj) return obj
    const result: any = {}
    Object.keys(obj).forEach(key => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
      result[camelKey] = obj[key]
    })
    return result
  }

  useEffect(() => {
    if (!tournamentId || !token) {
      setError('Link inválido.')
      return
    }
    
    const client = createPublicClient()
    
    const loadData = async () => {
      try {
        // First verify the tournament exists and token matches
        const tRes = await client.from('tournaments')
          .select()
          .eq('id', tournamentId)
          .eq('public_token', token)
          .maybeSingle()
        
        if (tRes.error) {
          console.error('Tournament query error:', tRes.error)
          setError(`Error: ${tRes.error.message}`)
          return
        }
        
        if (!tRes.data) {
          setError('Torneo no encontrado o link revocado.')
          return
        }
        
        setTournament(transformToCamel(tRes.data) as Tournament)
        
        // Load related data
        const [pRes, mRes] = await Promise.all([
          client.from('participants').select().eq('tournament_id', tournamentId),
          client.from('matches').select().eq('tournament_id', tournamentId),
        ])
        
        setParticipants((pRes.data || []).map(transformToCamel) as Participant[])
        setMatches((mRes.data || []).map(transformToCamel) as Match[])
      } catch (err) {
        console.error('Load error:', err)
        setError('Error al cargar el torneo.')
      }
    }
    
    loadData()
  }, [tournamentId, token])

  // Realtime subscription for live score updates
  useEffect(() => {
    if (!tournamentId || !token) return

    const client = createPublicClient()
    
    // Subscribe to match updates for this tournament
    const channel = client
      .channel(`public-matches-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('🔴 Live update received:', payload)
          
          // Update the specific match in state
          if (payload.new) {
            const updatedMatch = transformToCamel(payload.new) as Match
            setMatches(prev => 
              prev.map(m => m.id === updatedMatch.id ? updatedMatch : m)
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status)
      })

    // Cleanup subscription on unmount
    return () => {
      console.log('Unsubscribing from realtime channel')
      channel.unsubscribe()
    }
  }, [tournamentId, token])

  const participantName = (id: string) => participants.find((p) => p.id === id)?.name || '—'
  const participantColor = (id: string) => participants.find((p) => p.id === id)?.color

  const formatTime = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  // Check if match is currently in progress (has participants but no winner, and has at least 1 point)
  const isMatchLive = (match: Match) => {
    if (!match.homeParticipantId || !match.awayParticipantId || match.winnerParticipantId) {
      return false
    }
    
    // Verificar si hay al menos 1 punto en algún set
    if (match.sets && match.sets.length > 0) {
      return match.sets.some(s => s.home > 0 || s.away > 0)
    }
    
    return false
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

  const renderParticipant = (id: string, winner?: string | null) => {
    const isWinner = winner === id && Boolean(winner)
    return (
      <div className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${isWinner ? 'bg-green-50 font-semibold text-green-800' : 'text-gray-700'}`}>
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
                      <div className="absolute right-2 top-2 flex gap-2">
                        {isMatchLive(m) && (
                          <span className="animate-pulse rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                            🔴 EN VIVO
                          </span>
                        )}
                        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-bold text-purple-700">
                          {getMatchId(m)}
                        </span>
                      </div>
                      <div className="mb-2 flex flex-col gap-1">
                        <div className="text-sm font-bold text-gray-700">📅 {formatTime(m.scheduledAt)}</div>
                        <div className="text-sm font-bold text-blue-600">🏟️ {m.courtName}</div>
                      </div>
                      {m.homeParticipantId ? renderParticipant(m.homeParticipantId, m.winnerParticipantId) : renderPending(m, 'home')}
                      <div className="my-1 text-center text-xs text-gray-400">vs</div>
                      {m.awayParticipantId ? renderParticipant(m.awayParticipantId, m.winnerParticipantId) : renderPending(m, 'away')}
                      {((isMatchFinished(m) && m.winnerParticipantId) || isMatchLive(m)) && m.sets && m.sets.length > 0 && (
                        <div className="mt-2 text-center font-mono text-sm font-semibold">
                          {countSetsWon(m.sets, 'home')} - {countSetsWon(m.sets, 'away')}
                          <span className="block text-xs font-normal text-gray-500">
                            {m.sets.map((s, i) => (
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

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="card max-w-md text-center">
          <Trophy className="mx-auto h-12 w-12 text-gray-400" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">Torneo no disponible</h1>
          <p className="mt-2 text-gray-600">{error}</p>
        </div>
      </main>
    )
  }

  if (!tournament) {
    return <main className="flex min-h-screen items-center justify-center text-gray-600">Cargando...</main>
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="h-10 w-10 text-blue-700" />
            <h1 className="text-3xl font-bold text-gray-900">{tournament.name}</h1>
          </div>
          <p className="text-gray-600">{tournament.venue} · {new Date(tournament.startDate).toLocaleDateString('es-ES')}</p>
        </div>

        {renderBracket('knockout', 'Eliminatoria')}
        {renderBracket('winners', 'Bracket de ganadores')}
        {renderBracket('losers', 'Bracket de perdedores')}
        {renderBracket('final', 'Final general')}
      </div>
    </main>
  )
}

function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return 'Final'
  if (round === totalRounds - 1) return 'Semifinal'
  if (round === totalRounds - 2) return 'Cuartos'
  return `Ronda ${round}`
}
