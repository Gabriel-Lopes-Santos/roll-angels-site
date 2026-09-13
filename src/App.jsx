import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import CharacterSheet from './components/CharacterSheet'
import Login from './pages/Login'
import CharacterSelection from './pages/CharacterSelection'
import CharacterCreationRequest from './pages/CharacterCreationRequest'
import CharacterFullCreation from './pages/CharacterFullCreation'
import DMDashboard from './pages/DMDashboard'
import CampaignControl from './pages/CampaignControl'
import ResetPassword from './pages/ResetPassword'
import VTTPage from './pages/VTTPage'
import CompendiumPage from './pages/CompendiumPage'
import { LexiconProvider } from './context/LexiconContext'
import NestedTooltipPortal from './components/lexicon/NestedTooltipPortal'
import CompendiumDrawer from './components/lexicon/CompendiumDrawer'

function App() {
  return (
    <Router>
      <LexiconProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/selecao" element={<CharacterSelection />} />
          <Route path="/criacao" element={<CharacterCreationRequest />} />
          <Route path="/criacao-completa/:requestId" element={<CharacterFullCreation />} />
          <Route path="/mestre" element={<DMDashboard />} />
          <Route path="/mestre/campanha/:campaignId" element={<CampaignControl />} />
          <Route path="/ficha/:id" element={<CharacterSheet />} />
          <Route path="/compendio" element={<CompendiumPage />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/vtt/:sessionId" element={<VTTPage />} />
        </Routes>

        {/* Portais Globais: Tooltips Aninhadas e Drawer Deslizante */}
        <NestedTooltipPortal />
        <CompendiumDrawer />
      </LexiconProvider>
    </Router>
  )
}

export default App

