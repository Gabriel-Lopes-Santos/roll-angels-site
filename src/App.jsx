import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import CharacterSheet from './components/CharacterSheet'
import Login from './pages/Login'
import CharacterSelection from './pages/CharacterSelection'
import CharacterCreationRequest from './pages/CharacterCreationRequest'
import DMDashboard from './pages/DMDashboard'
import ResetPassword from './pages/ResetPassword'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/selecao" element={<CharacterSelection />} />
        <Route path="/criacao" element={<CharacterCreationRequest />} />
        <Route path="/mestre" element={<DMDashboard />} />
        <Route path="/ficha/:id" element={<CharacterSheet />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    </Router>
  )
}

export default App
