import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Panel } from "../components/Panel";
import { PageHead } from '../components/PageHead'
import { analysisExtras } from "../data/analysisExtras";
import { daysText, useFleet } from "../lib/fleet";
import { usePlan } from "../lib/plan";
import { resetUrgentBaseline } from "../lib/autoAlert";
import { useTheme, type ThemeMode } from "../theme/theme";
import { COST_LIMITS, COST_PRESETS, COST_PRESET_LABEL, DEFAULT_SETTINGS, LIMITS, useSettings, type CostBasis, type CostPreset } from "../lib/settings";

interface SweepRow {
  n: number;
  tp: number;
  fn: number;
  fp: number;
  cost15: number;
  fail: number;
}
const policy = analysisExtras.policy as unknown as {
  gruSweep: SweepRow[];
  testN: { danger: number; safe: number };
};
const gruMae =
  (
    analysisExtras.models as unknown as { name: string; testMae: number }[]
  ).find((m) => m.name.startsWith("GRU"))?.testMae ?? 0;

const row = (n: number) =>
  policy.gruSweep.find((r) => r.n === n) ?? policy.gruSweep[0];
const base = row(DEFAULT_SETTINGS.dangerN);

/** 이 민감도에서 기대되는 효과 — 과거 검증 결과 기준 */
function effect(n: number) {
  const r = row(n);
  return {
    catchRate: (r.tp / (r.tp + r.fn)) * 100,
    falsePer100: (r.fp / policy.testN.safe) * 100,
    failure: r.fail * 100,
    cost: (r.cost15 / base.cost15 - 1) * 100,
  };
}

const PRESETS = [
  { n: 40, name: "표준", desc: "불필요한 점검을 가장 적게" },
  { n: 42, name: "민감", desc: "놓침을 줄이고 점검은 조금 늘림" },
  { n: 46, name: "매우 민감", desc: "놓침을 최소로, 점검 증가 감수" },
];

function Slider({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  format,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  format: (v: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row items-baseline justify-between gap-3">
        <span
          className="text-[13px] font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {label}
        </span>
        <span
          className="mono text-[13px] font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        className="range-input"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      <span className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>
        {hint}
      </span>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span
        className="mono text-[14px] font-semibold"
        style={{ color: tone ?? "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

type Link = {
  state: "checking" | "ok" | "dev";
  slack: boolean;
  /** 결재 알림 채널: 별도 웹훅이면 separate, 정비 알림 채널과 같으면 shared */
  approvals: "separate" | "shared" | null;
  ai: boolean;
  provider?: string;
};

function Status({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className="inline-flex flex-row items-center gap-1.5 text-[12.5px] font-medium"
      style={{ color: on ? "var(--status-good)" : "var(--text-muted)" }}
    >
      <span
        className="h-2 w-2 rounded-full"
        style={{
          background: on ? "var(--status-good)" : "var(--border-strong)",
        }}
      />
      {label}
    </span>
  );
}

function Switch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative h-6 w-11 shrink-0 border"
      style={{
        background: on ? "var(--accent)" : "var(--surface-2)",
        borderColor: on ? "var(--accent)" : "var(--border-strong)",
        borderRadius: 999,
        transition: "background .15s",
      }}
    >
      <span
        className="absolute top-0.5 h-[18px] w-[18px] rounded-full"
        style={{
          left: on ? 22 : 2,
          background: on ? "var(--accent-ink)" : "var(--text-muted)",
          transition: "left .15s",
        }}
      />
    </button>
  );
}

const THEME_OPTIONS: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "라이트" },
  { id: "dark", label: "다크" },
  { id: "system", label: "시스템 설정" },
];

function ThemePicker() {
  const { mode, setMode } = useTheme();
  return (
    <div className="flex flex-col gap-2.5">
      <div
        role="radiogroup"
        aria-label="화면 테마"
        className="inline-flex w-fit flex-row border p-0.5"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface-2)",
          borderRadius: "var(--radius-pill)",
        }}
      >
        {THEME_OPTIONS.map((o) => {
          const active = mode === o.id;
          return (
            <button
              key={o.id}
              role="radio"
              aria-checked={active}
              onClick={() => setMode(o.id)}
              className="px-4 py-1.5 text-[12.5px] font-medium"
              style={{
                borderRadius: "var(--radius-pill)",
                background: active ? "var(--accent)" : "transparent",
                color: active ? "var(--accent-ink)" : "var(--text-secondary)",
                transition: "background .15s, color .15s",
              }}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {mode === "system" && (
        <span className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>
          기기의 라이트/다크 설정을 따릅니다.
        </span>
      )}
    </div>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderBottom: "1px solid var(--border-soft)" }}
    >
      <div>
        <div
          className="text-[13px] font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          {title}
        </div>
        <div className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>
          {desc}
        </div>
      </div>
      {children}
    </div>
  );
}

const COST_FIELDS: { key: keyof CostBasis; label: string; hint: string; unit: string; step: number }[] = [
  { key: "planned", label: "계획 정비 1건", hint: "엔진을 미리 입고시켜 정비하는 비용", unit: "억원", step: 1 },
  { key: "ratio", label: "비계획 정비 배율", hint: "고장 난 뒤 처리하면 계획 정비의 몇 배인가", unit: "배", step: 0.1 },
  { key: "lossPerDay", label: "운항 중단 손실", hint: "항공기가 멈춰 있는 하루당 손실", unit: "억원/일", step: 0.1 },
  { key: "downDays", label: "비계획 중단 일수", hint: "고장 때 운항이 멈추는 기간", unit: "일", step: 0.5 },
  { key: "extra", label: "부대 비용", hint: "긴급 물류·야간 인력·항공기 재배치 (건당)", unit: "억원", step: 0.1 },
  { key: "lifeCycles", label: "엔진 통상 수명", hint: "일찍 교체해서 버려지는 잔여 수명을 값으로 바꿀 때 쓰는 기준", unit: "cycle", step: 10 },
];

/** 정비 효과(/cost) 화면이 쓰는 비용 가정. 공개 자료의 범위에서 고른 값이라 항공사 계약에 맞게 고쳐 쓴다 */
function CostBasisPanel() {
  const { settings, update } = useSettings();
  const c = settings.cost;
  const pick = (p: "narrow" | "wide") => update({ costPreset: p, cost: COST_PRESETS[p] });
  const edit = (key: keyof CostBasis, v: number) => update({ costPreset: "custom", cost: { ...c, [key]: v } });
  const presets: CostPreset[] = ["narrow", "wide"];
  return (
    <Panel
      title="비용 기준"
      sub="정비 효과 금액을 계산할 때 쓰는 가정값입니다. 항공사·기종·정비 계약마다 다르니 실제 기준으로 고쳐 쓰세요"
    >
      <div className="mb-3 flex flex-row flex-wrap items-center gap-2">
        {presets.map((p) => {
          const active = settings.costPreset === p;
          return (
            <button
              key={p}
              onClick={() => pick(p as "narrow" | "wide")}
              className="border px-3 py-1.5 text-[12.5px]"
              style={{
                borderRadius: "var(--radius-pill)",
                borderColor: active ? "var(--accent)" : "var(--border)",
                background: active ? "var(--accent-dim)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
              }}
            >
              {COST_PRESET_LABEL[p]}
            </button>
          );
        })}
        {settings.costPreset === "custom" && (
          <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            직접 입력한 값을 쓰는 중
          </span>
        )}
      </div>
      {COST_FIELDS.map((f) => (
        <Row key={f.key} title={f.label} desc={f.hint}>
          <label className="flex flex-row items-center gap-2 text-[12.5px]" style={{ color: "var(--text-muted)" }}>
            <input
              type="number"
              value={c[f.key]}
              min={COST_LIMITS[f.key][0]}
              max={COST_LIMITS[f.key][1]}
              step={f.step}
              onChange={(e) => e.target.value !== "" && edit(f.key, Number(e.target.value))}
              className="mono w-24 border px-3 py-1.5 text-right text-[13px]"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)", color: "var(--text-primary)", borderRadius: "var(--radius-pill)" }}
            />
            <span className="w-14">{f.unit}</span>
          </label>
        </Row>
      ))}
      <p className="mb-0 mt-3 text-[11.5px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
        기본값은 공개 자료의 범위에서 고른 가정값입니다(1달러 = 1,400원 환산). 협동체 엔진 입고 약 $1.5M~4M, 비계획 정비는 계획보다 30~50% 비쌈, 엔진 사고로 인한 운항 중단 손실 하루 약 $50K~150K 수준으로 보았습니다.
        실제 금액은 정비 계약에 따라 크게 다를 수 있습니다.
      </p>
    </Panel>
  );
}

export function Settings() {
  const { settings, update, reset } = useSettings();
  const plan = usePlan();
  const fleet = useFleet();
  const [link, setLink] = useState<Link>({
    state: "checking",
    slack: false,
    approvals: null,
    ai: false,
  });

  // 서버 기능(/api/status)이 있는 배포 환경인지, 있다면 무엇이 연결돼 있는지 확인한다
  const probe = (): Promise<Link> =>
    fetch("/api/status")
      .then(async (r) => {
        if (!(r.headers.get("content-type") ?? "").includes("json"))
          throw new Error("no-api");
        const d = (await r.json()) as {
          slack?: boolean;
          slackApprovals?: "separate" | "shared" | null;
          ai?: boolean;
          aiProvider?: string;
        };
        return {
          state: "ok",
          slack: !!d.slack,
          approvals: d.slackApprovals ?? null,
          ai: !!d.ai,
          provider: d.aiProvider,
        } as Link;
      })
      .catch((): Link => ({ state: "dev", slack: false, approvals: null, ai: false }));

  useEffect(() => {
    let alive = true;
    probe().then((l) => alive && setLink(l));
    return () => {
      alive = false;
    };
  }, []);
  const check = () => {
    setLink((l) => ({ ...l, state: "checking" }));
    probe().then(setLink);
  };

  const eff = effect(settings.dangerN);
  const redCount = useMemo(
    () => fleet.filter((e) => e.level === "red").length,
    [fleet],
  );
  const doneCount = Object.values(plan.items).filter(
    (i) => i.status === "done",
  ).length;
  const marked = Object.keys(plan.items).length;

  return (
    <div className="flex flex-col gap-5">
      <PageHead title="설정" sub="이 기준에 따라 모든 화면의 등급과 정비 요청 기한이 다시 계산됩니다. 설정은 이 브라우저에 저장됩니다." />

      <Panel title="화면">
        <div className="flex flex-col gap-2 py-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div
              className="text-[13px] font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              화면 테마
            </div>
            <div
              className="text-[11.5px]"
              style={{ color: "var(--text-muted)" }}
            >
              이 브라우저에 저장됩니다. 인쇄·PDF 저장은 항상 라이트로 나옵니다
            </div>
          </div>
          <ThemePicker />
        </div>
      </Panel>

      <Panel
        title="알림 민감도"
        sub="예측 남은 수명이 몇 cycle 이하이면 '위험'으로 알릴지 정합니다. 높일수록 놓칠 위험은 줄고 불필요한 점검은 늘어납니다."
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PRESETS.map((p) => {
            const active = settings.dangerN === p.n;
            const e = effect(p.n);
            return (
              <button
                key={p.n}
                onClick={() => update({ dangerN: p.n })}
                className="flex flex-col gap-2 border p-4 text-left"
                style={{
                  background: active ? "var(--accent-dim)" : "var(--page)",
                  borderColor: active ? "var(--accent)" : "var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <div className="flex flex-row items-center justify-between">
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {p.name}
                  </span>
                  <span
                    className="mono text-[12px]"
                    style={{
                      color: active ? "var(--accent)" : "var(--text-muted)",
                    }}
                  >
                    ≤ {p.n} cycle
                  </span>
                </div>
                <span
                  className="text-[12px]"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {p.desc}
                </span>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <Metric
                    label="위험 엔진 포착"
                    value={`${e.catchRate.toFixed(0)}%`}
                  />
                  <Metric
                    label="안전 엔진 오경보"
                    value={`${e.falsePer100.toFixed(1)}%`}
                  />
                </div>
              </button>
            );
          })}
        </div>

        <div
          className="mt-5 flex flex-col gap-4 border-t pt-4"
          style={{ borderColor: "var(--border-soft)" }}
        >
          <Slider
            label="직접 지정"
            hint="예측 남은 수명이 이 값 이하이면 위험"
            value={settings.dangerN}
            onChange={(v) => update({ dangerN: v })}
            min={LIMITS.dangerN[0]}
            max={LIMITS.dangerN[1]}
            format={(v) => `≤ ${v} cycle`}
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric
              label="위험 엔진 포착률"
              value={`${eff.catchRate.toFixed(0)}%`}
            />
            <Metric
              label="안전 엔진 오경보율"
              value={`${eff.falsePer100.toFixed(1)}%`}
            />
            <Metric
              label="정비 전 고장 확률"
              value={`${eff.failure.toFixed(2)}%`}
            />
            <Metric
              label="정비 비용(표준 대비)"
              value={`${eff.cost >= 0 ? "+" : ""}${eff.cost.toFixed(1)}%`}
              tone={eff.cost > 3 ? "var(--status-warning)" : undefined}
            />
          </div>
          <p
            className="m-0 text-[12px]"
            style={{ color: "var(--text-secondary)" }}
          >
            지금 플릿에서는{" "}
            <b style={{ color: "var(--text-primary)" }}>{redCount}대</b>가
            위험으로 분류됩니다. 위 효과는 과거 검증 데이터(위험{" "}
            {policy.testN.danger}대·안전 {policy.testN.safe}대) 기준 추정이며,
            정비 전 고장·비용은 정비 준비 7일 등을 가정한 값입니다.
          </p>
        </div>
      </Panel>

      <Panel
        title="운항·정비 기준"
        sub="남은 수명(cycle)을 일 단위로 바꾸고 정비 요청 기한을 정하는 데 씁니다."
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Slider
            label="엔진당 하루 비행 횟수"
            hint={`남은 수명 40 cycle ≈ ${daysText(40 / settings.cyclesPerDay)}`}
            value={settings.cyclesPerDay}
            onChange={(v) => update({ cyclesPerDay: v })}
            min={LIMITS.cyclesPerDay[0]}
            max={LIMITS.cyclesPerDay[1]}
            format={(v) => `${v}회/일`}
          />
          <Slider
            label="정비 준비 기간"
            hint="정비를 요청한 뒤 부품·인력이 갖춰지기까지 걸리는 기간"
            value={settings.prepDays}
            onChange={(v) => update({ prepDays: v })}
            min={LIMITS.prepDays[0]}
            max={LIMITS.prepDays[1]}
            format={(v) => `${v}일`}
          />
          <Slider
            label="하루 정비 가능 대수"
            hint="같은 날 정비 예정으로 잡을 수 있는 엔진 수. 가득 찬 날은 예약할 수 없고, 정비는 다음 주부터 평일에만 잡습니다"
            value={settings.slotsPerDay}
            onChange={(v) => update({ slotsPerDay: v })}
            min={LIMITS.slotsPerDay[0]}
            max={LIMITS.slotsPerDay[1]}
            format={(v) => `${v}대/일`}
          />
        </div>
      </Panel>

      <Panel
        title="연동"
        sub="알림과 AI 요약은 서버 기능입니다. 배포 환경의 환경변수가 설정돼 있으면 연결됩니다."
        action={
          <button
            onClick={check}
            className="border px-3 py-1.5 text-[12px] font-medium"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-pill)",
            }}
          >
            상태 확인
          </button>
        }
      >
        <Row
          title="Slack 정비 알림"
          desc="엔진 위험 감지와 신규 즉시 조치를 이 채널로 보냅니다 · SLACK_WEBHOOK_URL"
        >
          {link.state === "checking" ? (
            <span
              className="text-[12.5px]"
              style={{ color: "var(--text-muted)" }}
            >
              확인 중…
            </span>
          ) : (
            <Status
              on={link.slack}
              label={
                link.slack
                  ? "연결됨"
                  : link.state === "dev"
                    ? "서버 기능 없음 (개발 모드)"
                    : "미연결"
              }
            />
          )}
        </Row>
        <Row
          title="Slack 결재 알림"
          desc="결재 요청·승인·반려·정비 완료를 보냅니다 · SLACK_APPROVAL_WEBHOOK_URL (없으면 정비 알림 채널로 함께 보냄)"
        >
          {link.state === "checking" ? (
            <span
              className="text-[12.5px]"
              style={{ color: "var(--text-muted)" }}
            >
              확인 중…
            </span>
          ) : (
            <Status
              on={link.approvals !== null}
              label={
                link.approvals === "separate"
                  ? "연결됨 · 별도 채널"
                  : link.approvals === "shared"
                    ? "정비 알림 채널과 같은 곳으로 전송"
                    : link.state === "dev"
                      ? "서버 기능 없음 (개발 모드)"
                      : "미연결"
              }
            />
          )}
        </Row>
        <Row
          title="AI 요약"
          desc="리포트의 요약을 생성형 AI로 다시 씁니다 · GEMINI_API_KEY(무료 한도 있음) 또는 ANTHROPIC_API_KEY"
        >
          {link.state === "checking" ? (
            <span
              className="text-[12.5px]"
              style={{ color: "var(--text-muted)" }}
            >
              확인 중…
            </span>
          ) : (
            <Status
              on={link.ai}
              label={
                link.ai
                  ? `연결됨${link.provider === "gemini" ? " · Gemini" : link.provider === "claude" ? " · Claude" : ""}`
                  : link.state === "dev"
                    ? "서버 기능 없음 (개발 모드)"
                    : "미연결"
              }
            />
          )}
        </Row>
      </Panel>

      <Panel
        title="자동 알림"
        sub="Slack이 연결돼 있으면 아래 상황에서 사람이 누르지 않아도 알림이 갑니다."
      >
        <Row
          title="결재 알림"
          desc="결재 요청, 승인, 반려, 정비 완료가 처리될 때 결재 알림 채널로 알립니다"
        >
          <Switch
            on={settings.notifyWorkflow}
            onChange={(v) => update({ notifyWorkflow: v })}
            label="결재 알림"
          />
        </Row>
        <Row
          title="신규 즉시 조치 알림"
          desc="엔진이 새로 '즉시 조치'가 되면 정비 알림 채널로 한 건으로 묶어 알립니다. 이미 알린 엔진은 다시 보내지 않습니다"
        >
          <Switch
            on={settings.notifyUrgent}
            onChange={(v) => update({ notifyUrgent: v })}
            label="신규 즉시 조치 알림"
          />
        </Row>
      </Panel>

      <Panel title="예측 정보">
        <ul
          className="m-0 flex list-disc flex-col gap-2 pl-5 text-[12.5px] leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          <li>
            엔진의 센서 15개를 시계열 신경망(GRU)에 넣어 남은 수명(cycle)을
            예측합니다. 비행 후 데이터가 들어올 때마다 갱신됩니다.
          </li>
          <li>
            예측의 평균 오차는 약 {gruMae.toFixed(0)} cycle(
            {daysText(gruMae / settings.cyclesPerDay)})입니다. 그래서 날짜
            하나가 아니라 90% 구간을 함께 보여 줍니다.
          </li>
          <li>
            센서 변화로 가리키는 점검 모듈은 가장 크게 변한 센서가 속한 모듈을
            추정한 것이며, 고장 원인을 확정하지 않습니다.
          </li>
        </ul>
      </Panel>

      <CostBasisPanel />

      <Panel title="데이터 관리">
        <Row
          title="운영 이력을 처음 상태로"
          desc="검토·결재·정비 이력을 처음 열었을 때의 상태로 되돌립니다. 지금까지 처리한 내용은 사라집니다"
        >
          <button
            onClick={() =>
              window.confirm(
                "검토·결재·정비 이력을 처음 열었을 때의 상태로 되돌릴까요? 지금까지 처리한 내용은 사라집니다.",
              ) && plan.restoreSeed()
            }
            className="border px-3 py-1.5 text-[12px] font-medium"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-pill)",
            }}
          >
            되돌리기
          </button>
        </Row>
        <Row
          title="결재·처리 기록 모두 지우기"
          desc={`검토·결재·정비 이력이 있는 엔진 ${marked}대 (완료 ${doneCount}대)`}
        >
          <button
            onClick={() =>
              window.confirm(
                "결재 요청·승인 이력을 포함한 모든 처리 기록을 지울까요? 되돌릴 수 없습니다.",
              ) && plan.clearAll()
            }
            disabled={!marked}
            className="border px-3 py-1.5 text-[12px] font-medium"
            style={{
              borderColor: "var(--border)",
              color: marked ? "var(--status-critical)" : "var(--text-muted)",
              borderRadius: "var(--radius-pill)",
              opacity: marked ? 1 : 0.6,
            }}
          >
            기록 지우기
          </button>
        </Row>
        <Row
          title="알림 기준 다시 잡기"
          desc="지금 '즉시 조치'인 엔진을 모두 이미 알린 것으로 보고 새로 시작합니다"
        >
          <button
            onClick={resetUrgentBaseline}
            className="border px-3 py-1.5 text-[12px] font-medium"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-pill)",
            }}
          >
            다시 잡기
          </button>
        </Row>
        <Row
          title="설정 기본값으로"
          desc={`민감도 ≤${DEFAULT_SETTINGS.dangerN} · 하루 ${DEFAULT_SETTINGS.cyclesPerDay}회 · 준비 ${DEFAULT_SETTINGS.prepDays}일 · 하루 정비 ${DEFAULT_SETTINGS.slotsPerDay}대`}
        >
          <button
            onClick={reset}
            className="border px-3 py-1.5 text-[12px] font-medium"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              borderRadius: "var(--radius-pill)",
            }}
          >
            초기화
          </button>
        </Row>
      </Panel>
    </div>
  );
}
