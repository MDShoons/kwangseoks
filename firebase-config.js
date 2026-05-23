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

// 관리자 UID 목록
// Firebase Authentication > Users 에서 관리자 계정 UID를 복사해서 넣으세요.
export const ADMIN_UIDS = [
  "여기에_관리자_UID"
];
