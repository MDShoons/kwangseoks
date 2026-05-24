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


## v25 수정 사항 - 캐시 우회 및 새 Worker 주소 강제 적용
아직도 예전 Worker 주소가 오류에 표시되는 문제는 브라우저/GitHub Pages가 예전 `app.js`를 읽고 있다는 뜻입니다.

v25에서는 파일명을 바꿨습니다.
- `app-v25.js`
- `firebase-config-v25.js`
- `index.html`은 `app-v25.js?v=25`를 불러옵니다.

새 Worker 주소:
https://kwangseoks-uploader.kos20050627.workers.dev/upload

상태 확인:
https://kwangseoks-uploader.kos20050627.workers.dev/health

중요:
GitHub에 `index.html`, `app-v25.js`, `firebase-config-v25.js`, `app.js`, `firebase-config.js`를 모두 올리세요.
그 다음 사이트에서 Ctrl+F5를 누르세요.
오류 메시지에 `kwangseoks.kos20050627.workers.dev`가 나오면 아직 예전 파일을 읽는 것입니다.
정상이라면 `kwangseoks-uploader.kos20050627.workers.dev`가 사용됩니다.


## v26 수정 사항 - Worker Invalid SPKI input 해결
WAV/MP3/MP4 업로드 시 `Invalid SPKI input` 오류가 나는 문제를 수정했습니다.

원인:
Cloudflare Worker WebCrypto는 Firebase의 X.509 인증서 PEM을 그대로 `spki` 키로 import하지 못합니다.

수정:
`cloudflare-worker-github-uploader.js`에서 X.509 인증서 DER 내부의 SubjectPublicKeyInfo 영역을 추출해 `crypto.subtle.importKey("spki")`에 넣도록 수정했습니다.

적용 방법:
1. ZIP 안의 `cloudflare-worker-github-uploader.js` 파일 열기
2. 내용 전체 복사
3. Cloudflare → Workers & Pages → kwangseoks-uploader
4. 코드 편집 화면에서 기존 코드 전체 삭제
5. 붙여넣기
6. Save and deploy
7. https://kwangseoks-uploader.kos20050627.workers.dev/health 확인
8. 작은 mp3 파일부터 업로드 테스트


## v27 수정 사항 - 삭제 후 목록에 남는 문제 보정
자료를 삭제했는데 Radios 등 페이지 목록에 계속 남아 보이는 문제를 보정했습니다.

수정 내용:
- 삭제 성공 후 Firestore뿐 아니라 브라우저의 `allContents` 배열에서도 즉시 제거
- Radios/Songs/Photos/Videos/Stories/About/Oneum 전체 목록을 강제 재렌더링
- 상세창이 열려 있으면 닫기
- Firestore를 다시 읽어 최종 동기화
- index.html의 app 로딩 주소에 v27 캐시 방지 쿼리 추가

주의:
- Firestore 문서 삭제는 사이트 목록에서 제거하는 기능입니다.
- 이미 GitHub audios/radios/videos 폴더에 올라간 실제 mp3/wav/mp4 파일은 자동 삭제되지 않습니다.
- GitHub 폴더 파일까지 지우려면 GitHub 저장소에서 직접 삭제하거나, 별도 파일 삭제 Worker 기능이 필요합니다.


## v28 수정 사항 - mp3/mp4/wav 다운로드 버튼 숨김
사이트 화면에서 mp3, mp4, wav 파일을 쉽게 다운로드하지 못하도록 보정했습니다.

적용 내용:
- audio/video 태그에 `controlsList="nodownload noplaybackrate"` 적용
- video 태그에 `disablePictureInPicture` 적용
- audio/video 우클릭 메뉴 차단
- 상세창의 audio/video에도 동일하게 적용
- 렌더링 후 모든 미디어 요소에 다운로드 방지 속성을 다시 부여
- 캐시 방지를 위해 app 로딩 쿼리를 v28로 변경

중요한 한계:
GitHub Pages에 공개 저장된 mp3/mp4/wav 파일은 주소를 아는 사용자가 개발자도구나 직접 URL 접근으로 받을 수 있습니다.
이 수정은 일반 사용자 화면에서 다운로드 버튼/우클릭 저장을 막는 수준입니다.

진짜 다운로드 차단이 필요하면:
- 공개 GitHub Pages 폴더에 파일을 두면 안 됩니다.
- Cloudflare R2 같은 비공개 저장소
- 서명 URL
- 로그인 검증 후 스트리밍 프록시
같은 구조가 필요합니다.


## v29 수정 사항 - 라디오/음원 카드 폭 축소
라디오(Radios) / 음원(Songs) 카드가 내용에 비해 너무 넓게 보이는 문제를 수정했습니다.

적용 내용:
- `#radioList`, `#songList`를 왼쪽 정렬 column 레이아웃으로 조정
- `#radioList .content-card`, `#songList .content-card` 폭을 `fit-content`로 축소
- 최대 폭 520px, 최소 폭 320px 적용
- 오디오 플레이어 폭을 280px로 제한
- 캐시 방지를 위해 app 로딩 쿼리를 v29로 변경


## v30 수정 사항 - 라디오/음원 카드 더 작고 단정한 버전
라디오(Radios) / 음원(Songs) 카드의 크기를 더 줄이고 시각적으로 정리했습니다.

적용 내용:
- 카드 최대 폭 420px
- 카드 최소 폭 280px
- 내부 여백 축소
- 제목 17px, 본문 14px로 정리
- 오디오 플레이어 폭 250px
- 그림자와 테두리를 더 얌전하게 조정
- 모바일에서는 화면 폭에 맞게 100% 표시
- 캐시 방지를 위해 app 로딩 쿼리를 v30으로 변경


## v31 수정 사항 - 작은 카드 + 다운로드 방지 통합판
v30의 작은 오디오 카드 스타일과 v28의 다운로드 방지 기능을 통합해서 다시 적용했습니다.

포함 기능:
- 라디오/음원 카드 최대 폭 420px
- 오디오 플레이어 폭 250px
- audio/video 다운로드 버튼 숨김
- 우클릭 저장 방지
- 상세창에서도 다운로드 버튼 숨김
- 렌더링 후 audio/video에 다운로드 방지 속성 재적용
- 캐시 방지용 v31 적용

한계:
GitHub Pages에 공개된 mp3/mp4/wav 파일은 직접 URL을 알면 받을 수 있습니다.
이 버전은 사이트 화면의 다운로드 버튼과 우클릭 저장을 막는 수준입니다.
완전 차단은 비공개 저장소/서명 URL/스트리밍 프록시 구조가 필요합니다.


## v32 수정 사항 - PC 버전 레이아웃
PC 화면 기준으로 레이아웃을 다시 정리했습니다.

적용 내용:
- 전체 사이트 최소 폭 1180px 적용
- 상단 메뉴를 PC형 가로 메뉴로 고정
- 본문 최대 폭 1280px / 주요 콘텐츠 1120px 기준 정리
- 카드 그리드 PC 4열 기준
- 갤러리 템플릿은 3열 기준
- 라디오/음원 카드는 작은 420px 박스형 유지
- 관리자 화면 입력 영역 PC 폭 정리
- 상세창은 PC 기준 980px 폭으로 조정
- 다운로드 방지 기능은 v31 기준 유지

주의:
이 버전은 PC 웹사이트 기준입니다.
모바일에서는 가로 스크롤이 생길 수 있습니다.


## v33 수정 사항 - 라디오/음원 목록 정돈형 레이아웃
라디오/음원 화면에서 큰 빈 박스 안에 내용만 왼쪽으로 붙어 보이는 문제를 수정했습니다.

적용 내용:
- Radios/Songs의 큰 list-box 배경/테두리 제거
- 각 자료를 독립된 작은 카드로 정리
- PC 기준 2열 카드 배치
- 카드 폭 420px 고정
- 제목/본문/연도/출처 글씨 간격 정리
- 오디오 플레이어 폭 270px로 정리
- 반복 출력되던 v31/v32 버전 표시 제거
- 다운로드 방지 기능 유지


## v34 수정 사항 - 깔끔한 프레임형 레이아웃
사용자가 원하는 예시처럼 Radios / Songs 목록을
큰 부드러운 프레임 안에 정돈된 개별 카드가 들어가는 방식으로 다시 정리했습니다.

적용 내용:
- 큰 외곽 프레임: 연한 배경 + 둥근 모서리 + 얇은 테두리
- 내부 카드: 420px 고정 폭, 넉넉한 여백, 더 얌전한 그림자
- 제목 아래 구분선 추가
- 설명 / 연도 / 출처 타이포그래피와 줄간격 정리
- 오디오 플레이어 위치와 여백 정리
- 하단 버전 표시 숨김
- 다운로드 방지 기능 유지


## v43 수정 사항 - 안정판 app.js 복구
v34의 정상 작동 레이아웃을 기준으로 다시 구성했습니다.
index.html은 app.js 하나만 읽습니다.

포함 기능:
- 자료별 최신 자료
- 비로그인 상태의 제한 자료 최신자료 클릭 차단
- 페이지별 검색
- Videos/Radios/Photos/Oneum 로그인 제한
- “로그인을 하지 않으셨네요!” 화면
- 회원정보 수정
- 회원탈퇴
- v34의 깔끔한 프레임형 Radios/Songs 레이아웃 유지

중요:
GitHub에는 ZIP 안의 파일을 루트에 덮어쓰기해야 합니다.
index.html의 마지막 script는 아래여야 합니다.
<script type="module" src="app.js?v=43-stable-appjs-member"></script>


## v44 수정 사항 - 우클릭/F12 차단 재적용
사이트 화면에서 일반 사용자가 쉽게 개발자도구나 저장 기능을 쓰지 못하도록 방지 코드를 다시 적용했습니다.

차단:
- 오른쪽 클릭
- F12
- Ctrl + Shift + I
- Ctrl + Shift + J
- Ctrl + Shift + C
- Ctrl + U
- Ctrl + S
- Ctrl + P
- 이미지/오디오/비디오 드래그 저장
- 일반 텍스트 선택

허용:
- input / textarea / select 입력창 안에서는 텍스트 선택 가능

한계:
브라우저 메뉴에서 직접 개발자도구 열기, 확장 프로그램, 직접 URL 접근, GitHub 공개 파일 접근까지 완전히 막을 수는 없습니다.


## v45 수정 사항 - 상세창 원본파일/깨진 이미지 표시 오류 수정
라디오/음원 자료의 상세창에서 원본파일 또는 깨진 이미지처럼 보이던 문제를 수정했습니다.

수정 내용:
- 상세창 미디어 표시를 자료 종류별로 분기
- Videos: 영상/유튜브 플레이어
- Songs/Radios: 오디오 플레이어
- Photos: 이미지
- Stories/About/Oneum: 글 중심, 이미지가 있을 때만 이미지 표시
- 썸네일/대표 이미지가 없으면 깨진 이미지 영역 자체를 표시하지 않음
- 오디오 플레이어에도 다운로드 방지 속성 유지


## v46 수정 사항 - 홈 화면 김광석 육성 오디오 추가
홈 화면에 김광석 육성 오디오 하나를 표시할 수 있는 기능을 추가했습니다.

관리자 화면:
- 템플릿/사이트 수정
- “홈 화면 김광석 육성”
- 제목 입력
- 설명 입력
- mp3/wav URL 입력
- 사이트 문구/배경 저장

동작:
- 오디오 URL이 비어 있으면 홈 화면에 표시하지 않음
- 오디오 URL이 있으면 홈 화면 히어로 아래에 오디오 플레이어 표시
- 다운로드 버튼 숨김/우클릭 방지 유지

추천 URL:
https://mdshoons.github.io/kwangseoks/audios/파일명.mp3
또는
https://mdshoons.github.io/kwangseoks/radios/파일명.wav


## v47 수정 사항 - 홈 화면 김광석 육성 자동재생
홈 화면의 김광석 육성을 플레이어 표시 방식이 아니라 자동재생 방식으로 변경했습니다.

동작:
- 홈 화면 진입 시 한 번 자동재생 시도
- 브라우저가 소리 자동재생을 허용하면 바로 재생
- 브라우저가 자동재생을 차단하면 첫 클릭/터치/키 입력 때 한 번 재생
- 같은 브라우저 세션에서는 한 번만 재생
- 오디오 플레이어는 화면에 보이지 않음

중요:
Chrome/Edge/Safari 등 대부분의 브라우저는 사용자의 상호작용 없이 소리 나는 오디오 자동재생을 막을 수 있습니다.
그래서 완전한 무조건 자동재생은 보장할 수 없고, 첫 클릭/터치 재생 fallback을 함께 넣었습니다.


## v48 수정 사항 - 홈 화면 육성 음원 파일 포함
사용자가 업로드한 mp3 파일을 사이트 안에 포함했습니다.

파일 위치:
audios/kim-kwangseok-voice-greeting.mp3

기본 재생 URL:
https://mdshoons.github.io/kwangseoks/audios/kim-kwangseok-voice-greeting.mp3

동작:
- 관리자 화면에서 별도 URL을 넣지 않아도 이 파일이 홈 화면 육성 자동재생 기본값으로 사용됩니다.
- 브라우저가 자동재생을 막으면 첫 클릭/터치/키 입력 때 한 번 재생됩니다.
- 같은 브라우저 세션에서는 한 번만 재생됩니다.

주의:
GitHub Pages 배포 후 파일 URL이 실제로 열리는지 확인하세요.
https://mdshoons.github.io/kwangseoks/audios/kim-kwangseok-voice-greeting.mp3


## v50 수정 사항 - 홈 큰 사진 hover 시 김광석 육성 재생
홈 화면의 “김광석의 목소리” 카드/플레이어를 완전히 제거했습니다.

동작:
- /kwangseoks/ 또는 /kwangseoks/#home 접속
- 홈 화면의 큰 김광석 사진 영역, 즉 “노래가 머무는 이 곳…” 히어로 이미지 영역에 마우스 커서가 닿으면 육성 재생 시도
- 모바일에서는 큰 사진 영역을 터치하면 재생 시도
- 화면에는 오디오 플레이어, 김광석 육성 카드, 안내 문구가 표시되지 않음

주의:
일부 브라우저는 hover만으로 소리 재생을 막을 수 있습니다.
그 경우 같은 사진 영역을 클릭/터치하면 재생됩니다.


## v51 수정 사항 - 상세정보 클릭/표시 복구
사진, 영상, 음성, 일기 등을 클릭해도 상세정보가 나오지 않던 문제를 수정했습니다.

원인:
- index.html의 상세창 구조는 `detailMediaArea`, `detailTitle`, `detailCategory`, `detailMeta`, `detailDescription` 방식이었음
- 이전 JS는 없는 요소인 `contentDetailBody`를 찾고 있었음
- 그래서 클릭해도 상세창 내용이 채워지지 않았음

수정:
- openContentDetail()을 기존 HTML 구조에 맞게 재작성
- closeContentDetail()도 안전하게 재작성
- Videos / Songs / Radios / Photos / Stories / About / Oneum 상세정보 표시 복구
- 라디오/음원은 깨진 이미지 대신 오디오 플레이어 표시
