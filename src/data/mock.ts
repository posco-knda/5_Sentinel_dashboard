// ⚠️ 자동 생성 파일 — sentinel_project/scripts/08_export_dashboard_ts.py 가 만든다.
// 직접 고치지 말고 파이썬 파이프라인을 다시 돌려서 새로 받아올 것.
// 원본 데이터: C-MAPSS FD001 (NASA 터보팬 엔진 열화 시뮬레이션), 모델: LSTM Seq2Seq
// (docs/DESIGN_DECISIONS.md, docs/DATA_MAPPING.md 참고)
// 시간축은 엔진 운행 '사이클(cycle)' 입니다 (기존 '코일 번호' 대체).

export type Status = 'good' | 'warning' | 'serious' | 'critical'

export const statusLabel: Record<Status, string> = {
  good: '정상',
  warning: '주의',
  serious: '경고',
  critical: '위험',
}

export const dataMeta = {
  "generatedAt": "2026-09-28T16:43:05",
  "dataset": "C-MAPSS FD001",
  "testEngines": 100,
  "selectedEngines": [
    34,
    42,
    81,
    76,
    37,
    56,
    18,
    43,
    47
  ],
  "featuredEngine": 37,
  "note": "시간축은 엔진 운행 사이클(cycle). 위험 등급(RED/YELLOW/GREEN)은 예측 RUL 기준(<20/<60/그 외). 비용·정비시간은 가정값(파이썬 스크립트 cost_model 참고), 탐지 성능(TP/FN/FP)은 LSTM 모델의 실제 test set 결과."
}

/** 메인 차트: 대표 엔진(#37)의 예측 RUL 추이 — h = 창 안의 사이클 순서(0~24) */
export const sensorSeries: { t: string; h: number; v: number }[] = [
  {
    "t": "#97",
    "h": 0,
    "v": 77.92
  },
  {
    "t": "#98",
    "h": 1,
    "v": 73.7
  },
  {
    "t": "#99",
    "h": 2,
    "v": 70.51
  },
  {
    "t": "#100",
    "h": 3,
    "v": 67.86
  },
  {
    "t": "#101",
    "h": 4,
    "v": 63.5
  },
  {
    "t": "#102",
    "h": 5,
    "v": 63.45
  },
  {
    "t": "#103",
    "h": 6,
    "v": 68.99
  },
  {
    "t": "#104",
    "h": 7,
    "v": 63.52
  },
  {
    "t": "#105",
    "h": 8,
    "v": 60.02
  },
  {
    "t": "#106",
    "h": 9,
    "v": 57.43
  },
  {
    "t": "#107",
    "h": 10,
    "v": 59.74
  },
  {
    "t": "#108",
    "h": 11,
    "v": 44.06
  },
  {
    "t": "#109",
    "h": 12,
    "v": 36.03
  },
  {
    "t": "#110",
    "h": 13,
    "v": 31.63
  },
  {
    "t": "#111",
    "h": 14,
    "v": 23.96
  },
  {
    "t": "#112",
    "h": 15,
    "v": 20.07
  },
  {
    "t": "#113",
    "h": 16,
    "v": 15.3
  },
  {
    "t": "#114",
    "h": 17,
    "v": 13.69
  },
  {
    "t": "#115",
    "h": 18,
    "v": 12.66
  },
  {
    "t": "#116",
    "h": 19,
    "v": 14.0
  },
  {
    "t": "#117",
    "h": 20,
    "v": 13.3
  },
  {
    "t": "#118",
    "h": 21,
    "v": 12.98
  },
  {
    "t": "#119",
    "h": 22,
    "v": 13.05
  },
  {
    "t": "#120",
    "h": 23,
    "v": 14.85
  },
  {
    "t": "#121",
    "h": 24,
    "v": 15.61
  }
]

export const anomalyWindow = {
  "start": 16,
  "end": 24
}

const START_CYCLE: number = 97

export function formatHour(h: number): string {
  return `cycle #${START_CYCLE + Math.round(h)}`
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

/** 선택된 9개 엔진의 헬스 점수(0~100) = 100 × (예측 RUL / 125).
 *  참고: 원본(TCM)과 달리 각 엔진은 서로 독립된 운행 이력이라 '공유된 시간축'이 없어서,
 *  스크러버(hour)에 따라 순위가 실시간으로 바뀌지는 않고 마지막 관측 시점 기준 스냅샷입니다. */
const equipmentRankingStatic: EquipmentRow[] = [
  {
    "id": "engine-34",
    "name": "Engine #34",
    "health": 8,
    "status": "critical"
  },
  {
    "id": "engine-42",
    "name": "Engine #42",
    "health": 8,
    "status": "critical"
  },
  {
    "id": "engine-81",
    "name": "Engine #81",
    "health": 9,
    "status": "critical"
  },
  {
    "id": "engine-76",
    "name": "Engine #76",
    "health": 9,
    "status": "critical"
  },
  {
    "id": "engine-37",
    "name": "Engine #37",
    "health": 12,
    "status": "critical"
  },
  {
    "id": "engine-56",
    "name": "Engine #56",
    "health": 18,
    "status": "warning"
  },
  {
    "id": "engine-18",
    "name": "Engine #18",
    "health": 19,
    "status": "warning"
  },
  {
    "id": "engine-43",
    "name": "Engine #43",
    "health": 49,
    "status": "good"
  },
  {
    "id": "engine-47",
    "name": "Engine #47",
    "health": 100,
    "status": "good"
  }
]

export function getEquipmentRankingAtHour(_hour: number): EquipmentRow[] {
  return equipmentRankingStatic
}

export const equipmentRanking = equipmentRankingStatic

export interface AlertRow {
  time: string
  h: number
  equipment: string
  sensor: string
  severity: Status
  action: string
  type?: string
}

/** 대표 엔진(#37)의 예측 RUL이 주의(60미만)/위험(20미만) 임계값을 넘은 시점 — 실제 계산값 */
export const alertLog: AlertRow[] = [
  {
    "h": 16,
    "time": "cycle #113",
    "equipment": "Engine #37",
    "sensor": "예측 RUL",
    "severity": "critical",
    "action": "정비 일정 즉시 수립",
    "type": "EngineRemoval"
  },
  {
    "h": 9,
    "time": "cycle #106",
    "equipment": "Engine #37",
    "sensor": "예측 RUL",
    "severity": "warning",
    "action": "정비 계획 준비",
    "type": "EngineRemoval"
  }
]

export function getAlertsUpToHour(hour: number): AlertRow[] {
  return alertLog.filter((a) => a.h <= hour)
}

export const kpis = {
  totalEquipment: 9,
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

// ---------------------------------------------------------------------------
// 엔진별 상세 데이터 (설비 상세 페이지 — /equipment/:id 로 조회)
// ---------------------------------------------------------------------------
export interface EngineDetail {
  equipmentInfo: { line: string; installedAt: string; lastMaintenance: string; team: string; operatingHours: number; modelNo: string }
  predictedRulCycle: { median: number; lower: number; upper: number }
  survivalCurve: { cycle: number; median: number; lower: number; upper: number }[]
  sensorTrend: Record<string, { h: number; v: number }[]>
  maintenanceHistory: { date: string; type: string; description: string; status: 'done' | 'scheduled' }[]
  status: Status
  health: number
}

export const engineDetails: Record<string, EngineDetail> = {
  "engine-34": {
    "equipmentInfo": {
      "line": "터보팬 엔진 · C-MAPSS FD001 (운전조건 1종)",
      "installedAt": "—(데이터에 없음)",
      "lastMaintenance": "—(단일 run-to-failure 데이터, 실제 교체 이력 없음)",
      "team": "5조 감시자들",
      "operatingHours": 203,
      "modelNo": "Turbofan (FD001)"
    },
    "predictedRulCycle": {
      "median": 9.5,
      "lower": 0.0,
      "upper": 35.1
    },
    "survivalCurve": [
      {
        "cycle": 0,
        "median": 1.0,
        "lower": 1.0,
        "upper": 1.0
      },
      {
        "cycle": 10,
        "median": 0.7619,
        "lower": 0.6429,
        "upper": 0.8571
      },
      {
        "cycle": 20,
        "median": 0.619,
        "lower": 0.5,
        "upper": 0.7381
      },
      {
        "cycle": 30,
        "median": 0.5,
        "lower": 0.381,
        "upper": 0.619
      },
      {
        "cycle": 40,
        "median": 0.4048,
        "lower": 0.2857,
        "upper": 0.5238
      },
      {
        "cycle": 60,
        "median": 0.3095,
        "lower": 0.1905,
        "upper": 0.4286
      },
      {
        "cycle": 80,
        "median": 0.1429,
        "lower": 0.0702,
        "upper": 0.2381
      },
      {
        "cycle": 100,
        "median": 0.0952,
        "lower": 0.0238,
        "upper": 0.1667
      },
      {
        "cycle": 120,
        "median": 0.0714,
        "lower": 0.0238,
        "upper": 0.1429
      },
      {
        "cycle": 140,
        "median": 0.0238,
        "lower": 0.0,
        "upper": 0.0714
      }
    ],
    "sensorTrend": {
      "s4": [
        {
          "h": 1,
          "v": 1402.56
        },
        {
          "h": 26,
          "v": 1387.99
        },
        {
          "h": 51,
          "v": 1395.88
        },
        {
          "h": 77,
          "v": 1405.09
        },
        {
          "h": 102,
          "v": 1393.27
        },
        {
          "h": 127,
          "v": 1402.14
        },
        {
          "h": 153,
          "v": 1406.22
        },
        {
          "h": 178,
          "v": 1416.91
        },
        {
          "h": 203,
          "v": 1427.49
        }
      ],
      "s9": [
        {
          "h": 1,
          "v": 9071.43
        },
        {
          "h": 26,
          "v": 9059.68
        },
        {
          "h": 51,
          "v": 9068.14
        },
        {
          "h": 77,
          "v": 9070.73
        },
        {
          "h": 102,
          "v": 9061.87
        },
        {
          "h": 127,
          "v": 9067.89
        },
        {
          "h": 153,
          "v": 9051.18
        },
        {
          "h": 178,
          "v": 9056.19
        },
        {
          "h": 203,
          "v": 9036.27
        }
      ],
      "s3": [
        {
          "h": 1,
          "v": 1574.94
        },
        {
          "h": 26,
          "v": 1586.31
        },
        {
          "h": 51,
          "v": 1578.49
        },
        {
          "h": 77,
          "v": 1583.53
        },
        {
          "h": 102,
          "v": 1591.2
        },
        {
          "h": 127,
          "v": 1586.2
        },
        {
          "h": 153,
          "v": 1588.56
        },
        {
          "h": 178,
          "v": 1594.82
        },
        {
          "h": 203,
          "v": 1600.38
        }
      ]
    },
    "maintenanceHistory": [
      {
        "date": "cycle #203 시점 예측",
        "type": "예정",
        "description": "RUL 예측 기반 — 잔존 약 9.5 사이클 소진 시 정비 권고 (신뢰구간 0.0~35.1)",
        "status": "scheduled"
      }
    ],
    "status": "critical",
    "health": 8
  },
  "engine-42": {
    "equipmentInfo": {
      "line": "터보팬 엔진 · C-MAPSS FD001 (운전조건 1종)",
      "installedAt": "—(데이터에 없음)",
      "lastMaintenance": "—(단일 run-to-failure 데이터, 실제 교체 이력 없음)",
      "team": "5조 감시자들",
      "operatingHours": 156,
      "modelNo": "Turbofan (FD001)"
    },
    "predictedRulCycle": {
      "median": 10.0,
      "lower": 0.0,
      "upper": 35.6
    },
    "survivalCurve": [
      {
        "cycle": 0,
        "median": 0.9775,
        "lower": 0.9551,
        "upper": 1.0
      },
      {
        "cycle": 10,
        "median": 0.8989,
        "lower": 0.8427,
        "upper": 0.9438
      },
      {
        "cycle": 20,
        "median": 0.8427,
        "lower": 0.7753,
        "upper": 0.8989
      },
      {
        "cycle": 30,
        "median": 0.7528,
        "lower": 0.6742,
        "upper": 0.8202
      },
      {
        "cycle": 40,
        "median": 0.5843,
        "lower": 0.5056,
        "upper": 0.6629
      },
      {
        "cycle": 60,
        "median": 0.3146,
        "lower": 0.236,
        "upper": 0.3933
      },
      {
        "cycle": 80,
        "median": 0.2135,
        "lower": 0.1461,
        "upper": 0.2815
      },
      {
        "cycle": 100,
        "median": 0.1798,
        "lower": 0.1124,
        "upper": 0.2472
      },
      {
        "cycle": 120,
        "median": 0.1011,
        "lower": 0.0562,
        "upper": 0.1573
      },
      {
        "cycle": 140,
        "median": 0.0449,
        "lower": 0.0112,
        "upper": 0.0787
      }
    ],
    "sensorTrend": {
      "s4": [
        {
          "h": 1,
          "v": 1401.03
        },
        {
          "h": 20,
          "v": 1399.05
        },
        {
          "h": 40,
          "v": 1394.26
        },
        {
          "h": 59,
          "v": 1395.43
        },
        {
          "h": 79,
          "v": 1406.66
        },
        {
          "h": 98,
          "v": 1397.51
        },
        {
          "h": 117,
          "v": 1405.5
        },
        {
          "h": 137,
          "v": 1412.28
        },
        {
          "h": 156,
          "v": 1425.12
        }
      ],
      "s9": [
        {
          "h": 1,
          "v": 9055.08
        },
        {
          "h": 20,
          "v": 9048.56
        },
        {
          "h": 40,
          "v": 9048.32
        },
        {
          "h": 59,
          "v": 9046.22
        },
        {
          "h": 79,
          "v": 9047.07
        },
        {
          "h": 98,
          "v": 9041.46
        },
        {
          "h": 117,
          "v": 9046.54
        },
        {
          "h": 137,
          "v": 9039.98
        },
        {
          "h": 156,
          "v": 9026.89
        }
      ],
      "s3": [
        {
          "h": 1,
          "v": 1586.33
        },
        {
          "h": 20,
          "v": 1589.14
        },
        {
          "h": 40,
          "v": 1590.99
        },
        {
          "h": 59,
          "v": 1590.66
        },
        {
          "h": 79,
          "v": 1589.98
        },
        {
          "h": 98,
          "v": 1583.73
        },
        {
          "h": 117,
          "v": 1594.99
        },
        {
          "h": 137,
          "v": 1591.07
        },
        {
          "h": 156,
          "v": 1599.55
        }
      ]
    },
    "maintenanceHistory": [
      {
        "date": "cycle #156 시점 예측",
        "type": "예정",
        "description": "RUL 예측 기반 — 잔존 약 10.0 사이클 소진 시 정비 권고 (신뢰구간 0.0~35.6)",
        "status": "scheduled"
      }
    ],
    "status": "critical",
    "health": 8
  },
  "engine-81": {
    "equipmentInfo": {
      "line": "터보팬 엔진 · C-MAPSS FD001 (운전조건 1종)",
      "installedAt": "—(데이터에 없음)",
      "lastMaintenance": "—(단일 run-to-failure 데이터, 실제 교체 이력 없음)",
      "team": "5조 감시자들",
      "operatingHours": 213,
      "modelNo": "Turbofan (FD001)"
    },
    "predictedRulCycle": {
      "median": 10.7,
      "lower": 0.0,
      "upper": 36.3
    },
    "survivalCurve": [
      {
        "cycle": 0,
        "median": 0.8649,
        "lower": 0.7568,
        "upper": 0.9459
      },
      {
        "cycle": 10,
        "median": 0.7027,
        "lower": 0.5676,
        "upper": 0.8108
      },
      {
        "cycle": 20,
        "median": 0.5676,
        "lower": 0.4324,
        "upper": 0.7027
      },
      {
        "cycle": 30,
        "median": 0.4595,
        "lower": 0.3243,
        "upper": 0.5946
      },
      {
        "cycle": 40,
        "median": 0.4595,
        "lower": 0.3243,
        "upper": 0.5946
      },
      {
        "cycle": 60,
        "median": 0.2973,
        "lower": 0.1892,
        "upper": 0.4324
      },
      {
        "cycle": 80,
        "median": 0.1081,
        "lower": 0.027,
        "upper": 0.1892
      },
      {
        "cycle": 100,
        "median": 0.0811,
        "lower": 0.0,
        "upper": 0.1622
      },
      {
        "cycle": 120,
        "median": 0.0811,
        "lower": 0.0,
        "upper": 0.1622
      },
      {
        "cycle": 140,
        "median": 0.027,
        "lower": 0.0,
        "upper": 0.0811
      }
    ],
    "sensorTrend": {
      "s4": [
        {
          "h": 1,
          "v": 1402.35
        },
        {
          "h": 27,
          "v": 1401.75
        },
        {
          "h": 54,
          "v": 1401.8
        },
        {
          "h": 81,
          "v": 1402.88
        },
        {
          "h": 107,
          "v": 1392.44
        },
        {
          "h": 133,
          "v": 1409.0
        },
        {
          "h": 160,
          "v": 1416.5
        },
        {
          "h": 187,
          "v": 1419.91
        },
        {
          "h": 213,
          "v": 1427.83
        }
      ],
      "s9": [
        {
          "h": 1,
          "v": 9065.91
        },
        {
          "h": 27,
          "v": 9063.92
        },
        {
          "h": 54,
          "v": 9065.22
        },
        {
          "h": 81,
          "v": 9065.01
        },
        {
          "h": 107,
          "v": 9071.65
        },
        {
          "h": 133,
          "v": 9063.52
        },
        {
          "h": 160,
          "v": 9077.21
        },
        {
          "h": 187,
          "v": 9066.9
        },
        {
          "h": 213,
          "v": 9075.26
        }
      ],
      "s3": [
        {
          "h": 1,
          "v": 1593.57
        },
        {
          "h": 27,
          "v": 1589.42
        },
        {
          "h": 54,
          "v": 1581.42
        },
        {
          "h": 81,
          "v": 1588.7
        },
        {
          "h": 107,
          "v": 1582.05
        },
        {
          "h": 133,
          "v": 1583.42
        },
        {
          "h": 160,
          "v": 1584.31
        },
        {
          "h": 187,
          "v": 1590.9
        },
        {
          "h": 213,
          "v": 1598.35
        }
      ]
    },
    "maintenanceHistory": [
      {
        "date": "cycle #213 시점 예측",
        "type": "예정",
        "description": "RUL 예측 기반 — 잔존 약 10.7 사이클 소진 시 정비 권고 (신뢰구간 0.0~36.3)",
        "status": "scheduled"
      }
    ],
    "status": "critical",
    "health": 9
  },
  "engine-76": {
    "equipmentInfo": {
      "line": "터보팬 엔진 · C-MAPSS FD001 (운전조건 1종)",
      "installedAt": "—(데이터에 없음)",
      "lastMaintenance": "—(단일 run-to-failure 데이터, 실제 교체 이력 없음)",
      "team": "5조 감시자들",
      "operatingHours": 205,
      "modelNo": "Turbofan (FD001)"
    },
    "predictedRulCycle": {
      "median": 10.9,
      "lower": 0.0,
      "upper": 36.5
    },
    "survivalCurve": [
      {
        "cycle": 0,
        "median": 1.0,
        "lower": 1.0,
        "upper": 1.0
      },
      {
        "cycle": 10,
        "median": 0.6905,
        "lower": 0.5714,
        "upper": 0.8095
      },
      {
        "cycle": 20,
        "median": 0.619,
        "lower": 0.5,
        "upper": 0.7381
      },
      {
        "cycle": 30,
        "median": 0.4524,
        "lower": 0.3333,
        "upper": 0.5714
      },
      {
        "cycle": 40,
        "median": 0.4048,
        "lower": 0.2857,
        "upper": 0.5238
      },
      {
        "cycle": 60,
        "median": 0.3095,
        "lower": 0.1905,
        "upper": 0.4286
      },
      {
        "cycle": 80,
        "median": 0.1429,
        "lower": 0.0702,
        "upper": 0.2381
      },
      {
        "cycle": 100,
        "median": 0.0952,
        "lower": 0.0238,
        "upper": 0.1667
      },
      {
        "cycle": 120,
        "median": 0.0714,
        "lower": 0.0238,
        "upper": 0.1429
      },
      {
        "cycle": 140,
        "median": 0.0238,
        "lower": 0.0,
        "upper": 0.0714
      }
    ],
    "sensorTrend": {
      "s4": [
        {
          "h": 1,
          "v": 1395.95
        },
        {
          "h": 27,
          "v": 1398.03
        },
        {
          "h": 52,
          "v": 1398.51
        },
        {
          "h": 77,
          "v": 1403.38
        },
        {
          "h": 103,
          "v": 1401.18
        },
        {
          "h": 129,
          "v": 1404.09
        },
        {
          "h": 154,
          "v": 1408.39
        },
        {
          "h": 179,
          "v": 1418.3
        },
        {
          "h": 205,
          "v": 1420.07
        }
      ],
      "s9": [
        {
          "h": 1,
          "v": 9057.45
        },
        {
          "h": 27,
          "v": 9060.68
        },
        {
          "h": 52,
          "v": 9061.38
        },
        {
          "h": 77,
          "v": 9065.54
        },
        {
          "h": 103,
          "v": 9063.56
        },
        {
          "h": 129,
          "v": 9068.19
        },
        {
          "h": 154,
          "v": 9074.13
        },
        {
          "h": 179,
          "v": 9096.17
        },
        {
          "h": 205,
          "v": 9114.99
        }
      ],
      "s3": [
        {
          "h": 1,
          "v": 1583.52
        },
        {
          "h": 27,
          "v": 1586.12
        },
        {
          "h": 52,
          "v": 1576.04
        },
        {
          "h": 77,
          "v": 1581.95
        },
        {
          "h": 103,
          "v": 1589.78
        },
        {
          "h": 129,
          "v": 1582.11
        },
        {
          "h": 154,
          "v": 1590.15
        },
        {
          "h": 179,
          "v": 1595.51
        },
        {
          "h": 205,
          "v": 1603.48
        }
      ]
    },
    "maintenanceHistory": [
      {
        "date": "cycle #205 시점 예측",
        "type": "예정",
        "description": "RUL 예측 기반 — 잔존 약 10.9 사이클 소진 시 정비 권고 (신뢰구간 0.0~36.5)",
        "status": "scheduled"
      }
    ],
    "status": "critical",
    "health": 9
  },
  "engine-37": {
    "equipmentInfo": {
      "line": "터보팬 엔진 · C-MAPSS FD001 (운전조건 1종)",
      "installedAt": "—(데이터에 없음)",
      "lastMaintenance": "—(단일 run-to-failure 데이터, 실제 교체 이력 없음)",
      "team": "5조 감시자들",
      "operatingHours": 121,
      "modelNo": "Turbofan (FD001)"
    },
    "predictedRulCycle": {
      "median": 15.6,
      "lower": 0.0,
      "upper": 41.2
    },
    "survivalCurve": [
      {
        "cycle": 0,
        "median": 1.0,
        "lower": 1.0,
        "upper": 1.0
      },
      {
        "cycle": 10,
        "median": 0.99,
        "lower": 0.97,
        "upper": 1.0
      },
      {
        "cycle": 20,
        "median": 0.96,
        "lower": 0.93,
        "upper": 0.99
      },
      {
        "cycle": 30,
        "median": 0.93,
        "lower": 0.8895,
        "upper": 0.97
      },
      {
        "cycle": 40,
        "median": 0.84,
        "lower": 0.78,
        "upper": 0.9
      },
      {
        "cycle": 60,
        "median": 0.7,
        "lower": 0.63,
        "upper": 0.77
      },
      {
        "cycle": 80,
        "median": 0.45,
        "lower": 0.37,
        "upper": 0.5305
      },
      {
        "cycle": 100,
        "median": 0.27,
        "lower": 0.2,
        "upper": 0.34
      },
      {
        "cycle": 120,
        "median": 0.17,
        "lower": 0.11,
        "upper": 0.23
      },
      {
        "cycle": 140,
        "median": 0.13,
        "lower": 0.08,
        "upper": 0.18
      }
    ],
    "sensorTrend": {
      "s4": [
        {
          "h": 1,
          "v": 1396.14
        },
        {
          "h": 16,
          "v": 1393.71
        },
        {
          "h": 31,
          "v": 1398.58
        },
        {
          "h": 46,
          "v": 1404.38
        },
        {
          "h": 61,
          "v": 1397.56
        },
        {
          "h": 76,
          "v": 1405.52
        },
        {
          "h": 91,
          "v": 1409.21
        },
        {
          "h": 106,
          "v": 1413.67
        },
        {
          "h": 121,
          "v": 1413.38
        }
      ],
      "s9": [
        {
          "h": 1,
          "v": 9051.31
        },
        {
          "h": 16,
          "v": 9052.93
        },
        {
          "h": 31,
          "v": 9059.87
        },
        {
          "h": 46,
          "v": 9059.41
        },
        {
          "h": 61,
          "v": 9049.06
        },
        {
          "h": 76,
          "v": 9052.06
        },
        {
          "h": 91,
          "v": 9053.14
        },
        {
          "h": 106,
          "v": 9049.81
        },
        {
          "h": 121,
          "v": 9041.71
        }
      ],
      "s3": [
        {
          "h": 1,
          "v": 1591.3
        },
        {
          "h": 16,
          "v": 1583.34
        },
        {
          "h": 31,
          "v": 1586.18
        },
        {
          "h": 46,
          "v": 1591.41
        },
        {
          "h": 61,
          "v": 1585.43
        },
        {
          "h": 76,
          "v": 1583.69
        },
        {
          "h": 91,
          "v": 1587.53
        },
        {
          "h": 106,
          "v": 1585.11
        },
        {
          "h": 121,
          "v": 1593.15
        }
      ]
    },
    "maintenanceHistory": [
      {
        "date": "cycle #121 시점 예측",
        "type": "예정",
        "description": "RUL 예측 기반 — 잔존 약 15.6 사이클 소진 시 정비 권고 (신뢰구간 0.0~41.2)",
        "status": "scheduled"
      }
    ],
    "status": "critical",
    "health": 12
  },
  "engine-56": {
    "equipmentInfo": {
      "line": "터보팬 엔진 · C-MAPSS FD001 (운전조건 1종)",
      "installedAt": "—(데이터에 없음)",
      "lastMaintenance": "—(단일 run-to-failure 데이터, 실제 교체 이력 없음)",
      "team": "5조 감시자들",
      "operatingHours": 136,
      "modelNo": "Turbofan (FD001)"
    },
    "predictedRulCycle": {
      "median": 22.4,
      "lower": 3.8,
      "upper": 48.0
    },
    "survivalCurve": [
      {
        "cycle": 0,
        "median": 1.0,
        "lower": 1.0,
        "upper": 1.0
      },
      {
        "cycle": 10,
        "median": 0.9796,
        "lower": 0.949,
        "upper": 1.0
      },
      {
        "cycle": 20,
        "median": 0.8878,
        "lower": 0.8367,
        "upper": 0.9388
      },
      {
        "cycle": 30,
        "median": 0.8163,
        "lower": 0.7551,
        "upper": 0.8776
      },
      {
        "cycle": 40,
        "median": 0.7653,
        "lower": 0.6939,
        "upper": 0.8265
      },
      {
        "cycle": 60,
        "median": 0.5306,
        "lower": 0.449,
        "upper": 0.6122
      },
      {
        "cycle": 80,
        "median": 0.2857,
        "lower": 0.2143,
        "upper": 0.3571
      },
      {
        "cycle": 100,
        "median": 0.1939,
        "lower": 0.1327,
        "upper": 0.2653
      },
      {
        "cycle": 120,
        "median": 0.1633,
        "lower": 0.102,
        "upper": 0.2245
      },
      {
        "cycle": 140,
        "median": 0.0918,
        "lower": 0.051,
        "upper": 0.1429
      }
    ],
    "sensorTrend": {
      "s4": [
        {
          "h": 1,
          "v": 1412.08
        },
        {
          "h": 18,
          "v": 1404.65
        },
        {
          "h": 35,
          "v": 1409.11
        },
        {
          "h": 52,
          "v": 1408.47
        },
        {
          "h": 69,
          "v": 1417.11
        },
        {
          "h": 85,
          "v": 1414.74
        },
        {
          "h": 102,
          "v": 1413.6
        },
        {
          "h": 119,
          "v": 1419.39
        },
        {
          "h": 136,
          "v": 1416.85
        }
      ],
      "s9": [
        {
          "h": 1,
          "v": 9046.05
        },
        {
          "h": 18,
          "v": 9042.96
        },
        {
          "h": 35,
          "v": 9045.08
        },
        {
          "h": 52,
          "v": 9041.58
        },
        {
          "h": 69,
          "v": 9045.47
        },
        {
          "h": 85,
          "v": 9044.9
        },
        {
          "h": 102,
          "v": 9046.23
        },
        {
          "h": 119,
          "v": 9049.07
        },
        {
          "h": 136,
          "v": 9035.55
        }
      ],
      "s3": [
        {
          "h": 1,
          "v": 1586.68
        },
        {
          "h": 18,
          "v": 1590.48
        },
        {
          "h": 35,
          "v": 1587.86
        },
        {
          "h": 52,
          "v": 1581.18
        },
        {
          "h": 69,
          "v": 1592.73
        },
        {
          "h": 85,
          "v": 1596.4
        },
        {
          "h": 102,
          "v": 1590.16
        },
        {
          "h": 119,
          "v": 1596.76
        },
        {
          "h": 136,
          "v": 1598.6
        }
      ]
    },
    "maintenanceHistory": [
      {
        "date": "cycle #136 시점 예측",
        "type": "예정",
        "description": "RUL 예측 기반 — 잔존 약 22.4 사이클 소진 시 정비 권고 (신뢰구간 3.8~48.0)",
        "status": "scheduled"
      }
    ],
    "status": "warning",
    "health": 18
  },
  "engine-18": {
    "equipmentInfo": {
      "line": "터보팬 엔진 · C-MAPSS FD001 (운전조건 1종)",
      "installedAt": "—(데이터에 없음)",
      "lastMaintenance": "—(단일 run-to-failure 데이터, 실제 교체 이력 없음)",
      "team": "5조 감시자들",
      "operatingHours": 133,
      "modelNo": "Turbofan (FD001)"
    },
    "predictedRulCycle": {
      "median": 23.5,
      "lower": 4.9,
      "upper": 49.1
    },
    "survivalCurve": [
      {
        "cycle": 0,
        "median": 1.0,
        "lower": 1.0,
        "upper": 1.0
      },
      {
        "cycle": 10,
        "median": 0.9697,
        "lower": 0.9394,
        "upper": 0.9899
      },
      {
        "cycle": 20,
        "median": 0.9293,
        "lower": 0.8889,
        "upper": 0.9697
      },
      {
        "cycle": 30,
        "median": 0.8283,
        "lower": 0.7677,
        "upper": 0.8889
      },
      {
        "cycle": 40,
        "median": 0.7677,
        "lower": 0.697,
        "upper": 0.8384
      },
      {
        "cycle": 60,
        "median": 0.596,
        "lower": 0.5152,
        "upper": 0.6768
      },
      {
        "cycle": 80,
        "median": 0.3232,
        "lower": 0.2424,
        "upper": 0.3939
      },
      {
        "cycle": 100,
        "median": 0.2121,
        "lower": 0.1414,
        "upper": 0.2828
      },
      {
        "cycle": 120,
        "median": 0.1717,
        "lower": 0.1111,
        "upper": 0.2323
      },
      {
        "cycle": 140,
        "median": 0.1111,
        "lower": 0.0606,
        "upper": 0.1616
      }
    ],
    "sensorTrend": {
      "s4": [
        {
          "h": 1,
          "v": 1395.19
        },
        {
          "h": 17,
          "v": 1398.77
        },
        {
          "h": 34,
          "v": 1395.26
        },
        {
          "h": 51,
          "v": 1408.2
        },
        {
          "h": 67,
          "v": 1392.12
        },
        {
          "h": 83,
          "v": 1402.25
        },
        {
          "h": 100,
          "v": 1399.01
        },
        {
          "h": 117,
          "v": 1410.29
        },
        {
          "h": 133,
          "v": 1419.18
        }
      ],
      "s9": [
        {
          "h": 1,
          "v": 9074.23
        },
        {
          "h": 17,
          "v": 9061.88
        },
        {
          "h": 34,
          "v": 9060.28
        },
        {
          "h": 51,
          "v": 9061.96
        },
        {
          "h": 67,
          "v": 9063.69
        },
        {
          "h": 83,
          "v": 9059.28
        },
        {
          "h": 100,
          "v": 9057.78
        },
        {
          "h": 117,
          "v": 9062.13
        },
        {
          "h": 133,
          "v": 9056.09
        }
      ],
      "s3": [
        {
          "h": 1,
          "v": 1586.9
        },
        {
          "h": 17,
          "v": 1590.23
        },
        {
          "h": 34,
          "v": 1591.52
        },
        {
          "h": 51,
          "v": 1583.99
        },
        {
          "h": 67,
          "v": 1586.89
        },
        {
          "h": 83,
          "v": 1593.37
        },
        {
          "h": 100,
          "v": 1593.49
        },
        {
          "h": 117,
          "v": 1591.96
        },
        {
          "h": 133,
          "v": 1600.45
        }
      ]
    },
    "maintenanceHistory": [
      {
        "date": "cycle #133 시점 예측",
        "type": "예정",
        "description": "RUL 예측 기반 — 잔존 약 23.5 사이클 소진 시 정비 권고 (신뢰구간 4.9~49.1)",
        "status": "scheduled"
      }
    ],
    "status": "warning",
    "health": 19
  },
  "engine-43": {
    "equipmentInfo": {
      "line": "터보팬 엔진 · C-MAPSS FD001 (운전조건 1종)",
      "installedAt": "—(데이터에 없음)",
      "lastMaintenance": "—(단일 run-to-failure 데이터, 실제 교체 이력 없음)",
      "team": "5조 감시자들",
      "operatingHours": 172,
      "modelNo": "Turbofan (FD001)"
    },
    "predictedRulCycle": {
      "median": 61.6,
      "lower": 43.0,
      "upper": 87.2
    },
    "survivalCurve": [
      {
        "cycle": 0,
        "median": 0.987,
        "lower": 0.961,
        "upper": 1.0
      },
      {
        "cycle": 10,
        "median": 0.9091,
        "lower": 0.8442,
        "upper": 0.961
      },
      {
        "cycle": 20,
        "median": 0.7792,
        "lower": 0.7013,
        "upper": 0.8571
      },
      {
        "cycle": 30,
        "median": 0.5455,
        "lower": 0.4545,
        "upper": 0.6364
      },
      {
        "cycle": 40,
        "median": 0.4805,
        "lower": 0.3896,
        "upper": 0.5714
      },
      {
        "cycle": 60,
        "median": 0.2727,
        "lower": 0.1948,
        "upper": 0.3636
      },
      {
        "cycle": 80,
        "median": 0.2208,
        "lower": 0.1429,
        "upper": 0.2987
      },
      {
        "cycle": 100,
        "median": 0.1429,
        "lower": 0.0779,
        "upper": 0.2078
      },
      {
        "cycle": 120,
        "median": 0.0649,
        "lower": 0.026,
        "upper": 0.1169
      },
      {
        "cycle": 140,
        "median": 0.0519,
        "lower": 0.013,
        "upper": 0.1039
      }
    ],
    "sensorTrend": {
      "s4": [
        {
          "h": 1,
          "v": 1402.16
        },
        {
          "h": 22,
          "v": 1402.72
        },
        {
          "h": 44,
          "v": 1401.53
        },
        {
          "h": 65,
          "v": 1404.99
        },
        {
          "h": 87,
          "v": 1402.32
        },
        {
          "h": 108,
          "v": 1403.49
        },
        {
          "h": 129,
          "v": 1408.38
        },
        {
          "h": 151,
          "v": 1406.72
        },
        {
          "h": 172,
          "v": 1418.4
        }
      ],
      "s9": [
        {
          "h": 1,
          "v": 9047.72
        },
        {
          "h": 22,
          "v": 9047.82
        },
        {
          "h": 44,
          "v": 9052.74
        },
        {
          "h": 65,
          "v": 9050.76
        },
        {
          "h": 87,
          "v": 9053.0
        },
        {
          "h": 108,
          "v": 9049.12
        },
        {
          "h": 129,
          "v": 9052.88
        },
        {
          "h": 151,
          "v": 9059.19
        },
        {
          "h": 172,
          "v": 9052.93
        }
      ],
      "s3": [
        {
          "h": 1,
          "v": 1588.76
        },
        {
          "h": 22,
          "v": 1588.7
        },
        {
          "h": 44,
          "v": 1588.3
        },
        {
          "h": 65,
          "v": 1582.45
        },
        {
          "h": 87,
          "v": 1591.45
        },
        {
          "h": 108,
          "v": 1583.13
        },
        {
          "h": 129,
          "v": 1589.55
        },
        {
          "h": 151,
          "v": 1591.29
        },
        {
          "h": 172,
          "v": 1594.19
        }
      ]
    },
    "maintenanceHistory": [
      {
        "date": "cycle #172 시점 예측",
        "type": "예정",
        "description": "RUL 예측 기반 — 잔존 약 61.6 사이클 소진 시 정비 권고 (신뢰구간 43.0~87.2)",
        "status": "scheduled"
      }
    ],
    "status": "good",
    "health": 49
  },
  "engine-47": {
    "equipmentInfo": {
      "line": "터보팬 엔진 · C-MAPSS FD001 (운전조건 1종)",
      "installedAt": "—(데이터에 없음)",
      "lastMaintenance": "—(단일 run-to-failure 데이터, 실제 교체 이력 없음)",
      "team": "5조 감시자들",
      "operatingHours": 73,
      "modelNo": "Turbofan (FD001)"
    },
    "predictedRulCycle": {
      "median": 125.0,
      "lower": 106.4,
      "upper": 125
    },
    "survivalCurve": [
      {
        "cycle": 0,
        "median": 1.0,
        "lower": 1.0,
        "upper": 1.0
      },
      {
        "cycle": 10,
        "median": 1.0,
        "lower": 1.0,
        "upper": 1.0
      },
      {
        "cycle": 20,
        "median": 1.0,
        "lower": 1.0,
        "upper": 1.0
      },
      {
        "cycle": 30,
        "median": 1.0,
        "lower": 1.0,
        "upper": 1.0
      },
      {
        "cycle": 40,
        "median": 1.0,
        "lower": 1.0,
        "upper": 1.0
      },
      {
        "cycle": 60,
        "median": 0.99,
        "lower": 0.97,
        "upper": 1.0
      },
      {
        "cycle": 80,
        "median": 0.92,
        "lower": 0.87,
        "upper": 0.96
      },
      {
        "cycle": 100,
        "median": 0.76,
        "lower": 0.69,
        "upper": 0.83
      },
      {
        "cycle": 120,
        "median": 0.59,
        "lower": 0.5,
        "upper": 0.67
      },
      {
        "cycle": 140,
        "median": 0.32,
        "lower": 0.24,
        "upper": 0.4
      }
    ],
    "sensorTrend": {
      "s4": [
        {
          "h": 1,
          "v": 1415.87
        },
        {
          "h": 10,
          "v": 1418.18
        },
        {
          "h": 19,
          "v": 1413.49
        },
        {
          "h": 28,
          "v": 1411.35
        },
        {
          "h": 37,
          "v": 1410.57
        },
        {
          "h": 46,
          "v": 1415.89
        },
        {
          "h": 55,
          "v": 1408.82
        },
        {
          "h": 64,
          "v": 1402.61
        },
        {
          "h": 73,
          "v": 1402.79
        }
      ],
      "s9": [
        {
          "h": 1,
          "v": 9045.79
        },
        {
          "h": 10,
          "v": 9048.75
        },
        {
          "h": 19,
          "v": 9046.35
        },
        {
          "h": 28,
          "v": 9051.07
        },
        {
          "h": 37,
          "v": 9041.39
        },
        {
          "h": 46,
          "v": 9040.82
        },
        {
          "h": 55,
          "v": 9043.84
        },
        {
          "h": 64,
          "v": 9044.41
        },
        {
          "h": 73,
          "v": 9038.32
        }
      ],
      "s3": [
        {
          "h": 1,
          "v": 1586.87
        },
        {
          "h": 10,
          "v": 1592.77
        },
        {
          "h": 19,
          "v": 1593.85
        },
        {
          "h": 28,
          "v": 1593.51
        },
        {
          "h": 37,
          "v": 1595.63
        },
        {
          "h": 46,
          "v": 1591.5
        },
        {
          "h": 55,
          "v": 1584.69
        },
        {
          "h": 64,
          "v": 1584.39
        },
        {
          "h": 73,
          "v": 1587.09
        }
      ]
    },
    "maintenanceHistory": [
      {
        "date": "cycle #73 시점 예측",
        "type": "예정",
        "description": "RUL 예측 기반 — 잔존 약 125.0 사이클 소진 시 정비 권고 (신뢰구간 106.4~125)",
        "status": "scheduled"
      }
    ],
    "status": "good",
    "health": 100
  }
}

export const DEFAULT_ENGINE_ID = 'engine-37'

/** 하위호환용 플랫 export (대표 엔진 #37 기준) */
export const equipmentInfo = engineDetails[DEFAULT_ENGINE_ID].equipmentInfo
export const predictedRulMileage = engineDetails[DEFAULT_ENGINE_ID].predictedRulCycle
export const survivalCurve = engineDetails[DEFAULT_ENGINE_ID].survivalCurve
export const maintenanceHistory = engineDetails[DEFAULT_ENGINE_ID].maintenanceHistory

/** 센서 추이 3종 (RF 피처 중요도 상위 센서: LPT outlet 온도 / 코어 속도 / HPC outlet 온도) */
export const sensorTrend72h = engineDetails[DEFAULT_ENGINE_ID].sensorTrend

export const trendMeta: Record<string, { unit: string; domain: [number, number] }> = {
  "s4": {
    "unit": "°R",
    "domain": [
      1376.3,
      1447.4
    ]
  },
  "s9": {
    "unit": "rpm",
    "domain": [
      8999.4,
      9266.9
    ]
  },
  "s3": {
    "unit": "°R",
    "domain": [
      1566.5,
      1621.5
    ]
  }
}

/** 위험 등급(RUL<20) 조기경보 성능 — LSTM 모델, 공식 test 100개 엔진 기준 실제 계산값
 *  (TP={tp}, FN={fn}, FP={fp}) */
export const classifierMetrics = {
  "precision": 0.733,
  "recall": 0.846,
  "f1": 0.786,
  "tp": 11,
  "fn": 2,
  "fp": 4
}

/** RF 피처 중요도 상위 5개 센서(그룹 합산) */
export const featureImportance = [
  {
    "label": "LPT outlet 온도 (s4)",
    "value": 0.58
  },
  {
    "label": "물리적 코어 속도(N2) (s9)",
    "value": 0.086
  },
  {
    "label": "HPC outlet 온도 (s3)",
    "value": 0.061
  },
  {
    "label": "HPC outlet 정압 (s11)",
    "value": 0.049
  },
  {
    "label": "LPT coolant bleed(2) (s21)",
    "value": 0.031
  }
]

/** AS-IS(사후 정비: 고장까지 운용) vs TO-BE(예지보전: RUL 기반 사전 정비) 비용 시뮬레이션.
 *  탐지/누락/오탐 건수는 LSTM 모델의 실제 test set 결과, 금액·시간 가정은 항공 엔진 정비
 *  맥락의 illustrative 값입니다 (자세한 내용은 docs/DESIGN_DECISIONS.md). */
export const scenarioCompare = [
  {
    "metric": "평균 가동중단 시간 (시간/1,000대 환산)",
    "asIs": 3120.0,
    "toBe": 940.0
  },
  {
    "metric": "정비 비용 (억원/1,000대 환산)",
    "asIs": 31.2,
    "toBe": 13.8
  },
  {
    "metric": "가동중단 손실 (억원/1,000대 환산)",
    "asIs": 312.0,
    "toBe": 94.0
  }
]

export const savingsSummary = {
  "perThousandCoilsEok": 235.4,
  "savingRatePct": 68.6,
  "anomalyCoilReductionPct": 85,
  "note": "테스트 엔진 100대 결과를 1,000대 규모로 환산한 값입니다. 정비 비용·가동중단 단가는 가정값이고, 탐지/누락/오탐 건수는 실제 모델 성능입니다."
}

/** 시나리오 화면 슬라이더가 다시 계산할 때 쓰는 원본 가정치 (계산식은 analysis 쪽과 동일) */
export const costModel = {
  "nCoils": 100,
  "general": {
    "downtimeCostPerHour": 1000.0,
    "repairUnplannedRatio": 3.0,
    "coilLoss": 0.0,
    "falseAlarmHours": 0.5,
    "falseAlarmLabor": 50.0
  },
  "types": {
    "EngineRemoval": {
      "episodes": 13,
      "detected": 11,
      "missed": 2,
      "falseAlarms": 4,
      "anomalyCoils": 13,
      "detectedCoils": 0,
      "missedCoils": 2,
      "hoursPlanned": 4.0,
      "hoursUnplanned": 24.0,
      "repairPlanned": 800.0
    }
  }
}
