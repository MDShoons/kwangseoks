// firebase-config.js
// Firebase Console > Project settings > Your apps > Web app 에서 복사한 값을 아래에 붙여 넣으세요.

export const firebaseConfig = {
  apiKey: "여기에_API_KEY",
  authDomain: "여기에_PROJECT_ID.firebaseapp.com",
  projectId: "여기에_PROJECT_ID",
  storageBucket: "여기에_PROJECT_ID.appspot.com",
  messagingSenderId: "여기에_SENDER_ID",
  appId: "여기에_APP_ID"
};

// 관리자 이메일 목록
// 비밀번호는 절대 이 파일에 저장하지 마세요.
// 아래 두 계정은 Firebase Authentication에서 직접 생성하거나, 사이트 회원가입으로 생성해야 합니다.
export const ADMIN_EMAILS = [
  "shinestone0106@kakao.com",
  "kos20050627@gmail.com"
];

// 관리자 아이디 목록
export const ADMIN_LOGIN_IDS = [
  "shinestone0106",
  "oldsong0106"
];
