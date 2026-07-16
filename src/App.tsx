import { Routes, Route, useLocation } from 'react-router-dom'
import { TournamentListPage } from './pages/TournamentListPage'
import { TournamentFormPage } from './pages/TournamentFormPage'
import { TournamentDetailPage } from './pages/TournamentDetailPage'
import { ParticipantsPage } from './pages/ParticipantsPage'
import { BracketPage } from './pages/BracketPage'
import { MatchesPage } from './pages/MatchesPage'
import { Layout } from './components/Layout'
import { AuthProvider, useAuth } from './supabase/AuthProvider'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { PublicBracketPage } from './pages/PublicBracketPage'

function AppContent() {
  const { session, loading } = useAuth()
  const location = useLocation()
  
  console.log('Current location:', location.pathname)
  
  // Public routes accessible without authentication
  if (location.pathname.startsWith('/public/')) {
    console.log('Rendering PublicBracketPage')
    return <PublicBracketPage />
  }
  
  if (loading) return <main className="flex min-h-screen items-center justify-center text-gray-600">Cargando...</main>
  
  if (!session) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/public/:id" element={<PublicBracketPage />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    )
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<TournamentListPage />} />
        <Route path="/tournaments/new" element={<TournamentFormPage />} />
        <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
        <Route path="/tournaments/:id/edit" element={<TournamentFormPage />} />
        <Route path="/tournaments/:id/participants" element={<ParticipantsPage />} />
        <Route path="/tournaments/:id/matches" element={<MatchesPage />} />
        <Route path="/tournaments/:id/bracket" element={<BracketPage />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return <AuthProvider><AppContent /></AuthProvider>
}

export default App
