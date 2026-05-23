// firebase-config.js
// 사용자가 Firebase Console에서 직접 복사해 준 정확한 Firebase 설정값을 반영했습니다.
// 비밀번호는 절대 이 파일에 저장하지 마세요.

export const firebaseConfig = {
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


// Cloudflare Worker 업로드 주소
// Cloudflare Worker 배포 후 예: https://gwangseok-github-uploader.본인계정.workers.dev/upload
// 아직 배포 전이면 빈 문자열로 두세요. 이 값이 비어 있으면 파일 업로드는 작동하지 않고, URL 직접 입력만 가능합니다.
export const GITHUB_UPLOAD_WORKER_URL = "";
