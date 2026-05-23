// firebase-config.js
// 아래 Firebase 설정값은 사용자가 제공한 Firebase Console 화면을 기준으로 반영했습니다.
// 비밀번호는 절대 이 파일에 저장하지 마세요.

const firebaseConfig = {
  apiKey: "AIzaSyDPGi_MBLGkap_VTdo07j_fXw6Sy4TTPeo",
  authDomain: "kksarchive.firebaseapp.com",
  projectId: "kksarchive",
  storageBucket: "kksarchive.firebasestorage.app",
  messagingSenderId: "322477795788",
  appId: "1:322477795788:web:85a4990dd85b04fe6d5569",
  measurementId: "G-L8JDZMQFWS"
};

// 관리자 이메일 목록
// 아래 두 계정은 Firebase Authentication에서 직접 생성하거나,
// 사이트 회원가입 화면에서 같은 이메일/아이디로 가입해야 합니다.
export const ADMIN_EMAILS = [
  "shinestone0106@kakao.com",
  "kos20050627@gmail.com"
];

// 관리자 아이디 목록
export const ADMIN_LOGIN_IDS = [
  "shinestone0106",
  "oldsong0106"
];
