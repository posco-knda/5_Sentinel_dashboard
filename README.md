# Sentinel Dashboard (시연용 대시보드)

**5조 · 팀명 "감시자들"** — 터보팬 엔진(C-MAPSS **FD004** — 운전조건 6종·고장모드 2종) 잔존수명(RUL) 예측 프로젝트의
시연용 웹 대시보드입니다.

> ⚠️ 이 저장소는 **공식 제출물이 아닙니다.** 강사님 진행가이드 기준 공식 제출물은 분석 저장소(노트북/코드/보고서)에 있습니다.
> 이 대시보드는 결과보고서/발표의 **현장 활용 시연 도구**로만 사용합니다.
>
> 분석 저장소: [`5_Sentinel_python`](https://github.com/posco-knda/5_Sentinel_python)
> C-MAPSS 분석 파이프라인(scripts/01~14): 현재 [`udwns310/knda_python_project`](https://github.com/udwns310/knda_python_project)에 있음 — 팀 분석 저장소로 옮기면 이 링크를 갱신하세요.

## 지금 상태 — 실제 분석 결과로 연결됨

`src/data/mock.ts`에는 더 이상 가짜 숫자가 없고, **분석 파이프라인이 만든 실제 결과**가 들어 있습니다 (파일 이름만 그대로 `mock.ts`).

| 화면 | 채워진 값 | 출처 |
|---|---|---|
| 홈: 엔진 플릿 현황 | 선택된 엔진 9대의 헬스 스코어 카드 | `engines_summary.json` |
| 모니터링: 예측 RUL 차트·위험 구간 | 대표 엔진(#198, 규칙으로 자동 선정) 예측 RUL(cycle), 위험 기준 교차 구간 | test 엔진 마지막 25사이클 창 |
| 모니터링: 정비 우선순위 | 엔진별 헬스 점수(마지막 관측 시점 기준 스냅샷) | GRU 예측 RUL |
| 모니터링: 위험 조기경보 로그 | 모델이 낸 경보 | GRU RUL 예측값의 임계값 교차 |
| 설비 상세: RUL·생존곡선 | 엔진별(9대 선택, URL로 전환) 잔존수명과 90% 구간, 생존확률(부트스트랩 90% 구간) | GRU 예측 + 검증 엔진에서 예측이 비슷했던 사례들의 실제 RUL 분포 |
| 설비 상세: 위험 조기경보 요인 | Precision/Recall/F1, 센서별 기여도(RF 피처 중요도) | test 엔진 248대 실제 결과 |
| 설비 상세: 정비 권고 | 예측 RUL 기반 향후 정비 권고 (실제 교체 이력은 없음 — run-to-failure 데이터라서) | GRU 예측 |
| 시나리오 | AS-IS vs TO-BE (1,000대 환산), 탐지/누락/오탐 건수는 실제 | 비용 시뮬레이션 |

기존에는 냉간압연 TCM(Tandem Cold Mill) 주제용으로 만들어진 대시보드였는데, 팀 주제가
C-MAPSS 터보팬 RUL 예측으로 확정되면서 데이터와 화면 용어를 함께 새 주제에 맞게
다시 연결했습니다. 처음에는 FD001로 연결했고, 2026-09-30부터 팀의 주 데이터인 **FD004**를 보여줍니다. **무엇을 어떻게 왜 바꿨는지는 [`docs/DATA_MAPPING.md`](docs/DATA_MAPPING.md)에
전부 정리되어 있습니다.**

**꼭 알아둘 점**
- 데이터는 NASA C-MAPSS FD004(터보팬 엔진 열화 시뮬레이션)라 실제 항공기 센서값이 아닙니다.
- **위험(빨간불) = 예측 잔여 ≤ 40사이클**, 주의 40~80, 정상 ≥ 80. 분석 레포의 과제 분류 라벨과 같은 기준이며,
  정비 일정 논문의 운영 조건(정비 준비 7일 등)으로 정비 비용이 가장 낮은 값을 골랐습니다 (분석 레포 `docs/DESIGN_DECISIONS.md` #11).
- 센서 추이는 비행 조건(6종) 차이를 뺀 **운전조건 보정값**입니다 (단위는 원래 그대로).
- 시간축은 엔진 운행 **사이클(cycle)**이며, test 엔진 248대는 서로 독립된 자기만의 시간축을 가집니다(하나의 공통 시계열이 아님).
- **금액·가동중단 시간은 가정값**입니다(데이터에 비용·정비시간 정보가 없음). 탐지/누락/오탐 건수(precision/recall/F1)만 실제 모델 결과입니다.

## 데이터를 다시 만들려면

`mock.ts`는 **자동 생성 파일**이라 직접 고치지 않습니다. 분석 코드를 다시 돌려서 새로 받아 오세요.

```bash
# 분석 파이프라인 저장소(knda_python_project)에서, 01~07 실행 후
python scripts/08_export_dashboard_ts.py   # → outputs/FD004/dashboard_data/mock.ts 생성
cp outputs/FD004/dashboard_data/mock.ts <이 저장소>/src/data/mock.ts
```

## 실행 방법

```bash
npm install
npm run dev
```

빌드(정적 배포용):

```bash
npm run build
```

## 기술 스택

Vite + React + TypeScript, Tailwind v4, Recharts. 백엔드 없이 정적 데이터(`src/data/mock.ts`)를 그대로 import해서 화면에 뿌리는 구조입니다.

## 문서

- [`docs/DATA_MAPPING.md`](docs/DATA_MAPPING.md) — 기존 TCM 주제 대시보드를 C-MAPSS 터보팬 RUL 주제로 다시 연결한 전체 근거와 매핑 표
