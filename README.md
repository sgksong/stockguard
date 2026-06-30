# StockGuard PWA v5

## 핵심 변경
- 한국투자 API 초당 제한 회피: `/api/price?code=종목코드` 단건 조회
- 앱에서 종목을 1.1초 간격으로 순환 조회
- 자동조회 시작/중지 버튼
- 담보위험 색상 경고 강화
- 홈 화면에 담보 위험도 요약 표시

## Vercel 환경변수
- KIS_APP_KEY
- KIS_APP_SECRET

## 테스트
- 단건: `/api/price?code=000660`
- 복수: `/api/prices?codes=000660,005930,005380,011790,102110`
