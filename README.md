# SAT R&W Practice

College Board 공식 문제은행(SAT Suite Question Bank)에서 Reading & Writing 문제를
받아 블루북 형식으로 푸는 개인 연습 앱. **단일 파일, 설치 불필요.**

## 사용법

**어느 기기서든**: https://bluebook-rw.bridge11korea.workers.dev 접속
→ 처음 한 번 동기화 키 입력 → 모든 기기가 같은 기록 공유.
(로컬에서 `index.html` 더블클릭도 여전히 동작 — 같은 기록으로 동기화됨.)

1. **Create Practice Session** — 난이도(Easy/Medium/Hard) 선택 → **Create Practice**
   → 공식 SAT 형식으로 27문제 자동 생성 (블루북 도메인 순서)
2. 풀고 **Submit** → 채점 + 문항별 정답/오답 + 공식 해설(rationale)
3. **Your Practice History** — 지난 세션 클릭하면 문제·내 답·해설 다시 보기

## 특징

- **공식 출처**: 문제는 College Board 공개 QBank API에서 실시간으로 받아옴 (로그인 불필요).
  satsuitequestionbank.collegeboard.org가 쓰는 것과 같은 공식 문제.
- **난이도 필터**: Easy(밴드1–3) / Medium(밴드4–5) / Hard(밴드6–7). 원하는 것만 선택.
- **중복 제거**: 한 번 나온 문제는 기록해서 다음 세션에 다시 안 나옴 (UWorld QBank 방식).
- **기록/성적**: 세션·정답률·소요시간이 localStorage + Cloudflare KV에 저장됨.
  동기화 키만 넣으면 폰/노트북 어디서든 같은 기록. 서버가 안 되면 localStorage만으로 계속 동작.
- **타이머**: 카운트업(경과 시간만), 제한 없음.
- **블루북 재현**: 지문/보기 2단, Mark for Review, Cross Out, 문제 네비게이션 패널.

## 초기화

- 특정 세션 삭제: History에서 ✕
- 전체 초기화(기록·중복목록 다 지우기): 브라우저 콘솔에서
  `localStorage.removeItem('bbrw_v1_sessions'); localStorage.removeItem('bbrw_v1_seen')`

## 참고

- 인터넷은 **새 세션 만들 때만** 필요(문제 받아올 때). 지난 기록 리뷰는 오프라인 OK.
- 개인 연습용 공개 데이터. R&W 문제 풀 총 1,688개.

## 배포/동기화 구조

- Cloudflare Worker(`worker.js`)가 `index.html` 서빙 + `POST /api/sync`로 기록 병합(`sync.js`, KV 저장).
- 배포: `npm run deploy` (또는 main 푸시 → GitHub Actions, `CLOUDFLARE_API_TOKEN` 시크릿 필요).
- 동기화 키 변경: `npx wrangler secret put SYNC_KEY` (각 기기에선 콘솔에서
  `localStorage.removeItem('bbrw_v1_key')` 후 새로고침하면 다시 물어봄).
- 병합 로직 테스트: `npm test`
