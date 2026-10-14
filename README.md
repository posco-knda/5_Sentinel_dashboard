# Sentinel

항공 엔진 **예지보전** 웹 대시보드입니다. 정비 계획 담당자가 엔진 플릿의 남은 수명 예측을 보고, 어떤 엔진을 언제까지 정비 요청해야 하는지 판단하고, 처리 상태를 기록합니다.

> 화면의 데이터는 **시연용**입니다. NASA C-MAPSS FD004 터보팬 열화 시뮬레이션이며 실제 항공기 데이터가 아닙니다.
> 팀 "5조 감시자들"의 프로젝트 결과물이고, 분석 과정과 평가는 분석 저장소에 있습니다: [`5_Sentinel_python`](https://github.com/posco-knda/5_Sentinel_python)

## 화면

| 화면 | 담당자가 하는 일 |
|---|---|
| **현황** `/` | 오늘 조치가 필요한 엔진 수, 정비 요청이 도래하는 주별 수요, 예측 남은 수명 분포, 점검이 예상되는 모듈 |
| **정비 계획** `/plan` | 정비 요청 기한이 급한 순으로 엔진을 보고 미확인 → 확인 → 정비 예정(날짜) → 완료로 처리 |
| **알림** `/alerts` | 위험·주의 구간에 들어온 알림을 최근 순으로 보고 확인 처리 |
| **엔진** `/equipment/:id` | 개요(남은 수명·예측 구간·권고) · 고장 진단(센서 → 점검 모듈 → 경보 시점 → 권고) · 센서 · 이력, 진단 리포트 |
| **리포트** `/report/:id` | 엔진 하나의 진단 요약을 A4로 인쇄·PDF 저장, AI 요약, Slack 알림 |
| **비용 분석** `/cost` | 사후 정비와 예지 정비의 비용을 단가를 바꿔 가며 비교 (가정값 기반) |
| **설정** `/settings` | 알림 민감도, 하루 비행 횟수, 정비 준비 기간, 연동 상태, 처리 기록 관리 |

- 남은 수명은 **cycle(비행 1회)** 단위이고, 설정의 "하루 비행 횟수"로 일로 바꿉니다.
- **정비 요청 기한 = 예측 남은 수명(일) − 정비 준비 기간.** 0 이하이면 "기한 지남"입니다.
- 위험은 예측 남은 수명 ≤ 알림 민감도(기본 40 cycle), 주의는 < 80입니다. 설정을 바꾸면 모든 화면이 다시 계산됩니다.
- 정비 처리 상태와 설정은 이 브라우저(`localStorage`)에 저장됩니다. 서버는 없습니다.
- 현장에서는 정답(실제 남은 수명)을 알 수 없으므로 화면은 예측값과 센서 변화만 씁니다.
- 점검 예상 모듈은 센서가 **가장 크게 변한 모듈을 추정**한 것이며 고장 원인을 확정하지 않습니다.

## 실행

```bash
npm install
npm run dev        # 개발 서버
npm run build      # 정적 빌드 (dist/)
npm run lint
npm run test:api   # 서버 함수 검증 (Node 22.18+ / 24)
```

## 데이터 갱신

`src/data/` 의 파일은 모두 분석 저장소가 만드는 **자동 생성 파일**이라 직접 고치지 않습니다. 분석 저장소에서 스크립트를 다시 돌려 복사하세요.

| 대시보드 파일 | 분석 저장소 스크립트 | 내용 |
|---|---|---|
| `mock.ts` | `08_export_dashboard_ts.py` | 비용 시뮬레이션 계수, 데이터 정보 |
| `detectionLog.ts` | `18_export_detection_log.py` | 엔진 248대의 마지막 예측 |
| `detectionCurves.ts` | `18_export_detection_log.py` | 경보가 난 엔진의 예측 곡선 (지연 로딩) |
| `partFlowMeta.ts`, `partFlow.ts` | `20_export_part_flow.py` | 센서 이탈도, 모듈 요약 (`partFlow.ts`는 지연 로딩) |
| `uncertainty.ts` | `21_export_uncertainty.py` | 엔진별 90% 예측 구간·생존곡선 |
| `analysisExtras.ts` | `19_export_analysis_extras.py` | 설정 화면의 민감도별 기대 효과 |

```bash
# 분석 저장소(5_Sentinel_python)에서
python scripts/08_export_dashboard_ts.py && python scripts/18_export_detection_log.py \
  && python scripts/19_export_analysis_extras.py && python scripts/20_export_part_flow.py && python scripts/21_export_uncertainty.py
# outputs/FD004/dashboard_data/ 의 파일을 src/data/ 로 복사 (mock.ts, detection_log.ts → detectionLog.ts, detection_curves.ts → detectionCurves.ts,
# part_flow_meta.ts → partFlowMeta.ts, part_flow.ts → partFlow.ts, uncertainty.ts, analysis_extras.ts → analysisExtras.ts)
```

## 배포 (Vercel)

정적 화면과 서버리스 함수(`api/`)를 한 곳에서 배포합니다. `vercel.json`이 새로고침해도 404가 나지 않도록 경로를 `index.html`로 돌립니다(`/api` 제외).

서버 기능은 **환경변수가 있을 때만** 동작하고, 없으면 화면이 "미연결"로 안내합니다. 값은 서버에만 있고 브라우저로 나가지 않습니다.

| 함수 | 환경변수 | 하는 일 |
|---|---|---|
| `api/notify.ts` | `SLACK_WEBHOOK_URL` | 엔진 진단을 Slack 채널로 전송 (Incoming Webhook) |
| `api/summary.ts` | `ANTHROPIC_API_KEY` (선택: `ANTHROPIC_MODEL`) | 진단 리포트 요약을 Claude로 다시 작성 |
| `api/status.ts` | — | 위 두 가지가 설정돼 있는지만 true/false로 알림 (설정 화면이 사용) |

`npm run test:api`가 모의 요청으로 입력 검증, Slack 멘션 이스케이프, 오류 처리, 비밀값 비노출을 키 없이 검증합니다. 실제 키로 외부 서비스를 호출하는 확인은 배포 후에 필요합니다.

## 기술 스택

Vite · React · TypeScript · Tailwind v4 · Recharts · Framer Motion. 화면은 처음 열 때 불러오고(코드 분할), 큰 데이터(`partFlow` 346KB, `detectionCurves` 207KB)는 필요한 화면에서만 불러옵니다.
