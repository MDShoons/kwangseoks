# v10 빠른 설정 안내

이 버전은 Firebase Storage와 Cloudinary를 쓰지 않습니다.

구조:
- GitHub Pages: 사이트 화면
- Firebase Authentication: 로그인/회원가입
- Firestore: 글, 설명, 유튜브 URL, 이미지 URL, 템플릿 저장
- Cloudflare Worker: 사진 업로드 중계
- GitHub 저장소 images 폴더: 실제 사진 저장

## 1. GitHub Pages에 올릴 파일
아래 파일을 GitHub 저장소 루트에 올리세요.

- index.html
- style.css
- app.js
- firebase-config.js
- firestore.rules
- storage.rules

## 2. Firebase 설정
Firebase Console에서 해야 할 일:

1. Authentication → Email/Password 켜기
2. Firestore Database 만들기
3. Firestore Database → Rules에 firestore.rules 붙여넣고 Publish
4. Authentication → Settings → Authorized domains에 mdshoons.github.io 추가

## 3. Cloudflare Worker 설정
Cloudflare Worker를 만들고 cloudflare-worker-github-uploader.js 내용을 붙여넣으세요.

Worker 환경변수:

일반 변수:
- GITHUB_OWNER = mdshoons
- GITHUB_REPO = 저장소 이름
- GITHUB_BRANCH = main
- GITHUB_PAGES_BASE_URL = https://mdshoons.github.io/저장소이름
- ADMIN_EMAILS = shinestone0106@kakao.com,kos20050627@gmail.com
- ALLOWED_ORIGIN = https://mdshoons.github.io

Secret:
- GITHUB_TOKEN

## 4. GitHub Token 권한
GitHub Fine-grained personal access token 권장.

Repository access:
- 이 사이트 저장소 하나만 선택

Permissions:
- Contents: Read and write

## 5. Worker 주소를 사이트에 넣기
Worker 배포 후 생기는 주소가 예를 들어:

https://gwangseok-github-uploader.계정명.workers.dev

라면 firebase-config.js에서 아래처럼 수정하세요.

export const GITHUB_UPLOAD_WORKER_URL = "https://gwangseok-github-uploader.계정명.workers.dev/upload";

이걸 GitHub에 다시 업로드해야 사진 파일 업로드가 작동합니다.
