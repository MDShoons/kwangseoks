# 광석이네집 - 김광석 아카이브 PC 웹사이트

GitHub Pages에 올릴 수 있는 정적 웹사이트 샘플입니다.  
Firebase Authentication과 Firestore를 연결하면 회원가입/로그인 기능을 사용할 수 있습니다.

## 포함 파일

```text
index.html
style.css
app.js
README.md
firestore.rules
```

## 1. GitHub에 올리는 방법

1. GitHub에서 새 저장소를 만듭니다.
2. 저장소 이름 예시: `gwangseok-archive`
3. 이 폴더 안의 파일들을 저장소에 업로드합니다.
4. GitHub 저장소에서 `Settings`로 들어갑니다.
5. 왼쪽 메뉴에서 `Pages`를 선택합니다.
6. `Build and deployment`에서 Source를 `Deploy from a branch`로 선택합니다.
7. Branch는 `main`, 폴더는 `/root`로 선택합니다.
8. 저장하면 잠시 후 사이트 주소가 생성됩니다.

GitHub Pages는 저장소에 있는 정적 사이트를 바로 웹사이트로 배포할 수 있는 기능입니다.

## 2. Firebase 설정 방법

1. Firebase Console에 접속합니다.
2. 프로젝트를 만듭니다.
3. 웹 앱을 추가합니다.
4. Firebase 설정값을 복사합니다.
5. `app.js` 파일의 아래 부분을 본인 값으로 바꿉니다.

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

## 3. Firebase Authentication 켜기

1. Firebase Console에서 `Authentication`으로 이동합니다.
2. `Sign-in method`를 누릅니다.
3. `Email/Password`를 활성화합니다.

현재 샘플은 Firebase 이메일/비밀번호 로그인 방식입니다.  
회원가입 화면에는 이름, 전화번호, 아이디, 메일주소, 비밀번호, 개인정보 동의가 있습니다.  
다만 실제 로그인은 이메일과 비밀번호로 처리됩니다. 아이디는 Firestore 회원 정보에 저장됩니다.

## 4. Firestore Database 만들기

1. Firebase Console에서 `Firestore Database`로 이동합니다.
2. 데이터베이스를 생성합니다.
3. 처음 테스트할 때는 테스트 모드로 시작할 수 있지만, 공개 운영 전에는 보안 규칙을 수정해야 합니다.
4. 이 샘플의 `firestore.rules` 내용을 참고하세요.

## 5. 중요한 주의사항

### 개인정보

이 샘플은 구조를 보여주는 기본 코드입니다.  
실제 운영 시에는 개인정보처리방침, 이용약관, 회원 탈퇴, 개인정보 삭제 요청 기능을 추가해야 합니다.

### 비밀번호

비밀번호는 Firebase Authentication에서 관리합니다.  
Firestore에 비밀번호를 저장하지 않습니다.

### 저작권

김광석 관련 음악, 영상, 사진, 일기, 둥근소리글은 저작권과 공개 권한 확인이 필요합니다.  
공개 권한이 불명확한 자료는 직접 업로드하지 말고, 자료 정보와 출처만 정리하는 방식이 안전합니다.

## 6. 파일 수정 위치

### 메뉴 이름 수정

`index.html`의 `<nav class="main-nav">` 부분을 수정하면 됩니다.

### 색상 수정

`style.css`의 `:root` 부분을 수정하면 됩니다.

### 샘플 자료 수정

`app.js`의 `archiveData` 부분을 수정하면 됩니다.

## 7. 현재 구현된 기능

- PC 웹 메인 화면
- videos 화면
- songs 화면
- radios 화면
- photos 화면
- stories 화면
- about seok 화면
- oneum 화면
- 회원가입 모달
- 로그인 모달
- 마이페이지
- Firebase Authentication 연동 준비
- Firestore 회원정보 저장 준비
- 개인정보 동의 체크
- 간단한 검색/필터
