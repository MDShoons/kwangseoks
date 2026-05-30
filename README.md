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


## v52 수정 사항 - 홈 큰 사진 hover 재생 / 이탈 일시정지
홈 화면 큰 김광석 사진 영역의 육성 재생 방식을 수정했습니다.

동작:
- 커서가 사진 위에 올라가면 멈춘 지점부터 이어서 재생
- 커서가 사진 밖으로 나가면 일시정지
- 다시 커서가 올라가면 이어서 재생
- 클릭하면 재생/일시정지 토글
- 모바일에서는 사진 영역을 터치하면 재생/일시정지 토글
- 화면에는 오디오 플레이어 또는 김광석 육성 카드가 표시되지 않음

주의:
일부 브라우저는 hover만으로 소리 재생을 막을 수 있으므로, 그 경우 사진 영역을 한 번 클릭하면 됩니다.


## v53 수정 사항 - 페이지네이션 / 정렬 / 등록일 표시
홈 화면과 관리자 화면을 제외한 자료 페이지에 목록 운영 기능을 추가했습니다.

적용 페이지:
- Videos
- Songs
- Radios
- Photos
- Stories
- About Seok
- Oneum

추가 기능:
- 한 페이지에 자료 6개씩 표시
- 6개 초과 시 페이지 번호 표시
- 이전 / 다음 버튼 표시
- 최신 순 / 오래된 순 정렬 선택
- 각 자료 카드에 등록일 표시: 20nn년 nn월 nn일

주의:
등록일은 Firestore의 createdAt 값을 기준으로 표시합니다.
createdAt 값이 없는 오래된 자료는 updatedAt/date를 보조로 사용하며, 그래도 없으면 ‘등록일 미기재’로 표시됩니다.


## v54 수정 사항 - 업로드 날짜와 시간 표시
자료 카드의 등록일 표시를 업로드 날짜+시간 형식으로 바꿨습니다.

표시 예:
업로드일: 2026년 05월 24일 | 16:35

기준:
- Firestore createdAt 우선
- createdAt이 없으면 updatedAt / createdDate / date 순서로 보조 사용
- 값이 없으면 ‘등록일 미기재’ 표시


## v55 수정 사항 - Stories 목록 본문 미리보기
Stories 페이지에서 일기 전체 내용이 목록에 모두 보이던 문제를 수정했습니다.

수정 내용:
- Stories 목록에는 제목, 일부 본문, 연도, 출처, 업로드일만 표시
- 긴 본문은 4줄 정도로 제한
- “전체 일기는 상세보기에서 볼 수 있습니다.” 안내 표시
- 일기 전체 내용은 카드를 클릭한 상세보기에서만 표시
- 다른 카드형 자료도 본문이 너무 길게 나오지 않도록 미리보기 처리


## v56 수정 사항 - 상세보기 업로드 날짜/시간 표시
상세보기 화면에도 업로드 날짜와 시간을 표시하도록 수정했습니다.

표시 위치:
- 상세보기의 연도 / 출처 아래

표시 형식:
업로드일: 2026년 05월 24일 | 16:35

기준:
- Firestore createdAt 우선
- createdAt이 없으면 updatedAt / createdDate / date 순서로 보조 사용
- 값이 없으면 ‘등록일 미기재’ 표시


## v57 수정 사항 - About Seok 소개글 전용 페이지
About Seok은 자료 목록 페이지가 아니라 김광석 소개글 페이지로 변경했습니다.

수정 내용:
- About Seok 페이지에서 검색창 제거
- 최신 순 / 오래된 순 제거
- 카테고리 필터 제거
- 페이지 번호 제거
- 자료 카드 목록 제거
- About 카테고리에 등록된 글 중 가장 최근 글 1개를 소개글처럼 표시
- 본문 전체가 About Seok 페이지에 바로 표시
- 홈의 자료별 최신 자료에서도 About Seok 최신 박스 제외

관리 방식:
관리자에서 About 카테고리로 글을 등록하면, 가장 최근 About 글이 소개글로 표시됩니다.


## v58 수정 사항 - 사진 확대/축소 툴 + 캡처 억제 보조
사진 상세보기에서 확대/축소 기능을 추가했습니다.

사진 상세보기 기능:
- 확대 +
- 축소 -
- 원본
- 마우스 휠 확대/축소
- 확대 상태에서 드래그 이동
- 더블클릭 확대/원본 전환

캡처/녹화 억제 보조:
- PrintScreen 키 감지 시 화면 보호 오버레이 표시 시도
- 인쇄 시 내용 숨김
- 화면 이탈/앱 전환 시 블러 처리
- 기존 우클릭/F12/드래그 저장 방지 유지

중요한 한계:
웹사이트 코드만으로는 휴대폰 캡처, OS 화면녹화, 외부 카메라 촬영을 100% 차단할 수 없습니다.
브라우저가 웹페이지에 그런 권한을 제공하지 않기 때문입니다.
이 버전은 가능한 범위의 억제/방해 기능입니다.


## v59 수정 사항 - About Seok 클릭 시 Home으로 이동하는 문제 수정
About Seok을 눌렀을 때 Home으로 이동하던 문제를 수정했습니다.

수정 내용:
- VALID_PAGES에 about 라우트 복구
- About Seok 메뉴 버튼을 goPage('about')로 고정
- #about 페이지 섹션 확인 및 복구
- About Seok은 검색/정렬/페이지번호 없는 소개글 전용 페이지로 유지
- About 카테고리에 등록된 가장 최근 글 1개를 소개글처럼 표시
- 홈 화면 자료별 최신자료에서는 About Seok 제외 유지


## v60 수정 사항 - 전역 오늘의 추천곡 미니 플레이어
모든 페이지 왼쪽에 오늘의 추천곡 미니 플레이어를 추가했습니다.

동작:
- Songs에 등록된 음원 중 하루 한 곡 자동 추천
- 한국시간 기준 날짜별 추천곡
- 매일 00:00에 추천곡 변경
- 같은 날짜에는 모든 사용자에게 같은 곡 추천
- 개인별 랜덤이 아니라 날짜별 공통 추천
- 재생/일시정지, 진행바, 현재시간/전체시간 표시
- 다운로드 버튼 없는 숨김 audio 사용

추천 기준:
- category가 songs인 자료
- mediaUrl/fileUrl/audioUrl 중 재생 URL이 있는 자료
- 한국 날짜 문자열을 seed로 사용해 같은 날 같은 곡 선택

주의:
Songs에 재생 가능한 음원이 하나도 없으면 플레이어는 표시되지 않습니다.


## v61 수정 사항 - About Seok 문서형/연보형 페이지
About Seok을 ‘가장 최근 글 1개’가 아니라 김광석 연보와 관련 글을 여러 개 쌓는 문서형 페이지로 변경했습니다.

동작:
- 검색창 없음
- 최신순/오래된순 없음
- 카테고리 필터 없음
- 페이지번호 없음
- 카드형 자료 목록 아님
- about 분류로 등록한 글 전체를 문서처럼 표시
- 각 글은 제목, 연도, 출처, 업로드일, 본문으로 구성
- 사진이 있으면 글 위에 표시
- 연도가 있으면 연도 기준 오름차순 정렬
- 연도가 없으면 업로드 시점 기준 오름차순 정렬

관리:
관리자에서 분류를 about으로 선택해 김광석 연보/소개글/관련 글을 여러 개 등록하면 About Seok 페이지에 문서형으로 쌓입니다.


## v62 수정 사항 - 추천곡 없을 때도 플레이어 유지
오늘의 추천곡 미니 플레이어가 Songs 음원이 없을 때 숨겨지지 않도록 수정했습니다.

동작:
- Songs에 재생 가능한 곡이 있으면 오늘의 추천곡 표시
- Songs에 재생 가능한 곡이 없으면 플레이어 UI는 그대로 표시
- 제목 영역에 “재생할 곡이 없습니다” 표시
- 설명 영역에 “Songs에 음원을 등록하면 오늘의 추천곡이 표시됩니다.” 표시
- 재생 버튼과 진행바는 비활성화


## v63 수정 사항 - 오늘의 추천곡 플레이어 오른쪽 고정 UI
오늘의 추천곡 플레이어가 화면 상단 전체폭으로 펼쳐지는 문제를 수정했습니다.

수정 내용:
- 플레이어를 오른쪽 사이드 고정 박스로 배치
- 헤더 위가 아니라 본문 오른쪽에 떠 있도록 수정
- 노래가 없어도 작은 플레이어 안에 “재생할 곡이 없습니다” 표시
- 재생 버튼/진행바는 비활성화
- PC 화면에서는 오른쪽 고정
- 좁은 화면에서도 상단 전체폭으로 펼쳐지지 않도록 강제


## v64 수정 사항 - 오늘의 추천곡 볼륨 조절 / 음소거
오늘의 추천곡 미니 플레이어에 볼륨 조절과 음소거 기능을 추가했습니다.

추가 기능:
- 음소거 / 음소거 해제 버튼
- 볼륨 슬라이더
- 기본 볼륨 70%
- 사용자가 조절한 볼륨 localStorage 저장
- 다음 접속 때 마지막 볼륨/음소거 상태 유지


## v65 수정 사항 - 볼륨 UI 소형화
오늘의 추천곡 플레이어에서 볼륨 조절 영역이 너무 크게 보이던 문제를 수정했습니다.

수정 내용:
- 음소거 버튼을 작은 아이콘형 버튼으로 축소
- 볼륨 슬라이더 길이 축소
- 볼륨 줄 높이 축소
- 튀는 기본 초록색 range 스타일 제거
- 볼륨 조절이 보조 기능처럼 보이도록 정리


## v66 수정 사항 - 볼륨 UI 강제 소형화
v65에서도 브라우저 기본 range 스타일이 남아 볼륨 조절이 크게 보이던 문제를 수정했습니다.

수정 내용:
- volume range에 id 기준 강제 CSS 적용
- inline style도 함께 적용
- appearance 제거
- 초록색 기본 슬라이더 색 제거
- 음소거 버튼 18px
- 볼륨 바 54px
- 볼륨 영역 전체 78px


## v67 수정 사항 - 라디오 흑백 커스텀 플레이어
- Radios 목록과 상세보기에서 기본 브라우저 audio UI 대신 흑백 커스텀 플레이어 적용
- 두 번째 예시 이미지처럼 더 정돈된 크기와 분위기로 조정
- 재생/일시정지, 진행바, 음소거, 볼륨 조절 포함
- Songs는 기존 기본 플레이어 유지


## v68 수정 사항 - Cloudflare Worker 업로드 주소 수정
미디어 파일 저장 오류를 막기 위해 사이트가 읽는 Worker 주소를 새 주소로 고정했습니다.

Worker URL:
https://kwangseoks-uploader.kos20050627.workers.dev

Health 확인:
https://kwangseoks-uploader.kos20050627.workers.dev/health

정상 예:
{"ok":true}

적용 후 확인:
- index.html 마지막 script가 app.js?v=68-worker-url-fix 인지 확인
- firebase-config.js 안의 GITHUB_UPLOAD_WORKER_URL 값이 https://kwangseoks-uploader.kos20050627.workers.dev 인지 확인
- GitHub Pages 배포 후 Ctrl + F5


## v69 수정 사항 - Worker 업로드 방식을 Git Data API로 변경
GitHub Contents API가 큰 파일에서 다음 오류를 내는 문제를 줄이기 위해 Worker 코드를 교체했습니다.

오류:
Sorry, the file is too large to be processed.

수정:
- GitHub Contents API 방식 제거
- Git Data API 방식 사용
  1. blob 생성
  2. tree 생성
  3. commit 생성
  4. branch ref 업데이트

주의:
- GitHub 자체가 너무 큰 파일 저장에는 적합하지 않습니다.
- 95MB를 넘는 파일은 기본적으로 Worker에서 거절합니다.
- 긴 mp4, 큰 wav는 Cloudflare R2 또는 Firebase Storage를 쓰는 편이 안전합니다.

Cloudflare에서 반드시 해야 할 일:
1. Workers & Pages
2. kwangseoks-uploader Worker 선택
3. Edit code 또는 Deployments 쪽에서 worker 코드 교체
4. cloudflare-worker-github-uploader.js 전체 내용 붙여넣기
5. Deploy

Health 확인:
https://kwangseoks-uploader.kos20050627.workers.dev/health

정상 version:
v69-git-data-api


## v70 수정 사항 - 사이트 업로드 Worker 주소 강제 고정
사이트가 firebase-config.js를 못 읽거나 캐시 때문에 예전 Worker 주소를 쓰는 문제를 막기 위해 app.js 안에 Worker 주소를 직접 고정했습니다.

강제 Worker URL:
https://kwangseoks-uploader.kos20050627.workers.dev

업로드 함수:
- ACTIVE_UPLOAD_WORKER_URL 사용
- /upload로 직접 POST
- cache: no-store
- 연결 실패 시 현재 사용 중인 Worker 주소를 오류에 직접 표시

확인:
1. GitHub에 v70 전체 덮어쓰기
2. Commit changes
3. Ctrl + F5
4. 브라우저에서 아래 주소 확인
   https://kwangseoks-uploader.kos20050627.workers.dev/health

중요:
Cloudflare Worker 코드 자체도 v69 Git Data API 코드로 Deploy되어 있어야 합니다.


## v71 수정 사항 - 오늘의 추천곡 닫기 버튼
오늘의 추천곡 미니 플레이어에 X 닫기 버튼을 추가했습니다.

동작:
- X 버튼 클릭 시 플레이어 숨김
- 재생 중이면 자동 일시정지
- 숨김 상태는 브라우저 localStorage에 저장
- 한국시간 날짜 기준으로 하루 동안 숨김 유지
- 다음 날이 되면 다시 표시


## v72 수정 사항 - 업로드 Firebase ID Token 전송 복구
미디어 업로드 시 “Firebase ID Token이 없습니다.” 오류가 발생하던 문제를 수정했습니다.

수정 내용:
- 업로드 전 로그인 상태 확인
- currentUser.getIdToken(true)로 Firebase ID Token 발급
- Worker /upload 요청에 Authorization: Bearer <token> 헤더 추가
- 토큰이 없으면 다시 로그인하라는 오류 표시

적용 후:
1. GitHub에 v72 전체 덮어쓰기
2. Commit changes
3. Ctrl + F5
4. 로그아웃 후 다시 로그인
5. 미디어 업로드 재시도

중요:
Cloudflare Worker가 Firebase ID Token 검증을 요구하는 구조라면, 이 버전부터 토큰이 전달됩니다.


## v73 수정 사항 - CORS 안전 업로드
v72에서 Authorization 헤더 때문에 브라우저 preflight/CORS 문제가 발생할 수 있어 수정했습니다.

수정 내용:
- 사이트 업로드 요청에서 Authorization 헤더 제거
- Firebase ID Token을 formData의 idToken 필드로 전송
- Worker는 Authorization Bearer 또는 formData idToken 둘 다 허용
- Worker OPTIONS 응답과 CORS 헤더 보강
- Worker health version: v73-cors-safe-upload

중요:
GitHub에 v73을 올리는 것만으로는 부족합니다.
Cloudflare Worker 코드도 ZIP 안의 cloudflare-worker-github-uploader.js 내용으로 교체 후 Deploy해야 합니다.

확인:
https://kwangseoks-uploader.kos20050627.workers.dev/health

정상:
version: v73-cors-safe-upload


## v74 수정 사항 - CORS 원인 분리용 Worker
아직도 Failed to fetch가 나는 경우를 위해 CORS를 가장 단순한 방식으로 완화했습니다.

수정 내용:
- Worker 응답 Access-Control-Allow-Origin: *
- Access-Control-Allow-Headers: *
- 사이트 fetch는 Authorization 헤더 없이 FormData만 사용
- credentials: omit
- health version: v74-origin-bypass-upload

중요:
이 버전도 Cloudflare Worker 코드 교체가 필수입니다.
ZIP 안의 cloudflare-worker-github-uploader.js 내용을 Worker에 붙여넣고 Deploy하세요.

정상 확인:
https://kwangseoks-uploader.kos20050627.workers.dev/health
version: v74-origin-bypass-upload


## v75 수정 사항 - 미디어 링크 입력 방식 전환
파일 직접 업로드 방식 대신 링크 입력 중심으로 전환했습니다.

핵심:
- mp3 / wav / mp4 / 이미지 파일을 직접 GitHub로 올리지 않아도 됨
- 관리자 화면의 URL 칸에 외부 링크를 입력하면 저장
- URL이 입력되어 있으면 Cloudflare Worker를 호출하지 않음
- 파일 선택은 선택사항으로 남겨두었지만, 권장 방식은 URL 입력

권장 링크 예:
- YouTube 영상 링크
- archive.org 음원/영상 링크
- Cloudflare R2 공개 URL
- Firebase Storage 다운로드 URL
- GitHub raw 또는 GitHub Pages 파일 URL
- Google Drive 직접 다운로드 가능한 공유 링크

적용 후:
index.html 하단 버전이 v75-link-only-media로 보여야 합니다.


## v76 수정 사항 - 구글드라이브 링크 재생 지원
구글드라이브 공유 링크를 입력해도 사이트에서 재생 가능하도록 링크 변환 기능을 추가했습니다.

지원 입력:
- https://drive.google.com/file/d/파일ID/view?usp=sharing
- https://drive.google.com/uc?export=download&id=파일ID

내부 변환:
- drive.google.com/file/d/파일ID/view
  → https://drive.google.com/uc?export=download&id=파일ID

적용:
- Songs
- Radios
- Videos
- Photos
- 상세보기
- 오늘의 추천곡 플레이어

주의:
구글드라이브 파일 공유 설정이 반드시 “링크가 있는 모든 사용자: 뷰어”여야 합니다.
파일이 너무 크거나 구글이 바이러스 검사/쿠키 확인 페이지를 끼워 넣으면 브라우저 플레이어에서 재생이 막힐 수 있습니다.


## v77 수정 사항 - URL 입력칸 인식 오류 수정
구글드라이브 링크를 넣어도 “미디어 링크를 입력하세요”가 뜨던 문제를 수정했습니다.

원인:
- 저장 함수가 실제 화면의 URL 입력칸 id와 다른 id를 찾고 있었을 가능성이 큼
- 링크를 넣었어도 코드에서는 빈 값으로 판단

수정:
- audioUrl, radioUrl, radioMediaUrl, radioFileUrl, radioLink 등 가능한 URL 입력칸 id를 모두 탐색
- Songs / Radios / Videos / Photos 저장 함수 보강
- 구글드라이브 file/d/.../view 링크 자동 변환 유지

적용 후 사이트 하단 버전:
v77-url-input-read-fix


## v78 수정 사항 - Songs UI를 Radios UI와 동일하게 변경
Songs 페이지의 오디오 재생 UI를 Radios 페이지와 같은 흑백 커스텀 플레이어로 변경했습니다.

수정 내용:
- Songs 목록 기본 audio 플레이어 제거
- Songs 목록에 Radios와 동일한 흑백 커스텀 플레이어 적용
- Songs 상세보기에도 동일한 플레이어 적용
- 재생/일시정지, 진행바, 시간 표시, 음소거, 볼륨 조절 동일 적용
- Radios UI는 기존 유지

적용 후 사이트 하단 버전:
v78-songs-match-radios-ui


## v101-real-mobile-layout
- Z Flip 같은 좁은 모바일 화면에서 PC폭 잔여 규칙으로 인한 가로 밀림을 강제로 해제했습니다.
- 모바일 메뉴를 반투명 겹침형이 아니라 고정 패널형으로 분리했습니다.
- 메인 최신자료 카드를 모바일에서 짧고 읽기 쉽게 압축했습니다.


## v114 수정 사항 - 우클릭/F12 차단 재적용
- 사이트 전체 우클릭 메뉴를 차단했습니다.
- F12, Ctrl+Shift+I/J/C/K, Ctrl+U, Ctrl+S 단축키를 차단했습니다.
- 이미지/영상/오디오 드래그를 차단했습니다.
- 입력폼은 관리자 등록·수정 작업을 위해 텍스트 입력과 선택을 유지했습니다.

※ 브라우저 보안 구조상 개발자도구 접근을 100% 원천 차단할 수는 없지만, 일반적인 우클릭·단축키 접근은 막도록 적용했습니다.


## v115 수정 사항 - Oneum 페이지당 8개 표시

- Oneum 목록의 페이지당 표시 개수를 기존 6개에서 8개로 변경했습니다.
- Videos, Songs, Radios, Photos, Stories 등 다른 페이지는 기존 6개 표시 기준을 유지합니다.
- 캐시 방지 버전을 `v115-oneum-page-size-8`로 변경했습니다.


## v116 수정 사항 - Songs 사용자 플레이리스트

- Songs 목록 카드에 `플레이리스트 담기` 버튼을 추가했습니다.
- 담은 곡은 브라우저 localStorage에 저장되어 새로고침해도 유지됩니다.
- 담긴 곡이 있을 때만 오늘의 추천곡 아래에 `내 플레이리스트` 미니 플레이어가 표시됩니다.
- 플레이리스트 플레이어는 오늘의 추천곡과 같은 미니 플레이어형 UI를 사용하며 재생/일시정지, 진행바, 음소거/볼륨, 이전/다음곡, 현재곡 빼기, 비우기를 지원합니다.
- 캐시 방지 버전을 `v116-song-playlist-player`로 변경했습니다.


## v136-stable-interaction-actual
- v130 정상본 기준 통신방만 실제 패치
- 회원별 말투/호칭 관계 보정
- 뭐하세요 질문 의미 보정
- 김광석 퇴장 후 바쁨 안내 반복 제거
- 재호출 가능 시 Y/N 입력 처리
- 캐시 방지 쿼리 v136 적용


## v139-pc-webllm-experiment
- 광석이네 통신방을 PC 전용으로 제한했습니다.
- 대화 방식에 기본 PC통신 대화 / 실험: PC 브라우저 생성형 옵션을 추가했습니다.
- 생성형 실험 모드는 WebGPU 지원 PC 브라우저에서 WebLLM을 동적으로 불러와 김광석 답변 생성을 시도하고, 실패하면 기본 대화로 자동 전환합니다.


## v144-human-dialogue-flow
- 통신방에 제타식 대화 묶음 흐름 추가: 사용자 입력 후 회원 1~2명, 회원끼리 후속 질문, 김광석 끼어듦, 추가 회원 반응이 시간차로 이어집니다.
- '뭐하세요?' 질문은 실제 행동 답변으로 분기합니다.
- WebLLM 실험 모드는 유지하되 실패 시 기본 관계형 대화로 자동 전환합니다.


## v144-human-dialogue-flow
- 통신방 대화를 랜덤 발화가 아니라 주제별 턴 흐름으로 보정했습니다.
- 질문/답변/회원 간 이어받기/김광석 끼어들기 흐름을 추가했습니다.


## v146 pages build safe
- Added .nojekyll to bypass GitHub Pages Jekyll processing.
- app.js syntax checked with node -c.

## v173 광석이네 통신방: Cloud Functions + OpenAI AI 대사 생성

이번 버전은 기존 Firebase 실시간 통신방에 `functions/telecomAiReply` callable function을 추가했습니다.
브라우저는 사용자 메시지만 Firestore에 저장하고, AI API 키는 Firebase Secret으로 숨긴 Cloud Functions에서만 사용합니다.

배포 요약:

```bash
firebase login
firebase use --add
cd functions
npm install
cd ..
firebase functions:secrets:set OPENAI_API_KEY
firebase deploy --only firestore:rules,functions
```

GitHub Pages를 계속 쓰는 경우 정적 파일은 GitHub에 올리고, `functions`와 `firestore.rules`는 Firebase CLI로 별도 배포해야 합니다.
자세한 순서는 `FIREBASE_AI_TELECOM_SETUP.txt`를 확인하세요.


## v174 광석이네 통신방: Cloudflare Workers AI 대사 생성

이 버전은 Firebase Cloud Functions/OpenAI 결제 구조 대신 Cloudflare Workers AI를 호출하도록 변경했습니다.

구조:

```text
GitHub Pages 화면
→ Cloudflare Worker 호출
→ Workers AI가 통신방 멤버 대사 생성
→ 브라우저가 로그인 사용자 권한으로 Firestore에 generated member 메시지 저장
```

핵심 파일:

```text
app.js
cloudflare-worker-ai-telecom.js
CLOUDFLARE_WORKERS_AI_TELECOM_SETUP.txt
firestore.rules
```

설정 순서:

1. Cloudflare에서 Worker를 만들고 `cloudflare-worker-ai-telecom.js` 내용을 붙여넣습니다.
2. Worker에 Workers AI binding을 추가하고 binding name을 `AI`로 설정합니다.
3. 배포 후 나온 Worker URL을 `app.js`의 `FB_TELECOM_AI_WORKER_URL` 값에 넣습니다.
4. GitHub Pages에는 수정된 정적 파일을 올립니다.
5. Firestore 규칙은 기존 규칙과 충돌하지 않게 `chatRooms` 부분을 합쳐 적용합니다.

자세한 순서는 `CLOUDFLARE_WORKERS_AI_TELECOM_SETUP.txt`를 확인하세요.


## 변경 안내

- 광석이네 통신방 메뉴와 페이지를 제거했습니다.
- Cloudflare Workers AI 통신방 관련 파일은 삭제했습니다.
- 기존 자료실, Songs, Radios, Photos, Stories, About, Oneum, 관리자 기능은 유지했습니다.


## v186 통신방 안내 제거

- 사이트 안내 페이지에서 광석이네 통신방 설명 카드를 제거했습니다.
- 통신방 메뉴/페이지 제거 상태를 유지합니다.
