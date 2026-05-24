// firebase-config.js
// Firebase 설정값은 사용자가 제공한 값으로 반영되어 있습니다.

export const firebaseConfig = {
  apiKey: "AIzaSyDPGi_MBLGkap_VTdo07j_fXw6Sy4TTPeo",
  authDomain: "kksarchive.firebaseapp.com",
  projectId: "kksarchive",
  storageBucket: "kksarchive.firebasestorage.app",
  messagingSenderId: "322477795788",
  appId: "1:322477795788:web:85a4990dd85b04fe6d5569",
  measurementId: "G-L8JDZMQFWS"
};

export const ADMIN_EMAILS = [
  "shinestone0106@kakao.com",
  "kos20050627@gmail.com"
];

export const ADMIN_LOGIN_IDS = [
  "shinestone0106",
  "oldsong0106"
];

// Cloudflare Worker 업로드 주소
// Worker 배포 후 아래 빈 문자열을 실제 주소로 바꾸세요.
// 예: "https://gwangseok-github-uploader.사용자명.workers.dev/upload"
export const GITHUB_UPLOAD_WORKER_URL = "";
