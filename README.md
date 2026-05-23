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
