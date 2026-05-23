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

관리자 권한은 아래 이메일로 로그인한 사용자에게 열리도록 만들어져 있습니다.

```text
이름: 최일훈
전화번호: 010-3143-2729
관리자 아이디: oldsong0106
관리자 메일주소: kos20050627@gmail.com
```

중요: 관리자 비밀번호는 GitHub 코드에 넣지 않았습니다.  
비밀번호를 GitHub에 올리면 공개 저장소에서 노출될 수 있으므로 매우 위험합니다.

## 관리자 계정 만드는 방법

1. 사이트에 접속합니다.
2. 회원가입을 누릅니다.
3. 아래 정보로 가입합니다.
   - 이름: 최일훈
   - 전화번호: 010-3143-2729
   - 아이디: oldsong0106
   - 메일주소: kos20050627@gmail.com
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
