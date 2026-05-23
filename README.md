# 광석이네집 - 관리자 편집 가능 GitHub Pages 버전

이 파일 세트는 GitHub Pages에 올릴 수 있는 정적 웹사이트입니다.  
Firebase Authentication과 Firestore를 연결하면 사이트 안에서 관리자 편집이 가능합니다.

## 포함 기능

- PC 웹 메인 화면
- videos / songs / radios / photos / stories / about seok / oneum
- 회원가입
- 로그인
- 마이페이지
- 관리자 전용 메뉴
- 관리자 템플릿 편집
  - 사이트 로고 이름
  - 메인 제목
  - 메인 설명
  - 오늘의 기록 문구
  - about seok 소개문
  - 푸터 문구
- 관리자 콘텐츠 등록/수정/삭제
- 공개 상태 설정
  - 전체 공개
  - 회원 공개
  - 비공개

## 관리자 계정 정보

관리자 권한은 아래 두 관리자 아이디/메일주소에 열리도록 만들어져 있습니다.

```text
관리자 1
이름: 최일훈
전화번호: 010-3143-2729
관리자 아이디: oldsong0106
관리자 메일주소: kos20050627@gmail.com

관리자 2
이름: 최민수
전화번호: 010-3016-0413
관리자 아이디: shinestone0106
관리자 메일주소: shinestone0106@kakao.com
```

중요: 관리자 비밀번호는 GitHub 코드에 넣지 않았습니다.  
비밀번호를 GitHub에 올리면 공개 저장소에서 노출될 수 있으므로 매우 위험합니다.

## 관리자 계정 만드는 방법

1. 사이트에 접속합니다.
2. 회원가입을 누릅니다.
3. 아래 관리자 정보 중 하나로 가입합니다.
   - 관리자 1: 최일훈 / 010-3143-2729 / oldsong0106 / kos20050627@gmail.com
   - 관리자 2: 최민수 / 010-3016-0413 / shinestone0106 / shinestone0106@kakao.com
   - 비밀번호: 본인이 정한 관리자 비밀번호
4. 가입 후 로그인합니다.
5. 상단 메뉴에 `관리자`가 보이면 정상입니다.

## Firebase 설정 방법

1. Firebase Console에서 프로젝트를 만듭니다.
2. 웹 앱을 추가합니다.
3. Firebase 설정값을 복사합니다.
4. `app.js`의 `firebaseConfig`를 본인 값으로 바꿉니다.

```js
const firebaseConfig = {
  apiKey: "여기에_apiKey",
  authDomain: "여기에_authDomain",
  projectId: "여기에_projectId",
  storageBucket: "여기에_storageBucket",
  messagingSenderId: "여기에_messagingSenderId",
  appId: "여기에_appId"
};
```

## Firebase Authentication 설정

1. Firebase Console에서 `Authentication`으로 이동합니다.
2. `Sign-in method`를 선택합니다.
3. `Email/Password`를 활성화합니다.

## Firestore Database 설정

1. Firebase Console에서 `Firestore Database`를 만듭니다.
2. `Rules` 메뉴로 이동합니다.
3. 이 폴더의 `firestore.rules` 내용을 복사해서 붙여넣습니다.
4. 게시합니다.

## GitHub Pages 업로드 방법

1. GitHub에서 새 저장소를 만듭니다.
2. 이 폴더 안의 파일을 모두 업로드합니다.
3. 저장소 `Settings`로 이동합니다.
4. `Pages` 메뉴를 선택합니다.
5. Source를 `Deploy from a branch`로 선택합니다.
6. Branch는 `main`, 폴더는 `/root`로 설정합니다.
7. 저장하면 사이트 주소가 생성됩니다.

## 중요한 보안 설명

이 사이트는 GitHub Pages에서 돌아가는 정적 웹사이트입니다.  
그래서 관리자 기능의 진짜 보안은 화면을 숨기는 것이 아니라 Firestore 보안 규칙에서 결정됩니다.

이 버전의 보안 규칙은 다음 기준을 사용합니다.

```text
관리자 이메일 = kos20050627@gmail.com
```

이 이메일로 로그인한 사용자만 `settings`와 `contents`를 수정할 수 있습니다.

## stories 운영 원칙

stories는 일기 전용 공간입니다.  
관리자 화면에서 stories에 글을 등록할 수는 있지만, 운영 원칙상 분류를 `일기`로 유지하는 것을 권장합니다.

## 저작권 주의

김광석 관련 음악, 영상, 사진, 일기, 둥근소리글은 권리 확인이 필요합니다.  
공개 권한이 불분명한 자료는 직접 업로드하지 말고, 자료명·날짜·출처·설명 중심으로 정리하는 방식이 안전합니다.


## 이번 버전에서 추가된 회원 기능

- 아이디 중복확인 버튼
- 이미 사용 중인 아이디일 때 문구 표시
  - `다른 사용자가 이미 사용중인 아이디 입니다.`
- 이메일 입력 방식 변경
  - 앞부분 직접 입력
  - 뒤 도메인은 `gmail.com`, `kakao.com`, `naver.com` 중 선택
- 로그인 방식 변경
  - 메일주소가 아니라 아이디 + 비밀번호로 로그인
- 로그인 실패 문구
  - `아이디와 비빌번호가 일치히지 않습니다.`

## Firestore 컬렉션 구조

이 버전은 아이디 중복 방지를 위해 `loginIds` 컬렉션을 사용합니다.

```text
loginIds/{아이디}
  - uid
  - email
  - loginId
  - createdAt
```

회원가입 시 먼저 중복확인을 하고, 가입 시에도 다시 한 번 중복 여부를 확인합니다.  
동시 가입 같은 예외 상황은 Firestore 보안 규칙에서 한 번 더 막습니다.


## v4 중요 수정사항

이 버전은 `app.js`를 반드시 아래 방식으로 불러옵니다.

```html
<script type="module" src="./app.js"></script>
```

Firebase의 `import { ... } from ...` 문법은 일반 script가 아니라 module script에서만 작동합니다.

## 로그인/회원가입이 안 될 때 확인할 것

1. `index.html` 맨 아래가 반드시 다음과 같아야 합니다.

```html
<script type="module" src="./app.js"></script>
```

2. Firebase Console → Authentication → Sign-in method에서 `Email/Password`를 활성화해야 합니다.

3. Firebase Console → Firestore Database → Rules에 `firestore.rules` 내용을 붙여넣고 게시해야 합니다.

4. GitHub Pages에 올린 뒤 `Ctrl + F5`로 강력 새로고침하세요.

5. 브라우저에서 F12 → Console을 열었을 때 아래 오류가 나오면 `type="module"`이 빠진 것입니다.

```text
Cannot use import statement outside a module
```
