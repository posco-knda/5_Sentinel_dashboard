# Sentinel Dashboard (시연용 대시보드)

**5조 · 팀명 "감시자들"** — 냉간압연 설비 이상탐지 & 잔존수명(RUL) 예측 프로젝트의 시연용 웹 대시보드입니다.

> ⚠️ 이 저장소는 **공식 제출물이 아닙니다.** 강사님 진행가이드 기준 공식 제출물은 분석 저장소(노트북/코드/보고서)에 있습니다.
> 이 대시보드는 결과보고서/발표 7장("현장 활용 근거")의 **시연 도구**로만 사용합니다.
>
> 분석 저장소: [`5_Sentinel_python`](https://github.com/posco-knda/5_Sentinel_python)

## 지금 상태 — 실제 분석 결과로 연결됨

`src/data/mock.ts`에는 더 이상 가짜 숫자가 없고, **분석 파이프라인이 만든 실제 결과**가 들어 있습니다 (파일 이름만 그대로 `mock.ts`).

| 화면 | 채워진 값 | 출처 |
|---|---|---|
| 모니터링: 압연력 차트·이상 구간 | Stand 3 압연력(MN), 실제 이상 라벨 구간 | 시험 구간(시간순 마지막 20%) 코일 25개 창 |
| 모니터링: 정비 우선순위 | 스탠드별 헬스 점수 | RandomForest 이상 확률 + 롤 마모 진행도 |
| 모니터링: 이상탐지 로그 | 모델이 낸 경보 | RandomForest |
| 설비 상세: RUL·생존곡선 | 남은 마일리지, 생존확률(부트스트랩 90% 구간) | RandomForest 회귀 + 롤 수명 분포 |
| 설비 상세: 성능·특성 중요도 | Precision/Recall/F1, 특성 기여도 | 시험 구간 |
| 설비 상세: 롤 교체 이력 | 마일리지 리셋 지점 | 수명 주기 분리 |
| 시나리오 | AS-IS vs TO-BE (코일 1,000개당) | 비용 시뮬레이션 |

**꼭 알아둘 점**
- 데이터는 **물리 시뮬레이션 데이터**(Zenodo TCM 벤치마크)라 실제 공장 센서값이 아닙니다.
- CSV에 시각이 없어서 화면의 "시간"은 **코일 번호(생산 순서)** 입니다. 스크러버 0~24 = 코일 25개 창.
- **금액·정지시간은 가정값**입니다(데이터에 비용·정지 정보가 없음). 사건 수·탐지율·탐지 지연만 실제 결과입니다.

## 데이터를 다시 만들려면

`mock.ts`는 **자동 생성 파일**이라 직접 고치지 않습니다. 분석 코드를 다시 돌려서 새로 받아 오세요.

```bash
# 분석 코드(analysis/)에서
python run_pipeline.py                     # → outputs/dashboard/mock.generated.ts 생성
cp outputs/dashboard/mock.generated.ts <이 저장소>/src/data/mock.ts
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
