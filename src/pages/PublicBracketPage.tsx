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

  useEffect(() => {
    console.log('PublicBracketPage useEffect triggered')
    console.log('tournamentId:', tournamentId)
    console.log('token:', token)
    
    if (!tournamentId || !token) {
      console.log('Missing tournamentId or token')
      setError('Link inválido.')
      return
    }
    const client = createPublicClient()
    console.log('Client created:', client)
    
    const loadData = async () => {
      try {
        // First verify the tournament exists and token matches
        const tRes = await client.from('tournaments')
          .select()
          .eq('id', tournamentId)
          .eq('public_token', token)
          .maybeSingle()
        
        console.log('Tournament query result:', tRes)
        
        if (tRes.error) {
          console.error('Tournament query error:', tRes.error)
          setError(`Error: ${tRes.error.message}`)
          return
        }
        
        if (!tRes.data) {
          setError('Torneo no encontrado o link revocado.')
          return
        }
        
        // Transform snake_case to camelCase
        const transformToCamel = (obj: any): any => {
          if (!obj) return obj
          const result: any = {}
          Object.keys(obj).forEach(key => {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
            result[camelKey] = obj[key]
          })
          return result
        }
        
        setTournament(transformToCamel(tRes.data) as Tournament)
        
        // Load related data
        const [pRes, mRes] = await Promise.all([
          client.from('participants').select().eq('tournament_id', tournamentId),
          client.from('matches').select().eq('tournament_id', tournamentId),
        ])
        
        console.log('Participants:', pRes)
        console.log('Matches:', mRes)
        
        setParticipants((pRes.data || []).map(transformToCamel) as Participant[])
        setMatches((mRes.data || []).map(transformToCamel) as Match[])
      } catch (err) {
        console.error('Load error:', err)
        setError('Error al cargar el torneo.')
      }
    }
    
    loadData()
  }, [tournamentId, token])

  const participantName = (id: string) => participants.find((p) => p.id === id)?.name || '—'
  const participantColor = (id: string) => participants.find((p) => p.id === id)?.color

  const formatTime = (iso: string) => {
    if (!iso) return ''
    return new Date(iso).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const renderParticipant = (id: string, winner?: string) => {
    const isWinner = winner === id && Boolean(winner)
    return (
      <div className={`flex items-center gap-2 rounded px-2 py-1 text-sm ${isWinner ? 'bg-green-50 font-semibold text-green-800' : 'text-gray-700'}`}>
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: participantColor(id) }} />
        <span className="truncate">{participantName(id)}</span>
      </div>
    )
  }

  const renderPending = () => (
    <div className="rounded px-2 py-1 text-sm text-gray-400">Por definir</div>
  )

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
                    <div key={m.id} className="card p-3">
                      <div className="mb-2 text-xs text-gray-500">{formatTime(m.scheduledAt)} · {m.courtName}</div>
                      {m.homeParticipantId ? renderParticipant(m.homeParticipantId, m.winnerParticipantId) : renderPending()}
                      <div className="my-1 text-center text-xs text-gray-400">vs</div>
                      {m.awayParticipantId ? renderParticipant(m.awayParticipantId, m.winnerParticipantId) : renderPending()}
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
