import { useState } from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeProvider } from './theme/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { Overview } from './pages/Overview'
import { Dashboard } from './pages/Dashboard'
import { Detail } from './pages/Detail'
import { Simulation } from './pages/Simulation'
import { equipmentRanking } from './data/mock'

function HomeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" />
    </svg>
  )
}
function ActivityIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}
function CpuIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
      <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" />
    </svg>
  )
}
function SlidersIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="4" x2="5" y2="20" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="19" y1="4" x2="19" y2="20" />
      <circle cx="5" cy="9" r="2.2" fill="var(--surface-1)" />
      <circle cx="12" cy="15" r="2.2" fill="var(--surface-1)" />
      <circle cx="19" cy="7" r="2.2" fill="var(--surface-1)" />
    </svg>
  )
}
function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

// '설비 상세'는 특정 엔진 하나에 고정된 페이지가 아니라 /equipment/:id 전체를 가리키는 섹션이다.
// 사이드바에서 처음 들어갈 때는 지금 가장 위험한(헬스 스코어가 가장 낮은) 엔진으로 연다.
const priorityEngineId = equipmentRanking[0].id

const navItems = [
  { to: '/', label: '홈', icon: HomeIcon, match: '/' },
  { to: '/dashboard', label: '모니터링', icon: ActivityIcon, match: '/dashboard' },
  { to: `/equipment/${priorityEngineId}`, label: '설비 상세', icon: CpuIcon, match: '/equipment' },
  { to: '/simulation', label: '시나리오 시뮬레이션', icon: SlidersIcon, match: '/simulation' },
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

function Logo() {
  return (
    <div className="flex flex-row items-center gap-2.5 px-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center" style={{ background: 'var(--accent)', borderRadius: 'var(--radius-sm)' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
          <path d="M12 8 L12 12 L15 14" />
        </svg>
      </div>
      <span className="text-[14px] font-semibold tracking-[-0.01em]">Sentinel</span>
    </div>
  )
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation()
  return (
    <nav className="flex flex-col gap-0.5">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = item.match === '/' ? location.pathname === '/' : location.pathname.startsWith(item.match)
        return (
          <Link
            key={item.match}
            to={item.to}
            onClick={onNavigate}
            className={`sidebar-link flex flex-row items-center gap-2.5 px-2.5 py-2 text-[13.5px] font-medium ${isActive ? 'is-active' : ''}`}
            style={isActive ? { color: 'var(--text-primary)' } : { color: 'var(--text-muted)' }}
          >
            <Icon />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

function LiveRow() {
  return (
    <div className="flex flex-row items-center justify-between">
      <span className="flex flex-row items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        <span className="led-dot led-dot--live" />
        Live
      </span>
      <ThemeToggle />
    </div>
  )
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* 데스크톱: 항상 보이는 고정 사이드바 */}
      <aside
        className="sticky top-0 hidden h-screen w-[228px] shrink-0 flex-col justify-between px-3 py-4 md:flex"
        style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-1)' }}
      >
        <div className="flex flex-col gap-6">
          <Logo />
          <SidebarNav />
        </div>
        <div className="flex flex-col gap-3 px-2">
          <LiveRow />
        </div>
      </aside>

      {/* 모바일: 오버레이 드로어 */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 md:hidden"
              style={{ background: 'rgba(0, 0, 0, 0.5)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={onClose}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[240px] flex-col justify-between px-3 py-4 md:hidden"
              style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border)' }}
              initial={{ x: -240 }}
              animate={{ x: 0 }}
              exit={{ x: -240 }}
              transition={{ type: 'tween', duration: 0.2 }}
            >
              <div className="flex flex-col gap-6">
                <div className="flex flex-row items-center justify-between">
                  <Logo />
                  <button onClick={onClose} aria-label="메뉴 닫기" className="icon-btn flex h-7 w-7 items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                    <CloseIcon />
                  </button>
                </div>
                <SidebarNav onNavigate={onClose} />
              </div>
              <div className="flex flex-col gap-3 px-2">
                <LiveRow />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function MobileTopBar({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header
      className="sticky top-0 z-30 flex flex-row items-center justify-between px-4 py-3 md:hidden"
      style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in oklab, var(--surface-1) 92%, transparent)', backdropFilter: 'blur(6px)' }}
    >
      <Logo />
      <button onClick={onMenuClick} aria-label="메뉴 열기" className="icon-btn flex h-8 w-8 items-center justify-center" style={{ color: 'var(--text-secondary)' }}>
        <MenuIcon />
      </button>
    </header>
  )
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col md:flex-row" style={{ background: 'var(--page)', color: 'var(--text-primary)' }}>
      <MobileTopBar onMenuClick={() => setMobileOpen(true)} />
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-9 lg:py-8">
        <div className="mx-auto max-w-[1200px]">
          <AnimatedRoutes />
        </div>
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
