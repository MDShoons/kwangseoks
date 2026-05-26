
function getInputValueByIds(ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && typeof el.value === "string" && el.value.trim()) {
      return el.value.trim();
    }
  }
  return "";
}

function getFileByIds(ids) {
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el && el.files && el.files[0]) {
      return el.files[0];
    }
  }
  return null;
}

function getMediaUrlForPrefix(prefix) {
  return getInputValueByIds([
    `${prefix}Url`,
    `${prefix}MediaUrl`,
    `${prefix}FileUrl`,
    `${prefix}Link`,
    `${prefix}SourceUrl`,
    `${prefix}AudioUrl`,
    `${prefix}VideoUrl`,
    `${prefix}PhotoUrl`,
    `${prefix}ImageUrl`,
    `${prefix}URL`,
    prefix === "audio" ? "songUrl" : "",
    prefix === "audio" ? "songMediaUrl" : "",
    prefix === "radio" ? "radioUrl" : "",
    prefix === "radio" ? "radioMediaUrl" : "",
    prefix === "video" ? "videoUrl" : "",
    prefix === "photo" ? "photoUrl" : ""
  ].filter(Boolean));
}

function getThumbnailUrlForPrefix(prefix) {
  return getInputValueByIds([
    `${prefix}ThumbnailUrl`,
    `${prefix}ThumbUrl`,
    `${prefix}ImageUrl`,
    `${prefix}CoverUrl`,
    `${prefix}PhotoUrl`
  ]);
}



function getGoogleDriveFileId(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);

    if (!parsed.hostname.includes("drive.google.com")) {
      return "";
    }

    const idFromQuery = parsed.searchParams.get("id");
    if (idFromQuery) return idFromQuery;

    const match = parsed.pathname.match(/\/file\/d\/([^/]+)/);
    if (match && match[1]) return match[1];

    const foldersMatch = parsed.pathname.match(/\/open\/([^/]+)/);
    if (foldersMatch && foldersMatch[1]) return foldersMatch[1];

    return "";
  } catch {
    const match = value.match(/\/file\/d\/([^/]+)/);
    return match ? match[1] : "";
  }
}

function normalizeGoogleDriveMediaUrl(url, type = "media") {
  const value = String(url || "").trim();
  if (!value) return "";

  const id = getGoogleDriveFileId(value);
  if (!id) return value;

  // 오디오/영상 재생은 download 주소가 가장 많이 호환됨.
  // 이미 uc?export=download&id=... 형태여도 같은 주소로 정리.
  return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
}

function normalizeGitHubPagesAudioUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    const isKwangseoksPages = parsed.hostname === "mdshoons.github.io" && parsed.pathname.startsWith("/kwangseoks/");
    if (!isKwangseoksPages) return value;

    const repoPath = parsed.pathname.replace(/^\/kwangseoks\//, "");
    if (!/^(audios|radios)\//i.test(repoPath)) return value;

    return `https://raw.githubusercontent.com/mdshoons/kwangseoks/main/${repoPath}`;
  } catch (_) {
    return value;
  }
}

function normalizeMediaUrlForPlayback(url, type = "media") {
  const value = String(url || "").trim();
  if (!value) return "";

  if (value.includes("drive.google.com") || value.includes("docs.google.com")) {
    return normalizeGoogleDriveMediaUrl(value, type);
  }

  if (type === "audio" || type === "radios" || type === "songs") {
    return normalizeGitHubPagesAudioUrl(value);
  }

  return value;
}

function getPlayableAudioUrl(item = {}) {
  return item.mediaUrl || item.fileUrl || item.audioUrl || item.songUrl || item.songMediaUrl || "";
}

function isAudioContentItem(item = {}) {
  return item.mediaType === "audio" || item.category === "songs" || item.category === "radios";
}

function isYoutubeUrl(url = "") {
  const value = String(url || "").trim();
  return value.includes("youtube.com") || value.includes("youtu.be");
}

function getVideoMediaUrl(item = {}) {
  return item.mediaUrl || item.fileUrl || item.videoUrl || item.videoFileUrl || "";
}

function isVideoContentItem(item = {}) {
  return item.category === "videos" || item.mediaType === "video" || item.mediaType === "youtube";
}


function sanitizeDownloadFileName(name = "자료") {
  const base = String(name || "자료")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return base || "자료";
}

function getFileExtensionFromUrl(url = "") {
  const value = String(url || "");
  try {
    const parsed = new URL(value);
    const cleanPath = decodeURIComponent(parsed.pathname || "");
    const match = cleanPath.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1].toLowerCase() : "";
  } catch (_) {
    const clean = value.split("?")[0].split("#")[0];
    const match = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
    return match ? match[1].toLowerCase() : "";
  }
}

function getAdminDownloadInfo(item = {}) {
  if (!isAdmin || !item || !item.category) return null;

  const category = item.category;
  let url = "";
  let type = "media";
  let fallbackExt = "";

  if (category === "songs") return null;

  if (category === "radios") {
    url = getPlayableAudioUrl(item);
    type = "audio";
    fallbackExt = "mp3";
  } else if (category === "photos") {
    url = item.mediaUrl || item.imageUrl || item.photoUrl || item.thumbnailUrl || "";
    type = "image";
    fallbackExt = "jpg";
  } else if (category === "videos") {
    const youtubeCandidate = item.youtubeUrl || item.url || (isYoutubeUrl(item.mediaUrl) ? item.mediaUrl : "");
    if (item.mediaType === "youtube" || isYoutubeUrl(youtubeCandidate)) return null;
    url = getVideoMediaUrl(item);
    if (isYoutubeUrl(url)) return null;
    type = "video";
    fallbackExt = "mp4";
  } else {
    return null;
  }

  url = normalizeMediaUrlForPlayback(url, type);
  if (!url) return null;

  const ext = getFileExtensionFromUrl(url) || fallbackExt;
  const fileName = `${sanitizeDownloadFileName(item.title || category)}.${ext}`;
  return { url, fileName, category, type };
}

function renderAdminDownloadButton(item = {}, place = "card") {
  const info = getAdminDownloadInfo(item);
  if (!info) return "";

  const labelMap = {
    radios: "라디오 다운로드",
    videos: "영상 다운로드",
    photos: "사진 다운로드"
  };
  const label = labelMap[info.category] || "자료 다운로드";
  const id = escapeHtml(item.id || "");
  return `<button type="button" class="admin-download-btn admin-download-btn-${place}" onclick="event.stopPropagation(); adminDownloadMedia('${id}')">${label}</button>`;
}

async function adminDownloadMedia(id) {
  if (!isAdmin) {
    alert("관리자 계정으로 로그인해야 다운로드할 수 있습니다.");
    return;
  }

  const item = allContents.find((content) => content.id === id);
  const info = getAdminDownloadInfo(item);
  if (!info) {
    alert("다운로드 가능한 자료가 아닙니다. 노래 자료와 유튜브 링크 영상은 제외됩니다.");
    return;
  }

  const directOpen = () => {
    const a = document.createElement("a");
    a.href = info.url;
    a.download = info.fileName;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  try {
    const response = await fetch(info.url, { mode: "cors" });
    if (!response.ok) throw new Error("download response not ok");
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = info.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  } catch (_) {
    directOpen();
  }
}

function normalizeYoutubeEmbedUrl(url) {
  const value = String(url || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    let id = "";
    if (parsed.hostname.includes("youtu.be")) {
      id = parsed.pathname.replace("/", "");
    } else if (parsed.searchParams.get("v")) {
      id = parsed.searchParams.get("v");
    } else if (parsed.pathname.includes("/embed/")) {
      return value;
    }

    return id ? `https://www.youtube.com/embed/${id}` : value;
  } catch {
    return value;
  }
}

import {
  firebaseConfig,
  ADMIN_EMAILS,
  ADMIN_LOGIN_IDS,
  GITHUB_UPLOAD_WORKER_URL
} from "./firebase-config.js";

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp,
  doc, setDoc, getDoc, runTransaction, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const APP_VERSION = "v118-ipad-detail-video-poster";
const ACTIVE_UPLOAD_WORKER_URL = "https://kwangseoks-uploader.kos20050627.workers.dev";
console.log("광석이네집", APP_VERSION);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentUserProfile = null;
let isAdmin = false;
let checkedLoginId = "";
let checkedLoginIdAvailable = false;
let allContents = [];
let pageCategories = {};

const DEFAULT_SETTINGS = {
  siteName: "광석이네 집",
  siteSubName: "김광석 디지털 아카이브",
  homeTitle: "노래가 머무는 이 곳, 광석이네집",
  homeDescription: "김광석 아카이브",
  videosDesc: "김광석의 공연, 방송, 인터뷰 영상을 모아둔 공간입니다.",
  songsDesc: "김광석의 노래와 앨범 정보를 정리한 음악 아카이브입니다.",
  radiosDesc: "김광석의 라디오 방송과 인터뷰 음성을 모아둔 공간입니다.",
  photosDesc: "김광석의 시간과 표정을 담은 사진 아카이브입니다.",
  storiesDesc: "김광석의 일기입니다.",
  aboutDesc: "김광석에 대한 정보를 볼 수 있는 곳입니다.",
  oneumDesc: "김광석의 둥근소리글을 모아둔 곳입니다.",
  homeBgUrl: "./images/main-bg.png",
  homeBgDataUrl: "",
  bodyBgColor: "#f6f0e7",
  headerBgColor: "#2d241f",
  buttonColor: "#7a4d35",
  cardBgColor: "#fffaf4",
  textColor: "#2f2924",
  heroTextColor: "#ffffff",
  navTextColor: "#f8eee3",
  baseFontSize: "16",
  heroTitleSize: "46",
  heroDescSize: "20"
};
let currentSettings = { ...DEFAULT_SETTINGS };


const VALID_PAGES = ["home", "siteinfo", "videos", "songs", "radios", "photos", "stories", "about", "oneum", "telecom", "login", "signup", "mypage", "loginRequired", "admin"];
const RESTRICTED_PAGES = ["videos", "radios", "photos", "oneum"];

function getPageFromHash() {
  const page = window.location.hash.replace("#", "").trim();
  return VALID_PAGES.includes(page) ? page : "home";
}

function goPage(pageId) {
  if (!VALID_PAGES.includes(pageId)) pageId = "home";

  if (window.location.hash !== `#${pageId}`) {
    window.location.hash = pageId;
  } else {
    showPage(pageId, true);
  }
}

function handleHashRoute() {
  showPage(getPageFromHash(), true);
}

window.showPage = showPage;
window.goPage = goPage;
window.goContentPage = goContentPage;
window.resetPageAndReload = resetPageAndReload;
window.showAdminForm = showAdminForm;
window.loadContents = loadContents;
window.renderAdminManageList = renderAdminManageList;
window.editContent = editContent;
window.deleteContentItem = deleteContentItem;
window.deleteCustomCategory = deleteCustomCategory;
window.openContentDetail = openContentDetail;
window.resetDetailPhotoZoom = resetDetailPhotoZoom;
window.zoomDetailPhoto = zoomDetailPhoto;
window.openLatestItem = openLatestItem;
window.closeContentDetail = closeContentDetail;
window.quickTemplate = quickTemplate;

function normalizeLoginId(v) { return String(v || "").trim().toLowerCase(); }
function normalizeEmail(v) { return String(v || "").trim().toLowerCase(); }
function isValidLoginId(v) { return /^[a-z0-9_]{4,20}$/.test(v); }
function escapeHtml(text) {
  return String(text || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function showPage(pageId, fromHash = false) {
  if (!VALID_PAGES.includes(pageId)) pageId = "home";

  if (!fromHash && window.location.hash !== `#${pageId}`) {
    window.location.hash = pageId;
    return;
  }

  if (RESTRICTED_PAGES.includes(pageId) && !currentUser) {
    pageId = "loginRequired";
  }

  if (pageId === "mypage" && !currentUser) {
    pageId = "loginRequired";
  }

  if (pageId === "admin" && !isAdmin) {
    if (currentUser) alert("관리자만 접근할 수 있습니다.");
    pageId = currentUser ? "home" : "loginRequired";
  }

  document.querySelectorAll(".page").forEach((p) => p.classList.remove("active"));

  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");

  if (pageId === "admin") {
    fillSettingsFormFromCurrent();
    renderAdminManageList();
    bindDesignPreviewEvents();
  }

  if (pageId === "mypage") {
    fillMyPageForm();
  }

  if (pageId === "home") setupHeroVoiceHover();

  if (pageId === "about") renderAboutDocument(allContents.filter(i => i.category === "about"));

  if (pageId === "home") tryPlayHomeVoiceOnce();

  if (pageId === "telecom" && typeof initTelecomChatRoom === "function") initTelecomChatRoom();

  if (["videos", "songs", "radios", "photos", "stories", "oneum"].includes(pageId)) {
    loadContents();
  }

  if (typeof installBasicContentProtection === "function") {
    installBasicContentProtection();
installScreenProtection();
  }
}

function showAdminForm(type) {
  ["adminContentForm","adminVideoForm","adminPhotoForm","adminAudioForm","adminRadioForm","adminOneumForm","adminManageForm","adminTemplateForm","adminCategoryForm"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
  const map = {content:"adminContentForm", video:"adminVideoForm", photo:"adminPhotoForm", audio:"adminAudioForm", radio:"adminRadioForm", oneum:"adminOneumForm", manage:"adminManageForm", template:"adminTemplateForm", category:"adminCategoryForm"};
  document.getElementById(map[type])?.classList.remove("hidden");
  if (type === "video") populateSpecificSubCategorySelect("videos", "videoSubCategory");
  if (type === "audio") populateSpecificSubCategorySelect("songs", "audioSubCategory");
  if (type === "radio") populateSpecificSubCategorySelect("radios", "radioSubCategory");
  if (type === "oneum") populateSpecificSubCategorySelect("oneum", "oneumSubCategory");
  if (type === "template") { fillSettingsFormFromCurrent(); bindDesignPreviewEvents(); }
  if (type === "category") renderCategoryList();
  if (type === "manage") renderAdminManageList();
  hardenMediaDownloadControls();
}

async function fileToCompressedDataUrl(file, maxWidth = 1400, quality = 0.74) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("이미지 파일을 읽지 못했습니다."));
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했습니다."));
    image.src = dataUrl;
  });
  const ratio = img.width > maxWidth ? maxWidth / img.width : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
  let output = canvas.toDataURL("image/jpeg", quality);
  if (output.length > 850000) output = canvas.toDataURL("image/jpeg", 0.58);
  if (output.length > 900000) throw new Error("이미지가 너무 큽니다. 더 작은 이미지로 다시 시도하세요.");
  return output;
}

async function getImageDataUrlOrDirectUrl(file, directUrl, maxWidth = 1400) {
  if (file) return await fileToCompressedDataUrl(file, maxWidth, 0.74);
  return directUrl && directUrl.trim() ? directUrl.trim() : "";
}

async function uploadFileToGitHubWorker(file, folder) {
  if (!file) return "";

  if (!currentUser) {
    throw new Error("로그인 후 업로드할 수 있습니다. Firebase ID Token이 없습니다.");
  }

  const token = await currentUser.getIdToken(true);
  if (!token) {
    throw new Error("Firebase ID Token이 없습니다. 다시 로그인한 뒤 업로드해 주세요.");
  }

  const workerUrl = ACTIVE_UPLOAD_WORKER_URL;
  const uploadUrl = `${workerUrl.replace(/\/$/, "")}/upload`;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder || "");
  formData.append("kind", folder || "");
  formData.append("idToken", token);

  let response;
  let text = "";

  try {
    response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
      mode: "cors",
      cache: "no-store",
      credentials: "omit"
    });

    text = await response.text();
  } catch (error) {
    throw new Error(`파일 직접 업로드는 현재 사용하지 않는 것을 권장합니다. URL 링크로 저장해 주세요. Cloudflare Worker에 연결하지 못했습니다. CORS 또는 Worker Deploy 문제일 가능성이 큽니다. 현재 사용 중인 Worker 주소: ${workerUrl}. health 확인: ${workerUrl}/health. 원문: ${error.message}`);
  }

  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { ok: false, error: text || "Worker 응답을 JSON으로 읽지 못했습니다." };
  }

  if (!response.ok || !data.ok) {
    throw new Error(data.error || data.message || `Worker 업로드 실패: HTTP ${response.status}`);
  }

  return data.url || data.downloadUrl || data.path || "";
}

function getYoutubeEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "");
      return id ? `https://www.youtube.com/embed/${id}` : "";
    }
    return "";
  } catch { return ""; }
}

document.getElementById("signupLoginId").addEventListener("input", () => {
  checkedLoginId = ""; checkedLoginIdAvailable = false; setLoginIdMessage("아이디 중복확인을 해주세요.", "");
});

document.getElementById("checkLoginIdBtn").addEventListener("click", async () => {
  const loginId = normalizeLoginId(document.getElementById("signupLoginId").value);
  if (!isValidLoginId(loginId)) return setLoginIdMessage("아이디는 영문 소문자, 숫자, 밑줄(_) 4~20자입니다.", "error");
  try {
    const snap = await getDoc(doc(db, "loginIds", loginId));
    if (snap.exists()) { checkedLoginIdAvailable = false; setLoginIdMessage("이미 사용 중인 아이디입니다.", "error"); }
    else { checkedLoginId = loginId; checkedLoginIdAvailable = true; setLoginIdMessage("사용 가능한 아이디입니다.", "ok"); }
  } catch (e) { setLoginIdMessage("아이디 확인 오류: " + e.message, "error"); }
});

function setLoginIdMessage(msg, type) {
  const el = document.getElementById("loginIdCheckMessage");
  el.textContent = msg; el.classList.remove("ok","error"); if (type) el.classList.add(type);
}

document.getElementById("doSignupBtn").addEventListener("click", async () => {
  const name = document.getElementById("signupName").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const loginId = normalizeLoginId(document.getElementById("signupLoginId").value);
  const email = normalizeEmail(document.getElementById("signupEmail").value);
  const password = document.getElementById("signupPassword").value;
  if (!name || !phone || !loginId || !email || !password) return alert("모든 필수 항목을 입력하세요.");
  if (!checkedLoginIdAvailable || checkedLoginId !== loginId) return alert("아이디 중복확인을 먼저 완료하세요.");
  if (!document.getElementById("privacyAgree").checked) return alert("개인정보 수집 및 이용에 동의해야 합니다.");
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const role = ADMIN_EMAILS.includes(email) || ADMIN_LOGIN_IDS.includes(loginId) ? "admin" : "user";
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "loginIds", loginId);
      if ((await tx.get(ref)).exists()) throw new Error("이미 사용 중인 아이디입니다.");
      tx.set(ref, { uid: cred.user.uid, loginId, email, role, createdAt: serverTimestamp() });
      tx.set(doc(db, "users", cred.user.uid), { uid: cred.user.uid, name, phone, loginId, email, privacyAgree: true, role, createdAt: serverTimestamp() });
    });
    alert("회원가입이 완료되었습니다."); showPage("home");
  } catch (e) { alert("회원가입 오류: " + e.message); }
});

document.getElementById("doLoginBtn").addEventListener("click", async () => {
  const identifier = document.getElementById("loginIdentifier").value.trim();
  const password = document.getElementById("loginPassword").value;
  if (!identifier || !password) return alert("아이디 또는 이메일과 비밀번호를 입력하세요.");
  try {
    let email = identifier;
    if (!identifier.includes("@")) {
      const snap = await getDoc(doc(db, "loginIds", normalizeLoginId(identifier)));
      if (!snap.exists()) return alert("존재하지 않는 아이디입니다.");
      email = snap.data().email;
    }
    await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
    alert("로그인되었습니다."); showPage("home");
  } catch (e) { alert("로그인 오류: " + e.message); }
});

document.getElementById("saveMyPageBtn")?.addEventListener("click", saveMyPageInfo);
document.getElementById("deleteAccountBtn")?.addEventListener("click", deleteMyAccount);

document.getElementById("logoutBtn").addEventListener("click", async () => { await signOut(auth); alert("로그아웃되었습니다."); showPage("home"); });

onAuthStateChanged(auth, async (user) => {
  currentUser = user; currentUserProfile = null;
  if (user) {
    const snap = await getDoc(doc(db, "users", user.uid));
    currentUserProfile = snap.exists() ? snap.data() : null;
  }
  const email = normalizeEmail(user?.email || "");
  const loginId = normalizeLoginId(currentUserProfile?.loginId || "");
  isAdmin = Boolean(user) && (ADMIN_EMAILS.includes(email) || ADMIN_LOGIN_IDS.includes(loginId) || currentUserProfile?.role === "admin");
  document.getElementById("userStatus").textContent = user ? (isAdmin ? "관리자 로그인" : (loginId || email)) : "로그인 전";
  document.getElementById("loginBtn").classList.toggle("hidden", Boolean(user));
  document.getElementById("signupBtn").classList.toggle("hidden", Boolean(user));
  document.getElementById("logoutBtn").classList.toggle("hidden", !user);
  document.getElementById("mypageBtn")?.classList.toggle("hidden", !user);
  if (typeof telecomApplyAccountIdentityToForm === "function") telecomApplyAccountIdentityToForm();
  let adminBtn = document.getElementById("adminNavBtn");
  if (isAdmin && !adminBtn) {
    adminBtn = document.createElement("button"); adminBtn.id = "adminNavBtn"; adminBtn.textContent = "관리자"; adminBtn.onclick = () => showPage("admin"); document.querySelector("nav").appendChild(adminBtn);
  }
  if (!isAdmin && adminBtn) adminBtn.remove();
  await window.addEventListener("hashchange", handleHashRoute);
window.addEventListener("DOMContentLoaded", handleHashRoute);
loadSiteSettings(); await loadPageCategories(); await loadContents();
  handleHashRoute();
});

async function loadPageCategories() {
  try {
    const snap = await getDocs(query(collection(db, "pageCategories"), orderBy("createdAt", "asc")));
    pageCategories = {};
    snap.forEach(d => {
      const item = { id: d.id, ...d.data() };
      if (!pageCategories[item.page]) pageCategories[item.page] = [];
      pageCategories[item.page].push(item);
    });
    populateAllCategoryFilters();
    populateContentSubCategorySelect(document.getElementById("contentCategory")?.value || "videos");
    populateSpecificSubCategorySelect("videos","videoSubCategory");
    populateSpecificSubCategorySelect("songs","audioSubCategory");
    populateSpecificSubCategorySelect("radios","radioSubCategory");
    populateSpecificSubCategorySelect("oneum","oneumSubCategory");
    renderCategoryList();
  } catch (e) { console.warn(e); }
}

function populateAllCategoryFilters() {
  ["videos","songs","radios","photos","stories","about","oneum"].forEach(page => {
    const select = document.getElementById(`${page}CategoryFilter`);
    if (!select) return;
    const cur = select.value;
    select.innerHTML = '<option value="">전체 카테고리</option>';
    (pageCategories[page] || []).forEach(cat => select.appendChild(new Option(cat.name, cat.name)));
    select.value = cur;
  });
}
function populateContentSubCategorySelect(page, selected="") {
  const select = document.getElementById("contentSubCategory"); if (!select) return;
  const cur = selected || select.value; select.innerHTML = '<option value="">카테고리 없음</option>';
  (pageCategories[page] || []).forEach(cat => select.appendChild(new Option(cat.name, cat.name)));
  if (cur) select.value = cur;
}
function populateSpecificSubCategorySelect(page, id, selected="") {
  const select = document.getElementById(id); if (!select) return;
  const cur = selected || select.value; select.innerHTML = '<option value="">카테고리 없음</option>';
  (pageCategories[page] || []).forEach(cat => select.appendChild(new Option(cat.name, cat.name)));
  if (cur) select.value = cur;
}

document.getElementById("contentCategory").addEventListener("change", e => populateContentSubCategorySelect(e.target.value));
document.getElementById("categoryPage").addEventListener("change", renderCategoryList);
document.getElementById("saveCategoryBtn").addEventListener("click", saveCustomCategory);

async function saveCustomCategory() {
  if (!isAdmin) return alert("관리자만 카테고리를 만들 수 있습니다.");
  const page = document.getElementById("categoryPage").value;
  const name = document.getElementById("newCategoryName").value.trim();
  if (!name) return alert("카테고리 이름을 입력하세요.");
  if ((pageCategories[page] || []).some(c => c.name === name)) return alert("이미 있는 카테고리입니다.");
  try {
    await addDoc(collection(db, "pageCategories"), { page, name, createdBy: currentUser.uid, createdAt: serverTimestamp() });
    document.getElementById("newCategoryName").value = "";
    await loadPageCategories();
    alert("카테고리가 생성되었습니다.");
  } catch(e) { alert("카테고리 생성 오류: " + e.message); }
}
async function deleteCustomCategory(id) {
  if (!isAdmin) return alert("관리자만 삭제할 수 있습니다.");
  if (!confirm("이 카테고리를 삭제하시겠습니까?")) return;
  await deleteDoc(doc(db, "pageCategories", id));
  await loadPageCategories();
}
function renderCategoryList() {
  const box = document.getElementById("categoryList"); if (!box) return;
  const page = document.getElementById("categoryPage")?.value || "videos";
  const cats = pageCategories[page] || [];
  box.innerHTML = cats.length ? "" : "<p>아직 생성된 카테고리가 없습니다.</p>";
  cats.forEach(cat => {
    const div = document.createElement("div");
    div.className = "category-chip";
    div.innerHTML = `<span>${escapeHtml(cat.name)}</span><button type="button" onclick="deleteCustomCategory('${cat.id}')">삭제</button>`;
    box.appendChild(div);
  });
}

document.getElementById("saveContentBtn").addEventListener("click", async () => {
  if (!isAdmin) return alert("관리자만 저장할 수 있습니다.");
  const editId = document.getElementById("editContentId").value;
  const originalItem = editId ? allContents.find(i => i.id === editId) : null;
  const editingAudioItem = Boolean(originalItem && isAudioContentItem(originalItem));
  const editingVideoItem = Boolean(originalItem && isVideoContentItem(originalItem));
  const category = document.getElementById("contentCategory").value;
  const subCategory = document.getElementById("contentSubCategory").value;
  const title = document.getElementById("contentTitle").value.trim();
  const body = document.getElementById("contentBody").value.trim();
  if (!title || !body) return alert("제목과 본문을 입력하세요.");
  try {
    const mediaUrl = await getImageDataUrlOrDirectUrl(document.getElementById("contentImageFile").files[0], document.getElementById("contentImageUrl").value, 1400);
    const payload = {
      category,
      subCategory,
      mediaType: editingAudioItem ? "audio" : (editingVideoItem ? (originalItem.mediaType === "youtube" ? "youtube" : "video") : (mediaUrl ? "imageText" : "text")),
      title,
      body,
      description: body,
      year: document.getElementById("contentYear").value.trim(),
      source: document.getElementById("contentSource").value.trim(),
      isFeatured: document.getElementById("contentFeatured").checked,
      isPublic: true,
      updatedAt: serverTimestamp()
    };

    if (editingAudioItem) {
      // Songs/Radios를 일반 수정 화면에서 고칠 때 음원 URL을 이미지 URL로 덮어쓰면
      // 목록의 바로듣기 플레이어가 사라지므로, 기존 음원 URL은 반드시 보존합니다.
      const audioUrl = getPlayableAudioUrl(originalItem);
      if (audioUrl) payload.mediaUrl = audioUrl;
      if (mediaUrl) payload.thumbnailUrl = mediaUrl;
      else if (originalItem.thumbnailUrl) payload.thumbnailUrl = originalItem.thumbnailUrl;
    } else if (editingVideoItem) {
      // Videos를 일반 글 수정 화면에서 고칠 때 기존 영상 URL/유튜브 URL이
      // 이미지 URL로 바뀌거나 mediaType이 text/imageText로 바뀌면 카드와 상세보기에서 영상이 사라집니다.
      // 따라서 제목/본문/연도/출처만 수정하더라도 영상 재생 정보는 반드시 보존합니다.
      const videoUrl = getVideoMediaUrl(originalItem);
      const youtubeUrl = originalItem.youtubeUrl || (isYoutubeUrl(originalItem.mediaUrl) ? originalItem.mediaUrl : "");
      if (youtubeUrl) {
        payload.mediaType = "youtube";
        payload.youtubeUrl = youtubeUrl;
        payload.mediaUrl = originalItem.mediaUrl || normalizeYoutubeEmbedUrl(youtubeUrl);
      } else if (videoUrl) {
        payload.mediaType = "video";
        payload.mediaUrl = videoUrl;
      }
      if (mediaUrl) payload.thumbnailUrl = mediaUrl;
      else if (originalItem.thumbnailUrl) payload.thumbnailUrl = originalItem.thumbnailUrl;
    } else if (mediaUrl) {
      payload.mediaUrl = mediaUrl;
    }

    if (editId) await updateDoc(doc(db, "contents", editId), payload);
    else await addDoc(collection(db, "contents"), { ...payload, createdBy: currentUser.uid, createdAt: serverTimestamp() });
    alert(editId ? "자료가 수정되었습니다." : "자료가 저장되었습니다.");
    resetContentForm(); await loadContents();
  } catch(e) { alert("자료 저장 오류: " + e.message); }
});
document.getElementById("resetContentBtn").addEventListener("click", resetContentForm);
function resetContentForm() { document.getElementById("editContentId").value = ""; document.getElementById("adminContentForm").reset(); document.getElementById("saveContentBtn").textContent = "저장하기"; }

document.getElementById("savePhotoBtn").addEventListener("click", async () => {
  if (!isAdmin) return alert("관리자만 저장할 수 있습니다.");
  const title = document.getElementById("photoTitle").value.trim();
  if (!title) return alert("사진 제목을 입력하세요.");
  try {
    const mediaUrl = await getImageDataUrlOrDirectUrl(document.getElementById("photoFile").files[0], document.getElementById("photoImageUrl").value, 1400);
    if (!mediaUrl) return alert("사진 파일 또는 이미지 URL을 입력하세요.");
    await addDoc(collection(db, "contents"), { category:"photos", mediaType:"image", title, mediaUrl,
      year:document.getElementById("photoYear").value.trim(), source:document.getElementById("photoSource").value.trim(),
      description:document.getElementById("photoDescription").value.trim(), body:document.getElementById("photoDescription").value.trim(),
      isPublic:true, createdBy:currentUser.uid, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
    alert("사진이 저장되었습니다."); document.getElementById("adminPhotoForm").reset(); await loadContents();
  } catch(e) { alert("사진 저장 오류: " + e.message); }
});

document.getElementById("saveVideoBtn").addEventListener("click", async () => {
  if (!isAdmin) return alert("관리자만 저장할 수 있습니다.");
  const editId = document.getElementById("editVideoId")?.value || "";
  const originalItem = editId ? allContents.find(i => i.id === editId) : null;
  const title = document.getElementById("videoTitle").value.trim();
  if (!title) return alert("영상 제목을 입력하세요.");
  const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
  const videoFile = document.getElementById("videoFile").files[0];
  const directVideoUrl = document.getElementById("videoFileUrl").value.trim();
  if (!editId && !youtubeUrl && !videoFile && !directVideoUrl) return alert("유튜브 URL, mp4 파일, 또는 영상 URL 중 하나를 입력하세요.");
  try {
    const embedUrl = youtubeUrl ? getYoutubeEmbedUrl(youtubeUrl) : "";
    if (youtubeUrl && !embedUrl) return alert("올바른 유튜브 URL을 입력하세요.");
    const uploadedVideoUrl = videoFile ? await uploadFileToGitHubWorker(videoFile, "videos") : "";
    const existingVideoUrl = originalItem ? getVideoMediaUrl(originalItem) : "";
    const existingYoutubeUrl = originalItem ? (originalItem.youtubeUrl || (isYoutubeUrl(originalItem.mediaUrl) ? originalItem.mediaUrl : "")) : "";
    const finalYoutubeUrl = youtubeUrl || existingYoutubeUrl;
    const finalEmbedUrl = youtubeUrl ? embedUrl : (originalItem?.mediaType === "youtube" ? (originalItem.mediaUrl || normalizeYoutubeEmbedUrl(existingYoutubeUrl)) : "");
    const finalVideoUrl = directVideoUrl || uploadedVideoUrl || (originalItem?.mediaType !== "youtube" ? existingVideoUrl : "");
    const mediaType = (finalEmbedUrl || (finalYoutubeUrl && !finalVideoUrl)) ? "youtube" : "video";
    const mediaUrl = mediaType === "youtube" ? (finalEmbedUrl || normalizeYoutubeEmbedUrl(finalYoutubeUrl)) : finalVideoUrl;
    if (!mediaUrl) return alert("기존 영상 주소를 찾을 수 없습니다. 영상 URL을 다시 입력하세요.");
    const thumbnailUrl = await getImageDataUrlOrDirectUrl(document.getElementById("videoImageFile").files[0], document.getElementById("videoImageUrl").value, 1000);
    const payload = { category:"videos", subCategory:document.getElementById("videoSubCategory").value,
      mediaType, title, youtubeUrl: finalYoutubeUrl || "", mediaUrl,
      year:document.getElementById("videoYear").value.trim(), source:document.getElementById("videoSource").value.trim(),
      description:document.getElementById("videoDescription").value.trim(), body:document.getElementById("videoDescription").value.trim(),
      isPublic:true, updatedAt:serverTimestamp() };
    if (thumbnailUrl) payload.thumbnailUrl = thumbnailUrl;
    else if (originalItem?.thumbnailUrl) payload.thumbnailUrl = originalItem.thumbnailUrl;

    if (editId) await updateDoc(doc(db, "contents", editId), payload);
    else await addDoc(collection(db, "contents"), { ...payload, createdBy:currentUser.uid, createdAt:serverTimestamp() });
    alert(editId ? "영상이 수정되었습니다." : "영상이 저장되었습니다.");
    resetVideoForm();
    await loadContents();
  } catch(e) { alert("영상 저장 오류: " + e.message); }
});
function resetVideoForm() {
  const form = document.getElementById("adminVideoForm");
  if (form) form.reset();
  const id = document.getElementById("editVideoId");
  if (id) id.value = "";
  const title = document.getElementById("videoFormTitle");
  if (title) title.textContent = "영상 등록";
  const btn = document.getElementById("saveVideoBtn");
  if (btn) btn.textContent = "영상 저장";
}
document.getElementById("resetVideoBtn")?.addEventListener("click", resetVideoForm);

document.getElementById("saveAudioBtn").addEventListener("click", () => saveAudioLike("songs", "audio"));
document.getElementById("saveRadioBtn").addEventListener("click", () => saveAudioLike("radios", "radio"));
document.getElementById("saveOneumBtn")?.addEventListener("click", saveOneumPost);
document.getElementById("resetOneumBtn")?.addEventListener("click", resetOneumForm);
document.getElementById("oneumHasKksReply")?.addEventListener("change", toggleOneumReplyFields);

function getOneumReplyFormData() {
  const checked = !!document.getElementById("oneumHasKksReply")?.checked;
  const title = document.getElementById("oneumReplyTitle")?.value.trim() || "";
  const author = document.getElementById("oneumReplyAuthor")?.value.trim() || "";
  const authorName = document.getElementById("oneumReplyAuthorName")?.value.trim() || "";
  const dateTime = document.getElementById("oneumReplyDateTime")?.value.trim() || "";
  const body = document.getElementById("oneumReplyBody")?.value.trim() || "";
  const source = document.getElementById("oneumReplySource")?.value.trim() || "";
  return { checked, title, author, authorName, dateTime, body, source };
}

function toggleOneumReplyFields() {
  const box = document.getElementById("oneumReplyFields");
  const checked = !!document.getElementById("oneumHasKksReply")?.checked;
  if (box) box.classList.toggle("hidden", !checked);
  if (checked) {
    const authorInput = document.getElementById("oneumReplyAuthor");
    const authorNameInput = document.getElementById("oneumReplyAuthorName");
    if (authorInput && !authorInput.value.trim()) authorInput.value = "김광석";
    if (authorNameInput && !authorNameInput.value.trim()) authorNameInput.value = "김광석";
  }
}

async function saveOneumPost() {
  if (!isAdmin) return alert("관리자만 저장할 수 있습니다.");

  const editId = document.getElementById("editOneumId")?.value || "";
  const title = document.getElementById("oneumTitle")?.value.trim() || "";
  const body = document.getElementById("oneumBody")?.value.trim() || "";
  const author = document.getElementById("oneumAuthor")?.value.trim() || "";
  const authorName = document.getElementById("oneumAuthorName")?.value.trim() || "";
  const dateTime = document.getElementById("oneumDateTime")?.value.trim() || "";
  const source = document.getElementById("oneumSource")?.value.trim() || "";
  const subCategory = document.getElementById("oneumSubCategory")?.value || "";
  const reply = getOneumReplyFormData();

  if (!title) return alert("글 제목을 입력하세요.");
  if (!body) return alert("본문을 입력하세요.");
  if (!author) return alert("올린이 닉네임을 입력하세요.");
  if (!authorName) return alert("올린이 이름을 입력하세요.");
  if (!dateTime) return alert("날짜와 시간을 입력하세요.");
  if (reply.checked) {
    if (!reply.title) return alert("김광석 답글의 제목을 입력하세요.");
    if (!reply.author) return alert("김광석 답글의 올린이 닉네임을 입력하세요.");
    if (!reply.authorName) return alert("김광석 답글의 이름을 입력하세요.");
    if (!reply.dateTime) return alert("김광석 답글의 날짜와 시간을 입력하세요.");
    if (!reply.body) return alert("김광석 답글 본문을 입력하세요.");
  }

  try {
    const payload = {
      category: "oneum",
      subCategory,
      mediaType: "text",
      title,
      body,
      description: body,
      author,
      authorNickname: author,
      authorName,
      uploadedByName: author,
      uploaderName: authorName,
      oneumDateTime: dateTime,
      year: dateTime,
      source,
      hasKksReply: reply.checked,
      kksReply: reply.checked ? {
        title: reply.title,
        author: reply.author,
        authorNickname: reply.author,
        authorName: reply.authorName,
        dateTime: reply.dateTime,
        body: reply.body,
        source: reply.source
      } : null,
      kksReplyTitle: reply.checked ? reply.title : "",
      kksReplyAuthor: reply.checked ? reply.author : "",
      kksReplyAuthorName: reply.checked ? reply.authorName : "",
      kksReplyDateTime: reply.checked ? reply.dateTime : "",
      kksReplyBody: reply.checked ? reply.body : "",
      kksReplySource: reply.checked ? reply.source : "",
      isPublic: true,
      updatedAt: serverTimestamp()
    };

    if (editId) {
      await updateDoc(doc(db, "contents", editId), payload);
    } else {
      await addDoc(collection(db, "contents"), {
        ...payload,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });
    }

    alert(editId ? "원음 글이 수정되었습니다." : "원음 글이 저장되었습니다.");
    resetOneumForm();
    await loadContents();
  } catch (error) {
    alert("원음 글 저장 오류: " + error.message);
  }
}

function resetOneumForm() {
  document.getElementById("editOneumId").value = "";
  document.getElementById("adminOneumForm")?.reset();
  toggleOneumReplyFields();
  const btn = document.getElementById("saveOneumBtn");
  if (btn) btn.textContent = "원음 글 저장";
}

async function saveAudioLike(category, prefix) {
  if (!isAdmin) return alert("관리자만 저장할 수 있습니다.");

  const title = getInputValueByIds([`${prefix}Title`, category === "songs" ? "songTitle" : "", category === "radios" ? "radioTitle" : ""].filter(Boolean));
  const urlInput = getMediaUrlForPrefix(prefix);
  const file = getFileByIds([`${prefix}File`, `${prefix}UploadFile`, category === "songs" ? "songFile" : "", category === "radios" ? "radioFile" : ""].filter(Boolean));
  const imageUrl = getThumbnailUrlForPrefix(prefix);

  if (!title) return alert("제목을 입력하세요.");
  if (!urlInput && !file) {
    return alert("미디어 URL 칸에 링크를 입력하세요. 예: https://drive.google.com/file/d/.../view 또는 https://drive.google.com/uc?export=download&id=...");
  }

  try {
    const mediaUrl = normalizeMediaUrlForPlayback(urlInput || await uploadFileToGitHubWorker(file, category === "songs" ? "audios" : "radios"), "audio");

    await addDoc(collection(db, "contents"), {
      category,
      subCategory: document.getElementById(`${prefix}SubCategory`)?.value || "",
      mediaType: "audio",
      title,
      mediaUrl,
      thumbnailUrl: imageUrl,
      description: getInputValueByIds([`${prefix}Description`, `${prefix}Desc`]),
      year: getInputValueByIds([`${prefix}Year`]),
      source: getInputValueByIds([`${prefix}Source`]),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    alert("미디어 링크가 저장되었습니다.");
    await loadContents();
  } catch (error) {
    alert("미디어 링크 저장 오류: " + error.message);
  }
}


function fillMyPageForm() {
  if (!currentUser || !currentUserProfile) return;

  const loginIdEl = document.getElementById("mypageLoginId");
  const emailEl = document.getElementById("mypageEmail");
  const nameEl = document.getElementById("mypageName");
  const phoneEl = document.getElementById("mypagePhone");

  if (loginIdEl) loginIdEl.value = currentUserProfile.loginId || "";
  if (emailEl) emailEl.value = currentUser.email || currentUserProfile.email || "";
  if (nameEl) nameEl.value = currentUserProfile.name || "";
  if (phoneEl) phoneEl.value = currentUserProfile.phone || "";
}

async function saveMyPageInfo() {
  if (!currentUser) return alert("로그인 후 이용할 수 있습니다.");

  const name = document.getElementById("mypageName").value.trim();
  const phone = document.getElementById("mypagePhone").value.trim();

  if (!name || !phone) return alert("이름과 전화번호를 입력하세요.");

  try {
    await updateDoc(doc(db, "users", currentUser.uid), {
      name,
      phone,
      updatedAt: serverTimestamp()
    });

    currentUserProfile = { ...(currentUserProfile || {}), name, phone };
    alert("회원 정보가 수정되었습니다.");
    fillMyPageForm();
  } catch (error) {
    alert("회원 정보 수정 오류: " + error.message);
  }
}

async function deleteMyAccount() {
  if (!currentUser || !currentUserProfile) return alert("로그인 후 이용할 수 있습니다.");

  const confirmText = prompt("회원 탈퇴를 진행하려면 '탈퇴합니다'를 입력하세요.");
  if (confirmText !== "탈퇴합니다") return alert("회원 탈퇴가 취소되었습니다.");

  try {
    const uid = currentUser.uid;
    const loginId = currentUserProfile.loginId;

    await deleteDoc(doc(db, "users", uid));
    if (loginId) await deleteDoc(doc(db, "loginIds", loginId));

    await deleteUser(currentUser);

    alert("회원 탈퇴가 완료되었습니다.");
    goPage("home");
  } catch (error) {
    if (String(error.code || "").includes("requires-recent-login")) {
      alert("보안을 위해 다시 로그인한 뒤 회원 탈퇴를 진행해야 합니다.");
    } else {
      alert("회원 탈퇴 오류: " + error.message);
    }
  }
}








function applyHomeVoiceSettings(settings = currentSettings || {}) {
  const audioEl = document.getElementById("homeVoiceAudio");
  if (!audioEl) return;

  const voiceUrl = settings.homeVoiceUrl || "https://mdshoons.github.io/kwangseoks/audios/kim-kwangseok-voice-greeting.mp3";

  if (!voiceUrl) {
    audioEl.pause();
    audioEl.removeAttribute("src");
    return;
  }

  audioEl.src = voiceUrl;
  audioEl.preload = "auto";
  audioEl.setAttribute("playsinline", "");
  audioEl.setAttribute("controlsList", "nodownload noplaybackrate");
  audioEl.setAttribute("oncontextmenu", "return false");

  setupHeroVoiceHover();
}


function setupHeroVoiceHover() {
  const hero = document.querySelector("#home .hero");
  const audioEl = document.getElementById("homeVoiceAudio");
  if (!hero || !audioEl || !audioEl.src) return;

  if (hero.dataset.voiceBound === "pauseResume") return;
  hero.dataset.voiceBound = "pauseResume";

  hero.setAttribute("title", "커서를 올리면 김광석의 목소리가 재생되고, 벗어나면 멈춥니다.");

  const playVoice = async () => {
    if (!audioEl.src) return;

    try {
      await audioEl.play();
    } catch (error) {
      console.log("브라우저가 hover 재생을 막았습니다. 클릭/터치 때 다시 시도합니다:", error?.message || error);
    }
  };

  const pauseVoice = () => {
    if (!audioEl.paused) {
      audioEl.pause();
    }
  };

  const toggleVoice = async () => {
    if (audioEl.paused) {
      await playVoice();
    } else {
      pauseVoice();
    }
  };

  // PC: 커서가 올라오면 이어서 재생, 벗어나면 일시정지
  hero.addEventListener("mouseenter", playVoice);
  hero.addEventListener("mouseleave", pauseVoice);

  // 키보드 접근성
  hero.addEventListener("focus", playVoice);
  hero.addEventListener("blur", pauseVoice);

  // 브라우저가 hover 재생을 막는 경우, 클릭하면 재생/일시정지 토글
  hero.addEventListener("click", toggleVoice);

  // 모바일: 터치할 때 재생/일시정지 토글
  hero.addEventListener("touchstart", (event) => {
    toggleVoice();
  }, { passive: true });
}


async function loadSiteSettings() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "main"));
    currentSettings = snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : { ...DEFAULT_SETTINGS };
  } catch { currentSettings = { ...DEFAULT_SETTINGS }; }
  applySiteSettings(currentSettings);
}

function applySiteSettings(settings) {
  applyDesignSettings(settings);
  document.getElementById("siteLogoText").textContent = settings.siteName;
  document.getElementById("siteLogoSubText").textContent = settings.siteSubName;
  document.getElementById("homeTitle").textContent = settings.homeTitle;
  document.getElementById("homeDescription").textContent = settings.homeDescription;
  ["videos","songs","radios","photos","stories","about","oneum"].forEach(p => {
    const el = document.getElementById(`${p}Desc`);
    if (el) el.textContent = settings[`${p}Desc`] || DEFAULT_SETTINGS[`${p}Desc`];
  });
  document.getElementById("footerTitle").textContent = `${settings.siteName} | ${settings.siteSubName}`;
  const hero = document.getElementById("homeHero");
  const bg = settings.homeBgDataUrl || settings.homeBgUrl;
  hero.style.backgroundImage = bg ? `url("${bg}${bg.startsWith("data:") ? "" : (bg.includes("?") ? "&" : "?") + "v=" + Date.now()}")` : "";
}

function applyDesignSettings(s = currentSettings) {
  const root = document.documentElement;
  const map = {
    "--body-bg": s.bodyBgColor, "--header-bg": s.headerBgColor, "--button-bg": s.buttonColor, "--card-bg": s.cardBgColor,
    "--text-color": s.textColor, "--hero-text-color": s.heroTextColor, "--nav-text-color": s.navTextColor,
    "--base-font-size": `${s.baseFontSize}px`, "--hero-title-size": `${s.heroTitleSize}px`, "--hero-desc-size": `${s.heroDescSize}px`
  };
  Object.entries(map).forEach(([k,v]) => root.style.setProperty(k, v));
}

function fillSettingsFormFromCurrent() {
  const ids = {
    settingSiteName:"siteName", settingSiteSubName:"siteSubName", settingHomeTitle:"homeTitle", settingHomeDescription:"homeDescription",
    settingVideosDesc:"videosDesc", settingSongsDesc:"songsDesc", settingRadiosDesc:"radiosDesc", settingPhotosDesc:"photosDesc",
    settingStoriesDesc:"storiesDesc", settingAboutDesc:"aboutDesc", settingOneumDesc:"oneumDesc",
    settingBodyBgColor:"bodyBgColor", settingHeaderBgColor:"headerBgColor", settingButtonColor:"buttonColor", settingCardBgColor:"cardBgColor",
    settingTextColor:"textColor", settingHeroTextColor:"heroTextColor", settingNavTextColor:"navTextColor",
    settingBaseFontSize:"baseFontSize", settingHeroTitleSize:"heroTitleSize", settingHeroDescSize:"heroDescSize"
  };
  Object.entries(ids).forEach(([id,key]) => { const el = document.getElementById(id); if (el) el.value = currentSettings[key] || DEFAULT_SETTINGS[key] || ""; });
  const bgUrl = document.getElementById("settingHomeBgUrl");
  if (bgUrl) bgUrl.value = currentSettings.homeBgDataUrl ? "" : (currentSettings.homeBgUrl || "");

  if (document.getElementById("homeVoiceTitleInput")) {
    document.getElementById("homeVoiceTitleInput").value = currentSettings.homeVoiceTitle || "김광석의 목소리";
  }
  if (document.getElementById("homeVoiceDescriptionInput")) {
    document.getElementById("homeVoiceDescriptionInput").value = currentSettings.homeVoiceDescription || "그의 목소리를 잠시 들어보세요.";
  }
  if (document.getElementById("homeVoiceUrlInput")) {
    document.getElementById("homeVoiceUrlInput").value = currentSettings.homeVoiceUrl || "https://mdshoons.github.io/kwangseoks/audios/kim-kwangseok-voice-greeting.mp3";
  }

}

function readDesignSettingsFromForm() {
  return {
    bodyBgColor: document.getElementById("settingBodyBgColor").value, headerBgColor: document.getElementById("settingHeaderBgColor").value,
    buttonColor: document.getElementById("settingButtonColor").value, cardBgColor: document.getElementById("settingCardBgColor").value,
    textColor: document.getElementById("settingTextColor").value, heroTextColor: document.getElementById("settingHeroTextColor").value,
    navTextColor: document.getElementById("settingNavTextColor").value, baseFontSize: document.getElementById("settingBaseFontSize").value,
    heroTitleSize: document.getElementById("settingHeroTitleSize").value, heroDescSize: document.getElementById("settingHeroDescSize").value
  };
}

function bindDesignPreviewEvents() {
  const selector = "#settingBodyBgColor,#settingHeaderBgColor,#settingButtonColor,#settingCardBgColor,#settingTextColor,#settingHeroTextColor,#settingNavTextColor,#settingBaseFontSize,#settingHeroTitleSize,#settingHeroDescSize";
  document.querySelectorAll(selector).forEach(el => {
    if (el.dataset.bound) return; el.dataset.bound = "1";
    el.addEventListener("input", () => applyDesignSettings({ ...currentSettings, ...readDesignSettingsFromForm() }));
  });
}
document.getElementById("applyDesignPreviewBtn").addEventListener("click", () => applyDesignSettings({ ...currentSettings, ...readDesignSettingsFromForm() }));
document.getElementById("resetDesignBtn").addEventListener("click", () => { currentSettings = { ...currentSettings, ...DEFAULT_SETTINGS }; fillSettingsFormFromCurrent(); applyDesignSettings(currentSettings); });

document.getElementById("saveSiteSettingsBtn").addEventListener("click", async () => {
  if (!isAdmin) return alert("관리자만 변경할 수 있습니다.");
  try {
    const file = document.getElementById("settingHomeBgFile").files[0];
    const url = document.getElementById("settingHomeBgUrl").value.trim();
    let homeBgDataUrl = currentSettings.homeBgDataUrl || "";
    let homeBgUrl = currentSettings.homeBgUrl || "";
    if (file) { homeBgDataUrl = await fileToCompressedDataUrl(file, 1600, .78); homeBgUrl = ""; }
    else if (url) { homeBgUrl = url; homeBgDataUrl = ""; }
    const settings = {
      siteName: document.getElementById("settingSiteName").value.trim() || DEFAULT_SETTINGS.siteName,
      siteSubName: document.getElementById("settingSiteSubName").value.trim() || DEFAULT_SETTINGS.siteSubName,
      homeTitle: document.getElementById("settingHomeTitle").value.trim() || DEFAULT_SETTINGS.homeTitle,
      homeDescription: document.getElementById("settingHomeDescription").value.trim() || DEFAULT_SETTINGS.homeDescription,
      videosDesc: document.getElementById("settingVideosDesc").value.trim() || DEFAULT_SETTINGS.videosDesc,
      songsDesc: document.getElementById("settingSongsDesc").value.trim() || DEFAULT_SETTINGS.songsDesc,
      radiosDesc: document.getElementById("settingRadiosDesc").value.trim() || DEFAULT_SETTINGS.radiosDesc,
      photosDesc: document.getElementById("settingPhotosDesc").value.trim() || DEFAULT_SETTINGS.photosDesc,
      storiesDesc: document.getElementById("settingStoriesDesc").value.trim() || DEFAULT_SETTINGS.storiesDesc,
      aboutDesc: document.getElementById("settingAboutDesc").value.trim() || DEFAULT_SETTINGS.aboutDesc,
      oneumDesc: document.getElementById("settingOneumDesc").value.trim() || DEFAULT_SETTINGS.oneumDesc,
      ...readDesignSettingsFromForm(), homeBgUrl, homeBgDataUrl, 
    homeVoiceTitle: document.getElementById("homeVoiceTitleInput")?.value.trim() || "김광석의 목소리",
    homeVoiceDescription: document.getElementById("homeVoiceDescriptionInput")?.value.trim() || "그의 목소리를 잠시 들어보세요.",
    homeVoiceUrl: document.getElementById("homeVoiceUrlInput")?.value.trim() || "https://mdshoons.github.io/kwangseoks/audios/kim-kwangseok-voice-greeting.mp3",
    updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, "siteSettings", "main"), settings);
    currentSettings = { ...DEFAULT_SETTINGS, ...settings };
    applySiteSettings(currentSettings); fillSettingsFormFromCurrent();
    document.getElementById("settingHomeBgFile").value = ""; document.getElementById("settingHomeBgUrl").value = "";
    alert("사이트 설정이 저장되었습니다.");
  } catch(e) { alert("사이트 설정 저장 오류: " + e.message); }
});

document.getElementById("saveTemplateBtn").addEventListener("click", async () => {
  if (!isAdmin) return alert("관리자만 변경할 수 있습니다.");
  const page = document.getElementById("templatePage").value;
  const template = document.getElementById("templateType").value;
  await setDoc(doc(db, "templateSettings", page), { page, template, updatedAt: serverTimestamp() });
  applyTemplate(page, template); alert("템플릿이 저장되었습니다.");
});

async function quickTemplate(page, template) {
  applyTemplate(page, template);
  if (isAdmin) await setDoc(doc(db, "templateSettings", page), { page, template, updatedAt: serverTimestamp() });
}
function applyTemplate(page, template) {
  const section = document.getElementById(page); if (!section) return;
  section.classList.remove("template-card","template-gallery","template-list","template-timeline","template-wide");
  section.classList.add(`template-${template}`);
}
async function applySavedTemplates() {
  for (const p of ["home","videos","songs","radios","photos","stories","about","oneum"]) {
    const snap = await getDoc(doc(db, "templateSettings", p));
    if (snap.exists()) applyTemplate(p, snap.data().template);
  }
}





function showScreenProtectOverlay(reason = "protect") {
  // v109: 화면 보호 오버레이가 사이트 클릭을 막는 문제를 방지하기 위해 비활성화합니다.
  const overlay = document.getElementById("screenProtectOverlay");
  if (overlay) overlay.classList.add("hidden");
  document.body.classList.remove("screen-protect-blur", "print-protect");
}

function installScreenProtection() {
  // v114: 우클릭/F12 차단은 유지하되, 예전 화면 가림 오버레이는 사용하지 않습니다.
  const overlay = document.getElementById("screenProtectOverlay");
  if (overlay) overlay.classList.add("hidden");
  document.body.classList.remove("screen-protect-blur", "print-protect");
}

function installBasicContentProtection() {
  // v114: 전체 페이지 우클릭, 드래그, 개발자도구 주요 단축키 차단 재적용
  if (document.body) document.body.classList.add("content-protected");

  const block = (event) => {
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

  if (!window.__kksContentProtectionBound) {
    window.__kksContentProtectionBound = true;

    document.addEventListener("contextmenu", block, true);
    document.addEventListener("dragstart", block, true);

    document.addEventListener("selectstart", (event) => {
      const target = event.target;
      const tag = target?.tagName?.toLowerCase() || "";
      if (["input", "textarea", "select", "option"].includes(tag) || target?.isContentEditable) return true;
      return block(event);
    }, true);

    document.addEventListener("keydown", (event) => {
      const key = String(event.key || "").toLowerCase();
      const code = event.keyCode || event.which;
      const ctrl = event.ctrlKey || event.metaKey;
      const shift = event.shiftKey;

      const blocked =
        code === 123 || key === "f12" ||
        (ctrl && shift && ["i", "j", "c", "k"].includes(key)) ||
        (ctrl && ["u", "s"].includes(key));

      if (blocked) return block(event);
      return true;
    }, true);
  }

  document.querySelectorAll("img, audio, video, iframe").forEach((el) => {
    el.setAttribute("draggable", "false");
    el.setAttribute("oncontextmenu", "return false");
  });
}

function hardenMediaDownloadControls() {
  document.querySelectorAll("audio, video").forEach((media) => {
    media.setAttribute("controlsList", "nodownload noplaybackrate");
    media.setAttribute("oncontextmenu", "return false");
    media.addEventListener("contextmenu", (event) => event.preventDefault());
    if (media.tagName.toLowerCase() === "video") {
      media.setAttribute("disablePictureInPicture", "");
    }
  });
}

function renderAllContentSections() {
  renderLatest(allContents);
  renderLatestByCategory(allContents);

  const videos = prepareItemsForPage("videos", filterBySelectedSubCategory("videos", allContents.filter(i => i.category === "videos")));
  const songs = prepareItemsForPage("songs", filterBySelectedSubCategory("songs", allContents.filter(i => i.category === "songs")));
  const radios = prepareItemsForPage("radios", filterBySelectedSubCategory("radios", allContents.filter(i => i.category === "radios")));
  const photos = prepareItemsForPage("photos", filterBySelectedSubCategory("photos", allContents.filter(i => i.category === "photos")));
  const stories = prepareItemsForPage("stories", filterBySelectedSubCategory("stories", allContents.filter(i => i.category === "stories")));
  const oneum = prepareItemsForPage("oneum", filterBySelectedSubCategory("oneum", allContents.filter(i => i.category === "oneum")));

  renderVideos(videos);
  renderPhotos(photos);
  renderList("songList", songs);
  renderList("radioList", radios);
  renderList("storyList", stories);
  renderAboutDocument(allContents.filter(i => i.category === "about"));
  renderList("oneumList", oneum);

  renderAdminManageList();
  installBasicContentProtection();
  setupRadioMonochromePlayers();
}


let dailyRecommendedItemId = "";
let dailyPlayerBound = false;
let playlistPlayerBound = false;
let playlistCurrentItemId = "";
let playlistRequestedItemId = "";

function getKoreanDateKey() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });

  return formatter.format(new Date());
}

function seededNumberFromString(text) {
  let hash = 2166136261;

  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0);
}

function pickDailyRecommendedSong(songs) {
  const playable = songs.filter((item) => {
    const url = getPlayableAudioUrl(item);
    return !!url;
  });

  if (!playable.length) return null;

  const dateKey = getKoreanDateKey();
  const seed = seededNumberFromString(`kwangseoks-${dateKey}`);
  const index = seed % playable.length;

  return playable[index];
}

function formatPlayerTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${min}:${sec}`;
}

function getAudioPlaybackCandidates(url) {
  const value = String(url || "").trim();
  if (!value) return [];

  const candidates = [];
  const push = (candidate) => {
    if (candidate && !candidates.includes(candidate)) candidates.push(candidate);
  };

  const normalized = normalizeMediaUrlForPlayback(value, "audio");
  push(normalized);
  push(value);

  // GitHub Pages에 방금 올라간 파일은 배포 지연 때문에 0:00/404가 날 수 있으므로 raw 주소를 우선 시도한다.
  const raw = normalizeGitHubPagesAudioUrl(value);
  if (raw !== value) push(raw);

  const id = getGoogleDriveFileId(value);
  if (id) {
    const encoded = encodeURIComponent(id);
    push(`https://drive.usercontent.google.com/download?id=${encoded}&export=download&authuser=0`);
    push(`https://drive.google.com/uc?export=download&id=${encoded}`);
    push(`https://docs.google.com/uc?export=download&id=${encoded}`);
  }

  return candidates;
}

function formatPlayerDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "--:--";
  return formatPlayerTime(seconds);
}

function getDailySongCategoryLabel(item) {
  const candidates = [
    item?.subCategory,
    item?.album,
    item?.albumTitle,
    item?.collection,
    item?.disc,
    item?.releaseTitle
  ];

  const found = candidates
    .map((value) => String(value || "").trim())
    .find(Boolean);

  return found || "앨범/분류 미지정";
}

function getDailyPlayerClosedKey() {
  return `kwangseoks_daily_player_closed_${getKoreanDateKey()}`;
}

function getDailyPlayerHideUntilKey() {
  return "kwangseoks_daily_player_hide_until";
}

function isDailyRecommendPlayerHiddenByTime() {
  const hideUntil = Number(localStorage.getItem(getDailyPlayerHideUntilKey()) || 0);

  if (!Number.isFinite(hideUntil) || hideUntil <= 0) {
    return false;
  }

  if (Date.now() < hideUntil) {
    return true;
  }

  localStorage.removeItem(getDailyPlayerHideUntilKey());
  return false;
}

function closeDailyRecommendPlayer() {
  const player = document.getElementById("dailyRecommendPlayer");
  const audio = document.getElementById("dailyPlayerAudio");

  if (audio) {
    audio.pause();
  }

  if (player) {
    player.classList.add("closed");
  }
}

function hideDailyRecommendPlayerForHours(hours) {
  const safeHours = Number(hours);
  if (!Number.isFinite(safeHours) || safeHours <= 0) return;

  localStorage.setItem(getDailyPlayerHideUntilKey(), String(Date.now() + safeHours * 60 * 60 * 1000));
  closeDailyRecommendPlayer();
}

function setupDailyRecommendPlayer() {
  const player = document.getElementById("dailyRecommendPlayer");
  const audio = document.getElementById("dailyPlayerAudio");
  const title = document.getElementById("dailyPlayerTitle");
  const sub = document.getElementById("dailyPlayerSub");
  const playBtn = document.getElementById("dailyPlayerPlayBtn");
  const progress = document.getElementById("dailyPlayerProgress");
  const current = document.getElementById("dailyPlayerCurrent");
  const duration = document.getElementById("dailyPlayerDuration");
  const muteBtn = document.getElementById("dailyPlayerMuteBtn");
  const volumeSlider = document.getElementById("dailyPlayerVolume");
  const closeBtn = document.getElementById("dailyPlayerCloseBtn");
  const hide1hBtn = document.getElementById("dailyPlayerHide1hBtn");
  const hide24hBtn = document.getElementById("dailyPlayerHide24hBtn");

  if (!player || !audio || !title || !sub || !playBtn || !progress || !current || !duration || !muteBtn || !volumeSlider || !closeBtn) return;

  // v85: 기존 “오늘 닫힘” 저장 방식은 더 이상 사용하지 않습니다.
  // X 버튼은 현재 화면에서만 닫고, 1시간/24시간 버튼만 만료시간을 localStorage에 저장합니다.
  localStorage.removeItem(getDailyPlayerClosedKey());

  if (isDailyRecommendPlayerHiddenByTime()) {
    player.classList.add("closed");
    audio.pause();
    return;
  }

  player.classList.remove("closed");


  
  const savedVolume = localStorage.getItem("kwangseoks_daily_player_volume");
  const savedMuted = localStorage.getItem("kwangseoks_daily_player_muted");

  const initialVolume = savedVolume !== null ? Math.min(1, Math.max(0, Number(savedVolume))) : 0.7;
  audio.volume = Number.isFinite(initialVolume) ? initialVolume : 0.7;
  audio.muted = savedMuted === "yes";
  volumeSlider.value = String(Math.round(audio.volume * 100));
  muteBtn.textContent = audio.muted || audio.volume === 0 ? "M" : "V";

  
  // 브라우저 기본 range 스타일이 크게 보이는 문제를 막기 위해 inline style도 강제 적용
  muteBtn.style.width = "18px";
  muteBtn.style.height = "18px";
  muteBtn.style.minWidth = "18px";
  muteBtn.style.padding = "0";
  muteBtn.style.fontSize = "9px";
  muteBtn.style.lineHeight = "1";
  muteBtn.style.boxShadow = "none";

  volumeSlider.style.width = "54px";
  volumeSlider.style.maxWidth = "54px";
  volumeSlider.style.minWidth = "54px";
  volumeSlider.style.height = "2px";
  volumeSlider.style.margin = "0";
  volumeSlider.style.padding = "0";
  volumeSlider.style.accentColor = "#ffffff";

  const songs = allContents.filter((item) => item.category === "songs");
  const selected = pickDailyRecommendedSong(songs);

  player.classList.remove("hidden");

  if (!selected) {
    dailyRecommendedItemId = "";
    audio.pause();
    audio.removeAttribute("src");
    title.textContent = "재생할 곡이 없습니다";
    sub.textContent = "Songs에 음원을 등록하면 오늘의 추천곡이 표시됩니다.";
    playBtn.textContent = "▶";
    playBtn.disabled = true;
    playBtn.classList.add("disabled");
    progress.value = "0";
    progress.disabled = true;
    current.textContent = "0:00";
    duration.textContent = "0:00";
    return;
  }

  const sourceUrl = normalizeMediaUrlForPlayback(selected.mediaUrl || selected.fileUrl || selected.audioUrl || "", "audio");
  if (!sourceUrl) {
    dailyRecommendedItemId = "";
    audio.pause();
    audio.removeAttribute("src");
    title.textContent = "재생할 곡이 없습니다";
    sub.textContent = "Songs에 재생 가능한 음원 URL이 없습니다.";
    playBtn.textContent = "▶";
    playBtn.disabled = true;
    playBtn.classList.add("disabled");
    progress.value = "0";
    progress.disabled = true;
    current.textContent = "0:00";
    duration.textContent = "0:00";
    return;
  }

  playBtn.disabled = false;
  playBtn.classList.remove("disabled");
  progress.disabled = false;

  const songCategoryLabel = getDailySongCategoryLabel(selected);
  title.textContent = selected.title || "제목 없는 추천곡";
  sub.textContent = `앨범/분류: ${songCategoryLabel} · ${getKoreanDateKey()} · 매일 00:00 추천 변경`;

  if (dailyRecommendedItemId !== selected.id) {
    dailyRecommendedItemId = selected.id;
    audio.pause();
    audio.src = sourceUrl;
    audio.currentTime = 0;
    progress.value = "0";
    playBtn.textContent = "▶";
    current.textContent = "0:00";
    duration.textContent = "0:00";
  }

  if (dailyPlayerBound) return;
  dailyPlayerBound = true;

  audio.setAttribute("controlsList", "nodownload noplaybackrate");
  audio.setAttribute("oncontextmenu", "return false");

  
  
  closeBtn.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeDailyRecommendPlayer();
  });

  if (hide1hBtn) {
    hide1hBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideDailyRecommendPlayerForHours(1);
    });
  }

  if (hide24hBtn) {
    hide24hBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideDailyRecommendPlayerForHours(24);
    });
  }

  volumeSlider.addEventListener("input", () => {
    const value = Math.min(100, Math.max(0, Number(volumeSlider.value || 0)));
    audio.volume = value / 100;

    if (audio.volume === 0) {
      audio.muted = true;
    } else {
      audio.muted = false;
    }

    localStorage.setItem("kwangseoks_daily_player_volume", String(audio.volume));
    localStorage.setItem("kwangseoks_daily_player_muted", audio.muted ? "yes" : "no");
    muteBtn.textContent = audio.muted || audio.volume === 0 ? "M" : "V";
  });

  muteBtn.addEventListener("click", () => {
    audio.muted = !audio.muted;
    localStorage.setItem("kwangseoks_daily_player_muted", audio.muted ? "yes" : "no");
    muteBtn.textContent = audio.muted || audio.volume === 0 ? "M" : "V";
  });

  audio.addEventListener("volumechange", () => {
    volumeSlider.value = String(Math.round(audio.volume * 100));
    muteBtn.textContent = audio.muted || audio.volume === 0 ? "M" : "V";
  });

  playBtn.addEventListener("click", async () => {
    if (playBtn.disabled || !audio.src) return;

    try {
      if (audio.paused) {
        await audio.play();
      } else {
        audio.pause();
      }
    } catch (error) {
      console.log("추천곡 재생 오류:", error?.message || error);
    }
  });

  audio.addEventListener("play", () => {
    playBtn.textContent = "Ⅱ";
  });

  audio.addEventListener("pause", () => {
    playBtn.textContent = "▶";
  });

  audio.addEventListener("loadedmetadata", () => {
    duration.textContent = formatPlayerTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    current.textContent = formatPlayerTime(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      progress.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    }
  });

  progress.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
    }
  });

  audio.addEventListener("ended", () => {
    playBtn.textContent = "▶";
    progress.value = "0";
  });
}


function getUserPlaylistStorageKey() {
  return "kwangseoks_user_playlist_song_ids_v1";
}

function loadUserPlaylistIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(getUserPlaylistStorageKey()) || "[]");
    return Array.isArray(parsed) ? parsed.map((id) => String(id || "")).filter(Boolean) : [];
  } catch (_) {
    return [];
  }
}

function saveUserPlaylistIds(ids) {
  const unique = [];
  (ids || []).forEach((id) => {
    const value = String(id || "").trim();
    if (value && !unique.includes(value)) unique.push(value);
  });
  localStorage.setItem(getUserPlaylistStorageKey(), JSON.stringify(unique));
}

function getUserPlaylistSongs() {
  const ids = loadUserPlaylistIds();
  const validSongs = [];
  ids.forEach((id) => {
    const item = allContents.find((content) => String(content.id) === String(id));
    if (item && item.category === "songs" && getPlayableAudioUrl(item)) {
      validSongs.push(item);
    }
  });
  if (validSongs.length !== ids.length) saveUserPlaylistIds(validSongs.map((item) => item.id));
  return validSongs;
}

function resetPlaylistPlayerUi(audio, playBtn, progress, current, duration) {
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load?.();
  }
  if (playBtn) {
    playBtn.textContent = "▶";
    playBtn.disabled = true;
    playBtn.classList.add("disabled");
  }
  if (progress) {
    progress.value = "0";
    progress.disabled = true;
  }
  if (current) current.textContent = "0:00";
  if (duration) duration.textContent = "0:00";
}

function closeUserPlaylistPlayerTemporarily() {
  const player = document.getElementById("userPlaylistPlayer");
  const audio = document.getElementById("playlistPlayerAudio");
  if (audio) audio.pause();
  if (player) player.classList.add("closed");
}

function clearUserPlaylist() {
  saveUserPlaylistIds([]);
  playlistCurrentItemId = "";
  playlistRequestedItemId = "";
  setupUserPlaylistPlayer({ forceOpen: false });
  updatePlaylistAddButtons();
}

function removeCurrentSongFromPlaylist() {
  if (!playlistCurrentItemId) return;
  const ids = loadUserPlaylistIds().filter((id) => String(id) !== String(playlistCurrentItemId));
  saveUserPlaylistIds(ids);
  playlistCurrentItemId = "";
  playlistRequestedItemId = ids[0] || "";
  setupUserPlaylistPlayer({ forceOpen: ids.length > 0 });
  updatePlaylistAddButtons();
}

function addSongToUserPlaylist(songId) {
  const id = String(songId || "").trim();
  if (!id) return;
  const item = allContents.find((content) => String(content.id) === id);
  if (!item || item.category !== "songs" || !getPlayableAudioUrl(item)) {
    alert("재생 가능한 Songs 음원만 플레이리스트에 담을 수 있습니다.");
    return;
  }
  const ids = loadUserPlaylistIds();
  if (!ids.includes(id)) ids.push(id);
  saveUserPlaylistIds(ids);
  playlistRequestedItemId = id;
  setupUserPlaylistPlayer({ forceOpen: true });
  updatePlaylistAddButtons();
}
window.addSongToUserPlaylist = addSongToUserPlaylist;

function updatePlaylistAddButtons() {
  const ids = loadUserPlaylistIds();
  document.querySelectorAll(".playlist-add-btn").forEach((btn) => {
    const onclick = btn.getAttribute("onclick") || "";
    const match = onclick.match(/addSongToUserPlaylist\(\"([^\"]+)\"\)/);
    const id = match ? match[1] : "";
    const added = id && ids.includes(id);
    btn.textContent = added ? "✓ 플레이리스트에 담김" : "＋ 플레이리스트 담기";
    btn.classList.toggle("added", Boolean(added));
  });
}

function movePlaylistSelection(direction) {
  const songs = getUserPlaylistSongs();
  if (!songs.length) return;
  const currentIndex = Math.max(0, songs.findIndex((item) => String(item.id) === String(playlistCurrentItemId)));
  const nextIndex = (currentIndex + direction + songs.length) % songs.length;
  playlistRequestedItemId = songs[nextIndex].id;
  setupUserPlaylistPlayer({ forceOpen: true });
}

function setupUserPlaylistPlayer(options = {}) {
  const player = document.getElementById("userPlaylistPlayer");
  const audio = document.getElementById("playlistPlayerAudio");
  const title = document.getElementById("playlistPlayerTitle");
  const sub = document.getElementById("playlistPlayerSub");
  const playBtn = document.getElementById("playlistPlayerPlayBtn");
  const progress = document.getElementById("playlistPlayerProgress");
  const current = document.getElementById("playlistPlayerCurrent");
  const duration = document.getElementById("playlistPlayerDuration");
  const muteBtn = document.getElementById("playlistPlayerMuteBtn");
  const volumeSlider = document.getElementById("playlistPlayerVolume");
  const closeBtn = document.getElementById("playlistPlayerCloseBtn");
  const prevBtn = document.getElementById("playlistPlayerPrevBtn");
  const nextBtn = document.getElementById("playlistPlayerNextBtn");
  const clearBtn = document.getElementById("playlistPlayerClearBtn");
  const removeBtn = document.getElementById("playlistPlayerRemoveBtn");

  if (!player || !audio || !title || !sub || !playBtn || !progress || !current || !duration || !muteBtn || !volumeSlider) return;

  const songs = getUserPlaylistSongs();
  if (!songs.length) {
    player.classList.add("closed");
    playlistCurrentItemId = "";
    title.textContent = "선택한 곡이 없습니다";
    sub.textContent = "Songs에서 듣고 싶은 곡을 담으면 표시됩니다.";
    resetPlaylistPlayerUi(audio, playBtn, progress, current, duration);
    return;
  }

  if (options.forceOpen) player.classList.remove("closed");
  if (!player.classList.contains("closed")) player.classList.remove("closed");

  const requestedIndex = playlistRequestedItemId ? songs.findIndex((item) => String(item.id) === String(playlistRequestedItemId)) : -1;
  const currentIndex = playlistCurrentItemId ? songs.findIndex((item) => String(item.id) === String(playlistCurrentItemId)) : -1;
  const selectedIndex = requestedIndex >= 0 ? requestedIndex : (currentIndex >= 0 ? currentIndex : 0);
  const selected = songs[selectedIndex] || songs[0];
  const sourceUrl = normalizeMediaUrlForPlayback(getPlayableAudioUrl(selected), "audio");

  playBtn.disabled = false;
  playBtn.classList.remove("disabled");
  progress.disabled = false;

  title.textContent = selected.title || "제목 없는 곡";
  sub.textContent = `${selectedIndex + 1}/${songs.length}곡 · 앨범/분류: ${getDailySongCategoryLabel(selected)}`;

  if (playlistCurrentItemId !== selected.id || audio.dataset.playlistSrc !== sourceUrl) {
    playlistCurrentItemId = selected.id;
    audio.pause();
    audio.src = sourceUrl;
    audio.dataset.playlistSrc = sourceUrl;
    audio.currentTime = 0;
    progress.value = "0";
    playBtn.textContent = "▶";
    current.textContent = "0:00";
    duration.textContent = "0:00";
  }
  playlistRequestedItemId = "";

  if (playlistPlayerBound) return;
  playlistPlayerBound = true;

  const savedVolume = localStorage.getItem("kwangseoks_playlist_player_volume");
  const savedMuted = localStorage.getItem("kwangseoks_playlist_player_muted");
  const initialVolume = savedVolume !== null ? Math.min(1, Math.max(0, Number(savedVolume))) : 0.7;
  audio.volume = Number.isFinite(initialVolume) ? initialVolume : 0.7;
  audio.muted = savedMuted === "yes";
  volumeSlider.value = String(Math.round(audio.volume * 100));
  muteBtn.textContent = audio.muted || audio.volume === 0 ? "M" : "V";
  audio.setAttribute("controlsList", "nodownload noplaybackrate");
  audio.setAttribute("oncontextmenu", "return false");

  closeBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeUserPlaylistPlayerTemporarily();
  });

  prevBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    movePlaylistSelection(-1);
  });

  nextBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    movePlaylistSelection(1);
  });

  clearBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    clearUserPlaylist();
  });

  removeBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    removeCurrentSongFromPlaylist();
  });

  volumeSlider.addEventListener("input", () => {
    const value = Math.min(100, Math.max(0, Number(volumeSlider.value || 0)));
    audio.volume = value / 100;
    audio.muted = audio.volume === 0;
    localStorage.setItem("kwangseoks_playlist_player_volume", String(audio.volume));
    localStorage.setItem("kwangseoks_playlist_player_muted", audio.muted ? "yes" : "no");
    muteBtn.textContent = audio.muted || audio.volume === 0 ? "M" : "V";
  });

  muteBtn.addEventListener("click", () => {
    audio.muted = !audio.muted;
    localStorage.setItem("kwangseoks_playlist_player_muted", audio.muted ? "yes" : "no");
    muteBtn.textContent = audio.muted || audio.volume === 0 ? "M" : "V";
  });

  audio.addEventListener("volumechange", () => {
    volumeSlider.value = String(Math.round(audio.volume * 100));
    muteBtn.textContent = audio.muted || audio.volume === 0 ? "M" : "V";
  });

  playBtn.addEventListener("click", async () => {
    if (playBtn.disabled || !audio.src) return;
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch (error) {
      console.log("플레이리스트 재생 오류:", error?.message || error);
    }
  });

  audio.addEventListener("play", () => {
    playBtn.textContent = "Ⅱ";
  });

  audio.addEventListener("pause", () => {
    playBtn.textContent = "▶";
  });

  audio.addEventListener("loadedmetadata", () => {
    duration.textContent = formatPlayerTime(audio.duration);
  });

  audio.addEventListener("timeupdate", () => {
    current.textContent = formatPlayerTime(audio.currentTime);
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      progress.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
    }
  });

  progress.addEventListener("input", () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
    }
  });

  audio.addEventListener("ended", () => {
    playBtn.textContent = "▶";
    progress.value = "0";
    movePlaylistSelection(1);
  });
}

async function loadContents() {
  try {
    const snap = await getDocs(query(collection(db, "contents"), orderBy("createdAt", "desc")));
    allContents = [];
    snap.forEach(d => { const item = { id:d.id, ...d.data() }; if (item.isPublic !== false) allContents.push(item); });
    renderAllContentSections();
    setupDailyRecommendPlayer();
    await applySavedTemplates();
  applyHomeVoiceSettings(currentSettings);
  } catch(e) { console.error(e); }
}


const PAGE_SIZE = 6;
const PAGE_SIZE_BY_PAGE = {
  oneum: 8
};

function getPageSizeForPage(page) {
  return PAGE_SIZE_BY_PAGE[page] || PAGE_SIZE;
}

const pageState = {
  videos: 1,
  songs: 1,
  radios: 1,
  photos: 1,
  stories: 1,
  oneum: 1
};

function parseFlexibleDateText(text) {
  const value = String(text || "").trim();
  if (!value) return 0;

  const normalized = value
    .replace(/년|\./g, "-")
    .replace(/월/g, "-")
    .replace(/일/g, " ")
    .replace(/시/g, ":")
    .replace(/분/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const direct = Date.parse(normalized);
  if (!Number.isNaN(direct)) return direct;

  const match = value.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})(?:\D+(\d{1,2})[:시\s]*(\d{1,2})?)?/);
  if (!match) return 0;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const hour = match[4] ? Number(match[4]) : 0;
  const minute = match[5] ? Number(match[5]) : 0;
  return new Date(year, month, day, hour, minute).getTime();
}

function getItemTimestamp(item) {
  if (item?.category === "oneum") {
    const manualOneumDate = String(item.oneumDateTime || item.dateTime || item.writtenAtText || "").trim();
    const manualTimestamp = parseFlexibleDateText(manualOneumDate);
    if (manualTimestamp) return manualTimestamp;
  }

  const raw = item.createdAt || item.updatedAt || item.createdDate || item.date || "";
  if (!raw) return 0;

  if (typeof raw === "number") return raw;

  if (typeof raw === "string") {
    const parsed = Date.parse(raw);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (raw.seconds) return raw.seconds * 1000;
  if (typeof raw.toDate === "function") return raw.toDate().getTime();

  return 0;
}

function formatKoreanDate(value) {
  const timestamp = typeof value === "object" ? getItemTimestamp({ createdAt: value }) : getItemTimestamp({ createdAt: value });
  if (!timestamp) return "등록일 미기재";

  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${year}년 ${month}월 ${day}일 | ${hour}:${minute}`;
}

function getItemCreatedDateText(item) {
  if (item?.category === "oneum") {
    const manualOneumDate = String(item.oneumDateTime || item.dateTime || item.writtenAtText || "").trim();
    if (manualOneumDate) return manualOneumDate;
  }
  return formatKoreanDate(item.createdAt || item.updatedAt || item.createdDate || item.date || "");
}

function resetPageAndReload(page) {
  if (pageState[page]) pageState[page] = 1;
  loadContents();
}

function goContentPage(page, pageNumber) {
  pageState[page] = pageNumber;
  loadContents();

  const target = document.getElementById(page);
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

function sortItemsForPage(page, items) {
  const sortValue = document.getElementById(`${page}SortSelect`)?.value || "desc";
  return [...items].sort((a, b) => {
    const at = getItemTimestamp(a);
    const bt = getItemTimestamp(b);
    return sortValue === "asc" ? at - bt : bt - at;
  });
}

function paginateItemsForPage(page, items) {
  const pageSize = getPageSizeForPage(page);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(pageState[page] || 1, 1), totalPages);
  pageState[page] = currentPage;

  const start = (currentPage - 1) * pageSize;
  return {
    pageItems: items.slice(start, start + pageSize),
    currentPage,
    totalPages
  };
}

function renderPagination(page, totalPages, currentPage) {
  const box = document.getElementById(`${page}Pagination`);
  if (!box) return;

  if (totalPages <= 1) {
    box.innerHTML = "";
    return;
  }

  let html = "";

  if (currentPage > 1) {
    html += `<button type="button" onclick="goContentPage('${page}', ${currentPage - 1})">이전</button>`;
  }

  for (let i = 1; i <= totalPages; i += 1) {
    html += `<button type="button" class="${i === currentPage ? "active" : ""}" onclick="goContentPage('${page}', ${i})">${i}</button>`;
  }

  if (currentPage < totalPages) {
    html += `<button type="button" onclick="goContentPage('${page}', ${currentPage + 1})">다음</button>`;
  }

  box.innerHTML = html;
}


function createdDateMarkup(item) {
  if (item?.category === "oneum") return "";
  return `<p class="created-date"><strong>업로드일:</strong> ${escapeHtml(getItemCreatedDateText(item))}</p>`;
}

function isOneumItem(item) {
  return item?.category === "oneum";
}

function getOneumAuthor(item) {
  return String(item?.authorNickname || item?.uploadedByName || item?.author || item?.writer || item?.createdByName || "").trim();
}

function getOneumAuthorName(item) {
  return String(item?.authorName || item?.uploaderName || item?.realName || "").trim();
}

function formatOneumAuthorLine(nickname, name) {
  const nick = String(nickname || "").trim();
  const real = String(name || "").trim();
  if (nick && real) return `${escapeHtml(nick)} <span class="real-name-paren">(${escapeHtml(real)})</span>`;
  if (nick) return escapeHtml(nick);
  if (real) return `<span class="real-name-paren">(${escapeHtml(real)})</span>`;
  return "";
}

function getOneumDateTime(item) {
  return String(item?.oneumDateTime || item?.dateTime || item?.writtenAtText || "").trim();
}

function oneumMetaMarkup(item) {
  if (!isOneumItem(item)) return "";
  const author = getOneumAuthor(item);
  const authorName = getOneumAuthorName(item);
  const dateTime = getOneumDateTime(item);
  const authorLine = formatOneumAuthorLine(author, authorName);
  const parts = [];
  if (authorLine) parts.push(`<p><strong>올린이:</strong> ${authorLine}</p>`);
  if (dateTime) parts.push(`<p><strong>업로드일:</strong> ${escapeHtml(dateTime)}</p>`);
  if (hasOneumKksReply(item)) parts.push(`<p><span class="category-badge oneum-reply-badge">김광석 답글 포함</span></p>`);
  return parts.join("");
}

function getOneumKksReply(item) {
  const nested = item?.kksReply && typeof item.kksReply === "object" ? item.kksReply : {};
  return {
    title: String(nested.title || item?.kksReplyTitle || "").trim(),
    author: String(nested.authorNickname || nested.author || item?.kksReplyAuthor || "김광석").trim(),
    authorName: String(nested.authorName || item?.kksReplyAuthorName || "김광석").trim(),
    dateTime: String(nested.dateTime || item?.kksReplyDateTime || "").trim(),
    body: String(nested.body || item?.kksReplyBody || "").trim(),
    source: String(nested.source || item?.kksReplySource || "").trim()
  };
}

function hasOneumKksReply(item) {
  if (!isOneumItem(item)) return false;
  const reply = getOneumKksReply(item);
  return !!(item?.hasKksReply && (reply.title || reply.body));
}

function renderOneumKksReplyMarkup(item) {
  if (!hasOneumKksReply(item)) return "";
  const reply = getOneumKksReply(item);
  const source = reply.source ? `<p><strong>출처:</strong> ${escapeHtml(reply.source)}</p>` : "";
  return `<section class="oneum-kks-reply-box">
    <div class="oneum-kks-reply-label">김광석의 답글</div>
    <h3>${escapeHtml(reply.title || "답글")}</h3>
    <p><strong>올린이:</strong> ${formatOneumAuthorLine(reply.author || "김광석", reply.authorName || "김광석")}</p>
    <p><strong>날짜/시간:</strong> ${escapeHtml(reply.dateTime || "미기재")}</p>
    <div class="oneum-kks-reply-body">${escapeHtml(reply.body).replace(/\n/g, "<br>")}</div>
    ${source}
  </section>`;
}

function prepareItemsForPage(page, items) {
  const sorted = sortItemsForPage(page, items);
  const paged = paginateItemsForPage(page, sorted);
  renderPagination(page, paged.totalPages, paged.currentPage);
  return paged.pageItems;
}

function matchesPageSearch(page, item) {
  const input = document.getElementById(`${page}SearchInput`);
  const keyword = String(input?.value || "").trim().toLowerCase();
  if (!keyword) return true;

  const haystack = [
    item.title,
    item.body,
    item.description,
    item.year,
    item.source,
    item.subCategory,
    item.author,
    item.uploadedByName,
    item.oneumDateTime,
    item.category
  ].join(" ").toLowerCase();

  return haystack.includes(keyword);
}

function filterBySelectedSubCategory(page, items) {
  const selected = document.getElementById(`${page}CategoryFilter`)?.value || "";
  let filtered = selected ? items.filter(i => i.subCategory === selected) : items;
  return filtered.filter(item => matchesPageSearch(page, item));
}

function openLatestItem(page, itemId) {
  if (RESTRICTED_PAGES.includes(page) && !currentUser) {
    goPage("loginRequired");
    return;
  }

  goPage(page);
  setTimeout(() => openContentDetail(itemId), 250);
}

function renderLatestByCategory(contents) {
  const box = document.getElementById("latestByCategory");
  if (!box) return;

  const labels = {
    videos: "Videos 최신",
    songs: "Songs 최신",
    radios: "Radios 최신",
    photos: "Photos 최신",
    stories: "Stories 최신",
    oneum: "Oneum 최신"
  };

  const pages = ["videos", "songs", "radios", "photos", "stories", "oneum"];
  box.innerHTML = "";

  pages.forEach((page) => {
    const item = contents.find((content) => content.category === page);
    const div = document.createElement("div");
    div.className = "latest-category-box";

    if (!item) {
      div.innerHTML = `<h3>${labels[page]}</h3><p class="helper-text">아직 등록된 자료가 없습니다.</p>`;
    } else {
      const isLockedLatest = RESTRICTED_PAGES.includes(page) && !currentUser;
      div.innerHTML = `
        <h3>${labels[page]}</h3>
        <div class="latest-mini-card" onclick="openLatestItem('${page}', '${item.id}');">
          <strong>${escapeHtml(item.title || "제목 없음")}</strong>
          <p>${escapeHtml((item.description || item.body || "").slice(0, 70))}</p>
          ${isOneumItem(item) ? oneumMetaMarkup(item) : `<p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p><p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>`}${createdDateMarkup(item)}
          ${isLockedLatest ? `<p class="login-lock-note">로그인 후 볼 수 있습니다.</p>` : ""}
        </div>
      `;
    }

    box.appendChild(div);
  });
}

function renderLatest(contents) {
  const box = document.getElementById("latestContents"); if (!box) return; box.innerHTML = "";
  const source = contents.filter(i => i.isFeatured).length ? contents.filter(i => i.isFeatured) : contents;
  if (!source.length) { box.innerHTML = "<p>등록된 최신 자료가 없습니다.</p>"; return; }
  source.slice(0,4).forEach(i => box.appendChild(createCard(i)));
}
function renderVideos(items) { const box = document.getElementById("videoList"); box.innerHTML = ""; if (!items.length) box.innerHTML = "<p>등록된 영상이 없습니다.</p>"; items.forEach(i => box.appendChild(createCard(i))); }
function renderPhotos(items) { const box = document.getElementById("photoList"); box.innerHTML = ""; if (!items.length) box.innerHTML = "<p>등록된 사진이 없습니다.</p>"; items.forEach(i => box.appendChild(createCard(i))); }

function makeTextPreview(text, maxLength = 90) {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > maxLength ? clean.slice(0, maxLength) + "..." : clean;
}





function renderAboutDocument(items) {
  const box = document.getElementById("aboutDocument") || document.getElementById("aboutArticle");
  if (!box) return;

  const sorted = [...items].sort((a, b) => {
    const ay = Number(String(a.year || "").replace(/[^0-9]/g, "")) || 0;
    const by = Number(String(b.year || "").replace(/[^0-9]/g, "")) || 0;

    if (ay && by && ay !== by) return ay - by;
    return getItemTimestamp(a) - getItemTimestamp(b);
  });

  if (!sorted.length) {
    box.innerHTML = `<p class="helper-text">아직 등록된 김광석 관련 글이 없습니다.</p>`;
    return;
  }

  box.innerHTML = sorted.map((item) => {
    const imageUrl = item.imageUrl || item.thumbnailUrl || item.photoUrl || "";
    const bodyText = item.body || item.description || "";
    const yearText = item.year ? `<span><strong>연도:</strong> ${escapeHtml(item.year)}</span>` : "";
    const sourceText = item.source ? `<span><strong>출처:</strong> ${escapeHtml(item.source)}</span>` : `<span><strong>출처:</strong> 미기재</span>`;

    return `
      <section class="about-document-entry">
        ${imageUrl ? `<img class="about-document-image" src="${escapeHtml(playbackImageUrl)}" alt="${escapeHtml(item.title || "김광석")}" draggable="false" oncontextmenu="return false" />` : ""}
        <h2>${escapeHtml(item.title || "제목 없는 글")}</h2>
        <div class="about-document-meta">
          ${yearText}
          ${sourceText}
          <span><strong>업로드일:</strong> ${escapeHtml(getItemCreatedDateText(item))}</span>
        </div>
        ${bodyText ? `<div class="about-document-body">${escapeHtml(bodyText).replace(/\n/g, "<br>")}</div>` : `<p class="helper-text">본문이 없습니다.</p>`}
      </section>
    `;
  }).join("");
}

function renderAboutArticle(items) {
  renderAboutDocument(items);
}


function renderRadioMonochromePlayer(mediaUrl, playerId = "") {
  const normalizedUrl = normalizeMediaUrlForPlayback(mediaUrl || "", "audio");
  const safeUrl = escapeHtml(normalizedUrl);
  const safeId = escapeHtml(playerId || "");
  if (!safeUrl) return "";

  return `
    <div class="radio-mono-player" data-radio-player data-player-id="${safeId}" data-audio-url="${safeUrl}" onclick="event.stopPropagation()">
      <audio preload="auto" controlsList="nodownload noplaybackrate" oncontextmenu="return false"></audio>
      <div class="radio-mono-controls">
        <button type="button" class="radio-mono-play" aria-label="재생 또는 일시정지">▶</button>
        <div class="radio-mono-time"><span class="radio-mono-current">0:00</span> <span class="radio-mono-divider">/</span> <span class="radio-mono-duration">--:--</span></div>
        <input type="range" class="radio-mono-progress" min="0" max="1000" value="0" step="1" aria-label="재생 위치">
        <button type="button" class="radio-mono-mute" aria-label="음소거">🔈</button>
      </div>
      <div class="radio-mono-volume-row">
        <span class="radio-mono-volume-label">VOL</span>
        <input type="range" class="radio-mono-volume" min="0" max="100" value="80" step="1" aria-label="볼륨 조절">
      </div>
    </div>
  `;
}

function setupRadioMonochromePlayers(root = document) {
  root.querySelectorAll('[data-radio-player]').forEach((player) => {
    if (player.dataset.bound === 'yes') return;

    const audio = player.querySelector('audio');
    const playBtn = player.querySelector('.radio-mono-play');
    const current = player.querySelector('.radio-mono-current');
    const duration = player.querySelector('.radio-mono-duration');
    const progress = player.querySelector('.radio-mono-progress');
    const muteBtn = player.querySelector('.radio-mono-mute');
    const volume = player.querySelector('.radio-mono-volume');

    if (!audio || !playBtn || !current || !duration || !progress || !muteBtn || !volume) return;

    player.dataset.bound = 'yes';
    audio.volume = 0.8;
    audio.muted = false;
    audio.setAttribute('playsinline', '');
    audio.preload = 'auto';
    volume.value = '80';

    const sourceUrl = player.dataset.audioUrl || audio.getAttribute('src') || '';
    const candidates = getAudioPlaybackCandidates(sourceUrl);
    let candidateIndex = 0;
    let triedDurationProbe = false;

    const setPlayerMessage = (text) => {
      duration.textContent = text;
    };

    const updateDurationUi = () => {
      duration.textContent = formatPlayerDuration(audio.duration);
    };

    const loadCandidate = (index = 0) => {
      const nextUrl = candidates[index];
      if (!nextUrl) {
        setPlayerMessage('링크 확인');
        return false;
      }
      candidateIndex = index;
      triedDurationProbe = false;
      audio.src = nextUrl;
      audio.load();
      return true;
    };

    loadCandidate(0);

    player.addEventListener('click', (event) => event.stopPropagation());
    player.querySelectorAll('button, input').forEach((control) => {
      control.addEventListener('click', (event) => event.stopPropagation());
      control.addEventListener('mousedown', (event) => event.stopPropagation());
    });

    const syncVolumeUi = () => {
      const volumeValue = audio.muted ? 0 : Math.round(audio.volume * 100);
      muteBtn.textContent = audio.muted || audio.volume === 0 ? '🔇' : '🔈';
      volume.value = String(volumeValue);
    };

    const syncPlayUi = () => {
      playBtn.textContent = audio.paused ? '▶' : '❚❚';
    };

    const tryFixMissingDuration = () => {
      if (triedDurationProbe) return;
      if (Number.isFinite(audio.duration) && audio.duration > 0) return;
      if (audio.readyState < 1) return;

      triedDurationProbe = true;
      const oldMuted = audio.muted;
      const oldTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      audio.muted = true;
      try {
        audio.currentTime = 1e9;
      } catch (_) {
        audio.muted = oldMuted;
        return;
      }

      const restore = () => {
        audio.removeEventListener('timeupdate', restore);
        audio.removeEventListener('durationchange', restore);
        try { audio.currentTime = oldTime || 0; } catch (_) {}
        audio.muted = oldMuted;
        updateDurationUi();
        syncVolumeUi();
      };

      audio.addEventListener('timeupdate', restore, { once: true });
      audio.addEventListener('durationchange', restore, { once: true });
      setTimeout(restore, 500);
    };

    playBtn.addEventListener('click', async () => {
      if (!audio.src && !loadCandidate(candidateIndex)) return;
      try {
        if (audio.paused) {
          await audio.play();
        } else {
          audio.pause();
        }
      } catch (error) {
        console.error('라디오 재생 오류', error);
        setPlayerMessage('재생 불가');
      }
    });

    muteBtn.addEventListener('click', () => {
      audio.muted = !audio.muted;
      syncVolumeUi();
    });

    volume.addEventListener('input', () => {
      const value = Number(volume.value) / 100;
      audio.volume = value;
      audio.muted = value === 0;
      syncVolumeUi();
    });

    progress.addEventListener('input', () => {
      if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
    });

    audio.addEventListener('loadedmetadata', () => {
      updateDurationUi();
      setTimeout(tryFixMissingDuration, 120);
    });

    audio.addEventListener('durationchange', updateDurationUi);
    audio.addEventListener('canplay', updateDurationUi);
    audio.addEventListener('loadeddata', updateDurationUi);

    audio.addEventListener('timeupdate', () => {
      current.textContent = formatPlayerTime(audio.currentTime);
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        duration.textContent = formatPlayerTime(audio.duration);
        progress.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
      } else {
        progress.value = '0';
      }
    });

    audio.addEventListener('error', () => {
      const canTryNext = candidateIndex + 1 < candidates.length;
      if (canTryNext) {
        loadCandidate(candidateIndex + 1);
        return;
      }
      console.error('오디오 링크를 불러오지 못했습니다:', sourceUrl, audio.error);
      setPlayerMessage('링크 확인');
      syncPlayUi();
    });

    audio.addEventListener('play', syncPlayUi);
    audio.addEventListener('pause', syncPlayUi);
    audio.addEventListener('ended', () => {
      progress.value = '0';
      syncPlayUi();
    });
    audio.addEventListener('volumechange', syncVolumeUi);

    syncPlayUi();
    syncVolumeUi();
    updateDurationUi();
  });
}

function renderAudioArchiveCard(item, id, img, previewText) {
  const safeTitle = escapeHtml(item.title || "제목 없음");
  const safeCategory = item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : "";
  const safePreview = previewText ? `<p class="audio-archive-summary">${escapeHtml(previewText)}</p>` : `<p class="audio-archive-summary empty">설명 정보가 없습니다.</p>`;
  const safeYear = escapeHtml(item.year || "미상");
  const safeSource = escapeHtml(item.source || "미기재");
  const created = createdDateMarkup(item);
  const player = renderRadioMonochromePlayer(normalizeMediaUrlForPlayback(getPlayableAudioUrl(item), "audio"), `${id}-${item.id}`);
  const showCover = id === "songList";
  const thumb = showCover
    ? (img
        ? `<div class="audio-archive-cover"><img src="${img}" alt="${safeTitle}"></div>`
        : `<div class="audio-archive-cover audio-archive-cover-placeholder"><span>NO<br>COVER</span></div>`)
    : "";
  const topClass = showCover ? "audio-archive-top" : "audio-archive-top no-cover";

  return `
    <div class="audio-archive-shell ${showCover ? "has-cover" : "no-cover"}">
      <div class="${topClass}">
        ${thumb}
        <div class="audio-archive-meta">
          <h3>${safeTitle}</h3>
          ${safeCategory}
          ${safePreview}
        </div>
      </div>
      <div class="audio-archive-player-row">
        ${player}
      </div>
      ${id === "songList" ? `<div class="playlist-add-row"><button type="button" class="playlist-add-btn" onclick='event.stopPropagation(); addSongToUserPlaylist(${JSON.stringify(item.id || "")})'>＋ 플레이리스트 담기</button></div>` : ""}
      ${id === "radioList" ? `<div class="admin-download-row">${renderAdminDownloadButton(item, "card")}</div>` : ""}
      <div class="audio-archive-info-row">
        <p><strong>연도:</strong> ${safeYear}</p>
        <p><strong>출처:</strong> ${safeSource}</p>
        ${created}
      </div>
    </div>
  `;
}

function renderTextArchiveCard(item, id, img, previewText) {
  const isStoryList = id === "storyList";
  const isOneumList = id === "oneumList";
  const fallbackLabel = isOneumList ? "원음 글" : "일기 자료";
  const metaMarkup = isOneumList
    ? oneumMetaMarkup(item)
    : `<p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p><p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>`;
  const hintText = isOneumList ? "전체 원음글은 상세보기에서 볼 수 있습니다." : "전체 일기는 상세보기에서 볼 수 있습니다.";

  return `
    ${img ? `<img src="${img}" alt="${escapeHtml(item.title)}">` : `<div class="card-placeholder text-card-placeholder">${fallbackLabel}</div>`}
    <div class="card-body text-archive-card-body">
      <h3>${escapeHtml(item.title)}</h3>
      ${item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : ""}
      ${previewText ? `<p class="text-preview">${escapeHtml(previewText)}</p>` : ""}
      <p class="read-more-hint">${hintText}</p>
      ${metaMarkup}
      ${createdDateMarkup(item)}
    </div>
  `;
}

function renderList(id, items) {
  const box = document.getElementById(id);
  if (!box) return;

  box.innerHTML = "";

  if (!items.length) {
    box.innerHTML = "<p>등록된 자료가 없습니다.</p>";
    return;
  }

  const isStoryList = id === "storyList";
  const isOneumList = id === "oneumList";
  const isTextArchiveGrid = isStoryList || isOneumList;
  const isAudioArchiveList = id === "songList" || id === "radioList";

  if (isTextArchiveGrid) box.classList.add("card-grid", "text-archive-grid");

  items.forEach(item => {
    const div = document.createElement("div");
    const playableAudioUrl = getPlayableAudioUrl(item);
    const shouldRenderAudioArchive = isAudioArchiveList && Boolean(playableAudioUrl);
    div.className = (item.mediaUrl || item.thumbnailUrl) && item.mediaType !== "youtube" ? "list-item with-image" : "list-item";
    if (isStoryList) div.classList.add("story-preview-card");
    if (shouldRenderAudioArchive) div.classList.add("audio-archive-card");
    if (isTextArchiveGrid) div.className = "card text-archive-card" + (isStoryList ? " story-preview-card" : " oneum-preview-card");

    div.onclick = () => openContentDetail(item.id);

    const img = normalizeMediaUrlForPlayback(item.thumbnailUrl || (!isAudioContentItem(item) && !isVideoContentItem(item) ? item.mediaUrl : ""), "image");
    const previewLength = isStoryList ? 120 : isOneumList ? 130 : 90;
    const previewText = makeTextPreview(item.body || item.description || "", previewLength);

    if (isTextArchiveGrid) {
      div.innerHTML = renderTextArchiveCard(item, id, img, previewText);
    } else if (shouldRenderAudioArchive) {
      div.innerHTML = renderAudioArchiveCard(item, id, img, previewText);
    } else {
      div.innerHTML = `
        ${img ? `<img src="${img}" alt="${escapeHtml(item.title)}">` : ""}
        <div>
          <h3>${escapeHtml(item.title)}</h3>
          ${item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : ""}
          ${previewText ? `<p class="text-preview">${escapeHtml(previewText)}</p>` : ""}
          ${isAudioContentItem(item) ? (id === "radioList" || id === "songList" ? renderRadioMonochromePlayer(normalizeMediaUrlForPlayback(getPlayableAudioUrl(item), "audio"), `${id}-${item.id}`) : `<audio controls controlsList="nodownload noplaybackrate" oncontextmenu="return false" src="${normalizeMediaUrlForPlayback(getPlayableAudioUrl(item), "audio")}"></audio>`) : ""}
          ${isOneumItem(item) ? oneumMetaMarkup(item) : `<p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p><p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>`}
          ${createdDateMarkup(item)}
        </div>
      `;
    }

    box.appendChild(div);
  });
}
function createCard(item) {
  const card = document.createElement("div"); card.className = "card"; card.onclick = () => openContentDetail(item.id);
  let media = "";
  const videoMediaUrl = getVideoMediaUrl(item);
  const youtubeCandidateUrl = item.youtubeUrl || (isYoutubeUrl(item.mediaUrl) ? item.mediaUrl : "");
  if (item.mediaType === "youtube" || (item.category === "videos" && youtubeCandidateUrl)) media = `<iframe src="${escapeHtml(normalizeYoutubeEmbedUrl(youtubeCandidateUrl || item.mediaUrl))}" allowfullscreen></iframe>`;
  else if (item.mediaType === "video" || (item.category === "videos" && videoMediaUrl)) {
    const videoPlaybackUrl = normalizeMediaUrlForPlayback(videoMediaUrl, "video");
    const videoPosterUrl = item.thumbnailUrl || item.imageUrl || item.photoUrl || "";
    const fileType = /\.mov(\?|#|$)/i.test(videoMediaUrl) ? "video/quicktime" : "video/mp4";
    media = `<video class="card-inline-video" controls playsinline webkit-playsinline preload="auto" controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false" poster="${escapeHtml(videoPosterUrl)}"><source src="${escapeHtml(videoPlaybackUrl)}" type="${fileType}"></video>`;
  }
  else if (isAudioContentItem(item)) media = `${item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title)}">` : `<div class="card-placeholder">음원 자료</div>`}<audio controls controlsList="nodownload noplaybackrate" oncontextmenu="return false" src="${normalizeMediaUrlForPlayback(getPlayableAudioUrl(item), "audio")}"></audio>`;
  else if (item.mediaUrl) media = `<img src="${normalizeMediaUrlForPlayback(item.mediaUrl, "image")}" alt="${escapeHtml(item.title)}">`;
  else media = `<div class="card-placeholder">글 자료</div>`;
  card.innerHTML = `${media}<div class="card-body"><h3>${escapeHtml(item.title)}</h3>${item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : ""}<p class="text-preview">${escapeHtml(makeTextPreview(item.description || item.body || "", 90))}</p><p><strong>분류:</strong> ${escapeHtml(item.category)}</p>${isOneumItem(item) ? oneumMetaMarkup(item) : `<p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p><p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>`}${createdDateMarkup(item)}${renderAdminDownloadButton(item, "card")}</div>`;
  return card;
}


function youtubeEmbedHtml(url) {
  const safeUrl = String(url || "");
  let videoId = "";

  try {
    const parsed = new URL(safeUrl);
    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "");
    } else if (parsed.searchParams.get("v")) {
      videoId = parsed.searchParams.get("v");
    } else if (parsed.pathname.includes("/embed/")) {
      videoId = parsed.pathname.split("/embed/")[1].split("/")[0];
    }
  } catch {
    return "";
  }

  if (!videoId) return "";
  return `<iframe src="https://www.youtube.com/embed/${escapeHtml(videoId)}" title="YouTube video" allowfullscreen></iframe>`;
}



let detailPhotoZoomScale = 1;
let detailPhotoTranslateX = 0;
let detailPhotoTranslateY = 0;
let detailPhotoDragging = false;
let detailPhotoDragStartX = 0;
let detailPhotoDragStartY = 0;

function applyDetailPhotoZoom() {
  const img = document.getElementById("detailZoomImage");
  if (!img) return;

  img.style.transform = `translate(${detailPhotoTranslateX}px, ${detailPhotoTranslateY}px) scale(${detailPhotoZoomScale})`;

  const percent = document.getElementById("detailZoomPercent");
  if (percent) percent.textContent = `${Math.round(detailPhotoZoomScale * 100)}%`;
}

function zoomDetailPhoto(delta) {
  detailPhotoZoomScale = Math.min(4, Math.max(0.5, detailPhotoZoomScale + delta));
  if (detailPhotoZoomScale === 1) {
    detailPhotoTranslateX = 0;
    detailPhotoTranslateY = 0;
  }
  applyDetailPhotoZoom();
}

function resetDetailPhotoZoom() {
  detailPhotoZoomScale = 1;
  detailPhotoTranslateX = 0;
  detailPhotoTranslateY = 0;
  applyDetailPhotoZoom();
}

function bindDetailPhotoZoom() {
  const viewer = document.getElementById("detailPhotoZoomViewer");
  const img = document.getElementById("detailZoomImage");
  if (!viewer || !img) return;

  detailPhotoZoomScale = 1;
  detailPhotoTranslateX = 0;
  detailPhotoTranslateY = 0;
  applyDetailPhotoZoom();

  viewer.onwheel = (event) => {
    event.preventDefault();
    zoomDetailPhoto(event.deltaY < 0 ? 0.15 : -0.15);
  };

  img.onmousedown = (event) => {
    if (detailPhotoZoomScale <= 1) return;
    detailPhotoDragging = true;
    detailPhotoDragStartX = event.clientX - detailPhotoTranslateX;
    detailPhotoDragStartY = event.clientY - detailPhotoTranslateY;
    img.classList.add("dragging");
  };

  window.onmousemove = (event) => {
    if (!detailPhotoDragging) return;
    detailPhotoTranslateX = event.clientX - detailPhotoDragStartX;
    detailPhotoTranslateY = event.clientY - detailPhotoDragStartY;
    applyDetailPhotoZoom();
  };

  window.onmouseup = () => {
    detailPhotoDragging = false;
    img.classList.remove("dragging");
  };

  viewer.ondblclick = () => {
    if (detailPhotoZoomScale === 1) {
      detailPhotoZoomScale = 2;
    } else {
      resetDetailPhotoZoom();
      return;
    }
    applyDetailPhotoZoom();
  };
}

function openCoverZoom(src, title) {
  const modal = document.getElementById("coverZoomModal");
  const img = document.getElementById("coverZoomImage");
  const caption = document.getElementById("coverZoomCaption");

  if (!modal || !img) return;
  if (!src) return;

  img.src = src;
  img.alt = title || "앨범 자켓";
  if (caption) caption.textContent = title || "앨범 자켓";

  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function openCoverZoomFromElement(element) {
  if (!element) return;
  openCoverZoom(element.dataset.coverSrc || "", element.dataset.coverTitle || "앨범 자켓");
}

function closeCoverZoom(event) {
  if (event && event.target !== event.currentTarget) return;

  const modal = document.getElementById("coverZoomModal");
  const img = document.getElementById("coverZoomImage");
  const contentDetailModal = document.getElementById("contentDetailModal");

  if (modal) modal.classList.add("hidden");
  if (img) img.removeAttribute("src");

  if (!contentDetailModal || contentDetailModal.classList.contains("hidden")) {
    document.body.style.overflow = "";
  }
}

function renderDetailMedia(item) {
  const category = item.category || "";
  const mediaUrl = isAudioContentItem(item) ? getPlayableAudioUrl(item) : (item.mediaUrl || item.fileUrl || item.videoUrl || "");
  const imageUrl = item.imageUrl || item.thumbnailUrl || item.photoUrl || "";
  const youtubeUrl = item.youtubeUrl || item.url || "";
  const playbackMediaUrl = normalizeMediaUrlForPlayback(mediaUrl, category);
  const playbackImageUrl = normalizeMediaUrlForPlayback(imageUrl, "image");
  const title = escapeHtml(item.title || "");

  if (category === "videos") {
    if (youtubeUrl && (youtubeUrl.includes("youtube.com") || youtubeUrl.includes("youtu.be"))) {
      return `<div class="detail-media-box">${youtubeEmbedHtml(youtubeUrl)}</div>`;
    }

    if (mediaUrl) {
      const posterUrl = playbackImageUrl || "";
      const posterAttr = posterUrl ? ` poster="${escapeHtml(posterUrl)}"` : "";
      const fileType = /\.mov(\?|#|$)/i.test(mediaUrl) ? "video/quicktime" : "video/mp4";
      return `<div class="detail-media-box detail-video-box"><video class="detail-inline-video" controls playsinline webkit-playsinline preload="auto"${posterAttr} controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false"><source src="${escapeHtml(playbackMediaUrl)}" type="${fileType}"></video></div>`;
    }

    if (imageUrl) {
      return `<div class="detail-media-box"><img src="${escapeHtml(playbackImageUrl)}" alt="${title}" draggable="false" oncontextmenu="return false" /></div>`;
    }

    return "";
  }

  if (category === "songs") {
    if (mediaUrl && imageUrl) {
      return `
        <div class="detail-song-audio-layout">
          <button type="button" class="detail-song-cover-box detail-song-cover-zoom-trigger" onclick="openCoverZoomFromElement(this)" data-cover-src="${escapeHtml(playbackImageUrl)}" data-cover-title="${title}" aria-label="앨범 자켓 크게 보기">
            <img src="${escapeHtml(playbackImageUrl)}" alt="${title}" draggable="false" oncontextmenu="return false" />
          </button>
          <div class="detail-audio-box detail-radio-audio-box detail-song-player-box">${renderRadioMonochromePlayer(playbackMediaUrl, `${category}-detail-${item.id || "detail"}`)}</div>
        </div>
      `;
    }

    if (mediaUrl) {
      return `<div class="detail-audio-box detail-radio-audio-box detail-song-player-box">${renderRadioMonochromePlayer(playbackMediaUrl, `${category}-detail-${item.id || "detail"}`)}</div>`;
    }

    if (imageUrl) {
      return `<button type="button" class="detail-media-box detail-cover-only detail-cover-zoom-trigger" onclick="openCoverZoomFromElement(this)" data-cover-src="${escapeHtml(playbackImageUrl)}" data-cover-title="${title}" aria-label="앨범 자켓 크게 보기"><img src="${escapeHtml(playbackImageUrl)}" alt="${title}" draggable="false" oncontextmenu="return false" /></button>`;
    }

    return "";
  }

  if (category === "radios") {
    if (mediaUrl) {
      return `<div class="detail-audio-box detail-radio-audio-box">${renderRadioMonochromePlayer(playbackMediaUrl, `${category}-detail-${item.id || "detail"}`)}</div>`;
    }

    if (imageUrl) {
      return `<div class="detail-media-box detail-cover-only"><img src="${escapeHtml(playbackImageUrl)}" alt="${title}" draggable="false" oncontextmenu="return false" /></div>`;
    }

    return "";
  }

  if (category === "photos") {
    if (imageUrl || mediaUrl) {
      return `<div class="detail-media-box"><img src="${escapeHtml(playbackImageUrl || playbackMediaUrl)}" alt="${title}" draggable="false" oncontextmenu="return false" /></div>`;
    }

    return "";
  }

  if (imageUrl) {
    return `<div class="detail-media-box detail-cover-only"><img src="${escapeHtml(playbackImageUrl)}" alt="${title}" draggable="false" oncontextmenu="return false" /></div>`;
  }

  return "";
}

function openContentDetail(id) {
  const item = allContents.find((content) => content.id === id);
  if (!item) return;

  const modal = document.getElementById("contentDetailModal");
  const mediaArea = document.getElementById("detailMediaArea");
  const titleEl = document.getElementById("detailTitle");
  const categoryEl = document.getElementById("detailCategory");
  const metaEl = document.getElementById("detailMeta");
  const descEl = document.getElementById("detailDescription");

  if (!modal || !mediaArea || !titleEl || !categoryEl || !metaEl || !descEl) {
    alert("상세창 영역을 찾지 못했습니다. index.html의 상세창 구조를 확인해 주세요.");
    return;
  }

  const mediaHtml = renderDetailMedia(item);
  const bodyText = item.body || item.description || "";

  mediaArea.innerHTML = mediaHtml ? `${mediaHtml}${renderAdminDownloadButton(item, "detail")}` : renderAdminDownloadButton(item, "detail");
  mediaArea.classList.toggle("hidden", !mediaHtml);

  titleEl.textContent = item.title || "제목 없음";
  categoryEl.innerHTML = `<strong>분류:</strong> ${escapeHtml(item.category || "미분류")}${item.subCategory ? ` / <strong>카테고리:</strong> ${escapeHtml(item.subCategory)}` : ""}`;
  if (isOneumItem(item)) {
    const author = getOneumAuthor(item) || "미기재";
    const authorName = getOneumAuthorName(item);
    const dateTime = getOneumDateTime(item) || "미기재";
    const source = item.source ? `<br><strong>출처:</strong> ${escapeHtml(item.source)}` : "";
    metaEl.innerHTML = `<strong>올린이:</strong> ${formatOneumAuthorLine(author, authorName)}<br><strong>업로드일:</strong> ${escapeHtml(dateTime)}${source}`;
  } else {
    metaEl.innerHTML = `<strong>연도:</strong> ${escapeHtml(item.year || "미상")} / <strong>출처:</strong> ${escapeHtml(item.source || "미기재")}<br><strong>업로드일:</strong> ${escapeHtml(getItemCreatedDateText(item))}`;
  }
  const detailBodyHtml = bodyText ? escapeHtml(bodyText).replace(/\n/g, "<br>") : "";
  const oneumReplyHtml = isOneumItem(item) ? renderOneumKksReplyMarkup(item) : "";
  descEl.innerHTML = `${detailBodyHtml}${oneumReplyHtml}`;

  forceMobileViewportZoomReset();
  modal.classList.remove("hidden");
  installBasicContentProtection();
  if (typeof hardenMediaDownloadControls === "function") {
    hardenMediaDownloadControls();
  }
  bindDetailPhotoZoom();
  setupRadioMonochromePlayers(mediaArea);
  document.body.style.overflow = "hidden";
}


function closeContentDetail(event) {
  if (event && event.target !== event.currentTarget) return;

  const mediaArea = document.getElementById("detailMediaArea");
  const titleEl = document.getElementById("detailTitle");
  const categoryEl = document.getElementById("detailCategory");
  const metaEl = document.getElementById("detailMeta");
  const descEl = document.getElementById("detailDescription");
  const modal = document.getElementById("contentDetailModal");

  if (mediaArea) mediaArea.innerHTML = "";
  if (titleEl) titleEl.textContent = "";
  if (categoryEl) categoryEl.innerHTML = "";
  if (metaEl) metaEl.innerHTML = "";
  if (descEl) descEl.innerHTML = "";
  if (modal) modal.classList.add("hidden");

  document.body.style.overflow = "";
  forceMobileViewportZoomReset();
}

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  const coverZoomModal = document.getElementById("coverZoomModal");
  if (coverZoomModal && !coverZoomModal.classList.contains("hidden")) return;
  closeContentDetail();
});

function renderAdminManageList() {
  const box = document.getElementById("adminContentList"); if (!box || !isAdmin) return;
  const filter = document.getElementById("manageCategoryFilter")?.value || "";
  const items = filter ? allContents.filter(i => i.category === filter) : allContents;
  box.innerHTML = items.length ? "" : "<p>관리할 자료가 없습니다.</p>";
  items.forEach(item => {
    const row = document.createElement("div"); row.className = "admin-row";
    row.innerHTML = `<div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.category || "")}${item.subCategory ? " / "+escapeHtml(item.subCategory) : ""} / ${escapeHtml(item.year || "미상")}</p></div><div class="admin-row-actions"><button onclick="editContent('${item.id}')">수정</button><button class="delete-btn" onclick="deleteContentItem('${item.id}')">삭제</button></div>`;
    box.appendChild(row);
  });
}
function editContent(id) {
  const item = allContents.find(i => i.id === id); if (!item) return;
  if (item.category === "videos") {
    showAdminForm("video");
    document.getElementById("editVideoId").value = item.id;
    document.getElementById("videoFormTitle").textContent = "영상 수정";
    populateSpecificSubCategorySelect("videos", "videoSubCategory", item.subCategory || "");
    document.getElementById("videoTitle").value = item.title || "";
    document.getElementById("youtubeUrl").value = item.youtubeUrl || (item.mediaType === "youtube" ? (item.mediaUrl || "") : "");
    document.getElementById("videoFileUrl").value = item.mediaType === "video" ? (getVideoMediaUrl(item) || "") : "";
    document.getElementById("videoYear").value = item.year || "";
    document.getElementById("videoSource").value = item.source || "";
    document.getElementById("videoDescription").value = item.body || item.description || "";
    document.getElementById("videoImageUrl").value = item.thumbnailUrl || "";
    document.getElementById("saveVideoBtn").textContent = "영상 수정 저장";
    return;
  }
  if (item.category === "oneum") {
    showAdminForm("oneum");
    document.getElementById("editOneumId").value = item.id;
    document.getElementById("oneumTitle").value = item.title || "";
    populateSpecificSubCategorySelect("oneum", "oneumSubCategory", item.subCategory || "");
    document.getElementById("oneumAuthor").value = getOneumAuthor(item) || "";
    document.getElementById("oneumAuthorName").value = getOneumAuthorName(item) || "";
    document.getElementById("oneumDateTime").value = getOneumDateTime(item) || item.year || "";
    document.getElementById("oneumBody").value = item.body || item.description || "";
    document.getElementById("oneumSource").value = item.source || "";
    const reply = getOneumKksReply(item);
    const hasReply = hasOneumKksReply(item);
    document.getElementById("oneumHasKksReply").checked = hasReply;
    document.getElementById("oneumReplyTitle").value = hasReply ? reply.title : "";
    document.getElementById("oneumReplyAuthor").value = hasReply ? (reply.author || "김광석") : "";
    document.getElementById("oneumReplyAuthorName").value = hasReply ? (reply.authorName || "김광석") : "";
    document.getElementById("oneumReplyDateTime").value = hasReply ? reply.dateTime : "";
    document.getElementById("oneumReplyBody").value = hasReply ? reply.body : "";
    document.getElementById("oneumReplySource").value = hasReply ? reply.source : "";
    toggleOneumReplyFields();
    const btn = document.getElementById("saveOneumBtn");
    if (btn) btn.textContent = "원음 글 수정 저장";
    return;
  }
  showAdminForm("content");
  document.getElementById("editContentId").value = item.id;
  document.getElementById("contentCategory").value = item.category || "stories";
  populateContentSubCategorySelect(item.category || "stories", item.subCategory || "");
  document.getElementById("contentTitle").value = item.title || "";
  document.getElementById("contentBody").value = item.body || item.description || "";
  document.getElementById("contentYear").value = item.year || "";
  document.getElementById("contentSource").value = item.source || "";
  document.getElementById("contentImageUrl").value = (isAudioContentItem(item) || isVideoContentItem(item)) ? (item.thumbnailUrl || "") : (item.mediaUrl || "");
  document.getElementById("contentFeatured").checked = Boolean(item.isFeatured);
  document.getElementById("saveContentBtn").textContent = "수정 저장하기";
}
async function deleteContentItem(id) {
  if (!isAdmin) return alert("관리자만 삭제할 수 있습니다.");
  if (!confirm("정말 삭제하시겠습니까?")) return;

  try {
    await deleteDoc(doc(db, "contents", id));

    // 화면에 남아 보이는 문제 방지: 로컬 목록에서도 즉시 제거 후 전체 재렌더링
    allContents = allContents.filter(item => item.id !== id);
    closeContentDetail();
    renderAllContentSections();

    // Firestore 서버 상태를 다시 읽어 최종 동기화
    await loadContents();

    alert("삭제되었습니다. 목록에서도 제거했습니다.");
  } catch (error) {
    alert("삭제 오류: " + error.message);
  }
}



// v112: 모바일에서 영상 상세/전체화면을 닫은 뒤 브라우저 확대 상태가 남는 문제 보정
function isMobileViewportForZoomReset() {
  return window.matchMedia && window.matchMedia("(max-width: 820px)").matches;
}

function forceMobileViewportZoomReset() {
  if (!isMobileViewportForZoomReset()) return;

  const viewport = document.querySelector('meta[name="viewport"]');
  const stableViewport = "width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover";
  const top = Math.max(0, window.scrollY || document.documentElement.scrollTop || 0);

  if (viewport) {
    // Android Chrome/Samsung Internet에서 video fullscreen 또는 상세창 종료 후
    // visual viewport scale이 남는 경우가 있어 viewport 값을 다시 주입합니다.
    viewport.setAttribute("content", stableViewport);
    setTimeout(() => viewport.setAttribute("content", stableViewport), 80);
    setTimeout(() => viewport.setAttribute("content", stableViewport), 250);
  }

  document.documentElement.style.width = "100%";
  document.documentElement.style.maxWidth = "100%";
  document.documentElement.style.overflowX = "hidden";
  document.body.style.width = "100%";
  document.body.style.maxWidth = "100%";
  document.body.style.overflowX = "hidden";

  requestAnimationFrame(() => {
    try { window.scrollTo({ left: 0, top, behavior: "auto" }); }
    catch (e) { window.scrollTo(0, top); }
  });
}

function installMobileVideoZoomResetGuards() {
  const resetSoon = () => {
    forceMobileViewportZoomReset();
    setTimeout(forceMobileViewportZoomReset, 120);
    setTimeout(forceMobileViewportZoomReset, 450);
  };

  document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) resetSoon();
  });
  document.addEventListener("webkitfullscreenchange", () => {
    if (!document.webkitFullscreenElement) resetSoon();
  });
  document.addEventListener("webkitendfullscreen", resetSoon, true);
  window.addEventListener("orientationchange", resetSoon);
  window.addEventListener("pageshow", resetSoon);

  // 모바일 브라우저의 video UI에서 뒤로 나오거나 닫기/일시정지를 했을 때도 보정합니다.
  document.addEventListener("pause", (event) => {
    if (event.target && event.target.tagName && event.target.tagName.toLowerCase() === "video") {
      resetSoon();
    }
  }, true);

  document.addEventListener("play", (event) => {
    if (event.target && event.target.tagName && event.target.tagName.toLowerCase() === "video") {
      const video = event.target;
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
      document.body.classList.add("is-video-playing-mobile");
    }
  }, true);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installMobileVideoZoomResetGuards);
} else {
  installMobileVideoZoomResetGuards();
}

window.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  const coverZoomModal = document.getElementById("coverZoomModal");
  if (coverZoomModal && !coverZoomModal.classList.contains("hidden")) {
    closeCoverZoom();
  }
});

window.openCoverZoom = openCoverZoom;
window.openCoverZoomFromElement = openCoverZoomFromElement;
window.closeCoverZoom = closeCoverZoom;
window.hideDailyRecommendPlayerForHours = hideDailyRecommendPlayerForHours;
window.adminDownloadMedia = adminDownloadMedia;

loadSiteSettings();
loadPageCategories();
loadContents();

window.closeDailyRecommendPlayer = closeDailyRecommendPlayer;

// v99: 모바일 기기에서는 모바일형 UI, PC에서는 기존 UI 유지
function setupMobileResponsiveMode() {
  const toggle = document.getElementById("mobileMenuToggle");
  const media = window.matchMedia("(max-width: 820px)");

  const applyMode = () => {
    const isMobile = media.matches;
    document.body.classList.toggle("is-mobile-site", isMobile);
    if (!isMobile) {
      document.body.classList.remove("mobile-nav-open");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
  };

  if (toggle) {
    toggle.addEventListener("click", () => {
      const opened = document.body.classList.toggle("mobile-nav-open");
      toggle.setAttribute("aria-expanded", opened ? "true" : "false");
      toggle.textContent = opened ? "× 닫기" : "☰ 메뉴";
    });
  }

  document.querySelectorAll("#siteNav button").forEach((button) => {
    button.addEventListener("click", () => {
      if (!media.matches) return;
      document.body.classList.remove("mobile-nav-open");
      if (toggle) {
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "☰ 메뉴";
      }
    });
  });

  applyMode();
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", applyMode);
  } else if (typeof media.addListener === "function") {
    media.addListener(applyMode);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupMobileResponsiveMode);
} else {
  setupMobileResponsiveMode();
}


// v109: 모듈 실행 후에도 메뉴 클릭을 보장하는 안전 클릭 위임
document.addEventListener("click", (event) => {
  const menuToggle = event.target.closest("#mobileMenuToggle");
  if (menuToggle) {
    event.preventDefault();
    const opened = document.body.classList.toggle("mobile-nav-open");
    menuToggle.setAttribute("aria-expanded", opened ? "true" : "false");
    menuToggle.textContent = opened ? "× 닫기" : "☰ 메뉴";
    return;
  }

  const btn = event.target.closest("[data-page-fallback]");
  if (!btn) return;
  const page = btn.getAttribute("data-page-fallback");
  if (!page) return;
  event.preventDefault();
  goPage(page);
}, false);


// v123: 광석이네 통신방 - 계정 닉네임/이름 고정, 모드/친밀도 선택 가독성 보정
const TELECOM_STORAGE = {
  settings: "kwangseokTelecomSettingsV120",
  log: "kwangseokTelecomLogV120",
  kksAwayUntil: "kwangseokTelecomKksAwayUntilV120",
  active: "kwangseokTelecomKksActiveV120",
  sessionStart: "kwangseokTelecomSessionStartV120",
  callPromptFor: "kwangseokTelecomCallPromptForV136",
  recentSpeakers: "kwangseokTelecomRecentSpeakersV142",
  recentTopics: "kwangseokTelecomRecentTopicsV142",
  thread: "kwangseokTelecomThreadV143",
  activeMembers: "kwangseokTelecomActiveMembersV145"
};
let telecomInitialized = false;
let telecomStatusTimer = null;
let telecomExitTimer = null;
let telecomMemberTimer = null;
let telecomCountdownTimer = null;
let telecomUserMessageCount = 0;

const DUNGEUNSORI_MEMBERS_TEXT = `김광석|김광석
녹차향기|변수진
mouse14|장민석
soriboy|김영호
학궁뎅이|오승준
외기러기|이연수
열린고백|김은주
enfant|이희정
강서대묘|김동준
sixs|육영수
아인타인|박영근
gonswing|신성철
뜨라기|고지은
mcgyver|박성재
raincoat|이효연
영원의꿈|박재완
avril|조해성
아주사|엄준호
jeejone|지정엽
btsmania|박재완
keis|김응일
byungari|이석권
점등인|최훈철
mjs1|목진설
gksdml|윤유석
작은기억|채원중
hakjeon|최만석
넋두리|최종희
낙원|이명훈
shim31|심수일
cupite|김홍준
경화|송경화
소금밭|김도현
hj8454|전상섭
ekjw123|강은경
하늘마음|김종구
w6012923|김관수
almanix|임현진
김치찌개|진성일
자아성찰|홍준수
nkotb2|김연수
swk3|신세호
그불|박순영
jhm10|장현민
rnchunji|장춘지
chika|오현주
michelle|최지영
lionsj|이수진
네생각|모우진
맑고푸른|이향표
proam|김삼연
아킬레스|노언진
레몬tea|조지연
huge|김정준
lseokgoo|이석구
daffodil|한희정
한글날|신소희
sawa92|설재훈
mecander|이성일
화랑소년|최대우
주환이|김주환
lovetony|이지영
알레카스|노경현
이끄는이|김경하
mountie|이동산
sensi|박수진
ych2|여행스케
mahakama|김용배
몬스키|김문숙
zet3|배진환
ok0606|이봉옥
iam75|박성화
야구도사|홍준선
아모로스|송현욱
rpg3|고현주
tajang|장병희
elohim77|김선기
바보나라|김용경
kroi|강한나
dr스쿠르|김종은
a245|서홍석
박영기|박영기
kfardor|김태호
이율배반|김동욱
sky1130|송기용
ose53|오세은
chirisan|강수천
비바9|서상혁
사과쥬스|송기훈
환경사랑|문양수
w6024140|한태규
soulman|서보균
popboy|김정수
colusvi|노남석
moguly|조은성
built|박종찬
butfor|안정철
조은인상|이준화
사랑예감|김성남
솔기|유석창
park71|박명식
steven|최재혁
lebleu|홍승일
76jeho|정제호
canni|조인식
pendia|김장환
metalbar|김동수
epigram|송수연
blubosco|이은산
giraffe7|한승훈
opt7|이광철
kyhpia|김용효
ncnd|이은석
w9011769|물방울
satware|구인회
ajeegang|김승민
슈퍼토끼|송영인
홍정훈|홍정훈
channel1|정재훈
skywatch|박성호
킹카95|장효선
깨비혜승|양혜승
사르막스|이승영
시종일관|김제효
jimcarry|장성석
besti|최현아
고뿔이|박지훈
상원잭슨|박상원
이빨교정|송한식
comhero|강희국
포세이돈|최영돈
극단두레|노진희
망중한|최선옥
ecology|이득만
1656|박지수
몽실95|이세영`;

const DUNGEUNSORI_MEMBERS = DUNGEUNSORI_MEMBERS_TEXT.split("\n").map((row) => {
  const [nick, name] = row.split("|");
  return { nick: (nick || "").trim(), name: (name || "").trim() };
}).filter((m) => m.nick && m.name);


const TELECOM_MEMBER_LINES = [
  "어서오세요~", "어소세요..", "하이!!!!", "후후후..", "히히히..", "글쿠나......", "아 바쁘다 바빠...",
  "갈무리 갈무리..~~", "축하드립니다.", "좋은 밤 되세요~~~", "에구에구...", "다시 왔읍니다..",
  "오늘 사람 많네요", "자료실 갔다왔어요", "잠깐 들어왔어요", "후훗..", "네", "응", "하하하.", "아하...",
  "게시판 글 읽고 왔어요", "공연 얘기 들었어요?", "오늘도 들렀어요", "방금 낙서장 보고 왔어요",
  "누가 글 새로 올렸나요?", "오늘은 조용하네요..", "이 방은 늘 금방 북적거리네요", "저는 잠깐 눈팅중입니다",
  "자료 갈무리하느라 바빠요", "원음 글 읽고 있었어요", "잠깐만요. 글 좀 보고요", "이야기가 또 길어지네요"
];
const TELECOM_MEMBER_REPLY_LINES = [
  "그러셨군요...", "그렇군요", "맞아요", "네 반갑습니다", "좋네요", "아하...", "후후후..", "글쿠나......",
  "조금 있다 나가야겠어요", "좋은 밤 되세요~~~", "요즘 어떠세요", "그러게요", "저도 그렇게 생각했어요",
  "그 얘기는 처음 듣네요", "음.. 그럴 수도 있겠네요", "잠깐 생각 좀 해볼께요", "아까 게시판에서도 비슷한 얘기 봤어요",
  "그럼 다음 얘기도 해보죠", "아시는 분 계세요?", "저는 조금 다르게 봤는데요", "그건 광석 아저씨 오시면 물어보죠"
];
const TELECOM_KKS_MEMBER_REPLIES = ["네", "그래요", "참 좋네요...", "오래간만이네요", "무슨일 있어요", "지금 즐거워요", "안녕하세요", "그럼...", "자판이 좀 낮설어요", "지금 잠깐 보고 있어요", "그 얘긴 좀 어렵네요", "천천히 말해요"];
const TELECOM_KKS_EXIT_LINES = ["금방 가야해요", "좀 바빠서 나가볼께요", "당구치러 갈께요", "안녕..."];

// v136: 회원별 말투/호칭 기본값. 낙서하기/물어보기답하기 자료에서 보이는 표현을 바탕으로 정리.
const TELECOM_MEMBER_PROFILES = {
  "녹차향기": { casual: false, manager: true, kksCall: ["광석 아찌", "아저씨"], lines: ["광석 아찌 금방 답하실거예요", "아저씨 오늘도 바쁘시죠", "여러분 천천히 말씀하세요", "게시판 정리하고 있어요", "방 분위기 좋네요...", "자료 올라온 것 좀 보고 있었어요", "아저씨 오시면 제가 말씀드릴께요", "방금 낙서장 확인했어요", "처음 오신 분들은 천천히 얘기하세요"] },
  "mouse14": { casual: true, kksCall: ["아저씨"], lines: ["후후후..", "알가쓰. 알가쓰...", "난 대화방 보고 있지", "오늘 사람 많네", "푸히히..", "갈무리 해야겠네", "난 그냥 구경중", "누가 또 들어왔나 봐야지", "이 방은 진짜 정신없다"] },
  "학궁뎅이": { casual: true, kksCall: ["광석이형"], lines: ["안냐세요??", "오홍홍홍~~~", "저는 그냥 놀고 있죠", "오늘도 왔음"] },
  "raincoat": { casual: true, kksCall: ["광석형"], lines: ["반갑반갑~~~", "홍홍", "저는 게시판 보고 있었죠", "잠깐 들어왔어요"] },
  "enfant": { casual: true, kksCall: ["아저씨"], lines: ["음........", "그랬구나......", "저는 그냥 글 읽고 있어요", "오늘은 조용하네요...", "잠깐 있다가 다시 볼께요...", "생각보다 글이 많네요...", "저는 좀 천천히 읽는 중이에요..."] },
  "ajeegang": { casual: true, kksCall: ["아저씨"], lines: ["에구에구...", "히히히", "저는 자료실 갔다왔어요", "아 바쁘다 바빠..."] },
  "ekjw123": { casual: true, kksCall: ["광석아저씨"], lines: ["HI~~~~~~~~~~~", "추카!추카!!!!", "저는 방금 들어왔어요", "우하하~~~~~~~~~~~~"] },
  "soriboy": { casual: false, kksCall: ["광석님"], lines: ["저는 글 읽고 있습니다", "음악 얘기 좋네요", "자료실 보고 왔습니다"] },
  "sixs": { casual: true, kksCall: ["광석형"], lines: ["그려", "저는 그냥 있습니다", "잠깐 들렀어요"] },
  "낙원": { casual: false, kksCall: ["광석이형"], lines: ["저는 노래 듣고 있어요", "궁금한 게 많네요", "게시판 보고 있었습니다"] },
  "popboy": { casual: false, kksCall: ["광석아찌"], lines: ["저는 음반 얘기 보고 있어요", "흐..", "궁금해서 들어왔어요"] },
  "kfardor": { casual: false, kksCall: ["형"], lines: ["기타 연습 얘기 보고 있어요", "스트로크가 어렵네요", "잠깐 질문 보러 왔습니다"] }
};
const TELECOM_CASUAL_MEMBER_NICKS = new Set(Object.keys(TELECOM_MEMBER_PROFILES).filter((nick) => TELECOM_MEMBER_PROFILES[nick]?.casual));
let telecomQueuedTimers = [];

function telecomNow() { return Date.now(); }
function telecomRand(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }
function telecomLoadJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || ""); } catch { return fallback; }
}
function telecomSaveJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function telecomNormalizeLine(text) {
  return String(text || "").replace(/\s+/g, "").replace(/[~.!?。？！…·ㆍ,，]/g, "").toLowerCase();
}

// v149: 오타가 있어도 문맥을 따라가도록 입력을 가볍게 보정한다.
// 실제 사용자가 친 문장은 화면에 그대로 두고, 의도 판단/대화 흐름에만 보정본을 쓴다.
function telecomCanonicalInput(text) {
  let t = String(text || "").trim();
  const pairs = [
    [/그라고/g, "그리고"], [/글고/g, "그리고"], [/근대/g, "근데"], [/근데/g, "그런데"],
    [/머하/g, "뭐하"], [/모하/g, "뭐하"], [/뭐햐/g, "뭐하"], [/뭐하고잇/g, "뭐하고있"],
    [/잇어/g, "있어"], [/잇나요/g, "있나요"], [/업어/g, "없어"], [/업나요/g, "없나요"],
    [/조아/g, "좋아"], [/조은/g, "좋은"], [/됫/g, "됐"], [/되요/g, "돼요"],
    [/얘기/g, "이야기"], [/애기/g, "이야기"], [/예기/g, "이야기"],
    [/광서/g, "광석"], [/광석이형/g, "광석이 형"], [/광석형/g, "광석 형"],
    [/일훈아는/g, "일훈이는"], [/일훈아/g, "일훈아"]
  ];
  pairs.forEach(([re, to]) => { t = t.replace(re, to); });
  return t;
}
function telecomCompactInput(text) {
  return telecomCanonicalInput(text).replace(/\s+/g, "");
}
function telecomConversationFocus(userText, fallbackIntent = "chat") {
  const fixed = telecomCanonicalInput(userText);
  const intent = fallbackIntent || telecomIntent(fixed);
  const topic = telecomExtractConcreteThing(fixed);
  const last = telecomRecentLogItems(6).filter(x => x.kind === "say").slice(-1)[0] || null;
  return { fixed, intent, topic, last };
}
function telecomContextFollowLine(member, intent, userText = "", previousMember = null) {
  const casual = telecomMemberUsesCasual(member);
  const topic = telecomExtractConcreteThing(userText);
  const prevName = previousMember ? (telecomGivenName(previousMember.name) || previousMember.nick) : "";
  // v152: 인사에는 "안녕하세요 얘기 말씀이군요" 같은 분석형 문장을 절대 쓰지 않는다.
  if (intent === "greeting") {
    return casual
      ? telecomPickLine(["반가워", "그래, 어서와", "하이!!!!", "나도 반가워"])
      : telecomPickLine(["반갑습니다", "어서오세요", "네, 반갑습니다", "좋은 밤 되세요"]);
  }
  if (intent === "doing") {
    if (previousMember) return casual ? `${prevName}이도 보고 있었구나. 난 ${telecomHumanReactionVerb(intent).replace(/어요$/, "어")}` : `${prevName}님도 보고 계셨군요. 저도 ${telecomHumanReactionVerb(intent)}`;
    return casual ? `나도 ${telecomHumanReactionVerb(intent).replace(/어요$/, "어")}` : `저도 ${telecomHumanReactionVerb(intent)}`;
  }
  if (intent === "music") return casual ? `${topic}면 나도 좀 궁금해` : `${topic}라면 저도 궁금하네요`;
  if (intent === "comfort") return casual ? "그 말 들으니까 좀 그렇다. 천천히 얘기해" : "말씀 들으니까 조금 마음이 쓰이네요. 천천히 얘기하세요";
  if (intent === "food") return casual ? "그 얘기 들으니까 배고프다" : "그 얘기 들으니까 배고파지네요";
  if (intent === "laugh") return casual ? "아까 말이 좀 웃겼어" : "아까 말이 좀 웃겼어요";
  if (intent === "question") return casual ? `${topic} 말하는 거지? 나도 그건 궁금해` : `${topic} 말씀하시는 거죠? 저도 궁금해요`;
  // v152: 일반 잡담도 사용자의 문장을 분석한 듯 되풀이하지 말고, 짧은 맞장구로 제한한다.
  return casual ? telecomPickLine(["응", "그렇구나", "나도 보고 있었어", "그러게"]) : telecomPickLine(["네", "그렇군요", "저도 보고 있었어요", "그러게요"]);
}
function telecomRememberSpeaker(nick) {
  if (!nick) return;
  const list = telecomLoadJson(TELECOM_STORAGE.recentSpeakers, []);
  list.push(String(nick));
  telecomSaveJson(TELECOM_STORAGE.recentSpeakers, list.slice(-10));
}
function telecomRecentSpeakers() {
  return telecomLoadJson(TELECOM_STORAGE.recentSpeakers, []);
}
function telecomRememberTopic(intent) {
  if (!intent) return;
  const list = telecomLoadJson(TELECOM_STORAGE.recentTopics, []);
  list.push(String(intent));
  telecomSaveJson(TELECOM_STORAGE.recentTopics, list.slice(-10));
}

function telecomSetThread(intent, userText = "") {
  const text = String(userText || "");
  let topic = "잡담";
  if (intent === "doing") topic = "지금 뭐하는지";
  else if (intent === "music") topic = text.includes("기타") ? "기타와 노래" : "노래 이야기";
  else if (intent === "comfort") topic = text.includes("비") ? "비 오는 날 마음" : "마음 얘기";
  else if (intent === "food") topic = text.includes("감자탕") ? "감자탕 얘기" : "먹는 얘기";
  else if (intent === "celebrate") topic = "축하 얘기";
  else if (intent === "question") topic = "질문 얘기";
  else if (intent === "greeting") topic = "인사";
  telecomSaveJson(TELECOM_STORAGE.thread, { intent, topic, userText: text.slice(0, 60), updatedAt: telecomNow() });
  return topic;
}
function telecomGetThread() {
  const t = telecomLoadJson(TELECOM_STORAGE.thread, null);
  if (!t || !t.updatedAt || telecomNow() - t.updatedAt > 8 * 60 * 1000) return null;
  return t;
}
function telecomDirectAnswerForIntent(member, intent, userText = "", variant = 0) {
  const s = telecomCurrentSettings();
  const userGiven = telecomGivenName(s.name || s.nick || "손님") || "손님";
  const honor = telecomMemberAddressUser(member, userGiven);
  const casual = telecomMemberUsesCasual(member);
  const nick = member?.nick || "";
  const text = String(userText || "");
  if (intent === "doing") {
    if (nick === "녹차향기") return telecomPickLine(["저는 방금 게시판 정리하고 있었어요", "자료실 글 확인하고 있었어요", "광석 아찌 들어오셨나 보고 있었어요", `${honor} 저는 회원 글 좀 보고 있었어요`]);
    if (nick === "mouse14") return telecomPickLine(["난 그냥 방 구경중", "후후후.. 난 대화방 보고 있었지", "아까 자료실 갔다왔어", "사람들 뭐하나 보고 있었지"]);
    if (nick === "enfant") return telecomPickLine(["음........ 저는 글 읽고 있었어요", "그냥 조용히 보고 있었어요...", "낙서장 읽고 있었어요..."]);
    return casual ? telecomPickLine(["난 글 보고 있어", "그냥 대화방 보고 있지", "잠깐 들어와 있었어", "자료실 갔다왔어"]) : telecomPickLine(["저는 게시판 보고 있어요", "자료실 글 보고 있습니다", "방금 들어와 있었습니다", "노래 듣고 있었어요"]);
  }
  if (intent === "music") {
    if (text.includes("기타")) return casual ? telecomPickLine(["기타 얘기면 재밌지", "난 코드는 잘 모르지만 듣는건 좋아", "그거 광석이형한테 물어봐야지"]) : telecomPickLine(["기타 얘기라면 광석님께 여쭤보면 좋겠네요", "저도 기타 얘기는 늘 궁금해요", "그 곡 기타로 치면 좋을 것 같아요"]);
    return casual ? telecomPickLine(["그 노래 나도 좋아해", "노래 얘기면 좋지", "어떤 판 얘기야?", "난 라이브가 더 좋더라"]) : telecomPickLine(["그 노래 저도 좋아해요", "어떤 음반 얘기하세요?", "라이브 이야기도 궁금하네요", "자료실에 관련 글 있을거예요"]);
  }
  if (intent === "comfort") {
    return casual ? telecomPickLine(["그랬구나...", "그럴 땐 좀 쉬어", "괜히 혼자 붙들고 있지마", "노래 하나 듣고 와"]) : telecomPickLine(["그러셨군요...", "그럴 땐 조금 쉬셔도 돼요", "혼자 너무 오래 생각하지 마세요", "좋은 노래 한 곡 들으세요"]);
  }
  if (intent === "food") {
    return casual ? telecomPickLine(["감자탕 좋지", "소주 얘기하니까 배고프네", "난 맥주 생각난다", "그 얘기하니까 나가고 싶네"]) : telecomPickLine(["감자탕 좋지요", "소주 얘기하니까 배고프네요", "맥주 한 캔 생각나네요", "먹는 얘기는 늘 좋네요"]);
  }
  if (intent === "celebrate") {
    return casual ? telecomPickLine(["추카추카!!", "좋은날이네", "축하해요", "오늘 방 분위기 좋다"]) : telecomPickLine(["축하드립니다", "좋은 날이네요", "다시 한번 축하드려요", "오늘은 기분 좋은 얘기네요"]);
  }
  if (intent === "greeting") {
    return casual ? telecomPickLine([`${honor} 어서와`, "하이!!!!", "어소세요..", "반가워"]) : telecomPickLine([`${honor} 어서오세요~`, "반갑습니다", "좋은 밤 되세요", "어서오세요"]);
  }
  if (intent === "question") {
    return casual ? telecomPickLine(["그건 잘 모르겠는데", "나도 궁금하네", "광석이형 오면 물어보자", "누가 알면 얘기해줘"]) : telecomPickLine(["그건 저도 잘 모르겠어요", "광석님 오시면 여쭤보죠", "아시는 분 계세요?", "저도 궁금하네요"]);
  }
  const thread = telecomGetThread();
  if (thread && thread.topic && variant > 0) {
    return casual ? telecomPickLine([`아까 ${thread.topic} 얘기하던거`, "그 얘기 계속 해봐", "그건 좀 재밌네", "후후.. 그렇구나"]) : telecomPickLine([`아까 ${thread.topic} 얘기 이어가면요`, "그 얘기 저도 봤어요", "그 부분은 저도 궁금해요", "저도 듣고 있었어요"]);
  }
  return casual ? telecomPickLine(["그렇구나", "음.. 그래서?", "얘기 그렇구나", "후후.. 재밌네"]) : telecomPickLine(["그렇군요", "그렇군요", "그 얘기 좋네요", "저도 들어보고 싶어요"]);
}
function telecomFollowLineBetweenMembers(speaker, listener, intent) {
  const speakerName = telecomGivenName(speaker?.name || "") || speaker?.nick || "";
  const listenerCall = telecomMemberUsesCasual(listener) ? telecomNameWithAh(speakerName) : `${speakerName}님`;
  if (intent === "doing") return telecomMemberUsesCasual(listener) ? `${listenerCall} 나도 비슷해` : `${listenerCall} 저도 비슷해요`;
  if (intent === "music") return telecomMemberUsesCasual(listener) ? `${listenerCall} 그 곡 얘기 맞지?` : `${listenerCall} 그 곡 얘기 맞으세요?`;
  if (intent === "comfort") return telecomMemberUsesCasual(listener) ? `${listenerCall} 말 들으니까 좀 그렇다` : `${listenerCall} 말씀 들으니까 좀 그렇네요`;
  if (intent === "food") return telecomMemberUsesCasual(listener) ? `${listenerCall} 그 얘기하니까 배고프다` : `${listenerCall} 그 얘기하니까 배고프네요`;
  return telecomMemberUsesCasual(listener) ? `${listenerCall} 그 말 맞는듯` : `${listenerCall} 그 말 맞는 것 같아요`;
}
function telecomKksContextReply(intent, userText = "") {
  const text = String(userText || "");
  if (intent === "doing") return telecomPickLine(["지금 잠깐 게시판 보고 있어요", "자판 보고 치고 있어요", "자료실 글 좀 보고 있어요", "방금 들어왔어요"]);
  if (intent === "music") return text.includes("기타") ? telecomPickLine(["기타는요", "일단 나무가 좋아야죠", "요즈음 콜트도 좋더군요", "그 곡 기타로 하면 괜찮아요"]) : telecomPickLine(["그 노래 좋아요", "라이브로 하면 좀 달라요", "노래는 천천히 해야죠", "음반보다 무대가 더 어렵죠"]);
  if (intent === "comfort") return telecomPickLine(["그래요", "그런날 있죠", "괜히 센치해 있지말기", "씩씩하게 살기..."]);
  if (intent === "food") return telecomPickLine(["감자탕 좋죠", "맥주한캔 생각나네요", "하 좋~~~타", "먹는 얘기 좋네요"]);
  if (intent === "celebrate") return telecomPickLine(["축하합니다", "좋은날이네요", "사랑과 행복이 가득한 나날을", "빌어드릴께요"]);
  if (intent === "question") return telecomPickLine(["그건 좀 어렵네요", "잘은 모르겠어요", "천천히 얘기해봐요", "무슨일 있어요"]);
  return telecomPickLine(["네", "그래요", "응...", "참 좋네요..."]);
}
function telecomRememberLine(text) {
  const key = "kwangseokTelecomRecentLinesV142";
  const list = telecomLoadJson(key, []);
  const value = String(text || "");
  list.push(value);
  list.push(telecomNormalizeLine(value));
  telecomSaveJson(key, list.filter(Boolean).slice(-120));
}
function telecomPickLine(pool) {
  const arr = (pool || []).filter(Boolean);
  if (!arr.length) return "네";
  const recentRaw = telecomLoadJson("kwangseokTelecomRecentLinesV142", []);
  const recent = new Set(recentRaw.concat(recentRaw.map(telecomNormalizeLine)));
  const fresh = arr.filter((x) => {
    const exact = String(x);
    const norm = telecomNormalizeLine(exact);
    return !recent.has(exact) && !recent.has(norm);
  });
  let source = fresh.length ? fresh : arr.filter((x) => telecomNormalizeLine(x).length > 3);
  if (!source.length) source = arr;
  const chosen = source[telecomRand(0, source.length - 1)];
  telecomRememberLine(chosen);
  return chosen;
}
function telecomIntent(message) {
  const msg = telecomCompactInput(message);
  if (/^(y|Y|n|N)$/.test(String(message || "").trim())) return "yn";
  if (/ㅋ|ㅎ|푸하|하하|웃기|웃겨|웃김/.test(msg)) return "laugh";
  if (/뭐하|뭐해|뭐하는|뭐하세요|머하|모하|다들뭐|어디서|지금뭐/.test(msg)) return "doing";
  if (/안녕|하이|어서|반가|왔어요|왔어|접속/.test(msg)) return "greeting";
  if (/비|우울|허전|외롭|힘들|슬프|센치|쓸쓸|답답|피곤/.test(msg)) return "comfort";
  if (/노래|기타|공연|음악|앨범|라디오|음반|자료실/.test(msg)) return "music";
  if (/밥|술|맥주|소주|감자탕|먹|마시/.test(msg)) return "food";
  if (/생일|축하|기념|추카/.test(msg)) return "celebrate";
  if (/왜|어떻게|무슨|궁금|알려|질문|\?/.test(msg)) return "question";
  return "chat";
}
function telecomFindMentionedMember(message) {
  const msg = telecomCanonicalInput(message);
  const compact = msg.replace(/\s+/g, "");
  return DUNGEUNSORI_MEMBERS.find((m) => {
    if (m.nick === "김광석") return false;
    const given = telecomGivenName(m.name);
    return compact.includes(m.nick) || compact.includes(m.name) || (given && compact.includes(given));
  });
}
function telecomKksMentioned(message) { return /김광석|광석|아저씨|아찌|광석형|광석이형|광석이 형/.test(telecomCanonicalInput(message).replace(/\s+/g, "")); }
function telecomCleanText(v, fallback = "") { return String(v || "").replace(/[<>]/g, "").trim() || fallback; }
function telecomRoomOpen() {
  const room = document.getElementById("telecomRoom");
  return !!room && !room.classList.contains("hidden");
}
function telecomQueue(fn, delay) {
  const timer = setTimeout(() => {
    telecomQueuedTimers = telecomQueuedTimers.filter((t) => t !== timer);
    fn();
  }, delay);
  telecomQueuedTimers.push(timer);
  return timer;
}
function telecomClearQueuedTimers() {
  telecomQueuedTimers.forEach((t) => clearTimeout(t));
  telecomQueuedTimers = [];
}

function telecomAccountIdentity() {
  const loginId = telecomCleanText(currentUserProfile?.loginId || currentUser?.email?.split("@")[0] || "", "");
  const realName = telecomCleanText(currentUserProfile?.name || currentUser?.displayName || loginId || "손님", "손님");
  return { nick: loginId || realName || "손님", name: realName || loginId || "손님" };
}
function telecomApplyAccountIdentityToForm() {
  const id = telecomAccountIdentity();
  const nickInput = document.getElementById("telecomNickInput");
  const nameInput = document.getElementById("telecomNameInput");
  if (nickInput) {
    nickInput.value = id.nick;
    nickInput.readOnly = true;
    nickInput.classList.add("telecom-readonly");
  }
  if (nameInput) {
    nameInput.value = id.name;
    nameInput.readOnly = true;
    nameInput.classList.add("telecom-readonly");
  }
  return id;
}

function telecomCurrentSettings() {
  const saved = telecomLoadJson(TELECOM_STORAGE.settings, null) || {};
  const id = telecomAccountIdentity();
  return {
    nick: id.nick,
    name: id.name,
    mode: saved.mode || "chat",
    close: saved.close || "known",
    engine: saved.engine || "webllm"
  };
}
function telecomKksActive() { return localStorage.getItem(TELECOM_STORAGE.active) === "1"; }
function telecomSetKksActive(v) { localStorage.setItem(TELECOM_STORAGE.active, v ? "1" : "0"); }
function telecomAwayUntil() { return Number(localStorage.getItem(TELECOM_STORAGE.kksAwayUntil) || "0") || 0; }
function telecomSetAwayForRandomHours() {
  const ms = telecomRand(120, 180) * 60 * 1000;
  localStorage.setItem(TELECOM_STORAGE.kksAwayUntil, String(telecomNow() + ms));
}
function telecomIsKksAvailable() { return telecomNow() >= telecomAwayUntil(); }
function telecomFormatLeft(ms) {
  const totalMin = Math.max(0, Math.ceil(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}시간 ${m}분` : `${m}분`;
}

function telecomIsPcAllowed() {
  const widthOk = window.matchMedia ? window.matchMedia("(min-width: 900px)").matches : window.innerWidth >= 900;
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent || "");
  return widthOk && !mobileUA;
}
function telecomApplyPcOnlyGate() {
  const ok = telecomIsPcAllowed();
  const notice = document.getElementById("telecomPcOnlyNotice");
  const shell = document.querySelector("#telecom .telecom-shell");
  if (notice) notice.classList.toggle("hidden", ok);
  if (shell) shell.style.display = ok ? "" : "none";
  return ok;
}
function telecomSetAiStatus(text) {
  const box = document.getElementById("telecomAiStatus");
  if (box) box.textContent = text;
}
const TELECOM_WEBLLM_MODELS = [
  "SmolLM2-360M-Instruct-q4f32_1-MLC",
  "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",
  "Llama-3.2-1B-Instruct-q4f16_1-MLC"
];
let telecomAiEngine = null;
let telecomAiLoading = false;
let telecomAiReady = false;
let telecomAiLastError = "";
async function telecomEnsureLocalAiEngine() {
  if (telecomAiEngine) return telecomAiEngine;
  if (telecomAiLoading) throw new Error("모델을 불러오는 중입니다. 잠시 뒤 다시 입력해주세요.");
  if (!("gpu" in navigator)) throw new Error("이 PC 브라우저는 WebGPU를 지원하지 않습니다. PC용 Chrome 또는 Edge 최신 버전에서 접속해주세요.");
  telecomAiLoading = true;
  telecomAiReady = false;
  telecomAiLastError = "";
  telecomSetAiStatus("PC WebGPU 생성형 모델을 불러오는 중입니다. 첫 실행은 오래 걸릴 수 있습니다...");
  try {
    const webllm = await import("https://esm.run/@mlc-ai/web-llm");
    let lastErr = null;
    for (const model of TELECOM_WEBLLM_MODELS) {
      try {
        telecomSetAiStatus(`모델 준비 중: ${model}`);
        telecomAiEngine = await webllm.CreateMLCEngine(model, {
          initProgressCallback: (p) => {
            const progress = Math.round((p?.progress || 0) * 100);
            const text = p?.text || "모델 준비 중";
            telecomSetAiStatus(`PC WebGPU 모델 준비 중... ${progress}% ${text}`);
          }
        });
        telecomAiReady = true;
        telecomSetAiStatus(`생성형 대화 준비 완료: ${model}`);
        return telecomAiEngine;
      } catch (err) {
        lastErr = err;
        console.warn("WebLLM model failed", model, err);
      }
    }
    throw lastErr || new Error("사용 가능한 WebLLM 모델을 불러오지 못했습니다.");
  } catch (err) {
    telecomAiLastError = String(err?.message || err || "알 수 없는 오류");
    telecomSetAiStatus(`생성형 모델 준비 실패: ${telecomAiLastError}`);
    throw err;
  } finally {
    telecomAiLoading = false;
  }
}
function telecomBuildLocalAiMessages(userText) {
  const s = telecomCurrentSettings();
  const recentLinesForAi = telecomLoadJson("kwangseokTelecomRecentLinesV142", []).filter((x) => String(x).length > 2).slice(-24).join(" / ");
  const recentLog = telecomLoadJson(TELECOM_STORAGE.log, []).slice(-24).map((line) => {
    if (line.kind === "system") return `Chat: ${line.text}`;
    return `${line.nick}(${line.name}): ${line.text}`;
  }).join("\n");
  const closenessGuide = {
    first: "처음 만남: 정중한 존댓말",
    known: "아는 사이: 짧은 존댓말",
    close: "조금 친함: 이름님 정도의 친근한 존댓말",
    veryClose: "많이 친함: 이름을 부르되 반존대",
    best: "아주 가까움: 이름을 부르는 짧은 반말"
  }[s.close] || "짧은 존댓말";
  const modeGuide = {
    chat: "잡담 흐름",
    comfort: "위로받기 흐름",
    music: "음악 이야기 흐름",
    memory: "추억 이야기 흐름",
    worry: "고민 상담 흐름"
  }[s.mode] || "잡담 흐름";
  const system = `너는 광석이네 통신방의 가상 PC통신 대화 생성기다. 실제 김광석 본인이라고 주장하지 않는다. 화면 안내에 따라 가상 대화로만 행동한다. 김광석 대사만 생성한다. 1995년 PC통신 채팅처럼 짧고 투박하게 쓴다. 한 번에 1~3줄, 각 줄은 짧게. 긴 시적 독백, 현대 상담사 말투, AI라는 표현은 금지. 기본 표현은 네, 그래요, 응..., 무슨일 있어요, 자판 보고 치고 있어요, 게시판 보고 있어요, 괜히 센치해 있지말기, 씩씩하게 살기... 같은 느낌. 사용자와 김광석의 친한 정도는 ${closenessGuide}. 현재 대화 흐름은 ${modeGuide}. 회원들은 둥근소리 회원이며 김광석을 아저씨, 광석이형, 광석 아찌 등으로 부를 수 있다. 사용자가 '뭐하세요'라고 물으면 반드시 지금 무엇을 하는지 답한다. 최근 나온 말과 비슷한 문장 금지. 최근 금지 표현: ${recentLinesForAi}`;
  const user = `최근 대화:\n${recentLog}\n\n사용자 입력: ${userText}\n\n김광석(김광석)의 다음 짧은 채팅 대사만 출력해라. 닉네임 표기는 붙이지 말고 대사 줄만 출력해라.`;
  return [{ role: "system", content: system }, { role: "user", content: user }];
}
function telecomCleanAiLines(text) {
  const raw = String(text || "").replace(/김광석\s*\([^)]*\)\s*[:：]?/g, "").replace(/^김광석\s*[:：]/gm, "");
  const lines = raw.split(/\n+/).map((v) => v.replace(/^[-*•\s]+/, "").trim()).filter(Boolean);
  return lines.slice(0, 3).map((v) => v.slice(0, 80));
}
async function telecomTryLocalAiKksReply(userText) {
  const s = telecomCurrentSettings();
  if (s.engine !== "webllm") return false;
  try {
    const engine = await telecomEnsureLocalAiEngine();
    const reply = await engine.chat.completions.create({
      messages: telecomBuildLocalAiMessages(userText),
      temperature: 0.92,
      top_p: 0.88,
      max_tokens: 110
    });
    const content = reply?.choices?.[0]?.message?.content || "";
    let lines = telecomCleanAiLines(content);
    if (!lines.length) lines = telecomGenerateKksReply(userText, "user");
    lines.forEach((line, i) => telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(line); }, i * 900));
    return true;
  } catch (err) {
    console.warn("WebLLM failed; fallback to local KKS reply", err);
    telecomAiLastError = String(err?.message || err || "알 수 없는 오류");
    // v147: 모델 오류를 채팅창에 뿌리지 않는다. 사용자는 자연스러운 답만 본다.
    telecomSetAiStatus("PC WebGPU 생성형 모델 연결이 불안정하여 기본 응답으로 이어갑니다.");
    const lines = telecomGenerateKksReply(userText, "user");
    lines.forEach((line, i) => telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(line); }, i * 900));
    return true;
  }
}
function telecomFormatClock(ts = telecomNow()) {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
function telecomFormatDate95(ts = telecomNow()) {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `95/${mm}/${dd}`;
}
function telecomUpdateRoomDate() {
  const el = document.getElementById("telecomRoomDate");
  if (el) el.textContent = telecomFormatDate95();
}
function telecomGivenName(name) {
  const clean = telecomCleanText(name, "");
  if (!clean) return "";
  if (/^[가-힣]{3,4}$/.test(clean)) return clean.slice(1);
  return clean;
}
function telecomHasFinalConsonant(word) {
  const ch = String(word || "").charCodeAt(String(word || "").length - 1);
  return ch >= 0xac00 && ch <= 0xd7a3 && ((ch - 0xac00) % 28) !== 0;
}
function telecomNameWithAh(name) {
  const g = telecomGivenName(name) || name || "";
  if (!g) return "";
  return g + (telecomHasFinalConsonant(g) ? "아" : "야");
}
function telecomNameWithYi(name) {
  const g = telecomGivenName(name) || name || "";
  if (!g) return "";
  return g + (telecomHasFinalConsonant(g) ? "이" : "");
}
function telecomMemberUsesCasual(member) {
  return !!member && !!TELECOM_MEMBER_PROFILES[member.nick]?.casual;
}


// v151: 입장/퇴장 인사 흐름.
// 누가 접속하면 먼저 본인이 인사하고, 방 안의 누군가가 받아준다.
// 누가 나갈 때도 본인이 나간다고 말하고, 남은 사람이 짧게 배웅한다.
function telecomGreetingLineForMember(member, targetName = "") {
  const nick = member?.nick || "";
  const casual = telecomMemberUsesCasual(member);
  const call = targetName ? (casual ? telecomNameWithAh(targetName) : `${targetName}님`) : "";
  if (nick === "녹차향기") return telecomPickLine(["안녕하세요~", "어서오세요. 반갑습니다", "방금 들어오신 분들 천천히 말씀하세요"]);
  if (nick === "mouse14") return telecomPickLine(["후후후.. 나 왔어", "하이!!!!", "나 잠깐 들어왔어"]);
  if (nick === "enfant") return telecomPickLine(["음........ 안녕하세요...", "저도 잠깐 들어왔어요...", "조용히 들어왔어요..."]);
  if (nick === "raincoat") return telecomPickLine(["반갑반갑~~~", "홍홍.. 저 왔어요", "안녕하세요~~~"]);
  if (nick === "ekjw123") return telecomPickLine(["HI~~~~~~~~~~~", "안냐세요~~~~", "우하하 저 왔어요"]);
  if (nick === "soriboy") return telecomPickLine(["안녕하세요", "조금 쉬러 들어왔습니다", "반갑습니다"]);
  if (call) return casual ? telecomPickLine([`${call} 하이`, `${call} 반가워`, `${call} 어서와`]) : telecomPickLine([`${call} 어서오세요`, `${call} 반갑습니다`, `${call} 좋은 밤 되세요`]);
  return casual ? telecomPickLine(["하이", "반가워", "나 들어왔어"]) : telecomPickLine(["안녕하세요", "반갑습니다", "들어왔습니다"]);
}
function telecomGreetingLineForUserResponder(member, userGiven) {
  const honor = telecomMemberAddressUser(member, userGiven || "손님");
  const casual = telecomMemberUsesCasual(member);
  if (member?.nick === "녹차향기") return telecomPickLine([`${honor} 어서오세요~`, `${honor} 반가워요`, "천천히 말씀하세요"]);
  if (member?.nick === "mouse14") return telecomPickLine([`${honor} 어서와`, "후후후.. 사람 왔네", "하이!!!!"]);
  if (member?.nick === "enfant") return telecomPickLine([`${honor} 안녕하세요...`, "음........ 반가워요...", "어서오세요..."]);
  return casual ? telecomPickLine([`${honor} 어서와`, `${honor} 반가워`, "하이!!!!"]) : telecomPickLine([`${honor} 어서오세요`, `${honor} 반갑습니다`, "좋은 밤 되세요"]);
}
function telecomKksGreetingLine(targetName = "") {
  const call = targetName ? telecomNameWithAh(targetName) : "";
  return telecomPickLine([call ? `${call} 왔네` : "오셨네요", "어... 반가워요", "늦었네. 무슨 얘기 중이었어요", "들어왔어요"]);
}
function telecomFarewellLineForMember(member) {
  const nick = member?.nick || "";
  const casual = telecomMemberUsesCasual(member);
  if (nick === "녹차향기") return telecomPickLine(["저는 잠깐 나가볼게요", "정리 좀 하고 다시 올게요", "좋은 밤 되세요"]);
  if (nick === "mouse14") return telecomPickLine(["나 잠깐 나간다", "후후후.. 이따 올게", "갈무리하고 올게"]);
  if (nick === "enfant") return telecomPickLine(["저는 조금 있다 다시 올게요...", "음........ 잠깐 나가요...", "좋은 밤 되세요..."]);
  if (nick === "raincoat") return telecomPickLine(["저 잠깐 나갔다 올게요", "홍홍.. 이따 봐요", "반갑반갑 하고 나갑니다~~~"]);
  return casual ? telecomPickLine(["나 잠깐 나갈게", "이따 봐", "먼저 나간다"]) : telecomPickLine(["저는 잠깐 나가볼게요", "이따 다시 오겠습니다", "좋은 밤 되세요"]);
}
function telecomFarewellResponseLine(member, leaverName = "") {
  const casual = telecomMemberUsesCasual(member);
  const call = leaverName ? (casual ? telecomNameWithAh(leaverName) : `${leaverName}님`) : "";
  if (member?.nick === "녹차향기") return telecomPickLine(["네, 또 오세요", "조심히 가세요", "이따 다시 뵈어요"]);
  if (member?.nick === "mouse14") return telecomPickLine([call ? `${call} 또 와` : "또 와", "후후후.. 잘가", "이따 봐"]);
  if (member?.nick === "enfant") return telecomPickLine(["또 오세요...", "좋은 밤 되세요...", "이따 봐요..."]);
  return casual ? telecomPickLine([call ? `${call} 잘가` : "잘가", "또 와", "이따 봐"]) : telecomPickLine([call ? `${call} 조심히 가세요` : "조심히 가세요", "또 오세요", "좋은 밤 되세요"]);
}

function telecomUserSpokeAfter(ts) {
  const userNick = telecomCurrentSettings().nick;
  const log = telecomLoadJson(TELECOM_STORAGE.log, []);
  return log.some((x) => x.kind === "say" && x.nick === userNick && (x.time || 0) > ts);
}
function telecomGreetingAnswerLine(member, userText = "") {
  const s = telecomCurrentSettings();
  const userGiven = telecomGivenName(s.name || s.nick || "손님") || "손님";
  const honor = telecomMemberAddressUser(member, userGiven);
  const casual = telecomMemberUsesCasual(member);
  if (member?.nick === "녹차향기") return telecomPickLine([`${honor} 반갑습니다`, `${honor} 어서오세요`, "네, 반갑습니다", "천천히 이야기하세요"]);
  if (member?.nick === "mouse14") return telecomPickLine([`${honor} 반가워`, "후후후.. 반가워", "하이!!!!"]);
  if (member?.nick === "enfant") return telecomPickLine([`${honor} 안녕하세요...`, "음........ 반가워요...", "어서오세요..."]);
  if (member?.nick === "raincoat") return telecomPickLine(["반갑반갑~~~", "홍홍.. 반가워요", `${honor} 어서오세요`]);
  return casual ? telecomPickLine([`${honor} 반가워`, "어서와", "하이!!!!"]) : telecomPickLine([`${honor} 반갑습니다`, "어서오세요", "네, 반갑습니다"]);
}
function telecomKksGreetingAnswerLine(userText = "") {
  const s = telecomCurrentSettings();
  const g = telecomGivenName(s.name || s.nick || "");
  if (s.close === "best" || s.close === "veryClose") return telecomPickLine([`${telecomNameWithAh(g)} 반가워`, "그래, 반가워", "응... 왔구나"]);
  if (s.close === "close") return telecomPickLine([`${g}님 반갑습니다`, "오셨네요", "네, 반갑습니다"]);
  return telecomPickLine(["반갑습니다", "오셨네요", "네, 안녕하세요"]);
}

function telecomScheduleGreetingRepliesForUser(userGiven) {
  // v152: 입장 인사는 짧게 1명만. 사용자가 이미 말을 시작했으면 늦은 입장 인사는 취소한다.
  const scheduledAt = telecomNow();
  const manager = telecomFindMemberByNick("녹차향기");
  const greeter = (manager && telecomIsMemberActive(manager.nick)) ? manager : telecomPickMember();
  if (greeter) {
    telecomQueue(() => {
      if (!telecomRoomOpen() || telecomUserSpokeAfter(scheduledAt)) return;
      telecomSayMember(greeter, telecomGreetingLineForUserResponder(greeter, userGiven));
    }, telecomRand(900, 1800));
  }
  // 김광석 인사는 telecomScheduleStatusLine에서 한 번만 처리한다. 여기서 중복으로 말하지 않는다.
}
function telecomScheduleGreetingRepliesForMember(joinedMember) {
  if (!joinedMember) return;
  const responder = telecomPickMember([joinedMember.nick]);
  if (responder) {
    telecomQueue(() => {
      if (telecomRoomOpen()) telecomSayMember(responder, telecomGreetingLineForMember(responder, telecomGivenName(joinedMember.name) || joinedMember.nick));
    }, telecomRand(1200, 3200));
  }
  if (telecomKksActive() && Math.random() < 0.35) {
    telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(telecomKksGreetingLine(telecomGivenName(joinedMember.name) || joinedMember.nick)); }, telecomRand(3600, 6200));
  }
}
function telecomScheduleFarewellRepliesForMember(leaverMember) {
  if (!leaverMember) return;
  const responder = telecomPickMember([leaverMember.nick]);
  if (responder) {
    telecomQueue(() => {
      if (telecomRoomOpen()) telecomSayMember(responder, telecomFarewellResponseLine(responder, telecomGivenName(leaverMember.name) || leaverMember.nick));
    }, telecomRand(1200, 3200));
  }
  if (telecomKksActive() && Math.random() < 0.25) {
    telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(telecomPickLine(["또 봐요", "조심히 가요", "다음에 또 얘기해요"])); }, telecomRand(3400, 5600));
  }
}
function telecomIsUserExitIntent(text) {
  const msg = telecomCompactInput(text);
  return /^(나갈게|나갑니다|나가요|갈게|갑니다|그만할게|종료|끝낼게|끊을게|빠이|바이|안녕)$/.test(msg) || /저는이제나갈|저이제나갈|먼저나갈|이만나갈|대화방나갈/.test(msg);
}
function telecomHandleUserExitAfterMessage() {
  const s = telecomCurrentSettings();
  const given = telecomGivenName(s.name || s.nick || "손님") || "손님";
  const m1 = telecomFindMemberByNick("녹차향기") || telecomPickMember();
  const m2 = telecomPickMember([m1?.nick]);
  if (m1) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m1, telecomFarewellResponseLine(m1, given)); }, telecomRand(1200, 2600));
  if (m2) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m2, telecomFarewellResponseLine(m2, given)); }, telecomRand(3200, 5200));
  if (telecomKksActive()) telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks("또 봐요"); }, telecomRand(5400, 7200));
  telecomQueue(() => {
    if (!telecomRoomOpen()) return;
    telecomSystem(`${s.nick}(${s.name})님이 대화방을 나갔습니다.`);
    telecomClearQueuedTimers();
    clearTimeout(telecomMemberTimer);
    document.getElementById("telecomAfterKksExit")?.classList.add("hidden");
    document.getElementById("telecomRoom")?.classList.add("hidden");
    document.getElementById("telecomSetup")?.classList.remove("hidden");
    telecomApplyAccountIdentityToForm();
  }, 8500);
}
function telecomAddLine(kind, data, save = true) {
  const item = { kind, time: telecomNow(), ...data };
  const log = telecomLoadJson(TELECOM_STORAGE.log, []);
  log.push(item);
  const clipped = log.slice(-260);
  if (save) telecomSaveJson(TELECOM_STORAGE.log, clipped);
  telecomRenderLog(clipped);
  return item;
}
function telecomSystem(text) { telecomAddLine("system", { text }); }

// v147: 통신방 상태관리 보강.
// - 방에 없는 사람은 절대 말하지 못하게 막는다.
// - 나간 회원을 발화 직전에 다시 자동 입장시키지 않는다.
// - 김광석이 나간 뒤 남은 예약 발화가 튀어나오지 않게 차단한다.
function telecomCanNickSpeak(nick) {
  const cleanNick = String(nick || "").trim();
  if (!cleanNick) return false;
  const userNick = telecomCurrentSettings().nick;
  if (cleanNick === userNick) return true;
  if (cleanNick === "김광석") return telecomKksActive();
  return telecomIsMemberActive(cleanNick);
}
function telecomSanitizeGeneratedText(nick, text) {
  let output = String(text || "").trim();
  if (!output) return "";

  // 사용자가 직접 입력한 글은 손대지 않는다. AI/회원 자동 발화만 정리한다.
  const userNick = telecomCurrentSettings().nick;
  if (String(nick || "") === userNick) return output;

  // 이미 나간 회원의 이름을 자동 발화에서 최대한 제거한다.
  const activeSet = new Set(telecomActiveMemberNicks());
  DUNGEUNSORI_MEMBERS.forEach((m) => {
    if (!m || m.nick === "김광석" || activeSet.has(m.nick)) return;
    [m.nick, m.name, telecomGivenName(m.name)].filter(Boolean).forEach((label) => {
      const safe = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      output = output.replace(new RegExp(`${safe}(님|형|씨|아저씨|아찌)?[은는이가을를에게도]*`, "g"), "");
    });
  });

  // 김광석이 나간 뒤 팬들 대화에서 김광석에게 직접 말을 거는 자동 문장을 줄인다.
  if (!telecomKksActive() && String(nick || "") !== "김광석") {
    output = output
      .replace(/김광석\s*(님|형|이형|아저씨|아찌)?\s*(계신가요\??|보셨어요\??|오시면|오면|한테|에게)/g, "")
      .replace(/광석\s*(님|형|이형|아저씨|아찌)?\s*(계신가요\??|보셨어요\??|오시면|오면|한테|에게)/g, "");
  }

  return output.replace(/\s{2,}/g, " ").trim();
}
function telecomIsRecentDuplicateLine(nick, text) {
  const cleaned = telecomNormalizeLine(text);
  if (!cleaned || cleaned.length < 3) return false;
  const log = telecomLoadJson(TELECOM_STORAGE.log, []);
  const recent = log.slice(-10).filter((line) => line.kind === "say");
  return recent.some((line) => {
    const prev = telecomNormalizeLine(line.text || "");
    if (!prev) return false;
    if (prev === cleaned) return true;
    // 같은 사람이 바로 비슷한 짧은 반응을 반복하는 것도 차단
    if (line.nick === nick && prev.includes(cleaned)) return true;
    if (line.nick === nick && cleaned.includes(prev)) return true;
    return false;
  });
}
function telecomSay(nick, name, text) {
  if (!telecomCanNickSpeak(nick)) {
    console.warn("[telecom blocked] inactive speaker:", nick, text);
    return null;
  }
  const cleaned = telecomSanitizeGeneratedText(nick, text);
  if (!cleaned) return null;
  if (String(nick || "") !== telecomCurrentSettings().nick && telecomIsRecentDuplicateLine(nick, cleaned)) {
    console.warn("[telecom blocked] duplicate generated line:", nick, cleaned);
    return null;
  }
  telecomRememberSpeaker(nick);
  telecomRememberLine(cleaned);
  return telecomAddLine("say", { nick, name, text: cleaned });
}
function telecomKks(text) {
  if (!telecomKksActive()) {
    console.warn("[telecom blocked] 김광석 is inactive:", text);
    return null;
  }
  return telecomSay("김광석", "김광석", text);
}
function telecomRenderLog(log = telecomLoadJson(TELECOM_STORAGE.log, [])) {
  const box = document.getElementById("telecomLog");
  if (!box) return;
  box.innerHTML = log.map((line) => {
    const clock = telecomFormatClock(line.time || telecomNow());
    if (line.kind === "system") return `<div class="telecom-line telecom-system">Chat : ${escapeHtml(line.text)} <span class="telecom-time">${clock}</span></div>`;
    return `<div class="telecom-line"><span class="telecom-nick">${escapeHtml(line.nick)}</span> <span class="telecom-real">(${escapeHtml(line.name)})</span> <span class="telecom-text">${escapeHtml(line.text)}</span> <span class="telecom-time">${clock}</span></div>`;
  }).join("");
  box.scrollTop = box.scrollHeight;
}

function telecomActiveMemberNicks() {
  let list = telecomLoadJson(TELECOM_STORAGE.activeMembers, null);
  if (!Array.isArray(list) || !list.length) {
    list = ["녹차향기", "mouse14", "enfant", "raincoat", "ajeegang", "ekjw123", "낙원", "soriboy"];
    telecomSaveJson(TELECOM_STORAGE.activeMembers, list);
  }
  return list.filter(Boolean);
}
function telecomSetActiveMemberNicks(list) {
  const unique = [...new Set((list || []).filter(Boolean).filter((nick) => nick !== "김광석"))].slice(0, 12);
  telecomSaveJson(TELECOM_STORAGE.activeMembers, unique);
  return unique;
}
function telecomIsMemberActive(nick) {
  return telecomActiveMemberNicks().includes(nick);
}
function telecomFindMemberByNick(nick) {
  return DUNGEUNSORI_MEMBERS.find((m) => m.nick === nick);
}
function telecomMemberJoin(member, silent = false) {
  if (!member || member.nick === "김광석") return;
  const list = telecomActiveMemberNicks();
  if (!list.includes(member.nick)) {
    list.push(member.nick);
    telecomSetActiveMemberNicks(list);
    if (!silent) {
      telecomSystem(`${member.nick}(${member.name})님이 접속하셨습니다.`);
      telecomQueue(() => {
        if (telecomRoomOpen() && telecomIsMemberActive(member.nick)) telecomSayMember(member, telecomGreetingLineForMember(member));
      }, telecomRand(700, 1800));
      telecomScheduleGreetingRepliesForMember(member);
    }
  }
}
function telecomMemberLeave(member) {
  if (!member || member.nick === "김광석") return false;
  const list = telecomActiveMemberNicks();
  if (!list.includes(member.nick) || list.length <= 4) return false;
  // 먼저 본인이 나간다고 말한 뒤, active 목록에서 제외한다.
  telecomSayMember(member, telecomFarewellLineForMember(member));
  telecomSetActiveMemberNicks(list.filter((nick) => nick !== member.nick));
  telecomSystem(`${member.nick}(${member.name})님이 나가셨습니다.`);
  telecomScheduleFarewellRepliesForMember(member);
  return true;
}
function telecomEnsureMemberCanSpeak(member) {
  if (!member || member.nick === "김광석") return false;
  // v147: 여기서 자동 재입장시키면, 나간 사람이 갑자기 다시 말하는 오류가 생긴다.
  // 말하기 직전에는 오직 현재 접속자만 통과시킨다.
  return telecomIsMemberActive(member.nick);
}
function telecomSayMember(member, text) {
  if (!telecomEnsureMemberCanSpeak(member)) {
    console.warn("[telecom blocked] inactive member tried to speak:", member?.nick, text);
    return null;
  }
  return telecomSay(member.nick, member.name, text);
}
function telecomPickMember(excluded = []) {
  const userNick = telecomCurrentSettings().nick;
  const recent = telecomRecentSpeakers().slice(-5);
  const blocked = new Set(["김광석", userNick, ...excluded].filter(Boolean));
  let active = telecomActiveMemberNicks().map(telecomFindMemberByNick).filter(Boolean);
  let pool = active.filter((m) => !blocked.has(m.nick) && !recent.includes(m.nick));
  if (!pool.length) pool = active.filter((m) => !blocked.has(m.nick));
  if (!pool.length) {
    // 말할 사람이 없으면 새 사람을 몰래 끌어오지 않는다.
    // 기본 접속자 중 실제 active인 사람만 복구한다.
    const fallbackActive = ["녹차향기", "mouse14", "enfant", "raincoat", "낙원", "soriboy"]
      .filter((nick) => !blocked.has(nick))
      .map(telecomFindMemberByNick)
      .filter(Boolean);
    if (!fallbackActive.length) return null;
    pool = fallbackActive;
  }
  return pool[telecomRand(0, Math.max(0, pool.length - 1))] || { nick: "녹차향기", name: "변수진" };
}
function telecomSetupCallButton() {
  const btn = document.getElementById("telecomCallBtn");
  if (!btn) return;
  clearInterval(telecomCountdownTimer);
  const apply = () => {
    const away = telecomAwayUntil();
    const active = telecomKksActive();
    if (active) {
      btn.classList.add("hidden");
      btn.disabled = false;
      btn.textContent = "김광석 호출";
      return;
    }
    btn.classList.remove("hidden");
    if (telecomNow() < away) {
      btn.disabled = true;
      btn.textContent = `김광석 대기중 ${telecomFormatLeft(away - telecomNow())}`;
      return;
    }
    btn.disabled = false;
    btn.textContent = "김광석 호출";
    // 대기시간이 끝난 경우 채팅창 안에서 Y/N으로 재호출 여부를 묻는다.
    if (away > 0 && telecomRoomOpen()) {
      const alreadyFor = localStorage.getItem(TELECOM_STORAGE.callPromptFor);
      if (alreadyFor !== String(away)) {
        localStorage.setItem(TELECOM_STORAGE.callPromptFor, String(away));
        telecomSystem("김광석 호출이 가능합니다. 호출 하시겠습니까? Y/N");
      }
    }
  };
  apply();
  telecomCountdownTimer = setInterval(apply, 30000);
}
function telecomGenerateKksOpener() {
  const s = telecomCurrentSettings();
  const g = telecomGivenName(s.name || s.nick || "");
  if (s.close === "best") return `${telecomNameWithAh(g)} 왔네`;
  if (s.close === "veryClose") return `${telecomNameWithAh(g)} 오셨네요`;
  if (s.close === "close") return `${g}님 오셨네요`;
  if (s.mode === "music") return "무슨 노래 얘기할까요";
  if (s.mode === "comfort") return "오늘은 좀 어떠세요";
  if (s.mode === "memory") return "옛날 얘기 해볼까요";
  if (s.mode === "worry") return "무슨일 있어요";
  return "오셨네요";
}
function telecomScheduleStatusLine() {
  clearTimeout(telecomStatusTimer);
  telecomStatusTimer = telecomQueue(() => {
    if (!telecomRoomOpen() || !telecomKksActive()) return;
    telecomSystem("'김광석'님은 수신[가능]상태로 (둥근소리 (김광석)) 서비스를 이용 중입니다.");
    telecomQueue(() => {
      if (!telecomRoomOpen() || !telecomKksActive()) return;
      telecomKks(telecomGenerateKksOpener());
      telecomQueue(() => {
        const greeter = telecomFindMemberByNick("녹차향기") || telecomPickMember();
        if (telecomRoomOpen() && greeter) telecomSayMember(greeter, "광석 아찌 어서오세요");
      }, 2200);
      telecomStartMemberNoise(5000);
    }, 1500);
  }, 10000);
}
function telecomScheduleKksExit() {
  clearTimeout(telecomExitTimer);
  if (!telecomKksActive()) return;
  const delay = telecomRand(15 * 60 * 1000, 28 * 60 * 1000);
  telecomExitTimer = telecomQueue(() => telecomKksLeave(), delay);
}
function telecomKksLeave() {
  if (!telecomKksActive()) return;
  const lines = TELECOM_KKS_EXIT_LINES.slice(0, telecomRand(2, TELECOM_KKS_EXIT_LINES.length));
  lines.forEach((t, i) => telecomQueue(() => { if (telecomKksActive()) telecomKks(t); }, i * 1200));
  telecomQueue(() => {
    telecomSetKksActive(false);
    telecomSetAwayForRandomHours();
    telecomSystem("김광석(김광석)님이 나가셨습니다.");
    document.getElementById("telecomAfterKksExit")?.classList.remove("hidden");
    telecomSetupCallButton();
  }, lines.length * 1200 + 1200);
}
function telecomGenerateKksReply(message, audience = "user") {
  const s = telecomCurrentSettings();
  const g = telecomGivenName(s.name || s.nick || "");
  const msg = String(message || "");
  const intent = telecomIntent(msg);
  const isUser = audience === "user";
  let prefix = "";
  // 행동 질문에는 이름을 앞에 붙이지 않는다. 답부터 해야 자연스럽다.
  if (isUser && intent !== "doing") {
    if (s.close === "best") prefix = `${telecomNameWithAh(g)} `;
    else if (s.close === "veryClose") prefix = `${telecomNameWithAh(g)} `;
    else if (s.close === "close") prefix = `${g}님 `;
  }
  let pool = [];
  if (intent === "doing") {
    pool = ["지금 잠깐 게시판 보고 있어요", "자판 보고 치고 있어요", "자료실 글 좀 보고 있어요", "방금 들어왔어요", "조금 있다 나가야해요"];
  } else if (intent === "comfort" || (isUser && s.mode === "comfort")) {
    pool = [`${prefix}그래요`, "그런날 있죠", "괜히 센치해 있지말기", "씩씩하게 살기...", "좀 쉬어요"];
  } else if (intent === "music" || (isUser && s.mode === "music")) {
    pool = [`${prefix}무슨 노래요`, "그 노래 좋아요", "기타로 하면 괜찮아요", "요즈음 콜트도 좋더군요", "잘 흥정해보시고요"];
  } else if (intent === "food") {
    pool = ["맥주한캔 생각나네요", "하 좋~~~타", "소주랑 감자탕도 좋죠", "좋은 물건 싸게 사는거 거 정말 기분 좋~~~~~지"];
  } else if (intent === "celebrate") {
    pool = ["축하합니다", "좋은날이네요", "사랑과 행복이 가득한 나날을", "빌어드릴께요"];
  } else if (intent === "greeting") {
    pool = [`${prefix}오셨네요`, "반갑습니다", "네"];
  } else if (isUser && s.mode === "worry") {
    pool = [`${prefix}무슨일 있어요`, "천천히 말해요", "그건 좀 어렵네요", "그래도 얘기해봐요"];
  } else if (isUser && s.mode === "memory") {
    pool = [`${prefix}오래됐네요`, "그때 생각나요", "참 좋네요...", "그럼..."];
  } else if (intent === "question") {
    pool = ["그건 저도 잘 모르겠네요", "아직", "네", "좀 그렇구나요"];
  } else {
    pool = [`${prefix}네`, "그래요", "응...", "얘기해봐요", "훗..."];
  }
  const count = intent === "doing" ? 1 : telecomRand(1, Math.min(3, pool.length));
  let replies = [];
  for (let i = 0; i < count; i++) replies.push(telecomPickLine(pool));
  if (isUser && s.close === "best" && intent !== "doing") {
    replies = replies.map((t) => t.replace(/요$/g, "").replace(/합니다$/g, "해").replace(/습니다$/g, "어").replace(/네요$/g, "네").replace(/까요$/g, "할까"));
  }
  return replies;
}
function telecomMemberAddressUser(member, userGiven) {
  // 부를 때 쓰는 호칭. 예: "일훈아", "일훈님"
  if (telecomMemberUsesCasual(member)) return telecomNameWithAh(userGiven) || userGiven;
  return `${userGiven}님`;
}
function telecomMemberTopicUser(member, userGiven) {
  // 문장 안 주어/화제로 쓸 때 쓰는 호칭. 예: "일훈이는" / "일훈님은"
  const g = telecomGivenName(userGiven || "") || userGiven || "";
  if (!g) return telecomMemberUsesCasual(member) ? "너는" : "손님은";
  if (telecomMemberUsesCasual(member)) return `${telecomNameWithYi(g)}는`;
  return `${g}님은`;
}
function telecomMemberObjectUser(member, userGiven) {
  const g = telecomGivenName(userGiven || "") || userGiven || "";
  if (!g) return telecomMemberUsesCasual(member) ? "너를" : "손님을";
  if (telecomMemberUsesCasual(member)) return `${telecomNameWithYi(g)}를`;
  return `${g}님을`;
}
function telecomGenerateMemberRepliesToUser(message) {
  const s = telecomCurrentSettings();
  const userGiven = telecomGivenName(s.name || s.nick || "손님") || "손님";
  const msg = String(message || "");
  const intent = telecomIntent(msg);
  const directNick = telecomFindMentionedMember(msg);
  const member1 = directNick || (Math.random() < 0.25 ? DUNGEUNSORI_MEMBERS.find((m) => m.nick === "녹차향기") : null) || telecomPickMember();
  const member2 = telecomPickMember([member1.nick]);
  const userHonor = telecomMemberAddressUser(member1, userGiven);
  const userHonor2 = telecomMemberAddressUser(member2, userGiven);
  function doingPool(member, honor) {
    const profile = TELECOM_MEMBER_PROFILES[member.nick];
    if (member.nick === "녹차향기") return ["저는 게시판 정리하고 있어요", "광석 아찌 글 기다리고 있어요", "자료실 보고 있었어요", `${honor} 천천히 말씀하세요`];
    if (telecomMemberUsesCasual(member)) return ["난 대화방 보고 있지", "그냥 글 읽고 있어", "자료실 갔다왔어", "잠깐 들어와 있었어"];
    return ["저는 게시판 보고 있어요", "자료실 글 보고 있습니다", "잠깐 들어와 있었습니다", "노래 듣고 있었어요"];
  }
  let firstPool = [];
  let secondPool = [];
  if (intent === "doing") {
    firstPool = doingPool(member1, userHonor);
    secondPool = doingPool(member2, userHonor2);
  } else if (member1.nick === "녹차향기") {
    firstPool = [`${userHonor} 반가워요`, "광석 아찌는 조금 있다 답하실거예요", "아저씨 오늘 좀 바쁘신가봐요", "천천히 말씀하세요..."];
    secondPool = TELECOM_MEMBER_PROFILES[member2.nick]?.lines || TELECOM_MEMBER_REPLY_LINES;
  } else if (intent === "greeting") {
    firstPool = telecomMemberUsesCasual(member1) ? [`${userHonor} 어서와`, `${userHonor} 반가워`, "하이!!!!"] : [`${userHonor} 어서오세요~`, `${userHonor} 반갑습니다`, "좋은 밤 되세요~~~"];
    secondPool = telecomMemberUsesCasual(member2) ? [`${userHonor2} 어소세요..`, "하이!!!!", "잠깐 들어왔어요"] : [`${userHonor2} 어서오세요`, "하이!!!!", "잠깐 들어왔어요"];
  } else if (intent === "comfort") {
    firstPool = telecomMemberUsesCasual(member1) ? [`${userHonor} 그랬구나...`, "오늘은 조금 쉬어", "괜히 센치해지지 말기"] : [`${userHonor} 그러셨군요...`, "오늘은 조금 쉬세요", "괜히 센치해지지 마세요"];
    secondPool = telecomMemberUsesCasual(member2) ? ["맞아", "비 오면 좀 그래", "좋은 음악 한곡 들어"] : ["맞아요", "비 오면 좀 그래요", "좋은 음악 한곡 들으세요"];
  } else if (intent === "music") {
    firstPool = telecomMemberUsesCasual(member1) ? [`${userHonor} 어떤 노래 좋아해`, "공연 얘기 들으면 반갑지요", "자료실에도 좋은 글 많아요"] : [`${userHonor} 어떤 노래 좋아하세요`, "공연 얘기 들으면 반갑지요", "자료실에도 좋은 글 많아요"];
    secondPool = telecomMemberUsesCasual(member2) ? ["그 노래 나도 좋아해", "기타 얘기 재밌네요", "라디오도 좋더군요"] : ["그 노래 저도 좋아해요", "기타 얘기 재밌네요", "라디오도 좋더군요"];
  } else if (intent === "food") {
    firstPool = telecomMemberUsesCasual(member1) ? ["감자탕 좋지", "소주 얘기하니까 배고프네", "난 맥주 생각난다"] : ["감자탕 좋지요", "소주 얘기하니까 배고프네요", "맥주 한 캔 생각나네요"];
    secondPool = ["후후후..", "좋네요", "하 좋~~~타"];
  } else if (intent === "celebrate") {
    firstPool = telecomMemberUsesCasual(member1) ? ["축하해요", `${userHonor} 좋은날이네`, "추카!추카!!!!"] : ["축하드립니다.", `${userHonor} 좋은날이네요`, "행복한 날 되세요~~~"];
    secondPool = ["후후후..", "좋네요", "다시한번 축하드려요"];
  } else {
    firstPool = telecomMemberUsesCasual(member1) ? [`${userHonor} 그랬구나`, `${userHonor} 얘기 그렇구나`, "글쿠나......", "그러게"] : [`${userHonor} 그러셨군요`, `${userHonor} 그 얘기 들었어요`, "글쿠나......", "그러게요"];
    secondPool = TELECOM_MEMBER_PROFILES[member2.nick]?.lines || (telecomMemberUsesCasual(member2) ? ["맞아", "좋네", "후후후..", `${userHonor2} 요즘 어때`] : ["맞아요", "좋네요", "후후후..", `${userHonor2} 요즘 어떠세요`]);
  }
  return [
    { member: member1, text: telecomPickLine(firstPool), delay: telecomRand(4500, 9000) },
    { member: member2, text: telecomPickLine(secondPool), delay: telecomRand(10000, 18000) }
  ];
}

// v140: 제타처럼 보이도록 한 번의 입력을 관계형 대화 묶음으로 확장한다.
function telecomMaybeBridge(intent) {
  const bridges = {
    doing: ["저는", "지금은", "방금까지", "아까부터"],
    music: ["그 얘기라면", "노래 얘기면", "자료실에도", "저도 그 곡은"],
    comfort: ["음..", "그럴땐", "저도 가끔", "비 오면"],
    question: ["그건", "제 생각엔", "아마", "잘은 모르지만"],
    chat: ["후후..", "글쎄요", "그러게요", "잠깐" ]
  };
  const pool = bridges[intent] || bridges.chat;
  return telecomPickLine(pool);
}
function telecomMemberActionLine(member, userHonor = "") {
  const nick = member?.nick || "";
  if (nick === "녹차향기") return telecomPickLine(["저는 게시판 정리하고 있어요", "자료실 보고 있었어요", "광석 아찌 글 기다리고 있어요", `${userHonor} 천천히 말씀하세요`]);
  if (nick === "mouse14") return telecomPickLine(["난 대화방 보고 있지", "후후후.. 그냥 있다", "자료실 갔다왔어", "사람들 뭐하나 보고 있지"]);
  if (nick === "raincoat") return telecomPickLine(["저는 게시판 보고 있었죠", "잠깐 들어왔어요", "홍홍 그냥 보고 있었어요", "노래 글 읽고 있었어요"]);
  if (nick === "enfant") return telecomPickLine(["음........ 글 읽고 있었어요", "그냥 조용히 보고 있었어요", "오늘은 좀 조용하네요...", "게시판 보고 있었어요..."]);
  if (nick === "ajeegang") return telecomPickLine(["에구에구... 자료실 보고 있었어요", "히히히 그냥 있었죠", "아 바쁘다 바빠... 그래도 보고 있었어요", "글 읽고 있었어요"]);
  if (nick === "ekjw123") return telecomPickLine(["HI~~~~~~~~~~~ 방금 들어왔어요", "저는 글 보고 있었어요", "우하하~~~~~~~~~~~~ 그냥 있었죠", "대화방 보고 있었어요"]);
  if (telecomMemberUsesCasual(member)) return telecomPickLine(["난 글 보고 있어", "그냥 대화방 보고 있지", "잠깐 들어와 있었어", "자료실 갔다왔어"]);
  return telecomPickLine(["저는 게시판 보고 있어요", "자료실 글 보고 있습니다", "잠깐 들어와 있었습니다", "노래 듣고 있었어요"]);
}
function telecomMemberLineForIntent(member, intent, userText = "", relation = "user") {
  return telecomDirectAnswerForIntent(member, intent, userText, relation === "member" ? 1 : 0);
}
function telecomMemberFollowupQuestion(member, intent) {
  const s = telecomCurrentSettings();
  const userGiven = telecomGivenName(s.name || s.nick || "손님") || "손님";
  const honor = telecomMemberAddressUser(member, userGiven);
  const topicName = telecomMemberTopicUser(member, userGiven);
  if (intent === "doing") return telecomMemberUsesCasual(member) ? `${topicName} 뭐해` : `${topicName} 뭐하고 계세요`;
  if (intent === "music") return telecomMemberUsesCasual(member) ? `${topicName} 어떤 노래 좋아해` : `${topicName} 어떤 노래 좋아하세요`;
  if (intent === "comfort") return telecomMemberUsesCasual(member) ? `${honor} 오늘 무슨일 있어` : `${honor} 오늘 무슨 일 있으셨어요`;
  if (intent === "question") return telecomMemberUsesCasual(member) ? `${honor} 그게 왜 궁금해` : `${honor} 그게 왜 궁금하세요`;
  return telecomMemberUsesCasual(member) ? `${honor} 그렇구나` : `${honor} 더 얘기해주세요`;
}
function telecomGenerateKksReplyToMember(member, intent, userText = "") {
  return telecomKksContextReply(intent, userText);
}
function telecomSelectFlowMembers(userText, count = 3) {
  const mentioned = telecomFindMentionedMember(userText);
  const list = [];
  if (mentioned) list.push(mentioned);
  const manager = DUNGEUNSORI_MEMBERS.find((m) => m.nick === "녹차향기");
  if (manager && !list.some((m) => m.nick === manager.nick) && Math.random() < 0.35) list.push(manager);
  while (list.length < count) {
    const m = telecomPickMember(list.map((x) => x.nick));
    if (!m) break;
    if (!list.some((x) => x.nick === m.nick)) list.push(m);
    else break;
  }
  return list;
}
function telecomScheduleKksResponseForUser(userText, baseDelay = telecomRand(28000, 34000)) {
  const s = telecomCurrentSettings();
  if (!telecomKksActive()) return;
  if (s.engine === "webllm") {
    telecomQueue(async () => {
      if (!telecomRoomOpen() || !telecomKksActive()) return;
      const ok = await telecomTryLocalAiKksReply(userText);
      if (!ok) {
        const replies = telecomGenerateKksReply(userText, "user");
        replies.forEach((r, i) => telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(r); }, i * 900));
      }
    }, baseDelay);
  } else {
    const replies = telecomGenerateKksReply(userText, "user");
    replies.forEach((r, i) => telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(r); }, baseDelay + i * telecomRand(1300, 2200)));
  }
}

function telecomHumanUserDisplayName() {
  const s = telecomCurrentSettings();
  return telecomGivenName(s.name || s.nick || "손님") || "손님";
}
function telecomRecentLogItems(limit = 12) {
  const log = telecomLoadJson(TELECOM_STORAGE.log, []);
  return log.slice(-limit);
}
function telecomLastUserText() {
  const s = telecomCurrentSettings();
  const log = telecomLoadJson(TELECOM_STORAGE.log, []);
  for (let i = log.length - 1; i >= 0; i--) {
    const line = log[i];
    if (line.kind === "say" && line.nick === s.nick) return String(line.text || "");
  }
  return "";
}
function telecomExtractConcreteThing(text) {
  const raw = telecomCanonicalInput(text).trim();
  if (!raw) return "그 얘기";
  if (/비|날씨/.test(raw)) return "비 얘기";
  if (/노래|음악|앨범|음반|라디오/.test(raw)) return "노래 얘기";
  if (/기타|코드|스트로크/.test(raw)) return "기타 얘기";
  if (/감자탕|소주|맥주|밥|먹/.test(raw)) return "먹는 얘기";
  if (/자료실|게시판|낙서|원음/.test(raw)) return "자료실 얘기";
  if (/외롭|허전|힘들|답답|우울/.test(raw)) return "마음 얘기";
  const cleaned = raw.replace(/[?？!！.。~]/g, "").slice(0, 16);
  return cleaned ? `${cleaned} 얘기` : "그 얘기";
}
function telecomHumanReactionVerb(intent) {
  const choices = {
    doing: ["보고 있었어요", "정리하고 있었어요", "갈무리하고 있었어요", "잠깐 눈팅중이었어요", "글 읽고 있었어요"],
    music: ["듣고 있었어요", "자료 찾고 있었어요", "곡 얘기 보고 있었어요", "라이브 생각하고 있었어요"],
    comfort: ["조금 생각하고 있었어요", "조용히 듣고 있었어요", "그 말 보고 있었어요", "잠깐 멍하니 있었어요"],
    food: ["먹을 생각하고 있었어요", "배고파졌어요", "그 얘기 보니까 나가고 싶네요"],
    question: ["저도 궁금했어요", "아까 비슷한 글 봤어요", "누가 알면 좋겠네요"],
    chat: ["그냥 대화방 보고 있었어요", "잠깐 들어와 있었어요", "글 읽고 있었어요"]
  };
  return telecomPickLine(choices[intent] || choices.chat);
}
function telecomHumanMemberLine(member, intent, userText = "", role = "answer") {
  const s = telecomCurrentSettings();
  const given = telecomHumanUserDisplayName();
  const honor = telecomMemberAddressUser(member, given);
  const topicName = telecomMemberTopicUser(member, given);
  const casual = telecomMemberUsesCasual(member);
  const nick = member?.nick || "";
  const topic = telecomExtractConcreteThing(userText);

  if (role === "askBack") {
    // "일훈아는"처럼 부르는 말+조사가 붙는 오류 방지.
    if (intent === "doing") return casual ? `${topicName} 뭐하고 있었어?` : `${topicName} 뭐하고 계셨어요?`;
    if (intent === "music") return casual ? `${topicName} 그 노래 어디서 들었어?` : `${topicName} 그 노래 어디서 들으셨어요?`;
    if (intent === "comfort") return casual ? `${topicName} 오늘 무슨 일 있었어?` : `${topicName} 오늘 무슨 일 있으셨어요?`;
    if (intent === "laugh") return casual ? "뭐가 그렇게 웃겨?" : "뭐가 그렇게 웃기셨어요?";
    return casual ? `${topicName} 어떻게 생각해?` : `${topicName} 어떻게 생각하세요?`;
  }

  if (intent === "laugh") {
    if (nick === "mouse14") return telecomPickLine(["후후후.. 왜 그렇게 웃어", "푸히히.. 나도 웃기네", "알가쓰.. 웃긴 얘기였구나"]);
    if (nick === "ekjw123") return telecomPickLine(["우하하~~~~~~~~~~~~", "ㅋㅋㅋㅋ 그러게", "HI~~~~~~~~ 웃기다"]);
    if (nick === "raincoat") return telecomPickLine(["홍홍.. 웃기네요", "반갑반갑~~~ 분위기 좋네요"]);
    return casual ? telecomPickLine(["ㅋㅋㅋ", "나도 웃기네", "그거 좀 웃겼어"]) : telecomPickLine(["하하.. 그러게요", "저도 좀 웃겼어요", "분위기 좋네요"]);
  }

  if (intent === "doing") {
    if (nick === "녹차향기") return telecomPickLine(["저는 게시판 정리하고 있었어요", "광석 아찌 글 올라왔나 보고 있었어요", `${honor} 저는 방금 자료실 확인하고 있었어요`, "방금 들어온 분들 확인하고 있었어요"]);
    if (nick === "mouse14") return telecomPickLine(["후후후.. 난 대화방 보고 있었지", "난 그냥 구경중", "갈무리할 거 있나 보고 있었어", "알가쓰.. 나는 눈팅중"]);
    if (nick === "enfant") return telecomPickLine(["음........ 저는 글 읽고 있었어요", "그냥 조용히 보고 있었어요...", "낙서장 읽고 있었어요..."]);
    if (nick === "raincoat") return telecomPickLine(["반갑반갑~~~ 저는 게시판 보고 있었죠", "홍홍.. 잠깐 들어왔어요", "저는 노래 얘기 보고 있었어요"]);
    return casual ? telecomPickLine(["난 글 보고 있어", "그냥 방 보고 있었어", "자료실 갔다왔어", "잠깐 들어와 있었지"]) : telecomPickLine(["저는 게시판 보고 있어요", "자료실 글 보고 있습니다", "잠깐 들어와 있었습니다", "노래 듣고 있었어요"]);
  }

  if (intent === "music") {
    if (nick === "녹차향기") return telecomPickLine(["자료실에 그 노래 얘기 있었어요", "광석 아찌 오시면 그 얘기 좋아하실 것 같아요", "노래 얘기는 늘 사람이 모이네요"]);
    if (nick === "mouse14") return telecomPickLine(["후후후.. 그 노래면 다들 말 많아지지", "난 라이브가 더 좋더라", "알가쓰.. 그 얘기 좋네"]);
    return casual ? telecomPickLine([`${topic} 좋지`, "나도 그거 좋아해", "그건 광석이형한테 물어봐야지", "라이브 얘기면 더 좋고"]) : telecomPickLine([`${topic} 좋네요`, "저도 그 곡 좋아해요", "광석님 오시면 여쭤보죠", "라이브 이야기도 궁금해요"]);
  }

  if (intent === "comfort") {
    if (nick === "녹차향기") return telecomPickLine([`${honor} 너무 오래 혼자 생각하지 마세요`, "비 오면 괜히 그럴 때 있죠", "광석 아찌 오시면 한마디 해주실거예요"]);
    if (nick === "mouse14") return telecomPickLine(["후후후.. 그래도 여기 왔잖아", "그럴 땐 좀 쉬어", "괜히 혼자 그러지마"]);
    return casual ? telecomPickLine(["그랬구나...", "좀 쉬어", "노래 하나 들어", "그런 날 있지"]) : telecomPickLine(["그러셨군요...", "조금 쉬셔도 돼요", "그럴 때 있지요", "좋은 노래 한 곡 들으세요"]);
  }

  if (intent === "food") return casual ? telecomPickLine(["감자탕 좋지", "소주 얘기하니까 배고프네", "난 맥주 생각난다"]) : telecomPickLine(["감자탕 좋지요", "먹는 얘기는 늘 좋네요", "맥주 한 캔 생각나네요"]);
  if (intent === "greeting") return casual ? telecomPickLine([`${honor} 어서와`, "하이!!!!", "어소세요..", "반가워"]) : telecomPickLine([`${honor} 어서오세요~`, "반갑습니다", "좋은 밤 되세요", "어서오세요"]);
  if (intent === "question") return casual ? telecomPickLine(["그건 나도 궁금하네", "광석이형 오면 물어보자", "누가 알면 말해줘"]) : telecomPickLine(["그건 저도 궁금해요", "아시는 분 계세요?", "광석님 오시면 여쭤보죠"]);

  if (role === "follow") {
    const prev = telecomRecentLogItems(6).filter(x => x.kind === "say").slice(-1)[0];
    const prevMember = prev ? telecomFindMemberByNick(prev.nick) : null;
    return telecomContextFollowLine(member, intent, userText, prevMember);
  }
  return casual ? telecomPickLine([`응, ${topic} 얘기였구나`, `${topic}라... 나도 보고 있었어`, "아하... 그러니까 그 얘기구나"]) : telecomPickLine([`네, ${topic} 말씀이군요`, `${topic}라면 저도 보고 있었어요`, "아하... 그러니까 그 말씀이군요"]);
}
function telecomHumanKksReply(intent, userText = "", target = "user") {
  const s = telecomCurrentSettings();
  const given = telecomHumanUserDisplayName();
  let prefix = "";
  if (target === "user") {
    if (s.close === "best" || s.close === "veryClose") prefix = `${telecomNameWithAh(given)} `;
    else if (s.close === "close") prefix = `${given}님 `;
  }
  if (intent === "doing") return telecomPickLine(["지금 잠깐 게시판 보고 있어요", "자판 보고 치고 있어요", "자료실 글 좀 보고 있어요", "방금 들어왔어요", "낮에는 좀 바빴어요"]);
  if (intent === "music") return telecomPickLine(["그 노래 좋아요", "라이브로 하면 좀 달라요", "기타로 하면 괜찮아요", "노래는 천천히 해야죠", "자료실에 있나요?"]);
  if (intent === "comfort") return telecomPickLine([`${prefix}그래요`, "그런날 있죠", "괜히 센치해 있지말기", "씩씩하게 살기...", "좀 쉬어요"]);
  if (intent === "food") return telecomPickLine(["감자탕 좋죠", "맥주한캔 생각나네요", "하 좋~~~타", "먹는 얘기 좋네요"]);
  if (intent === "celebrate") return telecomPickLine(["축하합니다", "좋은날이네요", "사랑과 행복이 가득한 나날을", "빌어드릴께요"]);
  if (intent === "question") return telecomPickLine(["그건 좀 어렵네요", "잘은 모르겠어요", "천천히 얘기해봐요", "무슨일 있어요"]);
  return telecomPickLine([`${prefix}네`, "그래요", "응...", "참 좋네요...", "훗..."]);
}
function telecomHumanContinueFromLast(userText) {
  const thread = telecomGetThread();
  const topic = thread?.topic || telecomExtractConcreteThing(userText);
  const last = telecomRecentLogItems(8).filter(x => x.kind === "say").slice(-1)[0];
  if (!last) return null;
  if (/더|계속|왜|그래서|어떻게|그러면|그럼|맞아|네|응/.test(String(userText || ""))) {
    return { topic, lastNick: last.nick, lastText: last.text };
  }
  return null;
}
function telecomScheduleHumanConversationFlow(userText) {
  const fixedText = telecomCanonicalInput(userText);
  const intent = telecomIntent(fixedText);
  const allTargeted = /다들|여러분|님들|회원|팬들|방에|방/.test(fixedText);
  const mentionedMember = telecomFindMentionedMember(fixedText);
  const kksTargeted = telecomKksMentioned(fixedText);
  const continuation = telecomHumanContinueFromLast(fixedText);
  telecomSetThread(intent, fixedText);
  telecomRememberTopic(intent);

  // v149: 한 입력에 여러 명이 제각각 떠드는 것을 막고, "답변 → 맞장구"의 짧은 묶음으로 제한한다.
  // 직접 지목된 회원은 조용히 끌어오지 않고, 접속 메시지를 먼저 남긴 뒤 답하게 한다.
  if (mentionedMember) telecomMemberJoin(mentionedMember, false);

  if (continuation) {
    const m1 = mentionedMember || telecomFindMemberByNick(continuation.lastNick) || telecomPickMember();
    const m2 = telecomPickMember([m1?.nick]);
    if (m1) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m1, telecomHumanMemberLine(m1, intent === "chat" ? "question" : intent, fixedText, "follow")); }, telecomRand(2600, 5200));
    if (m2 && Math.random() < 0.45) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m2, telecomContextFollowLine(m2, intent, fixedText, m1)); }, telecomRand(9000, 14500));
    return;
  }

  if (mentionedMember && !kksTargeted && !allTargeted) {
    const replier = telecomPickMember([mentionedMember.nick]);
    telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(mentionedMember, telecomHumanMemberLine(mentionedMember, intent, fixedText, "answer")); }, telecomRand(2200, 4800));
    if (replier && Math.random() < 0.55) {
      telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(replier, telecomContextFollowLine(replier, intent, fixedText, mentionedMember)); }, telecomRand(9000, 14500));
    }
    return;
  }

  if (kksTargeted && !allTargeted) {
    // 김광석을 부른 말이면 팬들이 엉뚱한 대답을 늘어놓지 않는다.
    if (telecomKksActive()) {
      telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(telecomHumanKksReply(intent, fixedText, "user")); }, telecomRand(2600, 5600));
    } else {
      const helper = telecomFindMemberByNick("녹차향기") || telecomPickMember();
      if (helper) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(helper, "광석 아찌 지금은 안 계신 것 같아요. 글 남겨두면 보실거예요"); }, telecomRand(3000, 6200));
    }
    return;
  }

  // v152: 사용자가 인사하거나 인사를 받아주면, 분석형 대화나 딴소리 없이 인사만 짧게 받는다.
  if (intent === "greeting") {
    const greeter = telecomFindMemberByNick("녹차향기") || telecomPickMember();
    const second = allTargeted ? telecomPickMember([greeter?.nick]) : null;
    if (greeter) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(greeter, telecomGreetingAnswerLine(greeter, fixedText)); }, telecomRand(1200, 2600));
    if (second && Math.random() < 0.35) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(second, telecomGreetingAnswerLine(second, fixedText)); }, telecomRand(4200, 6800));
    if (telecomKksActive() && Math.random() < 0.45) telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(telecomKksGreetingAnswerLine(fixedText)); }, telecomRand(5200, 8600));
    return;
  }

  const members = telecomSelectFlowMembers(fixedText, allTargeted ? 3 : 2);
  const m1 = members[0] || telecomPickMember();
  if (!m1) return;
  const m2 = members[1] || telecomPickMember([m1.nick]);
  const m3 = members[2] || telecomPickMember([m1.nick, m2?.nick]);

  telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m1, telecomHumanMemberLine(m1, intent, fixedText, "answer")); }, telecomRand(2400, 5600));

  if (m2 && Math.random() < 0.62) {
    telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m2, telecomContextFollowLine(m2, intent, fixedText, m1)); }, telecomRand(8500, 14000));
  }

  // 전체에게 물은 경우에만 세 번째 사람이 아주 짧게 붙는다. 질문을 남발하지 않는다.
  if (allTargeted && m3 && Math.random() < 0.28) {
    telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m3, telecomContextFollowLine(m3, intent, fixedText, m2 || m1)); }, telecomRand(15500, 22000));
  }

  // 김광석은 직접 부르거나 음악/마음 이야기일 때만 짧게 끼어든다.
  if (telecomKksActive() && (kksTargeted || intent === "music" || intent === "comfort") && Math.random() < 0.42) {
    telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(telecomHumanKksReply(intent, fixedText, "user")); }, telecomRand(19000, 28000));
  }
}


// v153: 대화 흐름 엔진 보강.
// 단순 맞장구가 아니라 감정/갈등/농담/공감/위로/핀잔을 구분해서 이어 말한다.
function telecomEmotionIntent(message) {
  const msg = telecomCompactInput(message);
  if (/씨발|시발|ㅅㅂ|좆|존나|졸라|빡치|꺼져|미친|병신|바보|짜증|열받|화나|화남|싫어|재수없/.test(msg)) return "anger";
  if (/싸우|시비|다툼|화났|기분나쁘|기분나쁜|왜그래|말그렇게|그건아니|아니잖|틀렸|헛소리/.test(msg)) return "conflict";
  if (/농담|장난|웃기|웃겨|ㅋㅋ|ㅎㅎ|푸하|하하|키득|개그/.test(msg)) return "joke";
  if (/고마|감사|위로|힘이되|괜찮|괜찬|미안|죄송/.test(msg)) return "warm";
  if (/힘들|외롭|우울|허전|슬프|답답|피곤|죽겠|센치|쓸쓸|속상|눈물|그립/.test(msg)) return "comfort";
  if (/맞아|그렇지|인정|동감|나도|그래그래/.test(msg)) return "agree";
  return "";
}
function telecomIntent(message) {
  const msg = telecomCompactInput(message);
  const emo = telecomEmotionIntent(message);
  if (/^(y|Y|n|N)$/.test(String(message || "").trim())) return "yn";
  if (emo) return emo;
  if (/뭐하|뭐해|뭐하는|뭐하세요|머하|모하|다들뭐|어디서|지금뭐/.test(msg)) return "doing";
  if (/안녕|하이|어서|반가|왔어요|왔어|접속/.test(msg)) return "greeting";
  if (/비|우울|허전|외롭|힘들|슬프|센치|쓸쓸|답답|피곤/.test(msg)) return "comfort";
  if (/노래|기타|공연|음악|앨범|라디오|음반|자료실/.test(msg)) return "music";
  if (/밥|술|맥주|소주|감자탕|먹|마시/.test(msg)) return "food";
  if (/생일|축하|기념|추카/.test(msg)) return "celebrate";
  if (/왜|어떻게|무슨|궁금|알려|질문|\?/.test(msg)) return "question";
  return "chat";
}
function telecomDialogueRole(intent, userText = "") {
  if (["anger", "conflict"].includes(intent)) return "deescalate";
  if (intent === "comfort") return "comfort";
  if (intent === "joke") return "joke";
  if (intent === "warm" || intent === "agree") return "accept";
  if (intent === "question" || intent === "doing") return "answer";
  return "react";
}
function telecomExtractConcreteThing(text) {
  const raw = telecomCanonicalInput(text).trim();
  const compact = raw.replace(/\s+/g, "");
  if (!raw) return "그 얘기";
  if (/씨발|시발|ㅅㅂ|좆|존나|빡치|짜증|화나|열받/.test(compact)) return "화난 얘기";
  if (/싸우|시비|다툼|말그렇게|기분나쁘|그건아니/.test(compact)) return "싸움 얘기";
  if (/농담|장난|웃기|웃겨|ㅋㅋ|ㅎㅎ|하하/.test(compact)) return "농담 얘기";
  if (/고마|감사|미안|죄송|위로/.test(compact)) return "고마운 얘기";
  if (/비|날씨/.test(raw)) return "비 얘기";
  if (/노래|음악|앨범|음반|라디오/.test(raw)) return "노래 얘기";
  if (/기타|코드|스트로크/.test(raw)) return "기타 얘기";
  if (/감자탕|소주|맥주|밥|먹/.test(raw)) return "먹는 얘기";
  if (/자료실|게시판|낙서|원음/.test(raw)) return "자료실 얘기";
  if (/외롭|허전|힘들|답답|우울|속상|그립/.test(raw)) return "마음 얘기";
  const cleaned = raw.replace(/[?？!！.。~]/g, "").slice(0, 14);
  return cleaned ? `${cleaned} 얘기` : "그 얘기";
}
function telecomContextFollowLine(member, intent, userText = "", previousMember = null) {
  const casual = telecomMemberUsesCasual(member);
  const prevName = previousMember ? (telecomGivenName(previousMember.name) || previousMember.nick) : "";
  const prevCall = prevName ? (casual ? telecomNameWithAh(prevName) : `${prevName}님`) : "";
  if (intent === "greeting") return casual ? telecomPickLine(["반가워", "그래, 어서와", "하이!!!!", "나도 반가워"]) : telecomPickLine(["반갑습니다", "어서오세요", "네, 반갑습니다", "좋은 밤 되세요"]);
  if (intent === "anger") return casual ? telecomPickLine(["야야, 말은 좀 살살해", "뭔 일인데 그렇게 빡쳤어", "아 씨... 그래도 진정 좀 해", "그건 좀 열받을만 하네"]) : telecomPickLine(["말은 조금만 낮춰요", "화나신 건 알겠어요", "일단 숨 좀 돌리시죠", "그건 기분 나쁠 만하네요"]);
  if (intent === "conflict") return casual ? telecomPickLine([`${prevCall} 말도 알겠는데, 너무 몰아가진 말자`, "잠깐만, 싸우지 말고 얘기해", "그건 좀 아니라고 볼 수도 있지", "둘 다 말이 좀 세다"]) : telecomPickLine([`${prevCall} 말씀도 알겠지만 조금만 천천히요`, "싸우자는 얘기는 아닌 것 같아요", "그 부분은 서로 다르게 볼 수 있죠", "말이 세지면 얘기가 안 됩니다"]);
  if (intent === "comfort") return casual ? telecomPickLine(["그 말은 좀 마음 쓰인다", "혼자 그러고 있지마", "오늘은 좀 쉬어", "여기서라도 털어놔"]) : telecomPickLine(["말씀 들으니까 마음이 쓰이네요", "혼자 오래 안고 있지 마세요", "오늘은 조금 쉬셔도 됩니다", "천천히 말씀하세요"]);
  if (intent === "joke") return casual ? telecomPickLine(["ㅋㅋㅋ 그건 좀 웃겼다", "아 그건 반칙이지", "푸히히.. 그런 말은 어디서 배웠어", "분위기 살아나네"]) : telecomPickLine(["하하.. 그건 좀 웃겼어요", "분위기가 좀 풀리네요", "농담이 세네요", "그 말은 예상 못 했어요"]);
  if (intent === "warm" || intent === "agree") return casual ? telecomPickLine(["그래, 그 말은 좋다", "나도 그렇게 생각해", "괜찮네", "맞아, 그게 낫지"]) : telecomPickLine(["네, 그 말 좋네요", "저도 그렇게 생각해요", "그렇게 정리하면 좋겠습니다", "맞습니다"]);
  if (intent === "doing") return previousMember ? (casual ? `${prevName}이도 보고 있었구나. 난 ${telecomHumanReactionVerb(intent).replace(/어요$/, "어")}` : `${prevName}님도 보고 계셨군요. 저도 ${telecomHumanReactionVerb(intent)}`) : (casual ? `나도 ${telecomHumanReactionVerb(intent).replace(/어요$/, "어")}` : `저도 ${telecomHumanReactionVerb(intent)}`);
  if (intent === "music") return casual ? telecomPickLine(["그 노래 얘기는 길어지겠네", "라이브 얘기로 가면 또 밤 새지", "그건 나도 듣고 싶다"]) : telecomPickLine(["그 노래 이야기는 길어지겠네요", "라이브 쪽 이야기도 궁금하네요", "저도 듣고 싶습니다"]);
  if (intent === "food") return casual ? "그 얘기 들으니까 배고프다" : "그 얘기 들으니까 배고파지네요";
  if (intent === "question") return casual ? "그건 바로 답하기 어렵긴 해" : "그건 바로 답하기는 조금 어렵네요";
  return casual ? telecomPickLine(["응, 그 흐름은 알겠어", "그러니까 그런 말이지", "나도 듣고 있었어", "그 얘기 계속 해봐"]) : telecomPickLine(["네, 말씀 흐름은 알겠어요", "그러니까 그런 뜻이군요", "저도 듣고 있었습니다", "그 얘기 계속해도 좋겠습니다"]);
}
function telecomHumanReactionVerb(intent) {
  const choices = {
    doing: ["보고 있었어요", "정리하고 있었어요", "갈무리하고 있었어요", "잠깐 눈팅중이었어요", "글 읽고 있었어요"],
    music: ["듣고 있었어요", "자료 찾고 있었어요", "곡 얘기 보고 있었어요", "라이브 생각하고 있었어요"],
    comfort: ["조용히 듣고 있었어요", "괜히 같이 마음이 쓰였어요", "그 말 보고 있었어요"],
    anger: ["왜 화났는지 보고 있었어요", "분위기 살피고 있었어요"],
    conflict: ["두 분 얘기 듣고 있었어요", "분위기 보고 있었어요"],
    joke: ["웃고 있었어요", "그 말 보고 피식했어요"],
    food: ["먹을 생각하고 있었어요", "배고파졌어요"],
    question: ["저도 궁금했어요", "아까 비슷한 글 봤어요"],
    chat: ["그냥 대화방 보고 있었어요", "잠깐 들어와 있었어요", "글 읽고 있었어요"]
  };
  return telecomPickLine(choices[intent] || choices.chat);
}
function telecomHumanMemberLine(member, intent, userText = "", role = "answer") {
  const given = telecomHumanUserDisplayName();
  const honor = telecomMemberAddressUser(member, given);
  const topicName = telecomMemberTopicUser(member, given);
  const casual = telecomMemberUsesCasual(member);
  const nick = member?.nick || "";
  const topic = telecomExtractConcreteThing(userText);

  if (role === "challenge") {
    return casual ? telecomPickLine(["야, 그건 좀 아니지", "잠깐만. 그렇게 말하면 기분 나쁘지", "말이 너무 세다", "그건 내가 보기엔 좀 틀렸어"]) : telecomPickLine(["그건 조금 아닌 것 같습니다", "그렇게 말씀하시면 오해가 생겨요", "말을 조금만 낮추면 좋겠습니다", "그 부분은 다르게 봅니다"]);
  }
  if (role === "soothe") {
    return casual ? telecomPickLine(["야야, 진정해", "그만 싸워. 얘기하자", "화난 건 알겠는데 말은 좀 살살해", "일단 물 한잔 마셔"]) : telecomPickLine(["잠깐만 진정해요", "싸우자는 분위기로 가지는 말죠", "화나신 건 알겠지만 조금만 천천히요", "일단 숨 좀 돌리시죠"]);
  }
  if (role === "askBack") {
    if (intent === "doing") return casual ? `${topicName} 뭐하고 있었어?` : `${topicName} 뭐하고 계셨어요?`;
    if (intent === "comfort") return casual ? `${topicName} 오늘 무슨 일 있었어?` : `${topicName} 오늘 무슨 일 있으셨어요?`;
    if (intent === "joke") return casual ? "뭐가 그렇게 웃겨?" : "뭐가 그렇게 웃기셨어요?";
    return casual ? `${topicName} 어떻게 생각해?` : `${topicName} 어떻게 생각하세요?`;
  }
  if (intent === "anger") {
    if (nick === "mouse14") return telecomPickLine(["후후후.. 많이 빡쳤네", "아 씨.. 그건 짜증날만 하다", "근데 욕은 좀 아껴라"]);
    if (nick === "녹차향기") return telecomPickLine([`${honor} 화나신 건 알겠는데, 말은 조금만 낮춰요`, "잠깐 진정하고 얘기해요", "그렇게까지 말하면 서로 힘들어요"]);
    return casual ? telecomPickLine(["뭐야, 누가 건드렸어", "그건 좀 열받겠네", "아... 짜증났겠다", "그래도 욕은 좀 줄이자"]) : telecomPickLine(["기분 나쁘셨겠네요", "그건 화날 만합니다", "그래도 말은 조금만 낮춰요", "일단 얘기부터 들어볼게요"]);
  }
  if (intent === "conflict") {
    if (nick === "녹차향기") return telecomPickLine(["두 분 다 잠깐만요. 얘기부터 정리해요", "싸우지 말고 하나씩 말해요", "서로 말이 조금 세졌어요"]);
    if (nick === "mouse14") return telecomPickLine(["야야 또 싸우냐", "잠깐만. 누가 먼저 그랬는데", "후후.. 이거 분위기 이상하다"]);
    return casual ? telecomPickLine(["나도 그건 좀 아니라고 봐", "말이 좀 세다", "싸우지 말고 얘기해", "그건 서로 오해한 거 아냐?"]) : telecomPickLine(["그건 서로 오해가 있는 것 같습니다", "말이 조금 세졌네요", "하나씩 얘기하면 될 것 같아요", "저는 조금 다르게 봅니다"]);
  }
  if (intent === "joke") {
    if (nick === "ekjw123") return telecomPickLine(["우하하~~~~~~~~~~~~", "ㅋㅋㅋㅋ 그거 웃기다", "HI~~~~~ 분위기 좋다"]);
    if (nick === "raincoat") return telecomPickLine(["홍홍.. 웃기네요", "반갑반갑~~~ 그런 농담 좋아요"]);
    return casual ? telecomPickLine(["ㅋㅋㅋ", "그건 좀 웃겼다", "아 그건 반칙이지", "푸히히.. 분위기 좋네"]) : telecomPickLine(["하하.. 그러게요", "그건 좀 웃겼어요", "분위기가 조금 풀리네요"]);
  }
  if (intent === "comfort") {
    if (nick === "녹차향기") return telecomPickLine([`${honor} 너무 오래 혼자 생각하지 마세요`, "비 오면 괜히 그럴 때 있죠", "천천히 말씀하세요. 듣고 있어요"]);
    if (nick === "mouse14") return telecomPickLine(["후후후.. 그래도 여기 왔잖아", "그럴 땐 좀 쉬어", "괜히 혼자 그러지마"]);
    return casual ? telecomPickLine(["그랬구나...", "좀 쉬어", "노래 하나 들어", "그런 날 있지", "여기서라도 말해"]) : telecomPickLine(["그러셨군요...", "조금 쉬셔도 돼요", "그럴 때 있지요", "좋은 노래 한 곡 들으세요", "말씀해도 괜찮아요"]);
  }
  if (intent === "warm" || intent === "agree") return casual ? telecomPickLine(["그래, 그 말 좋다", "나도 그렇게 생각해", "괜찮네", "맞아"]): telecomPickLine(["네, 그 말 좋네요", "저도 그렇게 생각합니다", "맞습니다", "좋게 정리됐네요"]);
  if (intent === "doing") {
    if (nick === "녹차향기") return telecomPickLine(["저는 게시판 정리하고 있었어요", "광석 아찌 글 올라왔나 보고 있었어요", `${honor} 저는 방금 자료실 확인하고 있었어요`]);
    if (nick === "mouse14") return telecomPickLine(["후후후.. 난 대화방 보고 있었지", "난 그냥 구경중", "갈무리할 거 있나 보고 있었어"]);
    if (nick === "enfant") return telecomPickLine(["음........ 저는 글 읽고 있었어요", "그냥 조용히 보고 있었어요...", "낙서장 읽고 있었어요..."]);
    return casual ? telecomPickLine(["난 글 보고 있어", "그냥 방 보고 있었어", "자료실 갔다왔어", "잠깐 들어와 있었지"]) : telecomPickLine(["저는 게시판 보고 있어요", "자료실 글 보고 있습니다", "잠깐 들어와 있었습니다", "노래 듣고 있었어요"]);
  }
  if (intent === "music") {
    if (nick === "녹차향기") return telecomPickLine(["자료실에 그 노래 얘기 있었어요", "노래 얘기는 늘 사람이 모이네요", "그 곡은 라이브 얘기도 같이 봐야 해요"]);
    if (nick === "mouse14") return telecomPickLine(["후후후.. 그 노래면 다들 말 많아지지", "난 라이브가 더 좋더라", "알가쓰.. 그 얘기 좋네"]);
    return casual ? telecomPickLine([`${topic} 좋지`, "나도 그거 좋아해", "라이브 얘기면 더 좋고"]) : telecomPickLine([`${topic} 좋네요`, "저도 그 곡 좋아해요", "라이브 이야기도 궁금해요"]);
  }
  if (intent === "food") return casual ? telecomPickLine(["감자탕 좋지", "소주 얘기하니까 배고프네", "난 맥주 생각난다"]) : telecomPickLine(["감자탕 좋지요", "먹는 얘기는 늘 좋네요", "맥주 한 캔 생각나네요"]);
  if (intent === "greeting") return casual ? telecomPickLine([`${honor} 어서와`, "하이!!!!", "어소세요..", "반가워"]) : telecomPickLine([`${honor} 어서오세요~`, "반갑습니다", "좋은 밤 되세요", "어서오세요"]);
  if (intent === "question") return casual ? telecomPickLine(["그건 나도 궁금하네", "누가 알면 말해줘", "일단 앞뒤를 봐야지"]) : telecomPickLine(["그건 저도 궁금해요", "아시는 분 계세요?", "앞뒤를 봐야 할 것 같습니다"]);
  if (role === "follow") return telecomContextFollowLine(member, intent, userText, telecomPickMember([member?.nick]));
  return casual ? telecomPickLine(["응, 무슨 말인진 알겠어", "그러니까 그런 말이지", "나도 듣고 있었어", "그 얘기 계속 해봐"]) : telecomPickLine(["네, 말씀 흐름은 알겠어요", "그러니까 그런 뜻이군요", "저도 듣고 있었습니다", "그 얘기 계속해도 좋겠습니다"]);
}
function telecomHumanKksReply(intent, userText = "", target = "user") {
  const s = telecomCurrentSettings();
  const given = telecomHumanUserDisplayName();
  let prefix = "";
  if (target === "user") {
    if (s.close === "best" || s.close === "veryClose") prefix = `${telecomNameWithAh(given)} `;
    else if (s.close === "close") prefix = `${given}님 `;
  }
  if (intent === "anger") return telecomPickLine([`${prefix}욕은 조금 아끼고`, "화난 건 알겠어요", "그럴수록 천천히 말해요", "아 씨... 그런 날 있죠"]);
  if (intent === "conflict") return telecomPickLine(["잠깐만요", "싸우지 말고 하나씩 얘기해요", "말이 세지면 노래도 안 들려요", "그건 서로 오해일 수도 있어요"]);
  if (intent === "joke") return telecomPickLine(["훗...", "그건 좀 웃기네요", "농담이 좀 센데요", "재밌네요"]);
  if (intent === "doing") return telecomPickLine(["지금 잠깐 게시판 보고 있어요", "자판 보고 치고 있어요", "자료실 글 좀 보고 있어요", "방금 들어왔어요"]);
  if (intent === "music") return telecomPickLine(["그 노래 좋아요", "라이브로 하면 좀 달라요", "기타로 하면 괜찮아요", "노래는 천천히 해야죠"]);
  if (intent === "comfort") return telecomPickLine([`${prefix}그래요`, "그런날 있죠", "괜히 센치해 있지말기", "씩씩하게 살기...", "좀 쉬어요"]);
  if (intent === "food") return telecomPickLine(["감자탕 좋죠", "맥주한캔 생각나네요", "하 좋~~~타", "먹는 얘기 좋네요"]);
  if (intent === "celebrate") return telecomPickLine(["축하합니다", "좋은날이네요", "사랑과 행복이 가득한 나날을", "빌어드릴께요"]);
  if (intent === "question") return telecomPickLine(["그건 좀 어렵네요", "잘은 모르겠어요", "천천히 얘기해봐요", "무슨일 있어요"]);
  return telecomPickLine([`${prefix}네`, "그래요", "응...", "참 좋네요...", "훗..."]);
}
function telecomHumanContinueFromLast(userText) {
  const thread = telecomGetThread();
  const topic = thread?.topic || telecomExtractConcreteThing(userText);
  const last = telecomRecentLogItems(10).filter(x => x.kind === "say").slice(-1)[0];
  if (!last) return null;
  const t = telecomCanonicalInput(userText);
  if (/더|계속|왜|그래서|어떻게|그러면|그럼|맞아|네|응|아니|그건|근데|그리고|그래도|진짜|헐|뭐야|그러니까|내말이/.test(t)) {
    return { topic, lastNick: last.nick, lastText: last.text };
  }
  return null;
}
function telecomPickLeadForIntent(intent, fixedText, mentionedMember, kksTargeted) {
  if (mentionedMember) return mentionedMember;
  if (["anger", "conflict"].includes(intent)) return telecomFindMemberByNick("녹차향기") || telecomPickMember();
  if (intent === "joke") return telecomFindMemberByNick("mouse14") || telecomFindMemberByNick("raincoat") || telecomPickMember();
  if (intent === "comfort") return telecomFindMemberByNick("enfant") || telecomFindMemberByNick("녹차향기") || telecomPickMember();
  if (intent === "music") return telecomFindMemberByNick("soriboy") || telecomFindMemberByNick("낙원") || telecomPickMember();
  return telecomPickMember();
}
function telecomScheduleHumanConversationFlow(userText) {
  const fixedText = telecomCanonicalInput(userText);
  const intent = telecomIntent(fixedText);
  const allTargeted = /다들|여러분|님들|회원|팬들|방에|방/.test(fixedText);
  const mentionedMember = telecomFindMentionedMember(fixedText);
  const kksTargeted = telecomKksMentioned(fixedText);
  const continuation = telecomHumanContinueFromLast(fixedText);
  telecomSetThread(intent, fixedText);
  telecomRememberTopic(intent);

  if (mentionedMember) telecomMemberJoin(mentionedMember, false);

  if (telecomIsUserExitIntent(fixedText)) return;

  if (kksTargeted && !allTargeted) {
    if (telecomKksActive()) telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(telecomHumanKksReply(intent, fixedText, "user")); }, telecomRand(1800, 4200));
    else {
      const helper = telecomFindMemberByNick("녹차향기") || telecomPickMember();
      if (helper) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(helper, "광석 아찌 지금은 안 계신 것 같아요. 글 남겨두면 보실거예요"); }, telecomRand(1800, 4200));
    }
    return;
  }

  if (intent === "greeting") {
    const greeter = telecomFindMemberByNick("녹차향기") || telecomPickMember();
    const second = allTargeted ? telecomPickMember([greeter?.nick]) : null;
    if (greeter) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(greeter, telecomGreetingAnswerLine(greeter, fixedText)); }, telecomRand(900, 2100));
    if (second && Math.random() < 0.28) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(second, telecomGreetingAnswerLine(second, fixedText)); }, telecomRand(3200, 5600));
    if (telecomKksActive() && Math.random() < 0.35) telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(telecomKksGreetingAnswerLine(fixedText)); }, telecomRand(4300, 7200));
    return;
  }

  // 1차: 질문/감정에 직접 반응하는 사람 1명
  const m1 = telecomPickLeadForIntent(intent, fixedText, mentionedMember, kksTargeted);
  if (!m1) return;
  const role1 = ["anger", "conflict"].includes(intent) ? "soothe" : "answer";
  telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m1, telecomHumanMemberLine(m1, intent, fixedText, role1)); }, telecomRand(1600, 3800));

  // 2차: 그냥 딴소리하지 않고, 앞사람 말에 동의/반박/농담으로 이어붙임
  const m2 = telecomPickMember([m1.nick]);
  const shouldSecond = allTargeted || ["anger", "conflict", "comfort", "joke"].includes(intent) || Math.random() < 0.55;
  if (m2 && shouldSecond) {
    const role2 = ["anger", "conflict"].includes(intent) && Math.random() < 0.45 ? "challenge" : "follow";
    telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m2, role2 === "challenge" ? telecomHumanMemberLine(m2, intent, fixedText, "challenge") : telecomContextFollowLine(m2, intent, fixedText, m1)); }, telecomRand(5200, 9500));
  }

  // 3차: 갈등/위로/농담처럼 살아있는 대화에서만 짧게 한 명 더 붙임
  const m3 = allTargeted || ["anger", "conflict", "comfort", "joke"].includes(intent) ? telecomPickMember([m1.nick, m2?.nick]) : null;
  if (m3 && Math.random() < 0.38) {
    const role3 = ["anger", "conflict"].includes(intent) ? "soothe" : "follow";
    telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m3, role3 === "soothe" ? telecomHumanMemberLine(m3, intent, fixedText, "soothe") : telecomContextFollowLine(m3, intent, fixedText, m2 || m1)); }, telecomRand(10500, 16000));
  }

  // 김광석은 직접 호출/음악/마음/갈등 정리 때만 짧게 끼어든다.
  if (telecomKksActive() && (kksTargeted || intent === "music" || intent === "comfort" || intent === "conflict") && Math.random() < 0.42) {
    telecomQueue(() => { if (telecomRoomOpen() && telecomKksActive()) telecomKks(telecomHumanKksReply(intent, fixedText, "user")); }, telecomRand(14500, 23000));
  }
}

function telecomScheduleConversationFlow(userText) {
  telecomScheduleHumanConversationFlow(userText);
}
function telecomMemberPresenceEvent() {
  const active = telecomActiveMemberNicks();
  const canLeave = active.length > 5;
  const joined = !canLeave || Math.random() < 0.58;
  if (joined) {
    let pool = DUNGEUNSORI_MEMBERS.filter((m) => m.nick !== "김광석" && !active.includes(m.nick));
    if (!pool.length) return null;
    const m = pool[telecomRand(0, pool.length - 1)];
    telecomMemberJoin(m, false);
    return m;
  }
  const leaveNick = active.filter((nick) => !["녹차향기"].includes(nick))[telecomRand(0, active.length - 2)];
  const m = telecomFindMemberByNick(leaveNick);
  if (m && telecomMemberLeave(m)) return null;
  return null;
}
function telecomMemberCallKks(member) {
  const calls = TELECOM_MEMBER_PROFILES[member.nick]?.kksCall || ["광석님"];
  return calls[telecomRand(0, calls.length - 1)];
}
function telecomPostAmbientConversation() {
  if (!telecomRoomOpen()) return;
  // v149: 사용자가 말한 직후에는 배경 잡담을 하지 않는다. 대화 흐름이 끊기지 않게 한다.
  const log = telecomLoadJson(TELECOM_STORAGE.log, []);
  const lastUser = log.slice().reverse().find((x) => x.kind === "say" && x.nick === telecomCurrentSettings().nick);
  if (lastUser && telecomNow() - (lastUser.time || 0) < 38000) return;

  let speaker = null;
  if (Math.random() < 0.14) speaker = telecomMemberPresenceEvent();
  const thread = telecomGetThread();
  const scenarios = thread ? [
    { intent: thread.intent || "chat", seed: thread.userText || thread.topic || "그 얘기" }
  ] : [
    { intent:"music", seed:"자료실에 새 노래 얘기 올라왔나요?" },
    { intent:"doing", seed:"다들 지금 뭐하세요?" },
    { intent:"chat", seed:"오늘 방이 좀 조용하네요.." }
  ];
  const sc = scenarios[telecomRand(0, scenarios.length - 1)];
  const m1 = speaker || telecomPickMember();
  if (!m1) return;
  const m2 = telecomPickMember([m1.nick]);
  telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m1, telecomHumanMemberLine(m1, sc.intent, sc.seed, "answer")); }, telecomRand(1200, 3000));
  if (m2 && Math.random() < 0.45) {
    telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m2, telecomContextFollowLine(m2, sc.intent, sc.seed, m1)); }, telecomRand(7800, 13000));
  }
}
function telecomStartMemberNoise(initialDelay = telecomRand(26000, 42000)) {
  clearTimeout(telecomMemberTimer);
  telecomMemberTimer = telecomQueue(function tick() {
    if (document.getElementById("telecom")?.classList.contains("active") && telecomRoomOpen()) {
      telecomPostAmbientConversation();
    }
    telecomMemberTimer = telecomQueue(tick, telecomRand(52000, 90000));
  }, initialDelay);
}
function telecomSendUserMessage(text) {
  const raw = String(text || "").trim();
  const s = telecomCurrentSettings();
  const away = telecomAwayUntil();
  const promptFor = localStorage.getItem(TELECOM_STORAGE.callPromptFor);
  // 김광석 재호출 Y/N 응답은 일반 대화로 흘리지 않는다.
  if (!telecomKksActive() && away > 0 && telecomNow() >= away && promptFor === String(away) && /^[YyNn]$/.test(raw)) {
    telecomSay(s.nick, s.name, raw.toUpperCase());
    if (/^[Yy]$/.test(raw)) {
      localStorage.removeItem(TELECOM_STORAGE.callPromptFor);
      telecomCallKks();
    } else {
      telecomSystem("김광석 호출을 취소했습니다. 팬들과 대화를 이어갑니다.");
      localStorage.setItem(TELECOM_STORAGE.callPromptFor, String(away));
    }
    return;
  }
  telecomUserMessageCount += 1;
  telecomSay(s.nick, s.name, text);
  if (telecomIsUserExitIntent(raw)) {
    telecomHandleUserExitAfterMessage();
    return;
  }
  telecomScheduleConversationFlow(text);
  if (telecomKksActive()) {
    const start = Number(localStorage.getItem(TELECOM_STORAGE.sessionStart) || telecomNow());
    if (telecomNow() - start > 15 * 60 * 1000 && telecomUserMessageCount >= 3 && Math.random() < 0.16) {
      clearTimeout(telecomExitTimer);
      telecomExitTimer = telecomQueue(() => telecomKksLeave(), telecomRand(45000, 90000));
    }
  }
  // 김광석이 나간 뒤 팬들과 계속 대화 중일 때는 바쁨 안내를 반복하지 않는다.
}
function telecomEnterRoom() {
  if (!currentUser) {
    alert("로그인 후 광석이네 통신방을 이용할 수 있습니다.");
    showPage("login");
    return;
  }
  telecomClearQueuedTimers();
  clearTimeout(telecomStatusTimer);
  clearTimeout(telecomExitTimer);
  clearTimeout(telecomMemberTimer);
  const kksWasActiveBeforeEnter = telecomKksActive();
  const account = telecomApplyAccountIdentityToForm();
  const nick = account.nick;
  const name = account.name;
  const mode = document.getElementById("telecomModeSelect")?.value || "chat";
  const close = document.getElementById("telecomCloseSelect")?.value || "known";
  const engine = document.getElementById("telecomEngineSelect")?.value || "webllm";
  telecomSaveJson(TELECOM_STORAGE.settings, { mode, close, engine });
  if (engine === "webllm") {
    telecomSetAiStatus("입장과 동시에 PC WebGPU 모델 준비를 시작합니다...");
    telecomEnsureLocalAiEngine().catch((err) => {
      console.warn("WebGPU preload failed", err);
    });
  }
  document.getElementById("telecomSetup")?.classList.add("hidden");
  document.getElementById("telecomRoom")?.classList.remove("hidden");
  telecomUpdateRoomDate();
  document.getElementById("telecomAfterKksExit")?.classList.add("hidden");
  localStorage.setItem(TELECOM_STORAGE.sessionStart, String(telecomNow()));
  telecomUserMessageCount = 0;
  if (!Array.isArray(telecomLoadJson(TELECOM_STORAGE.activeMembers, null))) telecomSetActiveMemberNicks(["녹차향기", "mouse14", "enfant", "raincoat", "ajeegang", "ekjw123", "낙원", "soriboy"]);
  const previousLog = telecomLoadJson(TELECOM_STORAGE.log, []);
  if (previousLog.length > 0) {
    telecomRenderLog(previousLog);
    telecomSystem(`${nick}(${name})님이 다시 접속하셨습니다.`);
  } else {
    telecomSystem(`${nick}(${name})님이 접속하셨습니다.`);
  }
  telecomScheduleGreetingRepliesForUser(telecomGivenName(name || nick || "손님") || "손님");
  if (telecomIsKksAvailable()) {
    telecomSetKksActive(true);
    if (!kksWasActiveBeforeEnter || previousLog.length === 0) {
      telecomSystem("김광석(김광석)님이 대화방에 들어왔습니다.");
    }
    telecomScheduleStatusLine();
    telecomScheduleKksExit();
  } else {
    telecomSetKksActive(false);
    const left = telecomFormatLeft(telecomAwayUntil() - telecomNow());
    telecomSystem(`김광석님은 지금 바빠서 접속하지 못합니다. 약 ${left} 후 다시 호출할 수 있습니다.`);
    telecomStartMemberNoise();
  }
  telecomSetupCallButton();
}
function telecomCallKks() {
  if (!telecomIsKksAvailable()) return telecomSetupCallButton();
  telecomSetKksActive(true);
  document.getElementById("telecomAfterKksExit")?.classList.add("hidden");
  localStorage.setItem(TELECOM_STORAGE.sessionStart, String(telecomNow()));
  telecomSystem("'김광석'님을 호출했습니다.");
  telecomQueue(() => {
    if (!telecomKksActive()) return;
    telecomSystem("김광석(김광석)님이 대화방에 들어왔습니다.");
    telecomSystem("'김광석'님은 수신[가능]상태로 (둥근소리 (김광석)) 서비스를 이용 중입니다.");
    telecomQueue(() => { if (telecomKksActive() && telecomRoomOpen()) telecomKks(telecomGenerateKksOpener()); }, 1500);
    telecomQueue(() => {
      const greeter = telecomFindMemberByNick("녹차향기") || telecomPickMember();
      if (telecomRoomOpen() && greeter) telecomSayMember(greeter, "광석 아찌 어서오세요");
    }, 3600);
    telecomSetupCallButton();
    telecomScheduleKksExit();
    telecomStartMemberNoise(3500);
  }, 2000);
}
function initTelecomChatRoom() {
  if (!telecomApplyPcOnlyGate()) return;
  if (telecomInitialized) {
    telecomRenderLog();
    telecomSetupCallButton();
    telecomApplyAccountIdentityToForm();
    return;
  }
  telecomInitialized = true;
  const s = telecomCurrentSettings();
  telecomApplyAccountIdentityToForm();
  telecomUpdateRoomDate();
  const modeSel = document.getElementById("telecomModeSelect");
  const closeSel = document.getElementById("telecomCloseSelect");
  const engineSel = document.getElementById("telecomEngineSelect");
  if (modeSel) modeSel.value = s.mode || "chat";
  if (closeSel) closeSel.value = s.close || "known";
  if (engineSel) engineSel.value = s.engine || "webllm";
  engineSel?.addEventListener("change", () => {
    const saved = telecomLoadJson(TELECOM_STORAGE.settings, {}) || {};
    telecomSaveJson(TELECOM_STORAGE.settings, { ...saved, engine: engineSel.value });
    if (engineSel.value === "webllm") {
      telecomSetAiStatus("PC WebGPU 생성형 모드 선택됨. 모델 준비를 시작합니다.");
      telecomEnsureLocalAiEngine().catch((err) => console.warn("WebGPU preload failed", err));
    } else {
      telecomSetAiStatus("기본 PC통신 대화 모드입니다.");
    }
  });
  document.getElementById("telecomEnterBtn")?.addEventListener("click", telecomEnterRoom);
  document.getElementById("telecomCallBtn")?.addEventListener("click", telecomCallKks);
  document.getElementById("telecomContinueFansBtn")?.addEventListener("click", () => {
    document.getElementById("telecomAfterKksExit")?.classList.add("hidden");
    telecomSystem("팬들과 대화를 이어갑니다.");
    telecomStartMemberNoise(2500);
  });
  document.getElementById("telecomEndRoomBtn")?.addEventListener("click", () => {
    const s = telecomCurrentSettings();
    telecomClearQueuedTimers();
    clearTimeout(telecomMemberTimer);
    telecomSystem(`${s.nick}(${s.name})님이 대화방을 나갔습니다.`);
    document.getElementById("telecomAfterKksExit")?.classList.add("hidden");
    document.getElementById("telecomRoom")?.classList.add("hidden");
    document.getElementById("telecomSetup")?.classList.remove("hidden");
    telecomApplyAccountIdentityToForm();
  });
  document.getElementById("telecomResetBtn")?.addEventListener("click", () => {
    if (!confirm("통신방 대화 기록을 초기화할까요?")) return;
    telecomClearQueuedTimers();
    clearTimeout(telecomStatusTimer);
    clearTimeout(telecomExitTimer);
    clearTimeout(telecomMemberTimer);
    telecomSaveJson(TELECOM_STORAGE.log, []);
    telecomSaveJson(TELECOM_STORAGE.recentSpeakers, []);
    telecomSaveJson(TELECOM_STORAGE.recentTopics, []);
    telecomSaveJson(TELECOM_STORAGE.activeMembers, []);
    telecomSaveJson("kwangseokTelecomRecentLinesV142", []);
    telecomSetKksActive(false);
    document.getElementById("telecomRoom")?.classList.add("hidden");
    document.getElementById("telecomSetup")?.classList.remove("hidden");
    telecomRenderLog([]);
    telecomSetupCallButton();
    telecomApplyAccountIdentityToForm();
  });
  document.getElementById("telecomForm")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("telecomMessageInput");
    const text = telecomCleanText(input?.value, "");
    if (!text) return;
    if (input) input.value = "";
    telecomSendUserMessage(text);
  });
  const log = telecomLoadJson(TELECOM_STORAGE.log, []);
  if (log.length) {
    document.getElementById("telecomSetup")?.classList.add("hidden");
    document.getElementById("telecomRoom")?.classList.remove("hidden");
    telecomUpdateRoomDate();
    telecomRenderLog(log);
    telecomStartMemberNoise();
    if (telecomKksActive()) telecomScheduleKksExit();
    else if (telecomAwayUntil() > telecomNow()) document.getElementById("telecomAfterKksExit")?.classList.remove("hidden");
  }
  telecomSetupCallButton();
}
window.addEventListener("resize", () => {
  if (document.getElementById("telecom")?.classList.contains("active")) telecomApplyPcOnlyGate();
});
window.initTelecomChatRoom = initTelecomChatRoom;

