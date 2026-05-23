# 광석이네집 v10 - 페이지별 연필 즉시 편집 + 사진 첨부 + 유튜브 재생 + 삭제

## 반영 사항

- 글/콘텐츠 삭제 가능
- 사진 파일 첨부 가능
- Firebase Storage에 사진 업로드
- 유튜브 링크 첨부 가능
- 유튜브 링크를 넣으면 상세 화면에서 바로 재생
- 각 페이지 오른쪽 위 연필 버튼 추가
  - 예: `#songs`, `#videos`, `#photos`, `#stories`, `#about`, `#oneum`
- 연필 버튼을 누르면 그 페이지의 제목/설명을 바로 수정
- 다시 연필 버튼을 누르면 즉시 저장
- 메인 화면 왼쪽 위 연필 버튼도 같은 방식으로 즉시 편집/저장
- stories의 운영 원칙 안내 문구 완전 제거
- 관리자만 글 작성/수정/삭제 가능

## Firebase 설정

1. Firestore Database → Rules에 `firestore.rules` 내용 붙여넣고 게시
2. Storage 시작
3. Storage → Rules에 `storage.rules` 내용 붙여넣고 게시
4. GitHub Pages 파일 교체 후 Ctrl + F5 강력 새로고침

## 업로드 파일

```text
index.html
style.css
app.js
README.md
firestore.rules
storage.rules
```

이 파일들을 GitHub 저장소 맨 위/root에 올려야 합니다.


## v11 버튼 무반응 수정

이번 버전은 로그인/회원가입 버튼이 app.js 또는 Firebase 오류 때문에 멈추지 않도록,
`index.html` 안에 최소 클릭 처리 코드를 먼저 넣었습니다.

즉, Firebase 설정이나 app.js 로딩에 문제가 있어도 아래 기능은 먼저 작동합니다.

- 로그인 창 열기
- 회원가입 창 열기
- 창 닫기
- 메뉴 이동
- 비밀번호 보기/숨기기

실제 회원가입 저장, 로그인 처리, 사진 첨부, 글 저장은 app.js와 Firebase가 정상 작동해야 합니다.
