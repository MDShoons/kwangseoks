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
