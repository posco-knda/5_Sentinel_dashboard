import { Suspense, lazy, useMemo, useState } from 'react'
import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ThemeProvider } from './theme/ThemeContext'
import { ThemeToggle } from './components/ThemeToggle'
import { SettingsProvider } from './lib/SettingsProvider'
import { PlanProvider } from './lib/PlanProvider'
import { AuthProvider } from './lib/AuthProvider'
import { ROLE_LABEL, useAuth } from './lib/auth'
import { useFleet } from './lib/fleet'
import { usePlan } from './lib/plan'
import { Overview } from './pages/Overview'
import { Plan } from './pages/Plan'
import { Login } from './pages/Login'

// 무거운 화면(차트·큰 데이터)은 처음 열 때 불러온다
const Approvals = lazy(() => import('./pages/Approvals').then((m) => ({ default: m.Approvals })))
const Weekly = lazy(() => import('./pages/Weekly').then((m) => ({ default: m.Weekly })))
const Alerts = lazy(() => import('./pages/Alerts').then((m) => ({ default: m.Alerts })))
const Detail = lazy(() => import('./pages/Detail').then((m) => ({ default: m.Detail })))
const Report = lazy(() => import('./pages/Report').then((m) => ({ default: m.Report })))
const Cost = lazy(() => import('./pages/Simulation').then((m) => ({ default: m.Simulation })))
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })))

const icon = (children: React.ReactNode) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
)
const HomeIcon = () => icon(<><path d="M3 11.5 12 4l9 7.5" /><path d="M5.5 10v9a1 1 0 0 0 1 1H10v-6h4v6h3.5a1 1 0 0 0 1-1v-9" /></>)
const CalendarIcon = () => icon(<><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="m9.5 15 1.8 1.8L15 13" /></>)
const BellIcon = () => icon(<><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" /></>)
const CpuIcon = () => icon(<><rect x="6" y="6" width="12" height="12" rx="1.5" /><rect x="9.5" y="9.5" width="5" height="5" rx="0.5" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" /></>)
const CheckIcon = () => icon(<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M9 13l2 2 4-4" /></>)
const DocIcon = () => icon(<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></>)
const BarsIcon = () => icon(<><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20H2" /></>)
const GearIcon = () => icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></>)
const MenuIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)
const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

function PageLoading() {
  return (
    <div className="flex h-[40vh] items-center justify-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
      불러오는 중…
    </div>
  )
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
        <Suspense fallback={<PageLoading />}>
          <Routes location={location}>
            <Route path="/" element={<Overview />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/equipment" element={<Detail />} />
            <Route path="/equipment/:id" element={<Detail />} />
            <Route path="/report/:id" element={<Report />} />
            <Route path="/weekly" element={<Weekly />} />
            <Route path="/cost" element={<Cost />} />
            <Route path="/settings" element={<Settings />} />
            {/* 이전 주소 */}
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/log" element={<Navigate to="/alerts" replace />} />
            <Route path="/policy" element={<Navigate to="/settings" replace />} />
            <Route path="/evidence" element={<Navigate to="/settings" replace />} />
            <Route path="/simulation" element={<Navigate to="/cost" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
  const fleet = useFleet()
  const plan = usePlan()
  const active = useMemo(() => fleet.filter((e) => plan.get(e.unit).status !== 'done'), [fleet, plan])
  const urgent = active.filter((e) => e.urgency === 'now').length
  const { user } = useAuth()
  // 운영 책임자에게는 결재 대기 건수, 정비 담당자에게는 반려된 건수를 알린다
  const approvals = Object.values(plan.items).filter((i) => i.status === (user?.role === 'manager' ? 'submitted' : 'rejected')).length
  const firstUnit = (active[0] ?? fleet[0]).unit

  const groups = [
    {
      title: '운영',
      items: [
        { to: '/', label: '현황', icon: HomeIcon, match: '/' },
        { to: '/plan', label: '정비 계획', icon: CalendarIcon, match: '/plan', badge: urgent },
        { to: '/approvals', label: '결재함', icon: CheckIcon, match: '/approvals', badge: approvals, badgeColor: 'var(--accent)' },
        { to: '/alerts', label: '알림', icon: BellIcon, match: '/alerts' },
        { to: `/equipment/engine-${firstUnit}`, label: '엔진', icon: CpuIcon, match: '/equipment' },
      ],
    },
    {
      title: '관리',
      items: [
        { to: '/weekly', label: '주간 리포트', icon: DocIcon, match: '/weekly' },
        { to: '/cost', label: '비용 분석', icon: BarsIcon, match: '/cost' },
        { to: '/settings', label: '설정', icon: GearIcon, match: '/settings' },
      ],
    },
  ]

  return (
    <nav className="flex flex-col gap-4">
      {groups.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <span className="px-2.5 pb-1 text-[11px] font-medium tracking-[0.04em]" style={{ color: 'var(--text-muted)', opacity: 0.8 }}>
            {group.title}
          </span>
          {group.items.map((item) => {
            const Icon = item.icon
            const isActive = item.match === '/' ? location.pathname === '/' : location.pathname.startsWith(item.match) || (item.match === '/equipment' && location.pathname.startsWith('/report'))
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
                {'badge' in item && item.badge ? (
                  <span className="mono ml-auto px-1.5 text-[11px] font-semibold" style={{ background: 'badgeColor' in item && item.badgeColor ? item.badgeColor : 'var(--status-critical)', color: '#fff', borderRadius: 'var(--radius-pill)' }}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function UserBox() {
  const { user, logout } = useAuth()
  if (!user) return null
  return (
    <div className="flex flex-row items-center gap-2.5 border px-2.5 py-2" style={{ borderColor: 'var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-2)' }}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center text-[12px] font-semibold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', borderRadius: 'var(--radius-pill)' }}>{user.name.slice(0, 1)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[12.5px] font-medium">{user.name}</div>
        <div className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>{ROLE_LABEL[user.role]}</div>
      </div>
      <button onClick={logout} className="shrink-0 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>로그아웃</button>
    </div>
  )
}

function FooterRow() {
  return (
    <div className="flex flex-row items-center justify-end">
      <ThemeToggle />
    </div>
  )
}

function Sidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  return (
    <>
      {/* 데스크톱: 항상 보이는 고정 사이드바 */}
      <aside className="sticky top-0 hidden h-screen w-[228px] shrink-0 flex-col justify-between px-3 py-4 md:flex" style={{ borderRight: '1px solid var(--border)', background: 'var(--surface-1)' }}>
        <div className="flex flex-col gap-6">
          <Logo />
          <SidebarNav />
        </div>
        <div className="flex flex-col gap-3 px-2">
          <UserBox />
          <FooterRow />
        </div>
      </aside>

      {/* 모바일: 오버레이 드로어 */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div className="fixed inset-0 z-40 md:hidden" style={{ background: 'rgba(0, 0, 0, 0.5)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} onClick={onClose} />
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
                <UserBox />
                <FooterRow />
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
      className="no-print sticky top-0 z-30 flex flex-row items-center justify-between px-4 py-3 md:hidden"
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

function Gate() {
  const { user } = useAuth()
  return user ? <Shell /> : <Login />
}

export default function App() {
  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <PlanProvider>
            <BrowserRouter>
              <Gate />
            </BrowserRouter>
          </PlanProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  )
}
