// firebase-config.js
// Firebase Console > Project settings > Your apps > Web app 에서 복사한 값을 아래에 붙여 넣으세요.

const firebaseConfig = {
  apiKey: "AIzaSyDPGi_MBLGkap_VTdo07j_fXw6Sy4TTPeo",
  authDomain: "kksarchive.firebaseapp.com",
  projectId: "kksarchive",
  storageBucket: "kksarchive.firebasestorage.app",
  messagingSenderId: "322477795788",
  appId: "1:322477795788:web:9f6a9c2c8d26c1a76d5569",
  measurementId: "G-9RG0YXCMY9"
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
