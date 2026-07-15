import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { db } from '../db'
import type { Tournament, TournamentFormat } from '../types'
import { generateId } from '../utils/tournament'

const DEFAULT_COURTS = 'Cancha 1, Cancha 2'

export function TournamentFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = Boolean(id)

  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [venue, setVenue] = useState('')
  const [format, setFormat] = useState<TournamentFormat>('groups-knockout')
  const [courts, setCourts] = useState(DEFAULT_COURTS)
  const [duration, setDuration] = useState(60)
  const [setsToWin, setSetsToWin] = useState(2)
  const [includeGrandFinal, setIncludeGrandFinal] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!id) return
    db.tournaments.get(id).then((t) => {
      if (t) {
        setName(t.name)
        setStartDate(t.startDate)
        setEndDate(t.endDate)
        setVenue(t.venue)
        setFormat(t.format)
        setCourts(t.courtNames.join(', '))
        setDuration(t.matchDurationMinutes)
        setSetsToWin(t.setsToWin)
        setIncludeGrandFinal(t.includeGrandFinal !== false)
      }
    })
  }, [id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('El nombre del torneo es obligatorio.')
      return
    }
    if (!startDate) {
      setError('La fecha de inicio es obligatoria.')
      return
    }
    if (!endDate) {
      setError('La fecha de cierre es obligatoria.')
      return
    }
    if (!venue.trim()) {
      setError('La sede es obligatoria.')
      return
    }
    const courtNames = courts.split(',').map((c) => c.trim()).filter(Boolean)
    if (courtNames.length === 0) {
      setError('Debe indicar al menos una cancha/escenario.')
      return
    }

    setLoading(true)
    const now = new Date().toISOString()
    const tournament: Tournament = {
      id: id || generateId(),
      name: name.trim(),
      startDate,
      endDate,
      venue: venue.trim(),
      format,
      courtNames,
      matchDurationMinutes: duration,
      setsToWin: Math.max(1, setsToWin),
      includeGrandFinal: format === 'double-elimination' ? includeGrandFinal : undefined,
      createdAt: now,
      updatedAt: now,
    }

    await db.tournaments.put(tournament)
    setLoading(false)
    navigate(`/tournaments/${tournament.id}`)
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={() => navigate(-1)} className="btn-secondary mb-4 gap-2">
        <ArrowLeft className="h-4 w-4" />
        Volver
      </button>
      <h1 className="text-2xl font-bold text-gray-900">
        {isEdit ? 'Editar torneo' : 'Nuevo torneo'}
      </h1>
      <form onSubmit={handleSubmit} className="card mt-4 space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
            placeholder="Torneo de verano"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fecha de inicio *</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Fecha de cierre *</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Sede *</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="input"
              placeholder="Club deportivo"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Formato *</label>
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value as TournamentFormat)}
            className="input"
          >
            <option value="groups-knockout">Fase de grupos + eliminatoria</option>
            <option value="knockout-only">Solo eliminatoria</option>
            <option value="league">Liga (todos contra todos)</option>
            <option value="double-elimination">Eliminación híbrida con consolación</option>
          </select>
          {format === 'double-elimination' && (
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeGrandFinal}
                onChange={(e) => setIncludeGrandFinal(e.target.checked)}
              />
              Enfrentar campeón de perdedores vs. campeón de ganadores en final general
            </label>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Canchas/escenarios *</label>
            <input
              type="text"
              value={courts}
              onChange={(e) => setCourts(e.target.value)}
              className="input"
              placeholder="Cancha 1, Cancha 2"
            />
            <p className="mt-1 text-xs text-gray-500">Separadas por coma.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Duración por partido (min) *</label>
            <input
              type="number"
              min={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Sets para ganar *</label>
            <input
              type="number"
              min={1}
              value={setsToWin}
              onChange={(e) => setSetsToWin(Number(e.target.value))}
              className="input"
            />
            <p className="mt-1 text-xs text-gray-500">Ej. 2 = mejor de 3 sets.</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Guardando...' : 'Guardar torneo'}
          </button>
        </div>
      </form>
    </div>
  )
}
