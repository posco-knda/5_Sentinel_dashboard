// ⚠️ 자동 생성 파일 — analysis/src/export_dashboard.py 가 만든다. 직접 고치지 말고 파이썬을 다시 돌릴 것.
// 대시보드 src/data/mock.ts 와 같은 이름의 export를 제공한다. (mock.ts 자리에 그대로 복사해서 쓰면 됨)
// 원본 CSV에 시각이 없어서 '시간'은 코일 번호(생산 순서)다.

export type Status = 'good' | 'warning' | 'serious' | 'critical'

export const statusLabel: Record<Status, string> = {
  good: '정상',
  warning: '주의',
  serious: '경고',
  critical: '위험',
}

export const dataMeta = {
  "generatedAt": "2026-09-22T09:49:29",
  "dataset": 6,
  "startRow": 16289,
  "endRow": 16313,
  "note": "원본 CSV에 시각 정보가 없어 시간축은 생산 순서(코일 번호). 비용·정지시간은 가정값(analysis/src/cost.py).",
  "costAssumptions": {
    "WorkRoll": {
      "hours_planned": 1.0,
      "hours_unplanned": 4.0,
      "repair_planned": 500.0
    },
    "Bearing": {
      "hours_planned": 2.0,
      "hours_unplanned": 8.0,
      "repair_planned": 2000.0
    },
    "Electric": {
      "hours_planned": 2.0,
      "hours_unplanned": 6.0,
      "repair_planned": 1500.0
    },
    "Reduction": {
      "hours_planned": 0.0,
      "hours_unplanned": 0.0,
      "repair_planned": 0.0
    },
    "downtime_cost_per_hour": 5000.0,
    "repair_unplanned_ratio": 4.5,
    "coil_loss": 150.0,
    "false_alarm_hours": 0.25,
    "false_alarm_labor": 100.0,
    "unplanned_hours_multiplier": 1.0
  }
}

/** 메인 차트: Stand 3 압연력(force, MN) 추이 — h = 창 안의 코일 순서(0~24) */
export const sensorSeries: { t: string; h: number; v: number }[] = [{"t": "#16289", "h": 0, "v": 6.538},
   {"t": "#16290", "h": 1, "v": 7.072},
   {"t": "#16291", "h": 2, "v": 6.734},
   {"t": "#16292", "h": 3, "v": 3.944},
   {"t": "#16293", "h": 4, "v": 3.959},
   {"t": "#16294", "h": 5, "v": 3.936},
   {"t": "#16295", "h": 6, "v": 4.1},
   {"t": "#16296", "h": 7, "v": 6.373},
   {"t": "#16297", "h": 8, "v": 5.936},
   {"t": "#16298", "h": 9, "v": 6.363},
   {"t": "#16299", "h": 10, "v": 6.098},
   {"t": "#16300", "h": 11, "v": 6.981},
   {"t": "#16301", "h": 12, "v": 6.946},
   {"t": "#16302", "h": 13, "v": 7.281},
   {"t": "#16303", "h": 14, "v": 8.37},
   {"t": "#16304", "h": 15, "v": 8.404},
   {"t": "#16305", "h": 16, "v": 8.567},
   {"t": "#16306", "h": 17, "v": 8.109},
   {"t": "#16307", "h": 18, "v": 8.457},
   {"t": "#16308", "h": 19, "v": 8.269},
   {"t": "#16309", "h": 20, "v": 6.452},
   {"t": "#16310", "h": 21, "v": 6.304},
   {"t": "#16311", "h": 22, "v": 6.279},
   {"t": "#16312", "h": 23, "v": 6.152},
   {"t": "#16313", "h": 24, "v": 5.799}]

export const anomalyWindow = {"start": 14, "end": 20}

const START_ROW: number = 16289

export function formatHour(h: number): string {
  return `코일 #${START_ROW + Math.round(h)}`
}

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

/** 스탠드별 헬스 점수(0~100) 시계열. 정의: 100 × (1 − (0.7 × 최근 이상 증거 + 0.3 × 롤 마모 진행도)) */
const standHealth: Record<string, number[]> = {"stand-1": [79, 79, 79, 78, 78, 78, 77, 77, 77, 76, 76, 6, 6, 5, 5, 5, 5, 4, 4, 4, 3, 3, 73, 72, 72],
   "stand-2": [96, 96, 96, 95, 95, 95, 94, 94, 93, 93, 93, 92, 92, 91, 91, 91, 90, 90, 90, 89, 89, 89, 88, 88, 88],
   "stand-3": [76, 75, 75, 74, 75, 74, 74, 73, 73, 72, 72, 70, 70, 69, 30, 30, 29, 29, 28, 28, 27, 30, 30, 70, 88],
   "stand-4": [79, 80, 79, 78, 78, 77, 78, 77, 77, 76, 75, 73, 73, 72, 72, 72, 71, 71, 70, 70, 69, 69, 100, 98, 98],
   "stand-5": [73, 73, 73, 71, 71, 70, 70, 70, 99, 98, 98, 96, 95, 95, 95, 96, 95, 94, 94, 92, 91, 91, 92, 91, 90]}

function statusFromHealth(health: number): Status {
  if (health < 30) return 'critical'
  if (health < 60) return 'warning'
  return 'good'
}

export function getEquipmentRankingAtHour(hour: number): EquipmentRow[] {
  const h = Math.max(0, Math.min(24, hour))
  const lo = Math.floor(h)
  const hi = Math.min(24, lo + 1)
  const frac = h - lo
  return Object.keys(standHealth)
    .map((id) => {
      const arr = standHealth[id]
      const health = Math.max(0, Math.min(100, Math.round(arr[lo] + (arr[hi] - arr[lo]) * frac)))
      return { id, name: `Stand ${id.split('-')[1]}`, health, status: statusFromHealth(health) }
    })
    .sort((a, b) => a.health - b.health)
}

export const equipmentRanking = getEquipmentRankingAtHour(24)

export interface AlertRow {
  time: string
  h: number
  equipment: string
  sensor: string
  severity: Status
  action: string
  type?: string
}

/** 모델(RandomForest)이 경보를 낸 시점. 창 안에서 시간순의 반대(최신이 위). */
export const alertLog: AlertRow[] = [
  {
    "h": 14,
    "time": "코일 #16303",
    "equipment": "Stand 3",
    "sensor": "Force",
    "severity": "critical",
    "action": "롤 교체 검토",
    "type": "WorkRoll"
  },
  {
    "h": 11,
    "time": "코일 #16300",
    "equipment": "Stand 1",
    "sensor": "Motor Power",
    "severity": "warning",
    "action": "전동기 점검",
    "type": "Electric"
  }
]

export function getAlertsUpToHour(hour: number): AlertRow[] {
  return alertLog.filter((a) => a.h <= hour)
}

export const kpis = {
  totalEquipment: 5,
  riskEquipment: equipmentRanking.filter((e) => e.status === 'critical').length,
  avgHealth: equipmentRanking.reduce((s, e) => s + e.health, 0) / equipmentRanking.length,
  todayAlerts: alertLog.length,
  alertsDelta: 0,
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

export const equipmentInfo = {
  "line": "냉간압연 5단 텐덤 라인 · Stand 3",
  "installedAt": "—(데이터에 없음)",
  "lastMaintenance": "코일 #16310",
  "team": "—",
  "operatingHours": 4.6,
  "modelNo": "Ø561mm"
}

/** 공정변수 추이(72코일 구간을 9점으로). 단위: torque kN·m, motor_power kW, tension kN */
export const sensorTrend72h = {
  "torque_3": [
    {
      "h": 0,
      "v": 66.98
    },
    {
      "h": 9,
      "v": 61.72
    },
    {
      "h": 18,
      "v": 69.65
    },
    {
      "h": 27,
      "v": 69.54
    },
    {
      "h": 36,
      "v": 84.02
    },
    {
      "h": 45,
      "v": 60.35
    },
    {
      "h": 54,
      "v": 52.8
    },
    {
      "h": 63,
      "v": 88.95
    },
    {
      "h": 72,
      "v": 66.75
    }
  ],
  "motor_power_3": [
    {
      "h": 0,
      "v": 3472.5
    },
    {
      "h": 9,
      "v": 2821.4
    },
    {
      "h": 18,
      "v": 3854.9
    },
    {
      "h": 27,
      "v": 4075.0
    },
    {
      "h": 36,
      "v": 2627.8
    },
    {
      "h": 45,
      "v": 2984.1
    },
    {
      "h": 54,
      "v": 1786.2
    },
    {
      "h": 63,
      "v": 4122.3
    },
    {
      "h": 72,
      "v": 3189.8
    }
  ],
  "tension_3": [
    {
      "h": 0,
      "v": 120.69
    },
    {
      "h": 9,
      "v": 130.84
    },
    {
      "h": 18,
      "v": 99.53
    },
    {
      "h": 27,
      "v": 122.35
    },
    {
      "h": 36,
      "v": 288.85
    },
    {
      "h": 45,
      "v": 134.21
    },
    {
      "h": 54,
      "v": 141.21
    },
    {
      "h": 63,
      "v": 196.62
    },
    {
      "h": 72,
      "v": 178.87
    }
  ]
}

/** 각 지표의 단위와 차트 축 범위 (실제 값 크기에 맞춤) */
export const trendMeta: Record<string, { unit: string; domain: [number, number] }> = {
  "force_3": {
    "unit": "MN",
    "domain": [
      0,
      12
    ]
  },
  "torque_3": {
    "unit": "kN·m",
    "domain": [
      47.0,
      95.0
    ]
  },
  "motor_power_3": {
    "unit": "kW",
    "domain": [
      1435.0,
      4473.0
    ]
  },
  "tension_3": {
    "unit": "kN",
    "domain": [
      71.0,
      318.0
    ]
  }
}

/** 지금 롤 나이에서 '앞으로 km(마일리지) 더 쓸 때까지 아직 쓰고 있을 확률' (부트스트랩 90% 구간) */
export const survivalCurve = [
  {
    "km": 0,
    "median": 1.0,
    "lower": 1.0,
    "upper": 1.0
  },
  {
    "km": 10,
    "median": 0.9792,
    "lower": 0.9764,
    "upper": 0.982
  },
  {
    "km": 20,
    "median": 0.9743,
    "lower": 0.9714,
    "upper": 0.9777
  },
  {
    "km": 30,
    "median": 0.9743,
    "lower": 0.9714,
    "upper": 0.9777
  },
  {
    "km": 40,
    "median": 0.9743,
    "lower": 0.9714,
    "upper": 0.9777
  },
  {
    "km": 50,
    "median": 0.9743,
    "lower": 0.9714,
    "upper": 0.9777
  },
  {
    "km": 60,
    "median": 0.9743,
    "lower": 0.9714,
    "upper": 0.9777
  },
  {
    "km": 70,
    "median": 0.9743,
    "lower": 0.9714,
    "upper": 0.9777
  },
  {
    "km": 80,
    "median": 0.9743,
    "lower": 0.9714,
    "upper": 0.9777
  },
  {
    "km": 90,
    "median": 0.9743,
    "lower": 0.9714,
    "upper": 0.9777
  },
  {
    "km": 100,
    "median": 0.9743,
    "lower": 0.9714,
    "upper": 0.9777
  },
  {
    "km": 120,
    "median": 0.0,
    "lower": 0.0,
    "upper": 0.0
  },
  {
    "km": 140,
    "median": 0.0,
    "lower": 0.0,
    "upper": 0.0
  }
]
export const predictedRulMileage = {"median": 114.4, "lower": 112.6, "upper": 115.3}

/** 이상탐지(RandomForest, Anomaly_Bearing_3) 시험 구간 성능 */
export const classifierMetrics = {"precision": 0.979, "recall": 1.0, "f1": 0.989}

export interface MaintenanceEvent {
  date: string
  type: string
  description: string
  status: 'done' | 'scheduled'
}

export const maintenanceHistory: MaintenanceEvent[] = [
  {
    "date": "코일 #16374",
    "type": "예정",
    "description": "RUL 예측 기반 — 남은 마일리지 약 114 소진 시 워크롤 교체 권고",
    "status": "scheduled"
  },
  {
    "date": "코일 #16310",
    "type": "롤 교체",
    "description": "워크롤 마일리지 리셋 — 조기 교체(작업롤 이상) · 직전 롤 사용 10",
    "status": "done"
  },
  {
    "date": "코일 #16303",
    "type": "롤 교체",
    "description": "워크롤 마일리지 리셋 — 정상 교체 · 직전 롤 사용 118",
    "status": "done"
  },
  {
    "date": "코일 #16241",
    "type": "롤 교체",
    "description": "워크롤 마일리지 리셋 — 정상 교체 · 직전 롤 사용 119",
    "status": "done"
  }
]

export const featureImportance = [
  {
    "label": "Torque 관련 (토크·토크 잔차)",
    "value": 0.919
  },
  {
    "label": "Motor Power 관련 (전력·효율)",
    "value": 0.034
  },
  {
    "label": "운전 조건 (속도·틈·두께·폭)",
    "value": 0.023
  },
  {
    "label": "Force 관련 (압연력·압연력 잔차)",
    "value": 0.012
  }
]

/** AS-IS(사후정비) vs TO-BE(예지보전). 비용은 가정값 기반 시뮬레이션 (코일 1,000개당) */
export const scenarioCompare = [
  {
    "metric": "평균 정지시간 (시간/1,000코일)",
    "asIs": 41.5,
    "toBe": 12.0
  },
  {
    "metric": "정비 비용 (억원/1,000코일)",
    "asIs": 4.3,
    "toBe": 1.0
  },
  {
    "metric": "생산차질 손실 (억원/1,000코일)",
    "asIs": 21.5,
    "toBe": 6.3
  }
]

export const savingsSummary = {
  "perThousandCoilsEok": 18.4,
  "savingRatePct": 71.6,
  "anomalyCoilReductionPct": 80.1,
  "note": "코일 1,000개당 값. 연간 환산은 실제 현장의 이상 발생 빈도를 알아야 의미가 있어서(시뮬레이션은 코일의 약 5%가 이상) 일부러 하지 않음."
}

/** 시험 구간의 이상 사건 요약 + 비용 가정. 시나리오 화면의 슬라이더가 이 값으로 AS-IS/TO-BE 비용을 다시 계산한다.
 *  (계산식은 analysis/src/cost.py 와 같다. 금액 단위 = 만원, 시간 단위 = h) */
export const costModel = {
  "nCoils": 16005,
  "general": {
    "downtimeCostPerHour": 5000.0,
    "repairUnplannedRatio": 4.5,
    "coilLoss": 150.0,
    "falseAlarmHours": 0.25,
    "falseAlarmLabor": 100.0
  },
  "types": {
    "Electric": {
      "episodes": 38,
      "detected": 38,
      "missed": 0,
      "falseAlarms": 0,
      "anomalyCoils": 226,
      "detectedCoils": 39,
      "missedCoils": 0,
      "hoursPlanned": 2.0,
      "hoursUnplanned": 6.0,
      "repairPlanned": 1500.0
    },
    "Bearing": {
      "episodes": 41,
      "detected": 40,
      "missed": 1,
      "falseAlarms": 2,
      "anomalyCoils": 158,
      "detectedCoils": 45,
      "missedCoils": 3,
      "hoursPlanned": 2.0,
      "hoursUnplanned": 8.0,
      "repairPlanned": 2000.0
    },
    "WorkRoll": {
      "episodes": 27,
      "detected": 27,
      "missed": 0,
      "falseAlarms": 2,
      "anomalyCoils": 189,
      "detectedCoils": 27,
      "missedCoils": 0,
      "hoursPlanned": 1.0,
      "hoursUnplanned": 4.0,
      "repairPlanned": 500.0
    },
    "Reduction": {
      "episodes": 192,
      "detected": 186,
      "missed": 6,
      "falseAlarms": 3,
      "anomalyCoils": 194,
      "detectedCoils": 186,
      "missedCoils": 6,
      "hoursPlanned": 0.0,
      "hoursUnplanned": 0.0,
      "repairPlanned": 0.0
    }
  }
}
