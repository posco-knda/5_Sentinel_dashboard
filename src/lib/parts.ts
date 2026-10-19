import { NOTABLE_Z } from './fleet'

const WARN_Z = NOTABLE_Z * 0.6

/** 변화 배수에 따른 색 — 빨강: 뚜렷한 변화, 주황: 변화 시작, 초록: 평소 수준 */
export function partTone(score: number | null): { color: string; label: string } {
  if (score == null) return { color: 'var(--text-muted)', label: '계산 중' }
  if (score >= NOTABLE_Z) return { color: 'var(--status-critical)', label: '뚜렷한 변화' }
  if (score >= WARN_Z) return { color: 'var(--status-warning)', label: '변화 시작' }
  return { color: 'var(--status-good)', label: '평소 수준' }
}

/** 모듈의 짧은 설명 — "이 부품이 뭐 하는 곳인지" */
export const PART_ROLE: Record<string, string> = {
  fan: '흡입한 공기의 대부분을 엔진 바깥쪽 통로(바이패스)로 보내 추력의 큰 몫을 만듭니다.',
  lpc: '들어온 공기를 처음 압축해 고압압축기로 넘깁니다.',
  hpc: '공기를 아주 높은 압력으로 눌러 연소실에서 연료가 잘 타게 합니다.',
  core: '압축된 공기에 연료를 섞어 태우는 곳. 엔진에서 가장 뜨거운 부분입니다.',
  hpt: '연소 가스의 힘을 받아 고압압축기를 돌립니다. 열을 가장 많이 받아 마모가 빠릅니다.',
  lpt: '남은 가스의 힘으로 팬과 저압압축기를 돌립니다.',
}
