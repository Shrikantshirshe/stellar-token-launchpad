import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import ExplorePage from './pages/ExplorePage'
import MyTokensPage from './pages/MyTokensPage'
import LaunchPage from './pages/LaunchPage'
import TokenDetailPage from './pages/TokenDetailPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/launch" element={<LaunchPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/explore/token/:address" element={<TokenDetailPage />} />
          <Route path="/my-tokens" element={<MyTokensPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  )
}
