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
