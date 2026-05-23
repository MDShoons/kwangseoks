# 광석이네집 - GitHub Pages + Firebase 기본 코드

## 포함 파일
- index.html
- style.css
- app.js
- firebase-config.js

## 사용 순서
1. GitHub 저장소를 만든다.
2. ZIP 파일 압축을 푼 뒤 4개 파일을 저장소 루트에 업로드한다.
3. Firebase 프로젝트를 만든다.
4. Firebase 웹 앱을 추가한다.
5. Firebase 설정값을 `firebase-config.js`에 붙여 넣는다.
6. Firebase Authentication에서 Email/Password 로그인을 켠다.
7. Firestore Database를 만든다.
8. Firebase Storage를 만든다.
9. Firebase Authentication > Users에서 관리자 계정 UID를 복사한다.
10. `firebase-config.js`의 `ADMIN_UIDS`에 관리자 UID를 넣는다.
11. GitHub Settings > Pages에서 main branch / root 배포를 켠다.
12. Firebase Authentication > Settings > Authorized domains에 `본인아이디.github.io`를 추가한다.

## 주의
- GitHub Pages만으로는 로그인, 사진 업로드, 데이터 저장이 되지 않는다.
- 이 ZIP은 Firebase와 연결해서 쓰는 기본 코드다.
- 실제 공개 운영 전에는 Firestore Rules와 Storage Rules를 반드시 설정해야 한다.
