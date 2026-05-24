# 광석이네집 v3 - Stories 수정 + 각 페이지 글/사진 업로드 + 관리자 수정 기능

## 이번 버전 변경사항
- Stories 설명을 `김광석의 일기를 모아둔 공간입니다.`로 수정
- 관리자 화면에서 각 페이지별 글 업로드 가능
  - Videos
  - Songs
  - Radios
  - Photos
  - Stories
  - About Seok
  - Oneum
- 글 등록 시 사진 첨부 가능
- 관리자 전용 자료 수정/삭제 기능 추가
- 관리자 전용 사이트 문구 수정 기능 추가
- 관리자 전용 메인 배경 이미지 수정 기능 추가
- 관리자 전용 페이지 템플릿 변경 기능 확장
- Firestore Rules와 Storage Rules 수정본 포함

## 포함 파일
- index.html
- style.css
- app.js
- firebase-config.js
- firestore.rules
- storage.rules
- README.md

## 관리자 계정
코드에는 관리자 이메일과 아이디만 들어 있습니다.

관리자 1
- 아이디: shinestone0106
- 이메일: shinestone0106@kakao.com

관리자 2
- 아이디: oldsong0106
- 이메일: kos20050627@gmail.com

비밀번호는 코드에 넣지 않았습니다.
GitHub Pages의 HTML/JS 파일은 누구나 볼 수 있으므로 비밀번호를 넣으면 그대로 노출됩니다.

## Firebase에서 해야 할 일
1. Firebase Authentication에서 Email/Password 로그인 켜기
2. 위 관리자 이메일 계정 2개를 Firebase Authentication에 생성
3. Firestore Database 만들기
4. Storage 만들기
5. `firebase-config.js`에는 현재 kksarchive Firebase 설정값이 이미 반영되어 있음
6. Firestore Rules에 `firestore.rules` 내용 붙여넣기
7. Storage Rules에 `storage.rules` 내용 붙여넣기
8. GitHub Pages 주소가 생기면 Firebase Authentication > Settings > Authorized domains에 `본인아이디.github.io` 추가

## 주의
- 기존 관리자 계정이 Firebase Authentication에만 있고 사이트 회원가입을 하지 않았다면, 아이디 로그인용 `loginIds` 문서가 없을 수 있습니다.
- 그 경우 이메일로 먼저 로그인하세요.
- 아이디 로그인을 완전히 쓰려면 관리자도 사이트 회원가입 화면에서 같은 이메일/아이디로 가입하는 방식이 가장 쉽습니다.


## v4 추가 반영
사용자가 제공한 Firebase Console 화면 기준으로 `firebase-config.js`에 아래 프로젝트 설정을 반영했습니다.

- projectId: kksarchive
- authDomain: kksarchive.firebaseapp.com
- storageBucket: kksarchive.firebasestorage.app
- messagingSenderId: 322477795788
- appId: 1:322477795788:web:9f6a9c2c8d26c1a76d5569
- measurementId: G-9R60YXCMY9

중요:
- Firebase Authentication에서 Email/Password 로그인을 켜야 합니다.
- Firestore Database를 만들어야 합니다.
- Firestore Rules에는 `firestore.rules` 내용을 붙여넣고 게시해야 합니다.
- Storage Rules에는 `storage.rules` 내용을 붙여넣고 게시해야 합니다.
- GitHub Pages 주소를 Firebase Authentication > Settings > Authorized domains에 추가해야 합니다.


## v5 수정 사항
사용자가 Firebase Console에서 텍스트로 복사해 준 정확한 `firebaseConfig` 값을 반영했습니다.

반영된 핵심 값:
- apiKey: AIzaSyDPGi_MBLGkap_VTdo07j_fXw6Sy4TTPeo
- authDomain: kksarchive.firebaseapp.com
- projectId: kksarchive
- storageBucket: kksarchive.firebasestorage.app
- messagingSenderId: 322477795788
- appId: 1:322477795788:web:85a4990dd85b04fe6d5569
- measurementId: G-L8JDZMQFWS

이전 `auth/api-key-not-valid` 오류는 apiKey가 잘못 입력되었을 때 발생합니다.
이번 파일은 사용자가 직접 제공한 정확한 값으로 교체되었습니다.

업로드 후에도 문제가 나면 다음을 확인하세요.
1. GitHub에 새 ZIP의 파일들이 실제로 덮어쓰기 되었는지 확인
2. 브라우저 캐시 삭제 또는 강력 새로고침
3. Firebase Authentication에서 Email/Password 로그인 사용 설정
4. Firestore Database 생성
5. Firestore Rules 게시
6. Firebase Authentication > Settings > Authorized domains에 GitHub Pages 도메인 추가


## v6 수정 사항 - 저장은 되는데 화면이 안 바뀌는 문제 보완
- `템플릿 저장` 버튼명을 `템플릿만 저장`으로 변경했습니다.
- 제목, 설명, 배경 이미지는 `사이트 문구/배경 저장` 버튼을 눌러야 반영되도록 안내 문구를 추가했습니다.
- Home 템플릿 저장 시에도 실제 화면 변화가 보이도록 CSS와 JS를 수정했습니다.
- 템플릿 저장 후 `loadContents()`를 다시 실행해 저장된 템플릿이 즉시 반영되도록 했습니다.
- 카드형, 갤러리형, 리스트형, 연도별형, 넓은 본문형의 시각적 차이를 더 크게 만들었습니다.


## v7 수정 사항 - Firebase Storage 제거 버전
비용 부담을 줄이기 위해 Firebase Storage를 사용하지 않는 구조로 바꿨습니다.

변경 내용:
- 사진 파일 업로드 제거
- 메인 배경 이미지 파일 업로드 제거
- 영상 썸네일 파일 업로드 제거
- 대신 이미지 URL 입력 방식으로 변경
- Firebase Storage import 코드 제거
- Storage Rules는 더 이상 필요 없음
- Firestore에는 제목, 본문, 설명, 유튜브 URL, 이미지 URL만 저장

이제 필요한 Firebase 기능:
1. Firebase Authentication
2. Firestore Database

필요하지 않은 기능:
- Firebase Storage

주의:
- 이미지 URL은 외부에서 공개 접근 가능한 주소여야 합니다.
- 카카오톡 임시 이미지 주소, 로그인 필요한 구글드라이브 주소, 네이버 블로그 직접 이미지 주소 등은 나중에 깨질 수 있습니다.
- 가장 안정적인 무료 방식은 GitHub 저장소에 `images` 폴더를 만들고 이미지를 직접 올린 뒤 그 이미지 주소를 등록하는 방식입니다.


## v9 수정 사항 - Cloudflare Worker → GitHub images 폴더 업로드 구조
이번 버전은 다음 요구사항을 반영했습니다.

- Firebase Storage 제거
- Cloudinary 제거
- 사진 업로드 버튼 유지
- 업로드 대상: Cloudflare Worker
- Worker가 GitHub 저장소 `images` 폴더에 사진 저장
- 사이트는 반환된 이미지 URL을 Firestore에 저장
- GitHub 토큰은 사이트 코드에 넣지 않고 Cloudflare Worker Secret으로 보관

## v9 전체 구조
- GitHub Pages: 웹사이트 화면
- Firebase Authentication: 로그인/회원가입
- Firestore: 글, 설명, 유튜브 URL, 이미지 URL, 템플릿 설정 저장
- Cloudflare Worker: 이미지 업로드 중계
- GitHub 저장소 images 폴더: 실제 이미지 파일 저장

## 새로 추가된 파일
- `cloudflare-worker-github-uploader.js`
- `wrangler.toml.example`

## 사이트 쪽 설정
Cloudflare Worker 배포 후 `firebase-config.js`에서 아래 값을 수정해야 합니다.

```js
export const GITHUB_UPLOAD_WORKER_URL = "https://본인-worker주소.workers.dev/upload";
```

## Cloudflare Worker에 필요한 환경변수
Cloudflare Dashboard > Workers > 해당 Worker > Settings > Variables에서 설정하세요.

일반 변수:
- GITHUB_OWNER: GitHub 아이디
- GITHUB_REPO: 저장소 이름
- GITHUB_BRANCH: main
- GITHUB_PAGES_BASE_URL: https://GitHub아이디.github.io/저장소이름
- ADMIN_EMAILS: shinestone0106@kakao.com,kos20050627@gmail.com
- ALLOWED_ORIGIN: https://GitHub아이디.github.io

Secret 변수:
- GITHUB_TOKEN

중요:
`GITHUB_TOKEN`은 절대 GitHub Pages의 app.js나 firebase-config.js에 넣지 마세요.
Cloudflare Worker Secret에만 넣어야 합니다.

## GitHub Token 권한
GitHub Fine-grained personal access token을 만들고 다음 권한을 주세요.

Repository access:
- 이 아카이브 저장소 하나만 선택

Permissions:
- Contents: Read and write

만료 기간은 너무 길게 잡지 말고, 필요시 갱신하는 방식이 안전합니다.

## 업로드 흐름
1. 관리자가 사이트에 로그인
2. 사진 파일 선택
3. 사이트가 Firebase ID Token을 Worker에 전달
4. Worker가 Firebase ID Token을 검증
5. Worker가 관리자 이메일인지 확인
6. Worker가 GitHub API로 images 폴더에 파일 저장
7. Worker가 이미지 URL 반환
8. 사이트가 그 URL을 Firestore에 저장
9. 화면에 사진 표시

## 주의
GitHub 저장소를 이미지 저장소처럼 쓰는 구조이므로 대량 이미지/대용량 원본 보관에는 적합하지 않습니다.
초기 아카이브, 소량 이미지, 관리자 직접 업로드 정도에는 현실적으로 사용할 수 있습니다.


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


## v11 수정 사항 - 메인 배경 사진 반영 문제 보완
- 메인 배경 이미지 적용 시 캐시 방지 쿼리값을 자동으로 붙입니다.
- 배경 이미지 URL 직접 입력 후 바로 확인할 수 있는 “입력한 배경 미리보기” 버튼을 추가했습니다.
- 사진 파일을 선택했는데 Cloudflare Worker 주소가 비어 있으면 더 명확한 안내가 뜨도록 수정했습니다.
- GitHub images 폴더 업로드 방식은 GitHub Pages 반영에 잠시 시간이 걸릴 수 있습니다.
- Worker를 아직 만들지 않았다면, 메인 배경은 파일 선택이 아니라 이미지 URL 직접 입력으로 먼저 테스트하세요.


## v12 수정 사항 - 메인 큰 배경 영역 보정
사용자가 표시한 파란색 큰 박스 영역은 `homeHero`입니다.
이번 버전에서는 관리자 화면의 “메인 큰 배경 사진”이 이 영역에 더 선명하게 보이도록 수정했습니다.

변경 내용:
- hero 영역의 어두운 덮개를 약하게 조정
- 배경 이미지가 있을 때 `has-bg` 클래스를 붙여 사진이 잘 보이게 처리
- 캐시 방지 쿼리값을 붙여 새 배경이 바로 반영되도록 처리
- 관리자 화면 문구를 “메인 큰 배경 사진”으로 명확하게 수정

주의:
- 사진 파일 업로드는 Cloudflare Worker 주소가 설정되어 있어야 작동합니다.
- Worker가 아직 없다면 이미지 URL 직접 입력으로 먼저 테스트하세요.


## v13 수정 사항 - 페이지별 사용자 정의 카테고리
관리자가 각 페이지별 카테고리를 직접 만들 수 있습니다.

예:
- Songs: 1집, 2집, 3집, 다시부르기, 라이브
- Videos: 공연, 방송, 인터뷰
- Photos: 공연사진, 증명사진, 포스터
- Stories: 일기, 메모, 편지

사용 방법:
1. 관리자 로그인
2. 관리자 → 페이지별 카테고리 만들기
3. 페이지 선택
4. 새 카테고리 이름 입력
5. 카테고리 생성
6. 각 페이지 글/사진 등록으로 이동
7. 등록할 페이지를 고르면 해당 페이지의 카테고리를 선택할 수 있음

주의:
- 새로 만든 카테고리는 Firestore의 pageCategories 컬렉션에 저장됩니다.
- Firestore Rules에도 pageCategories 권한이 추가되어 있으므로 Firebase Rules를 다시 게시해야 합니다.


## v14 수정 사항 - 영상/사진/음원/라디오 파일 등록
관리자 화면에 다음 등록 메뉴를 추가했습니다.

- 영상 등록: mp4 업로드 가능, Videos에 저장
- 사진 등록: 이미지 업로드 가능, Photos에 저장
- 음원 등록: mp3/wav 업로드 가능, Songs에 저장
- 라디오 등록: mp3/wav 업로드 가능, Radios에 저장

파일 저장 구조:
- 파일은 Firebase Storage가 아니라 Cloudflare Worker를 거쳐 GitHub 저장소 폴더에 저장됩니다.
- Firestore에는 최종 파일 URL과 제목/설명/연도/출처/카테고리만 저장됩니다.

저장 폴더:
- 영상: images/videos
- 영상 썸네일: images/video-thumbnails
- 사진: images/photos
- 음원: images/audios
- 음원 대표 이미지: images/audio-covers
- 라디오: images/radios
- 라디오 대표 이미지: images/radio-covers

주의:
- Cloudflare Worker 주소가 firebase-config.js의 GITHUB_UPLOAD_WORKER_URL에 설정되어 있어야 파일 업로드가 됩니다.
- GitHub API 파일 업로드는 대용량 파일에 적합하지 않습니다. 너무 큰 mp4/wav는 실패할 수 있습니다.
- v14 Worker는 80MB 이하 파일까지만 허용하도록 작성했습니다.


## v15 중요 수정 - pageCategories 권한 추가
카테고리 생성 오류 `Missing or insufficient permissions`를 해결하기 위해 Firestore Rules에 아래 컬렉션 권한을 추가했습니다.

- pageCategories

반드시 Firebase Console에서 다시 적용해야 합니다.

적용 순서:
1. Firebase Console 접속
2. Firestore Database
3. Rules
4. 이 ZIP 안의 firestore.rules 내용 전체 복사
5. 기존 Rules 전체 삭제 후 붙여넣기
6. Publish 클릭

이 작업을 하지 않으면 ZIP을 다시 올려도 카테고리 생성은 계속 실패합니다.


## v16 기본 메인 배경 적용
- 업로드된 거실 사진을 `images/main-bg.png`로 프로젝트에 포함했습니다.
- 사이트 첫 화면의 메인 큰 배경 영역(homeHero)에 이 사진이 기본 배경으로 적용됩니다.
- 관리자 화면에서 다른 배경 URL을 저장하면 그 값이 우선 적용됩니다.


## v17 메인 배경 파일 직접 저장
- 메인 큰 배경 사진은 이제 관리자 화면에서 파일을 선택하고 `사이트 문구/배경 저장`을 누르면 바로 저장됩니다.
- 별도 Cloudflare Worker 없이 브라우저에서 이미지를 압축한 뒤 Firestore의 `siteSettings/main` 문서에 data URL로 저장합니다.
- Firestore 문서 크기 제한 때문에 너무 큰 이미지는 실패할 수 있으므로 일반 사진 한 장 기준으로 사용하세요.
- URL 입력 방식도 계속 지원합니다.


## v18 수정 사항 - 자료 등록용 사진 업로드 단순화
자료 등록용 이미지 업로드도 Cloudflare Worker 없이 동작하도록 바꿨습니다.

Worker 없이 바로 저장되는 이미지:
- 각 페이지 글/사진 등록의 첨부 이미지
- Photos 사진 등록 이미지
- Videos 영상 썸네일 이미지
- Songs 음원 대표 이미지
- Radios 라디오 대표 이미지

처리 방식:
- 브라우저에서 이미지를 자동 축소/압축
- Firestore 문서에 data URL로 저장
- 별도 Firebase Storage, Cloudinary, Cloudflare Worker 없이 이미지 표시 가능

주의:
- 이 방식은 이미지용입니다.
- mp4, mp3, wav 같은 큰 미디어 파일은 Firestore에 직접 저장하지 않습니다.
- 영상/음원/라디오 파일 자체는 URL 등록을 쓰거나, Cloudflare Worker를 연결해야 합니다.
- 너무 큰 원본 이미지는 자동 압축해도 실패할 수 있으므로 일반 웹용 이미지 크기를 권장합니다.
