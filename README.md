# 광석이네 집 v22 안정판

이 버전은 섞여 있던 기능을 하나의 기준으로 다시 정리한 안정판입니다.

## 작동 기준
- 사진/썸네일/대표이미지/메인배경: 브라우저에서 자동 압축 후 Firestore 저장
- mp4/mp3/wav 파일: Cloudflare Worker 연결 시 GitHub 폴더 저장
- 유튜브: URL 저장
- 글/설명/카테고리/디자인: Firestore 저장
- 카드 클릭: 상세창 보기/재생

## 반드시 다시 올릴 파일
GitHub 저장소에 ZIP 안의 모든 파일을 덮어쓰기 업로드하세요.

## Firebase Rules
Firestore Rules는 `firestore.rules` 내용을 다시 게시하세요.

## Cloudflare Worker
Cloudflare Worker에는 `cloudflare-worker-github-uploader.js` 내용을 다시 붙여넣고 Deploy하세요.

환경변수:
- GITHUB_OWNER = mdshoons
- GITHUB_REPO = kwangseoks
- GITHUB_BRANCH = main
- GITHUB_PAGES_BASE_URL = https://mdshoons.github.io/kwangseoks
- ADMIN_EMAILS = shinestone0106@kakao.com,kos20050627@gmail.com
- ALLOWED_ORIGIN = https://mdshoons.github.io
- GITHUB_TOKEN = Secret

## firebase-config.js
이미 Worker 주소가 들어가 있습니다.

```js
export const GITHUB_UPLOAD_WORKER_URL = "https://kwangseoks.kos20050627.workers.dev/upload";
```


## v23 수정 사항 - WAV/MP3/MP4 업로드 오류 진단 강화
사진은 Firestore에 바로 저장되지만, WAV/MP3/MP4는 Cloudflare Worker를 통해 GitHub 폴더에 저장됩니다.
따라서 WAV/MP3/MP4가 안 올라갈 때는 Worker 설정 문제일 가능성이 큽니다.

v23 변경:
- WAV/MP3/MP4 파일이 95MB를 넘으면 업로드 전에 안내
- Failed to fetch 발생 시 원인 안내 강화
- Worker `/health` 점검 주소 추가
- Worker가 반환한 GitHub/API 오류를 화면에 더 자세히 표시

점검 주소:
https://kwangseoks.kos20050627.workers.dev/health

정상이면 JSON이 나옵니다.
예:
{"ok":true,"service":"kwangseoks-github-uploader","hasOwner":true,"hasRepo":true,"hasToken":true,...}

반드시 해야 할 일:
1. Cloudflare Worker 코드도 이 ZIP 안의 `cloudflare-worker-github-uploader.js` 내용으로 교체
2. Save and deploy
3. Worker 환경변수 확인
   - GITHUB_OWNER = mdshoons
   - GITHUB_REPO = kwangseoks
   - GITHUB_BRANCH = main
   - GITHUB_PAGES_BASE_URL = https://mdshoons.github.io/kwangseoks
   - ADMIN_EMAILS = shinestone0106@kakao.com,kos20050627@gmail.com
   - ALLOWED_ORIGIN = https://mdshoons.github.io
   - GITHUB_TOKEN = Secret
4. 먼저 1~3MB짜리 작은 mp3 파일로 테스트
5. 그다음 WAV/MP4 테스트

주의:
- 95MB가 넘는 WAV/MP4는 실패할 가능성이 높습니다.
- 큰 공연 영상은 유튜브 URL 등록이 더 안정적입니다.


## v24 수정 사항 - 새 업로드 Worker 주소 반영
WAV/MP3/MP4 업로드가 예전 Worker 주소로 요청되는 문제를 수정했습니다.

기존 주소:
https://kwangseoks.kos20050627.workers.dev/upload

새 주소:
https://kwangseoks-uploader.kos20050627.workers.dev/upload

확인 주소:
https://kwangseoks-uploader.kos20050627.workers.dev/health

중요:
GitHub에 firebase-config.js와 app.js를 반드시 덮어쓰기 업로드하고 Commit changes를 눌러야 합니다.
그 후 사이트에서 Ctrl+F5로 강력 새로고침하세요.
