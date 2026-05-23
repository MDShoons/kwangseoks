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
