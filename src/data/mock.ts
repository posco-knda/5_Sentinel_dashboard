export type Status = 'good' | 'warning' | 'serious' | 'critical'

export const statusLabel: Record<Status, string> = {
  good: '정상',
  warning: '주의',
  serious: '경고',
  critical: '위험',
}

/** 대시보드 상단 메인 차트: Stand 3 압연력(force) 추이 — 스크러버 시각(hour)에 따른 값.
 *  실제 데이터 연결 시 tcm5_dataset_*.csv의 force_3 컬럼(시간순 리샘플)으로 교체. */
export const sensorSeries = [
  { t: '00:00', h: 0, v: 3.1 },
  { t: '02:00', h: 2, v: 3.4 },
  { t: '04:00', h: 4, v: 3.0 },
  { t: '06:00', h: 6, v: 3.6 },
  { t: '08:00', h: 8, v: 3.3 },
  { t: '10:00', h: 10, v: 3.8 },
  { t: '12:00', h: 12, v: 4.5 },
  { t: '14:00', h: 14, v: 6.8 },
  { t: '15:00', h: 15, v: 9.2 },
  { t: '16:00', h: 16, v: 9.8 },
  { t: '17:00', h: 17, v: 8.4 },
  { t: '18:00', h: 18, v: 6.0 },
  { t: '20:00', h: 20, v: 3.9 },
  { t: '22:00', h: 22, v: 3.5 },
  { t: '24:00', h: 24, v: 3.2 },
]

export const anomalyWindow = { start: 14, end: 18 }

export function formatHour(h: number): string {
  const hh = Math.floor(h) % 24
  const mm = Math.round((h - Math.floor(h)) * 60)
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function parseTimeToHour(time: string): number {
  const [hh, mm] = time.split(':').map(Number)
  return hh + mm / 60
}

/** sensorSeries의 두 점 사이를 선형보간해서 임의의 시각의 압연력(force) 값을 계산 */
export function getVibrationAtHour(hour: number): number {
  const clamped = Math.max(0, Math.min(24, hour))
  for (let i = 0; i < sensorSeries.length - 1; i++) {
    const a = sensorSeries[i]
    const b = sensorSeries[i + 1]
    if (clamped >= a.h && clamped <= b.h) {
      const frac = (clamped - a.h) / (b.h - a.h)
      return a.v + (b.v - a.v) * frac
    }
  }
  return sensorSeries[sensorSeries.length - 1].v
}

export interface EquipmentRow {
  id: string
  name: string
  health: number
  status: Status
}

/** 5단 텐덤 라인의 스탠드 1·2·4·5 — Stand 3(아래 getEquipmentRankingAtHour에서 실시간 계산)를
 *  제외한 나머지는 고정값. 실제 연결 시 스탠드별 Anomaly_* 라벨 집계로 교체. */
const baseEquipment: EquipmentRow[] = [
  { id: 'stand-1', name: 'Stand 1', health: 41, status: 'warning' },
  { id: 'stand-2', name: 'Stand 2', health: 58, status: 'warning' },
  { id: 'stand-4', name: 'Stand 4', health: 76, status: 'good' },
  { id: 'stand-5', name: 'Stand 5', health: 91, status: 'good' },
]

function statusFromHealth(health: number): Status {
  if (health < 30) return 'critical'
  if (health < 60) return 'warning'
  return 'good'
}

/** 스크러버 시각(hour)에 따라 Stand 3의 헬스가 실시간으로 악화되는 것처럼 계산.
 *  압연력(force) 값에서 직접 유도해서 센서 차트와 항상 일관되게 맞춰줍니다. */
export function getEquipmentRankingAtHour(hour: number): EquipmentRow[] {
  const force = getVibrationAtHour(hour)
  const stand3Health = Math.max(0, Math.min(100, Math.round(100 - force * 8)))
  const stand3: EquipmentRow = {
    id: 'stand-3',
    name: 'Stand 3',
    health: stand3Health,
    status: statusFromHealth(stand3Health),
  }
  return [stand3, ...baseEquipment].sort((a, b) => a.health - b.health)
}

export const equipmentRanking = getEquipmentRankingAtHour(24)

export interface AlertRow {
  time: string
  equipment: string
  sensor: string
  severity: Status
  action: string
}

/** 실제 연결 시 Anomaly_Reduction / Anomaly_Electric_1~5 / Anomaly_Bearing_1~5 /
 *  Anomaly_WorkRoll_1~5 라벨이 True로 바뀌는 시점을 시간순으로 뽑아 교체. */
export const alertLog: AlertRow[] = [
  { time: '14:12', equipment: 'Stand 3', sensor: 'Force', severity: 'critical', action: '확인 필요' },
  { time: '13:47', equipment: 'Stand 1', sensor: 'Tension', severity: 'warning', action: '모니터링 중' },
  { time: '11:05', equipment: 'Stand 2', sensor: 'Torque', severity: 'warning', action: '모니터링 중' },
  { time: '09:32', equipment: 'Stand 4', sensor: 'Force', severity: 'good', action: '조치 완료' },
  { time: '08:58', equipment: 'Stand 5', sensor: 'Motor Power', severity: 'good', action: '조치 완료' },
]

/** 스크러버가 아직 지나가지 않은 시각의 알림은 "아직 발생 전"으로 취급해서 숨깁니다. */
export function getAlertsUpToHour(hour: number): AlertRow[] {
  return alertLog.filter((a) => parseTimeToHour(a.time) <= hour)
}

export const kpis = {
  totalEquipment: 5,
  riskEquipment: 3,
  avgHealth: 82.4,
  todayAlerts: 7,
  alertsDelta: 2,
}

export function getKpisAtHour(hour: number) {
  const ranking = getEquipmentRankingAtHour(hour)
  const riskEquipment = ranking.filter((e) => e.status === 'critical').length
  const avgHealth = ranking.reduce((s, e) => s + e.health, 0) / ranking.length
  const todayAlerts = getAlertsUpToHour(hour).length
  return {
    totalEquipment: kpis.totalEquipment,
    riskEquipment,
    avgHealth,
    todayAlerts,
    alertsDelta: kpis.alertsDelta,
  }
}

/** 설비 상세 페이지: 기본 정보 (Stand 3 기준) */
export const equipmentInfo = {
  line: '냉간압연 5단 텐덤 라인 · Stand 3',
  installedAt: '2019-04-12',
  lastMaintenance: '2026-06-02',
  team: '설비보전 2팀',
  /** work_roll_mileage_3 누적값(km) — 리셋(=롤 교체) 전까지 누적된 거리 */
  operatingHours: 18420,
  /** 워크롤 규격 코드 (예시) */
  modelNo: 'WR-820x1550',
}

/** 설비 상세 페이지: Stand 3 공정변수 최근 72시간 추이 (스크러버와는 별개의 고정 이력 데이터).
 *  실제 연결 시 tcm5_dataset_*.csv의 torque_3 / tension_3 / motor_power_3 컬럼으로 교체. */
export const sensorTrend72h = {
  torque_3: [
    { h: 0, v: 3.2 }, { h: 12, v: 3.4 }, { h: 24, v: 3.1 }, { h: 36, v: 3.6 },
    { h: 48, v: 4.0 }, { h: 60, v: 5.4 }, { h: 66, v: 7.8 }, { h: 72, v: 9.8 },
  ],
  motor_power_3: [
    { h: 0, v: 58 }, { h: 12, v: 59 }, { h: 24, v: 57 }, { h: 36, v: 60 },
    { h: 48, v: 62 }, { h: 60, v: 66 }, { h: 66, v: 69 }, { h: 72, v: 71.2 },
  ],
  tension_3: [
    { h: 0, v: 6.1 }, { h: 12, v: 6.2 }, { h: 24, v: 6.0 }, { h: 36, v: 6.3 },
    { h: 48, v: 6.2 }, { h: 60, v: 6.3 }, { h: 66, v: 6.4 }, { h: 72, v: 6.4 },
  ],
}

/** 설비 상세 페이지: 워크롤 잔존 마일리지 예측(RUL) — Weibull AFT 기반 생존곡선.
 *  km = 앞으로 더 탈 수 있는 마일리지. km 0 = 현재 시점(= 마지막 롤 교체 이후 누적 지점). */
export const survivalCurve = [
  { km: 0, median: 1.0, lower: 1.0, upper: 1.0 },
  { km: 10, median: 0.94, lower: 0.88, upper: 0.98 },
  { km: 20, median: 0.85, lower: 0.74, upper: 0.94 },
  { km: 30, median: 0.74, lower: 0.58, upper: 0.88 },
  { km: 40, median: 0.62, lower: 0.42, upper: 0.8 },
  { km: 50, median: 0.5, lower: 0.29, upper: 0.71 },
  { km: 60, median: 0.38, lower: 0.18, upper: 0.61 },
  { km: 70, median: 0.28, lower: 0.11, upper: 0.51 },
  { km: 80, median: 0.19, lower: 0.06, upper: 0.41 },
  { km: 90, median: 0.13, lower: 0.03, upper: 0.32 },
  { km: 100, median: 0.08, lower: 0.01, upper: 0.24 },
  { km: 120, median: 0.03, lower: 0, upper: 0.13 },
  { km: 140, median: 0.01, lower: 0, upper: 0.06 },
]
export const predictedRulMileage = { median: 60, lower: 40, upper: 90 }

/** 설비 상세 페이지: 이상탐지 baseline 모델 성능 (Anomaly_Bearing_3 라벨 기준 홀드아웃 테스트셋, 예시 값) */
export const classifierMetrics = { precision: 0.91, recall: 0.87, f1: 0.89 }

export interface MaintenanceEvent {
  date: string
  type: string
  description: string
  status: 'done' | 'scheduled'
}

/** 설비 상세 페이지: 최근 롤 교체 이력 — work_roll_mileage_3가 0으로 리셋되는 지점을
 *  "롤 교체 이벤트"로 변환한 것. */
export const maintenanceHistory: MaintenanceEvent[] = [
  { date: '2026-08-25', type: '예정', description: 'RUL 예측 기반 — 잔존 마일리지 소진 임박, 워크롤 교체 권고', status: 'scheduled' },
  { date: '2026-06-02', type: '롤 교체', description: '워크롤 마일리지 리셋 — 정상 교체', status: 'done' },
  { date: '2026-03-14', type: '점검', description: 'Stand 3 텐션 센서 점검, 이상 없음', status: 'done' },
  { date: '2025-12-01', type: '롤 교체', description: '워크롤 마일리지 리셋 — 정상 교체', status: 'done' },
]

/** 설비 상세 페이지: 이상탐지 기여 요인 — Anomaly_Bearing_3 분류에 대한 특성 기여도 (예시 값) */
export const featureImportance = [
  { label: 'Force 변동성 (압연력)', value: 0.42 },
  { label: 'Torque 변화율 (토크)', value: 0.27 },
  { label: 'Tension 편차 (텐션)', value: 0.18 },
  { label: 'Work Roll Mileage (누적 마일리지)', value: 0.13 },
]

export const scenarioCompare = [
  { metric: '평균 정지시간 (시간/월)', asIs: 18, toBe: 6 },
  { metric: '정비 비용 (백만원/월)', asIs: 42, toBe: 31 },
  { metric: '생산차질 손실 (백만원/월)', asIs: 65, toBe: 12 },
]
