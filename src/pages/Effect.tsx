import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { PageHead } from '../components/PageHead'
import { Panel } from '../components/Panel'
import { PolicyCompare } from '../components/ops/PolicyCompare'
import { RoiReference } from '../components/ops/RoiReference'
import { eok, summarize } from '../lib/cost'
import { useFleet } from '../lib/fleet'
import { usePlan } from '../lib/plan'
import { COST_PRESET_LABEL, useSettings } from '../lib/settings'

function Tile({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div className="surface-card flex flex-col gap-1 border px-4 py-3.5" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
      <span className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="mono text-[24px] font-semibold leading-tight" style={{ color: color ?? 'var(--text-primary)' }}>{value}</span>
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{sub}</span>
    </div>
  )
}

const day = (t: number | null) => (t ? new Date(t).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' }) : '—')
const th = 'whitespace-nowrap px-3 py-2 text-left text-[11.5px] font-semibold'

/** 정비 효과 — 이 시스템으로 처리한 정비가 만든 효과(추정)와, 앞으로 계획대로 처리했을 때/방치했을 때의 차이 */
export function Effect() {
  const fleet = useFleet()
  const plan = usePlan()
  const { settings } = useSettings()
  const s = useMemo(() => summarize(fleet, plan.items, settings), [fleet, plan.items, settings])
  const maxBar = Math.max(1, ...s.horizons.flatMap((h) => [h.neglect, h.waste]))

  return (
    <div className="flex flex-col gap-5">
      <PageHead title="정비 효과" sub={<>예측에 따라 미리 정비해서 고장 후 처리 대비 아낀 금액(추정)입니다. 단가는 <Link to="/settings" className="underline">설정의 비용 기준</Link>({COST_PRESET_LABEL[settings.costPreset]})을 따릅니다.</>} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="지금까지 얻은 효과" value={eok(s.doneGain)} sub={`정비 완료 ${s.done.length}건 · 보수적으로 ${eok(s.doneGainLow)}`} color="var(--status-good)" />
        <Tile label="진행 중 (정비 예정·결재 대기)" value={eok(s.pending.gain)} sub={`${s.pending.n}건 · 계획대로 끝나면 얻을 효과`} color="var(--accent)" />
        <Tile label="방치 시 위험 (30일 기대 손실)" value={eok(s.neglected.exposure)} sub={`기한이 지났는데 아직 처리 전인 ${s.neglected.n}대`} color="var(--status-critical)" />
        <Tile label="비용 기준" value={`계획 ${settings.cost.planned}억`} sub={`비계획 ×${settings.cost.ratio} · 운항 중단 ${settings.cost.lossPerDay}억/일`} />
      </div>

      <PolicyCompare />

      <Panel title="앞으로 처리했을 때와 방치했을 때" sub="남은 수명이 그 기간 안에 다하는 엔진 기준 · 계획대로 처리하면 순이득 = 방치 시 추가 비용 − 일찍 교체해 버리는 값">
        <div className="flex flex-col gap-4">
          {s.horizons.map((h) => (
            <div key={h.days} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[150px_1fr]">
              <div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>앞으로 {h.days}일</div>
                <div className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>정비가 필요한 엔진 {h.n}대</div>
              </div>
              <div className="flex flex-col gap-1.5">
                {[
                  { label: '방치하면 추가 비용', v: h.neglect, color: 'var(--status-critical)', note: '이 기간 안에 고장 날 확률로 가중한 기댓값' },
                  { label: '일찍 교체해 버리는 값', v: h.waste, color: 'var(--text-muted)', note: '남은 수명을 다 쓰지 못하고 교체하는 몫' },
                  { label: '계획대로 처리하면', v: h.gain, color: 'var(--status-good)', note: `순이득 · 보수적으로 ${eok(h.gainLow)}` },
                ].map((r) => (
                  <div key={r.label} className="flex flex-row items-center gap-3">
                    <span className="w-[132px] shrink-0 text-[12px]" style={{ color: 'var(--text-secondary)' }}>{r.label}</span>
                    <div className="h-3.5 flex-1" style={{ background: 'var(--surface-2)', borderRadius: 3 }}>
                      <div className="h-full" style={{ width: `${Math.max(1, (r.v / maxBar) * 100)}%`, background: r.color, borderRadius: 3, transition: 'width .4s' }} />
                    </div>
                    <span className="mono w-[128px] shrink-0 text-right text-[12.5px] font-semibold" style={{ color: r.color === 'var(--status-good)' ? 'var(--status-good)' : 'var(--text-primary)' }} title={r.note}>{eok(r.v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="정비 완료 내역" sub="고장까지 운용했다면 대비 · 순이득 = 회피한 추가 비용 − 일찍 교체해서 버린 잔여 수명의 값">
        {s.done.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-strong)' }}>
                  {['엔진', '완료', '남은 수명', '회피한 추가 비용', '버려진 잔여 수명', '순이득'].map((h) => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {s.done.map((r) => (
                  <tr key={r.unit} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                    <td className="px-3 py-2 text-[13px] font-medium"><Link to={`/equipment/engine-${r.unit}`} className="no-underline" style={{ color: 'var(--text-primary)' }}>Engine #{r.unit}</Link></td>
                    <td className="mono px-3 py-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{day(r.at)}</td>
                    <td className="mono px-3 py-2 text-[12.5px]">{Math.round(r.pred)} cycle</td>
                    <td className="mono px-3 py-2 text-[12.5px]">{eok(r.avoided)}</td>
                    <td className="mono px-3 py-2 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>−{eok(r.waste)}</td>
                    <td className="mono px-3 py-2 text-[13px] font-semibold" style={{ color: 'var(--status-good)' }}>{eok(r.gain)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>아직 정비가 완료된 엔진이 없습니다. 정비를 마치면 여기에 효과가 쌓입니다.</p>
        )}
      </Panel>

      <p className="m-0 text-[11.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        ※ 모두 추정입니다. "고장까지 운용했다면"이라는 가정과 모델의 고장 확률(과거 검증 오차 기준)로 계산했고, 실제로 고장이 났을지는 확인할 수 없습니다. 보수적 수치는 고장 후 추가 비용의 60%만 인정한 값입니다.
        단가는 공개 자료 기반 가정값이며 설정에서 바꿀 수 있습니다.
      </p>

      <details className="surface-card border" style={{ background: 'var(--surface-1)', borderColor: 'var(--border)' }}>
        <summary className="cursor-pointer px-5 py-3.5 text-[13px] font-semibold" style={{ color: 'var(--text-secondary)' }}>도입 효과 참고 (엔진 1,000대 규모 가정 비교)</summary>
        <div className="px-5 pb-5">
          <RoiReference />
        </div>
      </details>
    </div>
  )
}
