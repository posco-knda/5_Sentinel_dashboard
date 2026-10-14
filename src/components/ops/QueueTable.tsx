import { useNavigate } from 'react-router-dom'
import { Badge } from '../Badge'
import { PlanControl } from './PlanControl'
import { UrgencyChip } from './UrgencyChip'
import { LEVEL, daysText, deadlineText, limitDate, requestDate, type FleetEngine } from '../../lib/fleet'

/** 정비 요청이 필요한 엔진 표 — 현황과 정비 계획이 함께 쓴다. 행을 누르면 엔진 상세로 간다. */
export function QueueTable({ engines, withDates = false, empty = '해당하는 엔진이 없습니다' }: { engines: FleetEngine[]; withDates?: boolean; empty?: string }) {
  const nav = useNavigate()
  const heads = ['엔진', '긴급도', '알림 등급', '남은 수명', withDates ? '정비 요청 기한' : '요청 기한', ...(withDates ? ['가동 한계 예상'] : []), '점검 예상 모듈', '처리']
  const cell = { borderBottom: '1px solid var(--border-soft)' }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr>
            {heads.map((h) => (
              <th key={h} className="whitespace-nowrap border-b px-3 py-2.5 text-left text-[11.5px] font-semibold" style={{ color: 'var(--text-muted)', borderColor: 'var(--border-strong)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {engines.map((e) => (
            <tr key={e.unit} onClick={() => nav(`/equipment/engine-${e.unit}`)} className="cursor-pointer" tabIndex={0} onKeyDown={(ev) => ev.key === 'Enter' && nav(`/equipment/engine-${e.unit}`)}>
              <td className="mono px-3 py-3 text-[13px] font-semibold" style={{ ...cell, color: 'var(--text-primary)' }}>#{e.unit}</td>
              <td className="px-3 py-3" style={cell}><UrgencyChip urgency={e.urgency} /></td>
              <td className="px-3 py-3" style={cell}><Badge status={LEVEL[e.level].badge} /></td>
              <td className="px-3 py-3 text-[13px]" style={{ ...cell, color: 'var(--text-primary)' }}>
                <span className="mono font-medium">{e.pred}</span> cycle
                <span className="ml-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{daysText(e.daysLeft)}</span>
              </td>
              <td className="px-3 py-3 text-[13px]" style={{ ...cell, color: e.requestIn <= 0 ? 'var(--status-critical)' : 'var(--text-primary)', fontWeight: e.requestIn <= 7 ? 600 : 400 }}>
                {deadlineText(e.requestIn)}
                {withDates && <span className="mono ml-1.5 text-[11.5px] font-normal" style={{ color: 'var(--text-muted)' }}>{requestDate(e.requestIn).slice(5).replace('-', '/')}</span>}
              </td>
              {withDates && <td className="mono px-3 py-3 text-[12.5px]" style={{ ...cell, color: 'var(--text-secondary)' }}>{limitDate(e.daysLeft).slice(5).replace('-', '/')}</td>}
              <td className="px-3 py-3 text-[12.5px]" style={{ ...cell, color: e.topPart ? 'var(--text-secondary)' : 'var(--text-muted)' }}>{e.topPart ? e.topPart.label : '뚜렷한 변화 없음'}</td>
              <td className="px-3 py-3" style={cell}><PlanControl engine={e} /></td>
            </tr>
          ))}
          {!engines.length && (
            <tr>
              <td colSpan={heads.length} className="py-10 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>{empty}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
