import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import CharacterSheet from './components/CharacterSheet'
import Login from './pages/Login'
import CharacterSelection from './pages/CharacterSelection'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/selecao" element={<CharacterSelection />} />
        <Route path="/ficha/:id" element={<CharacterSheet />} />
      </Routes>
    </Router>
  )
}

export default App
