import { Routes, Route } from 'react-router-dom'
import { TournamentListPage } from './pages/TournamentListPage'
import { TournamentFormPage } from './pages/TournamentFormPage'
import { TournamentDetailPage } from './pages/TournamentDetailPage'
import { ParticipantsPage } from './pages/ParticipantsPage'
import { BracketPage } from './pages/BracketPage'
import { MatchesPage } from './pages/MatchesPage'
import { Layout } from './components/Layout'

function App() {
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

export default App
