# 광석이네집 v8 - 바로 편집 + 마이페이지 + 관리자만 작성

GitHub Pages에 올릴 수 있는 Firebase 연동 정적 웹사이트입니다.

## v8 변경사항

- 회원가입 후 자동 로그인되지 않도록 처리
- 회원가입 완료 후 로그인 창으로 이동
- 로그인 상태 표시를 이메일이 아니라 아이디로 표시
  - 예: `shinestone0106님`
- 마이페이지 추가
  - 회원 정보 확인
  - 로그아웃
  - 회원 탈퇴
- 별도의 관리자 편집실 제거
- 관리자 로그인 시 각 화면에서 바로 편집 가능
  - 영상 추가
  - 음악 추가
  - 라디오 추가
  - 사진 추가
  - 일기 추가
  - 둥근소리글 추가
  - 기존 글 수정
  - 기존 글 삭제
  - 템플릿 편집
- 관리자만 글쓰기/수정/삭제 가능
- Firestore 보안 규칙에도 관리자만 콘텐츠 작성 가능하도록 반영

## 관리자 계정

```text
관리자 1
이름: 최일훈
전화번호: 010-3143-2729
아이디: oldsong0106
메일주소: kos20050627@gmail.com

관리자 2
이름: 최민수
전화번호: 010-3016-0413
아이디: shinestone0106
메일주소: shinestone0106@kakao.com
```

비밀번호는 코드에 저장하지 않습니다. 사이트 회원가입 화면에서 직접 입력하세요.

## GitHub Pages 업로드 방법

ZIP을 풀면 아래 파일들이 나옵니다.

```text
index.html
style.css
app.js
README.md
firestore.rules
```

이 파일들을 GitHub 저장소의 맨 위/root에 올리세요.  
폴더째 올리면 GitHub Pages에서 404가 날 수 있습니다.

## Firebase에서 꼭 해야 할 일

1. Authentication → Sign-in method → Email/Password 활성화
2. Firestore Database 생성
3. Firestore Rules에 `firestore.rules` 내용 붙여넣고 게시
4. GitHub Pages에서 Ctrl + F5로 강력 새로고침

## 사진 바꾸기/추가하기

관리자로 로그인한 뒤 `photos` 화면에서 `사진 추가`를 누르세요.

`사진/파일/외부 링크` 칸에 이미지 URL을 넣으면 사진 카드에 이미지가 표시됩니다.

현재 버전은 GitHub Pages 정적 사이트 구조라서 컴퓨터 파일을 직접 업로드하는 저장소 기능은 없습니다.  
실제 이미지 파일 업로드까지 하려면 Firebase Storage를 추가로 붙여야 합니다.
