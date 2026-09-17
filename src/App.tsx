import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeProvider } from './theme/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { Overview } from './pages/Overview'
import { Dashboard } from './pages/Dashboard'
import { Detail } from './pages/Detail'
import { Simulation } from './pages/Simulation'

const navItems = [
  { to: '/', label: '개요' },
  { to: '/dashboard', label: '모니터링' },
  { to: '/equipment/compressor-03', label: '설비 상세' },
  { to: '/simulation', label: '시나리오 시뮬레이션' },
]

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          <Route path="/" element={<Overview />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/equipment/:id" element={<Detail />} />
          <Route path="/simulation" element={<Simulation />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function Shell() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--page)', color: 'var(--text-primary)' }}>
      <header
        className="sticky top-0 z-10 flex flex-row items-center justify-between px-8 py-3 backdrop-blur"
        style={{ borderBottom: '1px solid var(--border-strong)', background: 'color-mix(in oklab, var(--page) 92%, transparent)' }}
      >
        <div className="flex flex-row items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center" style={{ background: 'var(--accent)', borderRadius: 'var(--radius)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
              <path d="M12 8 L12 12 L15 14" />
            </svg>
          </div>
          <span className="mono text-[13.5px] font-semibold uppercase tracking-[0.08em]">Sentinel</span>
          <span className="flex flex-row items-center gap-1.5 border-l pl-3 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
            <span className="led-dot led-dot--live" />
            <span className="mono uppercase tracking-[0.1em]">Live</span>
          </span>
        </div>

        <nav className="flex flex-row gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-link px-3.5 py-2 text-[13.5px] font-medium ${isActive ? 'is-active' : ''}`}
              style={({ isActive }) => (isActive ? { color: 'var(--text-primary)' } : { color: 'var(--text-muted)' })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-[1360px] px-8 py-8">
        <AnimatedRoutes />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </ThemeProvider>
  )
}
