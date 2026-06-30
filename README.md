# StockGuard PWA v11

## 변경사항
- 종목명을 통한 검색 지원: /api/search?q=하이닉스
- 홈 화면은 기본적으로 담보 관련 정보 숨김
- 설정 하단의 작은 '담보' 버튼을 켜야 담보 탭/담보 표시 활성화
- 종목 상세 확장:
  현재가, 당일등락, 거래량, 호가, 차트, 평단, 수익률, 담보여부, 담보가능금액, 배당예상, AI 의견, 뉴스
- 기존 KIS 현재가/호가 API 유지

## Vercel 환경변수
- KIS_APP_KEY
- KIS_APP_SECRET
- OPENAI_API_KEY 선택
