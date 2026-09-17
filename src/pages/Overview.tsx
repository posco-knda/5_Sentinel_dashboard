import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const stats = [
  { label: '비계획 정지시간', value: '[ −42% ]' },
  { label: '연간 정비 비용', value: '[ −20% ]' },
  { label: '고장 예측 모델 F1', value: '[ 0.__ ]' },
]

export function Overview() {
  return (
    <motion.div
      className="mx-auto flex max-w-3xl flex-col py-10"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="mono flex flex-row items-center gap-2 text-[11.5px] font-medium uppercase tracking-[0.14em]" style={{ color: 'var(--accent)' }}>
        <span className="led-dot led-dot--live" />
        Smart Factory · Predictive Maintenance
      </span>

      <div className="mt-4 flex flex-row items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center" style={{ background: 'var(--accent)', borderRadius: 'var(--radius)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z" />
            <path d="M12 8 L12 12 L15 14" />
          </svg>
        </div>
        <span className="mono text-[15px] font-bold uppercase tracking-[0.05em]">Sentinel</span>
        <span style={{ color: 'var(--text-secondary)' }}>· 설비 예지보전 플랫폼</span>
      </div>

      <h1 className="mt-8 max-w-xl text-[42px] font-bold leading-tight tracking-tight">
        설비가 멈추기 전에,
        <br />
        <span style={{ color: 'var(--accent)' }}>먼저 압니다.</span>
      </h1>
      <p className="mt-4 max-w-lg text-[16px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        센서 데이터 기반 이상탐지와 고장 예측으로, 계획되지 않은 설비 정지를 &lsquo;계획된 정비&rsquo;로 바꾸는 예지보전
        플랫폼입니다.
      </p>

      <div className="mt-10 grid grid-cols-3 gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            className="surface-card flex flex-col gap-2 border p-5"
            style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 + i * 0.08 }}
          >
            <span className="text-[12px] tracking-[0.02em]" style={{ color: 'var(--text-muted)' }}>
              {s.label}
            </span>
            <span className="mono text-[26px] font-bold">{s.value}</span>
            <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              예시 지표 · 파일럿 데이터 확보 후 교체 예정
            </span>
          </motion.div>
        ))}
      </div>

      <div
        className="mt-14 flex flex-row items-center justify-between border-t pt-8"
        style={{ borderColor: 'var(--border)' }}
      >
        <Link
          to="/dashboard"
          className="cta-primary px-5 py-3 text-[14px] font-semibold no-underline"
          style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
        >
          라이브 대시보드 보기 →
        </Link>
        <div className="mono flex flex-row gap-2">
          {['Python', 'Pandas / scikit-learn', 'FastAPI', 'React'].map((t) => (
            <span
              key={t}
              className="border px-3 py-1.5 text-[11.5px]"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', borderRadius: 'var(--radius)' }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
