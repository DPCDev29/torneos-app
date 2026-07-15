import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Users, Swords, LayoutGrid, Trophy, Trash2, Edit, Calendar, MapPin, Clock } from 'lucide-react'
import { db } from '../db'
import type { Tournament, Participant, Match, Group, Standing } from '../types'
import { calculateStandingsForParticipantIds, regenerateTournamentSchedule } from '../utils/tournament'

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [standings, setStandings] = useState<Standing[]>([])

  useEffect(() => {
    if (!id) return
    Promise.all([
      db.tournaments.get(id),
      db.participants.where('tournamentId').equals(id).toArray(),
      db.matches.where('tournamentId').equals(id).toArray(),
      db.groups.where('tournamentId').equals(id).toArray(),
    ]).then(([t, p, m, g]) => {
      setTournament(t || null)
      setParticipants(p)
      setMatches(m)
      setGroups(g)
      if (t?.format === 'league') {
        setStandings(calculateStandingsForParticipantIds(p.map((x) => x.id), m))
      }
    })
  }, [id])

  const handleGenerate = async () => {
    if (!id || participants.length < 2) {
      alert('Registra al menos 2 participantes para generar el fixture.')
      return
    }
    if (tournament?.format === 'double-elimination' && participants.length < 4) {
      alert('La doble eliminatoria requiere al menos 4 participantes.')
      return
    }
    await regenerateTournamentSchedule(id)
    const [m, g, t] = await Promise.all([
      db.matches.where('tournamentId').equals(id).toArray(),
      db.groups.where('tournamentId').equals(id).toArray(),
      db.tournaments.get(id),
    ])
    setMatches(m)
    setGroups(g)
    setTournament(t || null)
    if (t?.format === 'league') {
      setStandings(calculateStandingsForParticipantIds(participants.map((p) => p.id), m))
    }
  }

  const handleDelete = async () => {
    if (!id) return
    if (!confirm('¿Eliminar este torneo y todos sus datos?')) return
    await db.transaction('rw', [db.tournaments, db.participants, db.matches, db.groups], async () => {
      await db.matches.where('tournamentId').equals(id).delete()
      await db.groups.where('tournamentId').equals(id).delete()
      await db.participants.where('tournamentId').equals(id).delete()
      await db.tournaments.delete(id)
    })
    navigate('/')
  }

  if (!tournament) {
    return <div className="text-center text-gray-600">Cargando...</div>
  }

  const hasSchedule = matches.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{tournament.name}</h1>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleGenerate} className="btn-primary gap-1">
            <Swords className="h-4 w-4" />
            {hasSchedule ? 'Regenerar fixture' : 'Generar fixture'}
          </button>
          <Link to={`/tournaments/${id}/edit`} className="btn-secondary gap-1">
            <Edit className="h-4 w-4" />
            Editar
          </Link>
          <button onClick={handleDelete} className="btn-danger gap-1">
            <Trash2 className="h-4 w-4" />
            Eliminar
          </button>
        </div>
      </div>

      <div className="card grid gap-3 text-sm text-gray-600 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{new Date(tournament.startDate).toLocaleDateString('es-ES')}</span>
        </div>
        {tournament.endDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(tournament.endDate).toLocaleDateString('es-ES')}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          <span>{tournament.venue}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          <span>{tournament.matchDurationMinutes} min/partido</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Link to={`/tournaments/${id}/participants`} className="card flex items-center gap-3 hover:border-blue-300">
          <Users className="h-6 w-6 text-blue-600" />
          <div>
            <p className="font-semibold text-gray-900">Participantes</p>
            <p className="text-sm text-gray-600">{participants.length} registrados</p>
          </div>
        </Link>
        <Link to={`/tournaments/${id}/matches`} className="card flex items-center gap-3 hover:border-blue-300">
          <Swords className="h-6 w-6 text-green-600" />
          <div>
            <p className="font-semibold text-gray-900">Partidos</p>
            <p className="text-sm text-gray-600">{matches.filter((m) => !m.isBye).length} programados</p>
          </div>
        </Link>
        {tournament.format === 'groups-knockout' && (
          <Link to={`/tournaments/${id}/bracket`} className="card flex items-center gap-3 hover:border-blue-300">
            <LayoutGrid className="h-6 w-6 text-purple-600" />
            <div>
              <p className="font-semibold text-gray-900">Grupos</p>
              <p className="text-sm text-gray-600">{groups.length} grupos</p>
            </div>
          </Link>
        )}
        {tournament.format !== 'league' && (
          <Link to={`/tournaments/${id}/bracket`} className="card flex items-center gap-3 hover:border-blue-300">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-gray-900">Bracket</p>
              <p className="text-sm text-gray-600">Eliminatoria</p>
            </div>
          </Link>
        )}
        {tournament.format === 'league' && (
          <div className="card flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-gray-900">Liga</p>
              <p className="text-sm text-gray-600">Todos contra todos</p>
            </div>
          </div>
        )}
        {tournament.format === 'double-elimination' && (
          <div className="card flex items-center gap-3">
            <Trophy className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="font-semibold text-gray-900">Eliminación híbrida con consolación</p>
              <p className="text-sm text-gray-600">Los perdedores de la primera ronda juegan en el bracket de perdedores</p>
            </div>
          </div>
        )}
      </div>

      {!hasSchedule && (
        <div className="card text-center">
          <p className="text-gray-600">Aún no se ha generado el fixture.</p>
          <button onClick={handleGenerate} className="btn-primary mt-3">
            Generar fixture ahora
          </button>
        </div>
      )}

      {tournament.format === 'league' && hasSchedule && (
        <section className="card space-y-3">
          <h2 className="text-lg font-semibold text-gray-800">Tabla de posiciones</h2>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="py-1">#</th>
                <th className="py-1">Equipo</th>
                <th className="py-1 text-center">PJ</th>
                <th className="py-1 text-center">Pts</th>
                <th className="py-1 text-center">DS</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, idx) => (
                <tr key={s.participantId} className="border-b border-gray-100">
                  <td className="py-1 text-gray-500">{idx + 1}</td>
                  <td className="py-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: participants.find((p) => p.id === s.participantId)?.color }}
                      />
                      <span>{participants.find((p) => p.id === s.participantId)?.name || '—'}</span>
                    </div>
                  </td>
                  <td className="py-1 text-center">{s.played}</td>
                  <td className="py-1 text-center font-semibold">{s.points}</td>
                  <td className="py-1 text-center">{s.setDifference}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {standings.length > 0 && (
            <div className="rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              {getWinnerText(standings, participants)}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function getWinnerText(standings: Standing[], participants: Participant[]): string {
  if (!standings.length) return ''
  const first = standings[0]
  const tied = standings.filter(
    (s) => s.points === first.points && s.setDifference === first.setDifference && s.setsFor === first.setsFor,
  )
  const names = tied.map((s) => participants.find((p) => p.id === s.participantId)?.name || '—')
  if (tied.length === 1) return `Ganador: ${names[0]} 🏆`
  return `Empate entre: ${names.join(' - ')}`
}
