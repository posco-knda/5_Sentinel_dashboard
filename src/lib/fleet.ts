import { useMemo } from 'react'
import { fleetPoints } from '../data/detectionLog'
import { partMeta } from '../data/partFlowMeta'
import { useSettings, WARN_N, type Settings } from './settings'
import { todayStr } from './plan'
import type { Curve } from './curves'

export type Level = 'red' | 'warn' | 'ok'
export type Urgency = 'now' | 'week' | 'month' | 'watch'

/** 센서 이탈이 평소 흔들림의 이 배수 이상이어야 "뚜렷하게 변했다"고 본다 */
export const NOTABLE_Z = 2
const HEALTH_CAP = 125

export const LEVEL: Record<Level, { label: string; color: string; wash: string; badge: 'critical' | 'warning' | 'good' }> = {
  red: { label: '위험', color: 'var(--status-critical)', wash: 'var(--status-critical-wash)', badge: 'critical' },
  warn: { label: '주의', color: 'var(--status-warning)', wash: 'var(--status-warning-wash)', badge: 'warning' },
  ok: { label: '정상', color: 'var(--status-good)', wash: 'var(--status-good-wash)', badge: 'good' },
}

export const URGENCY: Record<Urgency, { label: string; hint: string; color: string }> = {
  now: { label: '즉시', hint: '정비 요청 기한이 지났거나 오늘까지', color: 'var(--status-critical)' },
  week: { label: '이번 주', hint: '7일 안에 정비를 요청해야 함', color: 'var(--status-serious)' },
  month: { label: '이번 달', hint: '30일 안에 정비를 요청해야 함', color: 'var(--status-warning)' },
  watch: { label: '관찰', hint: '당장 정비 요청은 필요 없음', color: 'var(--text-muted)' },
}
export const URGENCY_ORDER: Urgency[] = ['now', 'week', 'month', 'watch']

export const PART_LABEL = Object.fromEntries(partMeta.parts.map((p) => [p.id, p.label])) as Record<string, string>

export interface FleetEngine {
  unit: number
  name: string
  /** 예측 남은 수명 (cycle = 비행 1회) */
  pred: number
  /** 0~100, 예측 남은 수명을 상한(125) 대비 비율로 */
  health: number
  level: Level
  /** 하루 비행 횟수로 환산한 남은 가동일 */
  daysLeft: number
  /** 정비 요청 기한까지 남은 일수 = 남은 가동일 − 정비 준비 기간 (0 이하이면 기한 지남) */
  requestIn: number
  urgency: Urgency
  /** 초기 대비 가장 크게 변한 부품 (뚜렷하지 않으면 null) */
  topPart: { id: string; label: string; score: number } | null
}

export const levelOf = (pred: number, dangerN: number): Level => (pred <= dangerN ? 'red' : pred < WARN_N ? 'warn' : 'ok')
export const urgencyOf = (requestIn: number): Urgency => (requestIn <= 0 ? 'now' : requestIn <= 7 ? 'week' : requestIn <= 30 ? 'month' : 'watch')

export function buildFleet(s: Settings): FleetEngine[] {
  return fleetPoints
    .map((p): FleetEngine => {
      const daysLeft = p.pred / s.cyclesPerDay
      const requestIn = daysLeft - s.prepDays
      const tp = partMeta.topParts[String(p.unit)]
      return {
        unit: p.unit,
        name: `Engine #${p.unit}`,
        pred: p.pred,
        health: Math.round(Math.min(100, (100 * p.pred) / HEALTH_CAP)),
        level: levelOf(p.pred, s.dangerN),
        daysLeft,
        requestIn,
        urgency: urgencyOf(requestIn),
        topPart: tp && tp[1] >= NOTABLE_Z ? { id: tp[0], label: PART_LABEL[tp[0]], score: tp[1] } : null,
      }
    })
    .sort((a, b) => a.requestIn - b.requestIn || a.unit - b.unit)
}

/** 현재 설정으로 계산한 전체 엔진 목록 (정비 요청 기한이 급한 순) */
export function useFleet(): FleetEngine[] {
  const { settings } = useSettings()
  return useMemo(() => buildFleet(settings), [settings])
}

export const daysText = (days: number) => (days < 1 ? '1일 미만' : `약 ${Math.round(days)}일`)

export function deadlineText(requestIn: number): string {
  if (requestIn <= 0) {
    const n = Math.ceil(-requestIn)
    return n === 0 ? '오늘까지' : `${n}일 지남`
  }
  return `D-${Math.ceil(requestIn)}`
}

/** 정비 요청 기한 날짜 (이미 지났으면 오늘) */
export const requestDate = (requestIn: number) => todayStr(Math.max(0, Math.ceil(requestIn)))
/** 남은 수명이 다하는 예상일 */
export const limitDate = (daysLeft: number) => todayStr(Math.ceil(daysLeft))

/** 정비 요청 기한이 며칠 뒤인지를 주 단위 칸으로: 0 = 기한 지남/오늘, 1 = 1주 안, … , MAX_WEEK = 그 이후 */
export const MAX_WEEK = 6
export const weekBucket = (requestIn: number) => (requestIn <= 0 ? 0 : Math.min(MAX_WEEK, Math.ceil(requestIn / 7)))
export const WEEK_LABEL = ['기한 경과', '1주 내', '2주 내', '3주 내', '4주 내', '5주 내', '6주+']

export interface AlertRuns {
  lastCycle: number
  /** 마지막 관측까지 '주의'(<80) 구간에 계속 머무르기 시작한 사이클 */
  warnSince: number | null
  /** 마지막 관측까지 '위험'(≤N) 구간에 계속 머무르기 시작한 사이클 */
  dangerSince: number | null
  /** 구간에 들어갔다가 마지막 관측 전에 나온 횟수 (일시 경보) */
  transientWarn: number
  transientDanger: number
}

function runs(mask: boolean[]): [number, number][] {
  const out: [number, number][] = []
  let start = -1
  mask.forEach((m, i) => {
    if (m && start < 0) start = i
    if (!m && start >= 0) {
      out.push([start, i - 1])
      start = -1
    }
  })
  if (start >= 0) out.push([start, mask.length - 1])
  return out
}

/** 엔진의 예측 곡선에서 현재 설정 기준의 경보 시작 시점을 찾는다 */
export function alertRuns(curve: Curve, dangerN: number): AlertRuns {
  const last = curve.p.length - 1
  const warn = runs(curve.p.map((v) => v < WARN_N))
  const danger = runs(curve.p.map((v) => v <= dangerN))
  const since = (rs: [number, number][]) => {
    const r = rs.find(([, e]) => e === last)
    return r ? curve.c[r[0]] : null
  }
  return {
    lastCycle: curve.c[last],
    warnSince: since(warn),
    dangerSince: since(danger),
    transientWarn: warn.filter(([, e]) => e !== last).length,
    transientDanger: danger.filter(([, e]) => e !== last).length,
  }
}
