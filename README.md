# 광석이네집 v9 - 사진 첨부 + 유튜브 재생 + 삭제 + 연필 템플릿 편집

## v9 변경사항

- 글/콘텐츠 삭제 가능
- 관리자만 글 작성, 수정, 삭제 가능
- 사진 파일 첨부 가능
- Firebase Storage에 사진 업로드
- 유튜브 링크 첨부 가능
- 유튜브 링크를 넣으면 상세 화면에서 바로 재생
- 메인 첫 화면 왼쪽 위 연필 버튼으로 템플릿 편집 가능
- stories의 운영 원칙 안내 박스 제거
- 사진 URL 또는 첨부 이미지를 photos 카드에 표시

## 업로드 방법

ZIP 압축을 풀면 아래 파일들이 나옵니다.

```text
index.html
style.css
app.js
README.md
firestore.rules
storage.rules
```

이 파일들을 GitHub 저장소 맨 위/root에 올리세요.

## Firebase에서 반드시 해야 할 일

### 1. Firestore Rules

Firebase Console → Firestore Database → Rules에 `firestore.rules` 내용을 붙여넣고 게시하세요.

### 2. Storage Rules

Firebase Console → Storage → Rules에 `storage.rules` 내용을 붙여넣고 게시하세요.

### 3. Storage 시작

Firebase Console → Storage에서 Storage를 먼저 시작해야 사진 첨부가 됩니다.

## 사진 첨부 사용법

관리자로 로그인 → photos → 사진 추가 → 사진 파일 첨부 → 저장

사진 파일은 Firebase Storage의 `content-images/` 폴더에 저장되고, 다운로드 URL이 콘텐츠에 자동 저장됩니다.

## 유튜브 링크 사용법

관리자로 로그인 → videos 또는 원하는 메뉴 → 추가 → 유튜브 링크 칸에 입력

지원 예:

```text
https://www.youtube.com/watch?v=영상ID
https://youtu.be/영상ID
https://www.youtube.com/shorts/영상ID
```

상세 화면에서 유튜브 플레이어가 표시됩니다.

## 주의

GitHub Pages만으로는 사진 파일 업로드가 불가능합니다.  
사진 첨부 기능은 Firebase Storage가 켜져 있어야 작동합니다.


## v10 긴급 수정

v10은 Firebase `app.js`가 오류로 멈추더라도 로그인/회원가입 버튼이 열리도록 `index.html` 안에 비상 클릭 스크립트를 넣었습니다.

즉, 최소한 아래 기능은 Firebase와 무관하게 작동해야 합니다.

- 로그인 창 열기
- 회원가입 창 열기
- 모달 닫기
- 비밀번호 보이기/숨기기
- 메뉴 이동

그래도 가입/로그인 저장이 안 되면 Firebase 설정, Authentication, Firestore Rules, Storage Rules 문제입니다.
