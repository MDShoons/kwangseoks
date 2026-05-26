
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
const TELECOM_KKS_MEMBER_REPLIES = ["네", "그래요", "참 좋네요...", "오래간만이네요", "무슨일 있어요", "지금 즐거워요", "안녕하세요", "그럼...", "자판이 좀 낯설어요", "지금 잠깐 보고 있어요", "그 얘긴 좀 어렵네요", "천천히 말해요"];
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

// v153: 회원별 인격/말투. 서로 같은 말만 하지 않도록 대표 성향을 분리한다.
const TELECOM_MEMBER_PERSONAS = {
  "녹차향기": { role:"방장형", desc:"차분하게 흐름을 정리하고 새 사람을 챙김" },
  "mouse14": { role:"장난꾸러기", desc:"후후후, 푸히히 같은 웃음이 많고 가볍게 받아침" },
  "enfant": { role:"조용한 관찰자", desc:"말줄임표가 많고 천천히 반응함" },
  "raincoat": { role:"낙천적 수다꾼", desc:"홍홍, 반갑반갑 같은 밝은 표현" },
  "soriboy": { role:"음악자료형", desc:"노래, 음반, 자료실 이야기에 집중" },
  "ekjw123": { role:"과장 리액션형", desc:"HI, 우하하, 추카처럼 큰 리액션" },
  "ajeegang": { role:"분주한 자료실형", desc:"자료실, 갈무리, 바쁘다는 말이 잦음" },
  "낙원": { role:"감성 청취자", desc:"노래를 듣고 감상하는 쪽" },
  "oldsong0106": { role:"옛노래형", desc:"오래된 노래와 게시판 분위기를 챙김" },
  "soulman": { role:"분석형", desc:"상황을 한 번 더 짚고 조심스럽게 말함" }
};

// v154: 감정/성격 레이어.
// 모든 회원이 같은 톤으로 맞장구치지 않도록, 감정 표현과 말버릇을 회원별로 분리한다.
// 욕설은 1990년대 PC통신 느낌의 가벼운 투덜거림 수준으로 제한한다.
const TELECOM_EMOTION_INTENTS = new Set(["angry", "curse", "joke", "sad", "fight", "laugh"]);
const TELECOM_MEMBER_EMOTION_PERSONAS = {
  "녹차향기": {
    angry: ["잠깐만요, 말은 조금 가려서 합시다", "화나는 건 알겠는데 서로 너무 세게 가지는 마세요", "일단 진정하고 하나씩 얘기해요"],
    curse: ["욕은 조금만 줄입시다", "말이 세지면 대화가 끊겨요", "화난 건 알겠는데 선은 지켜요"],
    joke: ["그 농담은 좀 뜬금없네요 ^^", "하하, 그래도 방 분위기는 풀렸네요", "농담은 좋은데 너무 멀리 가지는 맙시다"],
    sad: ["오늘은 조금 쉬어가도 돼요", "마음이 무거운 날이 있죠", "혼자 너무 오래 붙들고 있지 마세요"],
    fight: ["잠깐만요. 서로 한 줄씩만 얘기합시다", "싸우지 말고 무슨 얘기였는지부터 정리해요", "말 끊지 말고 차례대로 해요"]
  },
  "mouse14": {
    angry: ["아 왜 또 불붙어 ㅡㅡ", "에이씨.. 또 시작이야?", "후후후.. 근데 그건 좀 열받긴 하네"],
    curse: ["젠장.. 말이 좀 세다", "에이씨, 그래도 너무 막 가지는 말자", "욕 나올만 한데 잠깐만 참자"],
    joke: ["푸히히.. 그건 좀 웃겼다", "후후후.. 너 개그하냐", "아 배야 ㅋㅋ"],
    sad: ["야 그런 날엔 그냥 방에 붙어 있어", "후후.. 그래도 혼자는 아니잖아", "좀 울적하면 노래나 하나 틀자"],
    fight: ["둘 다 잠깐 숨 좀 쉬어", "야야 싸우지마 대화방 터진다", "그만그만, 모뎀 끊기겠다"]
  },
  "enfant": {
    angry: ["음........ 너무 세게 말하지는 말아요...", "화난 건 알겠는데요... 조금만 천천히...", "그 말은 좀 아프게 들려요..."],
    curse: ["음........ 욕은 조금 무서워요...", "그렇게까지 말하면 마음이 상해요...", "조금만 부드럽게 말해요..."],
    joke: ["음........ 피식했어요...", "그건 좀 웃기네요...", "조용히 웃고 있었어요..."],
    sad: ["그런 날 있죠...", "말 안 해도 조금 알 것 같아요...", "오늘은 조용히 있어도 돼요..."],
    fight: ["음........ 두 분 다 조금만 천천히요...", "말이 겹치면 더 속상해져요...", "잠깐 쉬었다 얘기하면 안 될까요..."]
  },
  "raincoat": {
    angry: ["홍홍.. 근데 이건 좀 화날만 하네요", "아이고 분위기 뜨거워졌네요", "잠깐만요, 너무 달아오르는데요"],
    curse: ["어머 말이 세다 세요", "욕은 살짝 접고 갑시다요", "에구, 그래도 너무 세게는 말고요"],
    joke: ["홍홍홍 그거 웃기네요", "반갑반갑~~~ 웃고 갑니다", "아 그 농담은 인정이요"],
    sad: ["비 오는 날이면 더 그렇죠", "오늘은 따뜻한 노래 들어요", "마음이 좀 축축해지는 날이네요"],
    fight: ["자자, 커피 한 잔씩 하고 얘기해요", "홍홍.. 싸움은 잠깐 멈춤", "분위기 풀어요, 방 깨져요"]
  },
  "soriboy": {
    angry: ["그 얘기는 감정이 좀 올라오네요", "자료 얘기하다가 싸우면 곤란합니다", "정확한 얘기부터 확인하는 게 좋겠습니다"],
    curse: ["표현은 조금 순화하는 게 좋겠습니다", "말이 거칠면 내용이 묻힙니다", "감정은 알겠지만 자료부터 보죠"],
    joke: ["그건 라디오 사연 같네요", "하하, 녹음해둘 걸 그랬습니다", "그 농담은 자료 가치가 있네요"],
    sad: ["그럴 때는 라이브 음원이 더 깊게 들리죠", "노래 하나가 위로가 될 때가 있습니다", "저도 그런 날에는 조용한 곡을 듣습니다"],
    fight: ["일단 사실관계부터 나눠서 보죠", "서로 말이 섞인 것 같습니다", "논점이 둘로 갈라졌네요"]
  },
  "ekjw123": {
    angry: ["아 진짜요????", "우와 이건 좀 빡치는데요", "헉 분위기 장난 아니네요"],
    curse: ["에이씨!!!!!! 그래도 참아요", "헉 욕 나왔다", "으아아아 진정진정"],
    joke: ["우하하~~~~~~~~~~~~", "ㅋㅋㅋㅋㅋㅋ", "아 미치겠다 진짜"],
    sad: ["아이고........", "그건 좀 슬프네요", "괜히 마음이 먹먹해요"],
    fight: ["싸우지마요~~~~~~~~", "잠깐 스톱!!!!!!", "둘 다 진정요!!!!"]
  },
  "ajeegang": {
    angry: ["에구에구... 또 왜 이래요", "아 바쁘다 바빠, 싸움까지 정리해야 하나", "그건 좀 짜증나겠네요"],
    curse: ["에구... 말이 험해졌네요", "욕은 갈무리 안 합니다 ㅎㅎ", "에이, 그 말은 좀 세요"],
    joke: ["히히히 그거 갈무리해야겠다", "에구 웃겨라", "그 농담 저장합니다"],
    sad: ["에구... 그런 날은 쉬세요", "자료실도 조용한데 마음도 조용하네요", "오늘은 너무 무리하지 마세요"],
    fight: ["잠깐만요, 로그 정리 좀 합시다", "싸움 갈무리하기 전에 멈춰요", "서로 말이 꼬였어요"]
  },
  "낙원": {
    angry: ["그 말은 조금 차갑게 들리네요", "화가 날 수는 있는데 마음이 상하겠어요", "서로 상처 주지는 않았으면 해요"],
    curse: ["그 말은 좀 아파요", "욕보다 노래 얘기로 돌리면 안 될까요", "말이 세면 오래 남아요"],
    joke: ["조용히 웃었습니다", "그 농담 괜찮네요", "노래 듣다가 웃었어요"],
    sad: ["그 말 들으니까 노래가 더 슬프게 들려요", "오늘은 마음이 좀 내려앉네요", "그런 밤이 있죠"],
    fight: ["잠깐 조용히 쉬었다 말해요", "서로 마음이 다친 것 같아요", "노래 한 곡 듣고 다시 얘기해요"]
  },
  "soulman": {
    angry: ["감정은 이해되는데 표현은 분리해서 봐야 합니다", "지금은 화난 이유와 말투를 나눠야겠네요", "분노 자체보다 방향이 중요합니다"],
    curse: ["욕설은 논점을 흐릴 수 있습니다", "표현이 강하면 상대가 방어적으로 됩니다", "말의 강도를 조금 낮추는 게 좋겠습니다"],
    joke: ["농담의 타이밍은 나쁘지 않았습니다", "그건 긴장을 낮추는 효과가 있네요", "웃음으로 넘길 수 있으면 좋죠"],
    sad: ["그 감정은 가볍게 넘기기 어렵겠네요", "슬픔은 설명보다 시간이 필요한 것 같습니다", "지금은 해결보다 들어주는 게 먼저겠네요"],
    fight: ["현재 쟁점은 감정과 사실이 섞여 있습니다", "한 사람씩 말해야 정리가 됩니다", "중재하려면 먼저 오해부터 줄여야 합니다"]
  }
};
function telecomEmotionLine(member, intent) {
  const nick = member?.nick || "";
  const persona = TELECOM_MEMBER_EMOTION_PERSONAS[nick];
  const pool = persona?.[intent];
  if (pool && pool.length) return telecomPickLine(pool);
  const casual = telecomMemberUsesCasual(member);
  const fallback = {
    angry: casual ? ["아 그건 좀 열받네", "에이씨.. 그건 아니지", "그 말은 좀 짜증난다"] : ["그건 조금 화날 수 있겠네요", "그 말은 좀 불편하네요", "조금 진정하고 이야기해요"],
    curse: casual ? ["젠장.. 그래도 말은 좀 낮추자", "에이씨, 잠깐만", "욕 나올만 해도 조금만 참자"] : ["표현은 조금 낮추는 게 좋겠어요", "말이 세지면 대화가 어려워져요", "조금만 진정해요"],
    joke: casual ? ["ㅋㅋㅋ 웃기네", "푸하하", "그건 좀 개그다"] : ["하하, 그건 웃기네요", "농담이 좋네요", "분위기가 조금 풀렸네요"],
    sad: casual ? ["좀 슬프네", "그런 날 있지", "마음이 좀 그렇다"] : ["조금 슬프네요", "그런 날이 있지요", "마음이 좀 무겁네요"],
    fight: casual ? ["야야 싸우지마", "잠깐 진정해", "둘 다 한 박자 쉬어"] : ["잠깐 진정하고 이야기해요", "서로 한 줄씩만 말해요", "싸우기보다 정리부터 해요"],
    laugh: casual ? ["ㅋㅋㅋ", "푸히히", "나도 웃기네"] : ["하하", "저도 웃겼어요", "분위기 좋네요"]
  };
  return telecomPickLine(fallback[intent] || fallback.joke);
}
function telecomEmotionFollowLine(member, intent) {
  if (intent === "fight") return telecomEmotionLine(member, "fight");
  if (intent === "curse") return telecomEmotionLine(member, Math.random() < 0.55 ? "curse" : "fight");
  if (intent === "angry") return telecomEmotionLine(member, Math.random() < 0.45 ? "angry" : "fight");
  return telecomEmotionLine(member, intent);
}


// v156: 감정 모델 + 인격 모델.
// 목표: 회원들이 "랜덤 문장"이 아니라 각자 다른 성격과 감정 반응을 가진 사람처럼 말하게 한다.
// 이 모델은 외부 AI가 아니라 브라우저 안에서 도는 가벼운 상태/성격 엔진이다.
const TELECOM_ROOM_MOOD_KEY = "kwangseokTelecomRoomMoodV156";
const TELECOM_MEMBER_PERSONALITY_MODELS = {
  "녹차향기": { role:"방장", temperament:"calm", humor:0.20, empathy:0.78, conflict:0.92, chatter:0.35, style:"존댓말, 정리, 중재", weights:{ fight:5, angry:4, greeting:4, sad:3, question:2 } },
  "mouse14": { role:"장난", temperament:"playful", humor:0.92, empathy:0.45, conflict:0.40, chatter:0.88, style:"반말, 후후후, 놀림, 가벼운 투덜", weights:{ joke:5, laugh:5, curse:3, food:3, chat:2 } },
  "enfant": { role:"조용한 감성", temperament:"quiet", humor:0.25, empathy:0.92, conflict:0.55, chatter:0.28, style:"말줄임표, 소심함, 조용한 공감", weights:{ sad:5, comfort:5, fight:3, greeting:2 } },
  "raincoat": { role:"분위기 메이커", temperament:"bright", humor:0.70, empathy:0.60, conflict:0.50, chatter:0.78, style:"홍홍, 밝게 받아침", weights:{ laugh:5, joke:4, greeting:4, food:3, chat:3 } },
  "soriboy": { role:"음악자료", temperament:"archivist", humor:0.22, empathy:0.45, conflict:0.45, chatter:0.42, style:"자료, 음반, 라디오, 사실 확인", weights:{ music:6, question:3, chat:2 } },
  "ekjw123": { role:"과장 리액션", temperament:"reactive", humor:0.82, empathy:0.50, conflict:0.35, chatter:0.82, style:"큰 리액션, 느낌표, 우하하", weights:{ laugh:5, joke:5, angry:3, greeting:3, celebrate:5 } },
  "ajeegang": { role:"갈무리", temperament:"busy", humor:0.48, empathy:0.42, conflict:0.55, chatter:0.65, style:"에구에구, 갈무리, 자료실", weights:{ music:3, question:3, fight:2, chat:3 } },
  "낙원": { role:"감성 청취", temperament:"sentimental", humor:0.20, empathy:0.88, conflict:0.60, chatter:0.35, style:"노래와 마음으로 받아침", weights:{ sad:5, comfort:5, music:4, fight:3 } },
  "oldsong0106": { role:"옛노래", temperament:"nostalgic", humor:0.35, empathy:0.55, conflict:0.35, chatter:0.55, style:"옛 노래, 오래된 게시판 느낌", weights:{ music:4, chat:3, greeting:3 } },
  "soulman": { role:"분석", temperament:"analytic", humor:0.18, empathy:0.55, conflict:0.88, chatter:0.38, style:"논점 정리, 차분한 분석", weights:{ question:5, fight:5, angry:3, chat:2 } }
};
function telecomEmotionModel(text) {
  const fixed = telecomCanonicalInput(text || "");
  const compact = fixed.replace(/\s+/g, "");
  let intent = telecomIntent(fixed);
  let intensity = 1;
  if (/!!!|ㅠㅠ|ㅜㅜ|ㅋㅋㅋㅋ|ㅎㅎㅎㅎ|~~~~|미치|개빡|존나|진짜|너무|완전|대박/.test(String(text || ""))) intensity += 1;
  if (/씨발|시발|ㅅㅂ|닥쳐|꺼져|개빡|죽겠|미치겠|울고싶|못참/.test(compact)) intensity += 1;
  intensity = Math.max(1, Math.min(3, intensity));
  let valence = "neutral";
  if (["laugh","joke","celebrate","greeting"].includes(intent)) valence = "positive";
  if (["sad","angry","curse","fight"].includes(intent)) valence = "negative";
  if (intent === "comfort") valence = "soft";
  const needs = {
    greeting: intent === "greeting",
    soothe: ["sad","comfort","fight","angry","curse"].includes(intent),
    joke: ["joke","laugh"].includes(intent),
    music: intent === "music",
    answer: ["question","doing"].includes(intent)
  };
  return { raw:String(text || ""), fixed, compact, intent, intensity, valence, needs, at: telecomNow() };
}
function telecomGetRoomMood() {
  return telecomLoadJson(TELECOM_ROOM_MOOD_KEY, { mood:"neutral", heat:0, lastIntent:"chat", updatedAt:0 });
}
function telecomUpdateRoomMood(analysis) {
  const old = telecomGetRoomMood();
  const now = telecomNow();
  const cooledHeat = Math.max(0, Number(old.heat || 0) - Math.floor((now - Number(old.updatedAt || now)) / 45000));
  let heat = cooledHeat;
  if (["angry","curse","fight"].includes(analysis.intent)) heat += analysis.intensity + 1;
  else if (["sad","comfort"].includes(analysis.intent)) heat += 1;
  else if (["laugh","joke","greeting"].includes(analysis.intent)) heat = Math.max(0, heat - 1);
  heat = Math.max(0, Math.min(8, heat));
  let mood = "neutral";
  if (heat >= 5) mood = "heated";
  else if (["sad","comfort"].includes(analysis.intent)) mood = "soft";
  else if (["laugh","joke"].includes(analysis.intent)) mood = "funny";
  else if (analysis.intent === "music") mood = "music";
  else if (analysis.intent === "greeting") mood = "welcoming";
  telecomSaveJson(TELECOM_ROOM_MOOD_KEY, { mood, heat, lastIntent:analysis.intent, updatedAt:now });
  return { mood, heat, lastIntent:analysis.intent, updatedAt:now };
}
function telecomPersonaModel(member) {
  return TELECOM_MEMBER_PERSONALITY_MODELS[member?.nick] || {
    role:"일반회원", temperament: telecomMemberUsesCasual(member) ? "casual" : "polite", humor:0.35, empathy:0.45, conflict:0.45, chatter:0.45, style:"일반 PC통신 회원", weights:{ chat:2 }
  };
}
function telecomWeightedPersonaMembers(intent, count = 2, exclude = []) {
  const active = telecomActiveMemberNicks();
  let pool = DUNGEUNSORI_MEMBERS.filter((m) => m.nick !== "김광석" && !exclude.includes(m.nick));
  if (active.length) pool = pool.filter((m) => active.includes(m.nick));
  const scored = pool.map((m) => {
    const model = telecomPersonaModel(m);
    let score = 1 + (model.weights?.[intent] || model.weights?.chat || 0);
    if (["fight","angry","curse"].includes(intent)) score += Math.round(model.conflict * 4);
    if (["sad","comfort"].includes(intent)) score += Math.round(model.empathy * 4);
    if (["joke","laugh"].includes(intent)) score += Math.round(model.humor * 4);
    score += Math.random() * 2;
    return { m, score };
  }).sort((a,b) => b.score - a.score);
  const picked = [];
  for (const item of scored) {
    if (picked.length >= count) break;
    if (!picked.some((x) => x.nick === item.m.nick)) picked.push(item.m);
  }
  while (picked.length < count) {
    const m = telecomPickMember(picked.map(x => x.nick).concat(exclude));
    if (!m || picked.some(x => x.nick === m.nick)) break;
    picked.push(m);
  }
  return picked;
}
function telecomPersonaOpening(member, analysis) {
  const model = telecomPersonaModel(member);
  const casual = telecomMemberUsesCasual(member);
  const hot = telecomGetRoomMood().heat >= 4;
  if (model.temperament === "playful") {
    if (["fight","angry","curse"].includes(analysis.intent)) return telecomPickLine(["야야", "후후.. 잠깐", "에이씨, 잠깐만"]);
    if (["laugh","joke"].includes(analysis.intent)) return telecomPickLine(["푸히히", "후후후", "아 배야"]);
  }
  if (model.temperament === "quiet") return telecomPickLine(["음........", "저기...", "조용히 보고 있었는데..."]);
  if (model.temperament === "bright") return telecomPickLine(["홍홍", "아이고", "반갑반갑~~~"]);
  if (model.temperament === "analytic") return telecomPickLine(["제 생각엔", "잠깐 정리하면", "그건"]);
  if (model.temperament === "archivist") return telecomPickLine(["자료로 보면", "기록상으로는", "음반 얘기라면"]);
  if (model.temperament === "busy") return telecomPickLine(["에구에구", "아 바쁘다 바빠", "갈무리하다가 봤는데"]);
  if (model.temperament === "sentimental") return telecomPickLine(["그 말은", "듣고 있으니까", "노래 생각나네요"]);
  if (hot && model.conflict > 0.7) return casual ? "잠깐" : "잠깐만요";
  return "";
}
function telecomPersonaModelLine(member, analysis, userText = "", role = "answer", previousMember = null) {
  const model = telecomPersonaModel(member);
  const casual = telecomMemberUsesCasual(member);
  const intent = analysis.intent;
  const start = telecomPersonaOpening(member, analysis);
  const prevName = previousMember ? (telecomGivenName(previousMember.name) || previousMember.nick) : "";
  const glue = start ? " " : "";
  if (intent === "greeting") return telecomGreetingAnswerLine(member, userText);
  if (["fight","angry","curse","joke","sad","laugh"].includes(intent)) {
    let line = role === "follow" ? telecomEmotionFollowLine(member, intent) : telecomEmotionLine(member, intent);
    return start && !line.startsWith(start) ? `${start}${glue}${line}` : line;
  }
  if (intent === "comfort") {
    if (model.empathy > 0.8) return telecomPickLine(casual ? ["그럴 땐 여기서 좀 쉬어", "혼자 있지 말고 얘기해", "마음이 좀 그러면 노래 하나 듣자"] : ["그럴 땐 여기서 조금 쉬세요", "혼자 오래 들고 있지 마세요", "마음이 무거우면 노래 하나 들으셔도 좋아요"]);
    if (model.humor > 0.75) return telecomPickLine(["후후.. 그래도 여기 왔잖아", "야 그런 날엔 방에 붙어 있어", "울적하면 내가 썰렁한 농담 해줄까"]);
  }
  if (intent === "music") {
    if (model.temperament === "archivist") return telecomPickLine(["그건 자료실에 비슷한 글 있었어요", "라이브 녹음 쪽으로 보면 얘기가 달라집니다", "음반판하고 공연판 느낌이 좀 다릅니다"]);
    if (model.temperament === "sentimental") return telecomPickLine(["그 노래는 밤에 들으면 더 깊어요", "가사 생각하면 좀 조용해지네요", "그 곡 얘기 나오면 마음이 먼저 움직여요"]);
    if (model.temperament === "playful") return telecomPickLine(["후후후.. 노래 얘기 나오면 다들 진지해져", "그건 광석이형이 늦게라도 칠 듯", "나도 라이브가 더 좋더라"]);
  }
  if (intent === "question") {
    if (telecomIsKksTypingContext(userText)) return casual ? telecomPickLine(["응, 자판이 서툴러서 오래 걸리는 듯", "아마 한 글자씩 보고 치실걸", "기다리면 천천히 올라올 거야"]) : telecomPickLine(["아마 자판이 아직 서투르셔서 오래 걸리는 것 같아요", "한 글자씩 보고 입력하시는 분위기예요", "조금 기다리면 천천히 올라올 것 같아요"]);
    if (model.temperament === "analytic") return telecomPickLine(["그건 먼저 맥락을 봐야겠네요", "질문을 둘로 나눠보면 좋겠습니다", "정확히는 조금 더 확인해야 해요"]);
    if (model.temperament === "archivist") return telecomPickLine(["자료실에 단서가 있을 것 같습니다", "기록을 보면 찾을 수 있을지도 몰라요", "제가 본 글에는 아직 없었습니다"]);
  }
  if (intent === "doing") {
    if (model.temperament === "busy") return telecomPickLine(["자료실 갈무리하고 있었어요", "에구에구... 글 정리 중이었어요", "아 바쁘다 바빠, 그래도 보고 있었어요"]);
    if (model.temperament === "archivist") return telecomPickLine(["라디오 녹음 글 보고 있었습니다", "음반 목록 정리하고 있었어요", "자료실 검색하고 있었습니다"]);
    if (model.temperament === "playful") return telecomPickLine(["난 그냥 눈팅중", "후후후.. 사람들 뭐하나 보고 있었지", "갈무리할 거 있나 보고 있었어"]);
    if (model.temperament === "quiet") return telecomPickLine(["그냥 조용히 글 읽고 있었어요...", "낙서장 보고 있었어요...", "음........ 보고만 있었어요..."]);
  }
  if (role === "follow" && previousMember) {
    if (model.temperament === "playful") return casual ? `${prevName}이 말 들으니까 좀 웃기네` : `${prevName}님 말 들으니까 좀 웃기네요`;
    if (model.temperament === "analytic") return casual ? `${prevName} 말이랑 이어서 보면 그렇지` : `${prevName}님 말씀과 이어서 보면 그렇네요`;
    if (model.temperament === "quiet") return `${prevName}님 말도 조금 알 것 같아요...`;
  }
  return null;
}
function telecomPersonaMemberLine(member, intent, userText = "", role = "answer") {
  const nick = member?.nick || "";
  const topic = telecomExtractConcreteThing(userText);
  if (TELECOM_EMOTION_INTENTS.has(intent)) {
    return role === "follow" ? telecomEmotionFollowLine(member, intent) : telecomEmotionLine(member, intent);
  }
  if (role === "follow") {
    if (nick === "녹차향기") return telecomPickLine(["네, 그 흐름으로 이어가면 될 것 같아요", "잠깐 정리하면 그 얘기였죠", "다들 천천히 말씀하세요"]);
    if (nick === "mouse14") return telecomPickLine(["후후후.. 나도 그 말에 한표", "푸히히.. 그 얘기 계속해", "알가쓰.. 그런 흐름이구나"]);
    if (nick === "enfant") return telecomPickLine(["음........ 저도 그렇게 들었어요...", "조용히 보고 있었는데 그 말 맞는 것 같아요...", "그 얘기 조금 더 들어볼께요..."]);
    if (nick === "raincoat") return telecomPickLine(["홍홍.. 저도 그렇게 봤어요", "반갑반갑~~~ 얘기 이어가요", "그 분위기 좋네요"]);
  }
  if (intent === "doing") {
    if (nick === "soriboy") return telecomPickLine(["저는 노래 자료 정리하고 있었습니다", "음반 목록 보고 있었어요", "라디오 녹음 글 찾고 있었습니다"]);
    if (nick === "ajeegang") return telecomPickLine(["에구에구... 자료실 갔다왔어요", "갈무리하느라 좀 바빴어요", "아 바쁘다 바빠... 그래도 보고 있었어요"]);
    if (nick === "낙원") return telecomPickLine(["저는 노래 듣고 있었어요", "가사 보면서 듣고 있었습니다", "게시판에 올라온 노래 얘기 보고 있었어요"]);
  }
  if (intent === "music") {
    if (nick === "soriboy") return telecomPickLine([`${topic} 자료가 있으면 좋겠네요`, "저는 라이브 녹음 쪽이 궁금합니다", "음반보다 방송 녹음이 더 찾기 어렵더군요"]);
    if (nick === "낙원") return telecomPickLine(["그 노래는 밤에 들으면 더 좋더라구요", "저는 그 곡 들으면 좀 조용해져요", "라이브로 들으면 느낌이 달라요"]);
    if (nick === "oldsong0106") return telecomPickLine(["옛 노래는 들을수록 다르죠", "그 시절 노래 얘기 좋네요", "자료실에 예전 글 있을 겁니다"]);
  }
  if (intent === "comfort") {
    if (nick === "enfant") return telecomPickLine(["음........ 그런 날 있죠...", "말 안 해도 조금 알 것 같아요...", "천천히 있어도 돼요..."]);
    if (nick === "녹차향기") return telecomPickLine(["너무 혼자 붙들고 있지 마세요", "방에 들어오셨으니 조금 쉬다 가세요", "오늘은 천천히 이야기해도 돼요"]);
    if (nick === "mouse14") return telecomPickLine(["후후후.. 그래도 여기 왔잖아", "그럴 땐 그냥 좀 쉬어", "혼자 끙끙대지 말고 말해봐"]);
  }
  if (intent === "question") {
    if (nick === "soulman") return telecomPickLine(["제 생각엔 먼저 맥락을 봐야 할 것 같아요", "그건 앞의 얘기랑 같이 봐야겠네요", "단정하긴 어렵지만 저는 그렇게 봅니다"]);
    if (nick === "녹차향기") return telecomPickLine(["아시는 분 계시면 같이 얘기해주세요", "질문은 천천히 풀어보면 될 것 같아요", "자료실에도 찾아볼게요"]);
  }
  return "";
}
const TELECOM_CASUAL_MEMBER_NICKS = new Set(Object.keys(TELECOM_MEMBER_PROFILES).filter((nick) => TELECOM_MEMBER_PROFILES[nick]?.casual));
let telecomQueuedTimers = [];

function telecomNow() { return Date.now(); }
function telecomRand(min, max) { return Math.floor(min + Math.random() * (max - min + 1)); }


// v153: 김광석은 PC통신/타자가 능숙한 사람이 아니라, 자판을 보고 천천히 치는 사람으로 처리한다.
// 그래서 김광석 대사는 즉시 튀어나오지 않고, 항상 느린 타자 지연을 거친다.
function telecomKksTypingDelay(extra = 0) {
  return telecomRand(18000, 46000) + Number(extra || 0);
}
function telecomSetKksTypingStatus() {
  telecomSetAiStatus("김광석님은 PC통신 자판이 아직 서툴러 천천히 입력 중입니다...");
}
function telecomQueueKks(text, delay = null) {
  const d = delay == null ? telecomKksTypingDelay() : delay;
  telecomSetKksTypingStatus();
  return telecomQueue(() => {
    if (!telecomRoomOpen() || !telecomKksActive()) return;
    telecomKks(text);
    telecomSetAiStatus("김광석님은 접속 중입니다. 타자가 느려 답이 늦을 수 있습니다.");
  }, d);
}
function telecomQueueKksLines(lines, baseDelay = null) {
  const arr = (lines || []).filter(Boolean).slice(0, 2);
  const start = baseDelay == null ? telecomKksTypingDelay() : baseDelay;
  arr.forEach((line, i) => telecomQueueKks(line, start + i * telecomRand(5200, 9200)));
}
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
function telecomIsKksTypingContext(text) {
  const raw = telecomCanonicalInput(text || "");
  return /광석|김광석|아저씨|아찌|형|타자|자판|오래|느리|어려|서툴|걸리/.test(raw) && /타자|자판|오래|느리|어려|서툴|걸리/.test(raw);
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
  const analysis = telecomEmotionModel(userText || intent);
  analysis.intent = intent;
  const personaLine = telecomPersonaModelLine(member, analysis, userText, "follow", previousMember);
  if (personaLine) return personaLine;
  if (TELECOM_EMOTION_INTENTS.has(intent)) return telecomEmotionFollowLine(member, intent);
  if (intent === "doing") {
    if (previousMember) return casual ? `${prevName}이도 보고 있었구나. 난 ${telecomHumanReactionVerb(intent).replace(/어요$/, "어")}` : `${prevName}님도 보고 계셨군요. 저도 ${telecomHumanReactionVerb(intent)}`;
    return casual ? `나도 ${telecomHumanReactionVerb(intent).replace(/어요$/, "어")}` : `저도 ${telecomHumanReactionVerb(intent)}`;
  }
  if (intent === "music") return casual ? `${topic}면 나도 좀 궁금해` : `${topic}라면 저도 궁금하네요`;
  if (intent === "comfort") return casual ? "그 말 들으니까 좀 그렇다. 천천히 얘기해" : "말씀 들으니까 조금 마음이 쓰이네요. 천천히 얘기하세요";
  if (intent === "food") return casual ? "그 얘기 들으니까 배고프다" : "그 얘기 들으니까 배고파지네요";
  if (intent === "laugh") return casual ? "아까 말이 좀 웃겼어" : "아까 말이 좀 웃겼어요";
  if (intent === "question") {
    if (telecomIsKksTypingContext(userText)) {
      return casual
        ? telecomPickLine(["응, 자판이 아직 익숙하지 않으신가봐", "아마 천천히 치고 계신 것 같아", "맞아, 그래서 답이 좀 늦게 올라오나봐"])
        : telecomPickLine(["자판이 아직 익숙하지 않으신가 봐요", "아마 천천히 입력하고 계신 것 같아요", "그래서 답이 조금 늦게 올라오는 것 같아요"]);
    }
    return casual ? telecomPickLine(["나도 그건 궁금해", "그러게, 그건 좀 물어보자", "음.. 그건 잘 모르겠네"]) : telecomPickLine(["저도 그건 궁금하네요", "그건 조금 더 봐야겠어요", "아시는 분 계실까요?"]);
  }
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
  if (TELECOM_EMOTION_INTENTS.has(intent)) return telecomEmotionLine(member, intent);
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
  return casual ? telecomPickLine(["그렇구나", "음.. 그래서?", "후후.. 재밌네", "나도 보고 있었어"]) : telecomPickLine(["그렇군요", "저도 보고 있었어요", "조금 더 들어볼게요", "그러게요"]);
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
  if (intent === "angry") return telecomPickLine(["화낼 일은 화내야죠", "근데 말은 조금 아껴요", "에이... 그건 좀 그렇네요"]);
  if (intent === "curse") return telecomPickLine(["욕은 조금만요", "에이씨... 그래도 참아요", "말 세게 하면 더 아파요"]);
  if (intent === "joke") return telecomPickLine(["훗...", "그건 좀 웃기네요", "개그가 좀 썰렁한데요"]);
  if (intent === "sad") return telecomPickLine(["그런 날 있죠", "슬픈 건 그냥 슬픈 거예요", "울적하면 노래 하나 들어요"]);
  if (intent === "fight") return telecomPickLine(["싸우지 말아요", "둘 다 잠깐만요", "한 사람씩 얘기해요"]);
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
  // v154: 감정 흐름을 먼저 잡는다. 오타가 있어도 canonicalInput을 거친 compact 텍스트로 판단한다.
  if (/싸우|다투|그만해|진정|중재|말다툼|시비|열받아서서로|화내지마/.test(msg)) return "fight";
  if (/씨발|시발|ㅅㅂ|젠장|에이씨|짜증|빡치|개빡|열받|꺼져|닥쳐|미친|욕나오|화나|화났|화냄/.test(msg)) return "curse";
  if (/화나|화났|화냄|분노|열받|짜증|빡치|성질|불쾌/.test(msg)) return "angry";
  if (/개그|농담|웃긴말|드립|장난|썰렁|아재개그/.test(msg)) return "joke";
  if (/슬프|울고|울었|눈물|먹먹|그립|서럽|쓸쓸|외롭|허전|우울|힘들|답답|피곤|센치/.test(msg)) return "sad";
  if (/ㅋ|ㅎ|푸하|하하|웃기|웃겨|웃김|웃었|웃음/.test(msg)) return "laugh";
  if (/뭐하|뭐해|뭐하는|뭐하세요|머하|모하|다들뭐|어디서|지금뭐/.test(msg)) return "doing";
  if (/안녕|하이|어서|반가|왔어요|왔어|접속/.test(msg)) return "greeting";
  if (/비|위로|괜찮|마음|기분/.test(msg)) return "comfort";
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
  const system = `너는 광석이네 통신방의 가상 PC통신 대화 생성기다. 실제 김광석 본인이라고 주장하지 않는다. 화면 안내에 따라 가상 대화로만 행동한다. 김광석 대사만 생성한다. 1995년 PC통신 채팅처럼 짧고 투박하게 쓴다. 한 번에 1~3줄, 각 줄은 짧게. 긴 시적 독백, 현대 상담사 말투, AI라는 표현은 금지. 김광석은 PC통신과 타자가 서툴러 자판을 보고 천천히 치는 사람이다. 답은 늦고 짧으며, 가끔 말이 끊긴 듯해야 한다. 감정 표현은 가능하지만 길게 설교하지 않는다. 화나면 짧게 말리고, 슬프면 짧게 위로하고, 웃기면 피식 웃고, 싸움이면 중재한다. 욕설은 아주 가벼운 투덜거림 수준으로만 쓴다. 기본 표현은 네, 그래요, 응..., 무슨일 있어요, 자판 보고 치고 있어요, 게시판 보고 있어요, 괜히 센치해 있지말기, 씩씩하게 살기... 같은 느낌. 사용자와 김광석의 친한 정도는 ${closenessGuide}. 현재 대화 흐름은 ${modeGuide}. 회원들은 둥근소리 회원이며 김광석을 아저씨, 광석이형, 광석 아찌 등으로 부를 수 있다. 사용자가 '뭐하세요'라고 물으면 반드시 지금 무엇을 하는지 답한다. 최근 나온 말과 비슷한 문장 금지. 최근 금지 표현: ${recentLinesForAi}`;
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
    telecomQueueKksLines(lines, telecomRand(6200, 12000));
    return true;
  } catch (err) {
    console.warn("WebLLM failed; fallback to local KKS reply", err);
    telecomAiLastError = String(err?.message || err || "알 수 없는 오류");
    // v147: 모델 오류를 채팅창에 뿌리지 않는다. 사용자는 자연스러운 답만 본다.
    telecomSetAiStatus("PC WebGPU 생성형 모델 연결이 불안정하여 기본 응답으로 이어갑니다.");
    const lines = telecomGenerateKksReply(userText, "user");
    telecomQueueKksLines(lines, telecomRand(6200, 12000));
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
    telecomQueueKks(telecomKksGreetingLine(telecomGivenName(joinedMember.name) || joinedMember.nick), telecomKksTypingDelay(8000));
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
    telecomQueueKks(telecomPickLine(["또 봐요", "조심히 가요", "다음에 또 얘기해요"]), telecomKksTypingDelay(9000));
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
  if (telecomKksActive()) telecomQueueKks("또 봐요", telecomKksTypingDelay(5000));
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
    // v153: 접속했다고 바로 능숙하게 치지 않는다. 회원들이 먼저 맞이하고, 김광석은 한참 뒤 천천히 친다.
    telecomQueue(() => {
      const greeter = telecomFindMemberByNick("녹차향기") || telecomPickMember();
      if (telecomRoomOpen() && greeter) telecomSayMember(greeter, "광석 아찌 어서오세요");
    }, telecomRand(2600, 5200));
    telecomQueueKks(telecomGenerateKksOpener(), telecomKksTypingDelay(6000));
    telecomStartMemberNoise(12000);
  }, 9000);
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
  lines.forEach((t, i) => telecomQueueKks(t, i * telecomRand(4200, 7600) + telecomRand(6000, 12000)));
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
    firstPool = telecomMemberUsesCasual(member1) ? [`${userHonor} 그랬구나`, `${userHonor} 그랬구나`, "글쿠나......", "그러게"] : [`${userHonor} 그러셨군요`, `${userHonor} 그 얘기 들었어요`, "글쿠나......", "그러게요"];
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
    angry: ["아", "그건", "잠깐", "진정하고"],
    curse: ["에이", "잠깐", "그래도", "말은"],
    joke: ["하하", "그건", "푸히히", "농담이면"],
    sad: ["음..", "그런 날은", "조용히", "저도 가끔"],
    fight: ["잠깐", "한 사람씩", "싸우지 말고", "정리하면"],
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
function telecomScheduleKksResponseForUser(userText, baseDelay = telecomKksTypingDelay(12000)) {
  const s = telecomCurrentSettings();
  if (!telecomKksActive()) return;
  if (s.engine === "webllm") {
    telecomQueue(async () => {
      if (!telecomRoomOpen() || !telecomKksActive()) return;
      const ok = await telecomTryLocalAiKksReply(userText);
      if (!ok) {
        const replies = telecomGenerateKksReply(userText, "user");
        telecomQueueKksLines(replies, telecomRand(6200, 12000));
      }
    }, baseDelay);
  } else {
    const replies = telecomGenerateKksReply(userText, "user");
    telecomQueueKksLines(replies, baseDelay);
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
  if (!raw) return "그 말";
  const songTitle = telecomExtractSongTitle(raw);
  if (songTitle) return `${songTitle}`;
  if (/비|날씨/.test(raw)) return "비 얘기";
  if (/노래|음악|앨범|음반|라디오/.test(raw)) return "노래 얘기";
  if (/기타|코드|스트로크/.test(raw)) return "기타 얘기";
  if (/감자탕|소주|맥주|밥|먹/.test(raw)) return "먹는 얘기";
  if (/자료실|게시판|낙서|원음/.test(raw)) return "자료실 얘기";
  if (/싸우|다투|중재/.test(raw)) return "싸움";
  if (/화나|열받|짜증|빡치|욕/.test(raw)) return "화난 일";
  if (/웃기|개그|농담|장난/.test(raw)) return "웃긴 말";
  if (/슬프|외롭|허전|힘들|답답|우울|눈물/.test(raw)) return "마음 얘기";
  if (/어려|오래|느리|타자|자판|치는|걸리|서툴/.test(raw)) return "자판 치는 거";
  // 사용자가 친 문장을 그대로 '~ 얘기'로 되받으면 로봇처럼 보이므로, 미분류 문장은 복사하지 않는다.
  return "그 말";
}

// v158: 음악 대화에서 '그 곡/그 노래' 같은 빈 지시어를 함부로 쓰지 않기 위한 구체 곡명 추출기.
// 곡명이 명시되지 않았으면 라이브/곡 감상 질문을 만들지 않고, 먼저 어떤 곡인지 묻는다.
function telecomExtractSongTitle(text) {
  const raw = telecomCanonicalInput(text || "").trim();
  if (!raw) return "";

  const quoted = raw.match(/[「『"'“‘]([^「」『』"'“”‘’]{2,32})[」』"'”’]/);
  if (quoted && quoted[1]) return quoted[1].trim();

  const knownTitles = [
    "서른 즈음에", "사랑했지만", "이등병의 편지", "어느 60대 노부부 이야기",
    "먼지가 되어", "거리에서", "잊어야 한다는 마음으로", "흐린 가을 하늘에 편지를 써",
    "너무 아픈 사랑은 사랑이 아니었음을", "나의 노래", "일어나", "변해가네",
    "그날들", "기다려줘", "혼자 남은 밤", "바람이 불어오는 곳", "두 바퀴로 가는 자동차",
    "말하지 못한 내 사랑", "그루터기", "광야에서", "자유롭게", "부치지 않은 편지"
  ];
  const found = knownTitles.find((title) => raw.includes(title));
  if (found) return found;

  const m = raw.match(/(?:노래|곡|라이브|음원|가사)\s*["'‘“]?([가-힣A-Za-z0-9\s]{2,24}?)(?:\s*(?:얘기|이야기|듣|부르|좋|어때|맞|라이브|가사|음원)|[?？!.。]|$)/);
  if (m && m[1]) {
    const candidate = m[1].replace(/^(그|저|이|어떤|무슨)\s*/, "").trim();
    if (candidate && !/^(노래|곡|라이브|음악|얘기|이야기)$/.test(candidate)) return candidate;
  }

  return "";
}
function telecomHasConcreteSongContext(text) {
  return !!telecomExtractSongTitle(text || "");
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

  const analysis = telecomEmotionModel(userText || intent);
  analysis.intent = intent;
  const personaLine = telecomPersonaModelLine(member, analysis, userText, role);
  if (personaLine) return personaLine;

  if (TELECOM_EMOTION_INTENTS.has(intent)) {
    return role === "follow" ? telecomEmotionFollowLine(member, intent) : telecomEmotionLine(member, intent);
  }

  if (role !== "askBack" && intent !== "greeting" && intent !== "laugh") {
    const persona = telecomPersonaMemberLine(member, intent, userText, role);
    if (persona) return persona;
  }

  if (role === "askBack") {
    // "일훈아는"처럼 부르는 말+조사가 붙는 오류 방지.
    if (intent === "doing") return casual ? `${topicName} 뭐하고 있었어?` : `${topicName} 뭐하고 계셨어요?`;
    if (intent === "music") return casual ? `${topicName} 그 노래 어디서 들었어?` : `${topicName} 그 노래 어디서 들으셨어요?`;
    if (intent === "comfort") return casual ? `${topicName} 오늘 무슨 일 있었어?` : `${topicName} 오늘 무슨 일 있으셨어요?`;
    if (intent === "laugh") return casual ? "뭐가 그렇게 웃겨?" : "뭐가 그렇게 웃기셨어요?";
    return casual ? `${topicName} 어떻게 생각해?` : `${topicName} 어떻게 생각하세요?`;
  }

  if (intent === "laugh") {
    if (nick === "mouse14") return telecomPickLine(["후후후.. 왜 그렇게 웃어", "푸히히.. 나도 웃기네", "알가쓰.. 나도 웃기네"]);
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
  if (intent === "question") {
    if (telecomIsKksTypingContext(userText)) {
      return casual
        ? telecomPickLine(["아마 자판이 아직 서툰가봐", "천천히 치고 계신 것 같아", "기다리면 올라올 듯"])
        : telecomPickLine(["아마 자판이 아직 서투르신가 봐요", "천천히 입력하고 계신 것 같아요", "조금 기다리면 올라올 것 같아요"]);
    }
    return casual ? telecomPickLine(["그건 나도 궁금하네", "그건 좀 물어보자", "누가 알면 말해줘"]) : telecomPickLine(["그건 저도 궁금해요", "아시는 분 계세요?", "조금 더 봐야겠어요"]);
  }

  if (role === "follow") {
    const prev = telecomRecentLogItems(6).filter(x => x.kind === "say").slice(-1)[0];
    const prevMember = prev ? telecomFindMemberByNick(prev.nick) : null;
    return telecomContextFollowLine(member, intent, userText, prevMember);
  }
  // 미분류 문장은 사용자의 문장을 복사해 '~말씀이군요'로 되받지 않는다.
  return casual
    ? telecomPickLine(["응", "그렇구나", "나도 보고 있었어", "그러게", "잠깐만, 무슨 흐름인지 보고 있었어"])
    : telecomPickLine(["네", "그렇군요", "저도 보고 있었어요", "그러게요", "잠깐 흐름을 보고 있었어요"]);
}
function telecomHumanKksReply(intent, userText = "", target = "user") {
  const s = telecomCurrentSettings();
  const given = telecomHumanUserDisplayName();
  let prefix = "";
  if (target === "user") {
    if (s.close === "best" || s.close === "veryClose") prefix = `${telecomNameWithAh(given)} `;
    else if (s.close === "close") prefix = `${given}님 `;
  }
  if (intent === "angry") return telecomPickLine([`${prefix}화낼 일은 화내야죠`, "근데 말은 조금 아껴요", "에이... 그건 좀 그렇네요"]);
  if (intent === "curse") return telecomPickLine(["욕은 조금만요", "에이씨... 그래도 참아요", "말 세게 하면 더 아파요"]);
  if (intent === "joke") return telecomPickLine(["훗...", "그건 좀 웃기네요", "개그가 좀 썰렁한데요"]);
  if (intent === "sad") return telecomPickLine([`${prefix}그런 날 있죠`, "슬픈 건 그냥 슬픈 거예요", "울적하면 노래 하나 들어요"]);
  if (intent === "fight") return telecomPickLine(["싸우지 말아요", "둘 다 잠깐만요", "한 사람씩 얘기해요"]);
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
  const analysis = telecomEmotionModel(userText);
  const fixedText = analysis.fixed;
  const intent = analysis.intent;
  telecomUpdateRoomMood(analysis);
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
      telecomQueueKks(telecomHumanKksReply(intent, fixedText, "user"), telecomKksTypingDelay(3000));
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
    if (telecomKksActive() && Math.random() < 0.45) telecomQueueKks(telecomKksGreetingAnswerLine(fixedText), telecomKksTypingDelay(2000));
    return;
  }

  const members = telecomWeightedPersonaMembers(intent, allTargeted ? 3 : 2);
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

  // v153: 김광석을 억지로 막는 것이 아니라, PC통신/타자가 서툴러 반응이 늦게 뜨는 구조다.
  // 직접 부르거나 음악/위로 흐름이면 비교적 높은 확률로, 일반 잡담이면 낮은 확률로 한참 뒤 짧게 반응한다.
  const emotionalForKks = TELECOM_EMOTION_INTENTS.has(intent) || intent === "comfort";
  const kksChance = kksTargeted ? 0.92 : (intent === "music" || emotionalForKks ? 0.50 : 0.14);
  if (telecomKksActive() && Math.random() < kksChance) {
    telecomQueueKks(telecomHumanKksReply(intent, fixedText, "user"), telecomKksTypingDelay(kksTargeted ? 4000 : 18000));
  }

  // v157: 회원도 자연스럽게 김광석에게 말을 걸고, 김광석은 늦게 답한다.
  // 단, 너무 자주 나오면 산만하므로 음악/위로/싸움/질문 흐름 위주로 낮은 확률 + 쿨다운을 둔다.
  const exchangeChance = intent === "music" ? 0.42
    : ["sad", "comfort", "fight", "angry", "curse"].includes(intent) ? 0.34
    : telecomIsKksTypingContext(fixedText) ? 0.55
    : intent === "question" ? 0.24
    : 0.10;
  if (!kksTargeted) {
    telecomMaybeScheduleMemberKksExchange(intent, fixedText, { chance: exchangeChance, askDelay: telecomRand(10500, 22000), minGap: 70000 });
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


// v157: 회원 ↔ 김광석 직접 대화 흐름.
// 목표: 사용자가 김광석에게만 묻는 구조가 아니라, 방 안의 회원들도 광석이형/아저씨에게 말을 걸고
// 김광석은 타자가 서툴러 한참 뒤 짧게 답하는 느낌을 만든다.
const TELECOM_KKS_MEMBER_EXCHANGE_COOLDOWN_KEY = "kwangseokTelecomKksMemberExchangeCooldownV157";
function telecomKksMemberExchangeAllowed(minGap = 65000) {
  const last = Number(localStorage.getItem(TELECOM_KKS_MEMBER_EXCHANGE_COOLDOWN_KEY) || 0);
  return telecomNow() - last > minGap;
}
function telecomMarkKksMemberExchange() {
  localStorage.setItem(TELECOM_KKS_MEMBER_EXCHANGE_COOLDOWN_KEY, String(telecomNow()));
}
function telecomMemberAskKksLine(member, intent = "chat", seed = "") {
  const call = telecomMemberCallKks(member);
  const casual = telecomMemberUsesCasual(member);
  const topic = telecomExtractConcreteThing(seed || "");
  const nick = member?.nick || "";

  if (intent === "music") {
    const songTitle = telecomExtractSongTitle(seed || "");
    if (!songTitle) {
      if (nick === "soriboy") return telecomPickLine([
        `${call}, 어느 곡 얘기인지 먼저 정해야겠네요`,
        `${call}, 곡 제목을 알아야 라이브 얘기도 할 수 있겠죠?`,
        `${call}, 지금은 그냥 음악 얘기만 나온 것 같아요`
      ]);
      if (nick === "낙원") return telecomPickLine([
        `${call}, 어떤 노래 얘기인지 궁금해요`,
        `${call}, 곡 이름 나오면 그때 여쭤봐요`,
        `${call}, 그냥 노래 얘기만 해도 좋네요`
      ]);
      return casual
        ? telecomPickLine([`${call}, 무슨 노래 얘기야?`, `${call}, 곡 제목부터 말해봐`, `${call}, 그냥 음악 얘기 하는 중이지?`])
        : telecomPickLine([`${call}, 어떤 곡 이야기인가요?`, `${call}, 곡 제목을 먼저 들어봐야겠네요`, `${call}, 음악 이야기는 좋네요`]);
    }
    if (nick === "soriboy") return telecomPickLine([
      `${call}, '${songTitle}' 라이브로 부를 때 느낌이 달랐나요?`,
      `${call}, '${songTitle}' 방송 녹음하고 공연 녹음은 좀 다르죠?`,
      `${call}, '${songTitle}' 얘기 조금만 해주세요`
    ]);
    if (nick === "낙원") return telecomPickLine([
      `${call}, '${songTitle}'는 어떤 마음으로 부르셨어요?`,
      `${call}, '${songTitle}' 들으면 마음이 좀 그렇더라구요`,
      `${call}, '${songTitle}' 얘기 하나만 해주세요`
    ]);
    return casual
      ? telecomPickLine([`${call}, '${songTitle}' 어땠어?`, `${call}, '${songTitle}' 라이브 얘기 좀 해줘`, `${call}, '${songTitle}' 기타로 칠 때 어렵나?`])
      : telecomPickLine([`${call}, '${songTitle}'는 어떠셨어요?`, `${call}, '${songTitle}' 라이브 때는 느낌이 달랐나요?`, `${call}, '${songTitle}' 이야기를 조금만 해주세요`]);
  }

  if (["sad", "comfort"].includes(intent)) {
    return casual
      ? telecomPickLine([`${call}, 이런 날엔 무슨 노래 들어?`, `${call}, 한마디만 해줘`, `${call}, 좀 울적할 땐 어떻게 해?`])
      : telecomPickLine([`${call}, 이런 날에는 어떤 노래가 좋을까요?`, `${call}, 한마디만 해주세요`, `${call}, 마음이 가라앉을 때는 어떻게 하셨어요?`]);
  }

  if (["fight", "angry", "curse"].includes(intent)) {
    return casual
      ? telecomPickLine([`${call}, 이럴 땐 좀 말려줘`, `${call}, 방 분위기 좀 이상해`, `${call}, 한마디만 해봐`])
      : telecomPickLine([`${call}, 이런 분위기엔 어떻게 말하면 좋을까요?`, `${call}, 잠깐 말려주세요`, `${call}, 한마디 해주세요`]);
  }

  if (telecomIsKksTypingContext(seed)) {
    return casual
      ? telecomPickLine([`${call}, 자판 아직 어려워?`, `${call}, 타자 치기 오래 걸려?`, `${call}, 지금 한 글자씩 치는 중이야?`])
      : telecomPickLine([`${call}, 자판이 아직 어려우세요?`, `${call}, 타자 치는 데 오래 걸리세요?`, `${call}, 지금 천천히 입력 중이세요?`]);
  }

  if (["laugh", "joke"].includes(intent)) {
    return casual
      ? telecomPickLine([`${call}, 이거 웃기지?`, `${call}, 지금 웃었지?`, `${call}, 개그 어땠어?`])
      : telecomPickLine([`${call}, 이 농담 어떠세요?`, `${call}, 조금 웃기지 않나요?`, `${call}, 지금 웃으셨어요?`]);
  }

  if (intent === "doing" || intent === "question") {
    return casual
      ? telecomPickLine([`${call}, 지금 뭐해?`, `${call}, 보고 있어?`, `${call}, 답 치고 있어?`])
      : telecomPickLine([`${call}, 지금 뭐하고 계세요?`, `${call}, 보고 계세요?`, `${call}, 답 입력 중이세요?`]);
  }

  return casual
    ? telecomPickLine([`${call}, 아직 있어?`, `${call}, 뭐라고 생각해?`, `${call}, 한마디 해줘`])
    : telecomPickLine([`${call}, 아직 계세요?`, `${call}, 어떻게 생각하세요?`, `${call}, 한마디 해주세요`]);
}
function telecomKksReplyToMemberLine(member, intent = "chat", seed = "") {
  const given = telecomGivenName(member?.name || member?.nick || "") || member?.nick || "";
  const call = given ? telecomNameWithAh(given) : "";
  if (intent === "music") {
    const songTitle = telecomExtractSongTitle(seed || "");
    if (!songTitle) return telecomPickLine([
      call ? `${call}, 어떤 노래 말하는 거야?` : "어떤 노래 말하는 거예요?",
      "곡 이름을 알아야 얘기하지요",
      "그냥 음악 얘기면 좋죠",
      "노래 얘기는 천천히 해요"
    ]);
    return telecomPickLine([
      call ? `${call}, '${songTitle}'는 천천히 해야 돼` : `'${songTitle}'는 천천히 해야 돼요`,
      `'${songTitle}'는 라이브마다 조금 달라요`,
      `'${songTitle}'는 기타 치면서 부르면 또 다르죠`,
      `'${songTitle}'는 마음이 먼저 가야 돼요`
    ]);
  }
  if (["sad", "comfort"].includes(intent)) return telecomPickLine([
    call ? `${call}, 괜찮다` : "괜찮아요",
    "그런 날 있죠",
    "울적하면 노래 하나 들어요",
    "너무 오래 혼자 있지 말아요"
  ]);
  if (["fight", "angry", "curse"].includes(intent)) return telecomPickLine([
    "그만하자. 말이 너무 세다",
    "서로 조금만 천천히 말하자",
    "한 사람씩 얘기해요",
    "말이 세면 마음이 다쳐요"
  ]);
  if (telecomIsKksTypingContext(seed) || intent === "doing") return telecomPickLine([
    "자판 보고 치고 있어요",
    "좀 오래 걸리네요",
    "한 글자씩 치는 중이에요",
    "PC통신은 아직 어렵네요"
  ]);
  if (["laugh", "joke"].includes(intent)) return telecomPickLine([
    "하하... 이제 봤네",
    "그건 좀 웃기다",
    "나 지금 읽고 웃었다",
    "개그가 좀 썰렁한데요"
  ]);
  if (intent === "question") return telecomPickLine([
    "그건 좀 어렵네요",
    "천천히 얘기해봐요",
    "잘은 모르겠어요",
    "생각 좀 해볼께요"
  ]);
  return telecomPickLine([
    "네, 보고 있어요",
    "그래요",
    "응...",
    "자판이 좀 늦네요"
  ]);
}
function telecomMaybeScheduleMemberKksExchange(intent = "chat", seed = "", options = {}) {
  if (!telecomRoomOpen() || !telecomKksActive()) return false;
  if (!telecomKksMemberExchangeAllowed(options.minGap || 65000)) return false;
  const chance = typeof options.chance === "number" ? options.chance : 0.22;
  if (Math.random() > chance) return false;
  const preferred = intent === "music" ? ["soriboy", "낙원", "oldsong0106", "녹차향기"]
    : ["sad", "comfort"].includes(intent) ? ["enfant", "낙원", "녹차향기"]
    : ["fight", "angry", "curse"].includes(intent) ? ["녹차향기", "soulman", "mouse14"]
    : ["mouse14", "raincoat", "녹차향기", "soriboy"];
  let asker = preferred.map(telecomFindMemberByNick).find((m) => m && telecomIsMemberActive(m.nick));
  if (!asker) asker = telecomPickMember();
  if (!asker) return false;
  telecomMarkKksMemberExchange();
  const askDelay = options.askDelay == null ? telecomRand(5200, 12500) : options.askDelay;
  telecomQueue(() => {
    if (!telecomRoomOpen() || !telecomKksActive() || !telecomIsMemberActive(asker.nick)) return;
    const asked = telecomSayMember(asker, telecomMemberAskKksLine(asker, intent, seed));
    if (!asked) return;
    telecomQueueKks(telecomKksReplyToMemberLine(asker, intent, seed), telecomKksTypingDelay(options.replyExtraDelay || 3000));
  }, askDelay);
  return true;
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
  if (telecomKksActive() && Math.random() < 0.30 && telecomKksMemberExchangeAllowed(90000)) {
    telecomMaybeScheduleMemberKksExchange(sc.intent, sc.seed, { chance: 1, askDelay: telecomRand(7800, 14500), minGap: 90000, replyExtraDelay: 6000 });
    return;
  }
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

// v159: 카톡 단체대화 느낌 보강.
// 핵심: 한 사람이 말하면 다음 사람이 그 말을 받아치고, 가끔 회원끼리 서로 묻고 답한다.
// 사용자의 오타는 화면에는 그대로 두되, 내부 판단은 보정된 문장으로 이어간다.
function telecomRecentSayItems(limit = 8) {
  return telecomLoadJson(TELECOM_STORAGE.log, []).filter((x) => x.kind === "say").slice(-limit);
}
function telecomLastSayItem(excludeNick = "") {
  const list = telecomRecentSayItems(10).reverse();
  return list.find((x) => !excludeNick || x.nick !== excludeNick) || null;
}
function telecomHasTypoCorrection(raw, fixed) {
  return String(raw || "").trim() && String(raw || "").trim() !== String(fixed || "").trim();
}
function telecomKakaoTinyReaction(member, intent, seed = "", previousMember = null) {
  const casual = telecomMemberUsesCasual(member);
  const nick = member?.nick || "";
  const prev = previousMember ? (telecomGivenName(previousMember.name) || previousMember.nick) : "";
  const songTitle = telecomExtractSongTitle(seed || "");
  if (intent === "greeting") return telecomGreetingAnswerLine(member, seed);
  if (["fight", "angry", "curse"].includes(intent)) return telecomEmotionFollowLine(member, intent);
  if (["laugh", "joke"].includes(intent)) {
    if (nick === "mouse14") return telecomPickLine(["ㅋㅋㅋㅋ", "푸히히 그건 웃겼다", "후후후.. 방금 터졌다"]);
    if (nick === "ekjw123") return telecomPickLine(["우하하~~~~~~~~", "ㅋㅋㅋㅋㅋㅋ", "아 미치겠다 진짜"]);
    return casual ? telecomPickLine(["ㅋㅋ", "나도 웃겼어", "그건 좀 웃기네"]) : telecomPickLine(["하하", "저도 웃겼어요", "분위기 좀 풀렸네요"]);
  }
  if (intent === "music") {
    if (songTitle) {
      if (nick === "soriboy") return telecomPickLine([`'${songTitle}' 자료는 한번 찾아볼게요`, `'${songTitle}'는 라이브 쪽이 더 궁금합니다`, `'${songTitle}' 얘기면 기록이 좀 있을 겁니다`]);
      if (nick === "낙원") return telecomPickLine([`'${songTitle}'는 밤에 들으면 더 그렇죠`, `저는 '${songTitle}' 들으면 좀 조용해져요`, `그 노래는 마음이 먼저 가요`]);
      return casual ? telecomPickLine([`'${songTitle}' 좋지`, `나도 '${songTitle}' 좋아해`, `그 노래는 인정`]) : telecomPickLine([`'${songTitle}' 좋네요`, `저도 그 노래 좋아해요`, `그 곡은 이야기가 많죠`]);
    }
    return casual ? telecomPickLine(["무슨 곡 얘기야?", "노래 얘기 나오면 또 진지해지네", "곡 이름 나오면 더 재밌겠다"]) : telecomPickLine(["어떤 곡인지 나오면 더 얘기할 수 있겠네요", "노래 얘기는 좋네요", "곡명이 있으면 자료도 찾아볼 수 있겠어요"]);
  }
  if (intent === "doing") {
    if (nick === "mouse14") return telecomPickLine(["난 눈팅중 ㅋㅋ", "후후후.. 방 보고 있었지", "그냥 사람들 뭐하나 보는 중"]);
    if (nick === "enfant") return telecomPickLine(["저는 조용히 글 읽고 있었어요...", "음........ 그냥 보고 있었어요...", "낙서장 읽고 있었어요..."]);
    if (nick === "soriboy") return telecomPickLine(["저는 자료실 보고 있었습니다", "라디오 녹음 글 찾고 있었어요", "음반 목록 보고 있었습니다"]);
    return casual ? telecomPickLine(["난 그냥 보고 있었어", "잠깐 들어와 있었지", "글 읽는 중"]) : telecomPickLine(["저는 게시판 보고 있었어요", "잠깐 글 읽고 있었습니다", "자료실 확인하고 있었어요"]);
  }
  if (["sad", "comfort"].includes(intent)) {
    if (nick === "enfant") return telecomPickLine(["그런 날 있죠...", "말 안 해도 조금 알 것 같아요...", "오늘은 조용히 있어도 돼요..."]);
    if (nick === "낙원") return telecomPickLine(["그 말 들으니까 노래가 더 슬프게 들려요", "마음이 좀 내려앉네요", "그런 밤이 있죠"]);
    return casual ? telecomPickLine(["그럴 땐 좀 쉬어", "혼자 있지 말고 여기 있어", "노래 하나 듣자"]) : telecomPickLine(["천천히 이야기하세요", "혼자 오래 들고 있지 마세요", "오늘은 조금 쉬어도 돼요"]);
  }
  if (intent === "question") {
    if (telecomIsKksTypingContext(seed)) return casual ? telecomPickLine(["맞아, 자판이 느려서 그럴걸", "한 글자씩 치는 중일 듯", "기다리면 올라올 거야"]) : telecomPickLine(["아마 자판이 익숙하지 않으셔서 그럴 거예요", "천천히 입력 중이신 것 같아요", "조금 기다리면 답이 올라올 것 같아요"]);
    if (nick === "soulman") return telecomPickLine(["질문을 조금 나눠서 보면 좋겠네요", "그건 앞의 흐름하고 같이 봐야 해요", "단정하긴 어렵지만 맥락은 보입니다"]);
    return casual ? telecomPickLine(["그건 나도 궁금해", "누가 알면 말해줘", "음.. 그건 좀 봐야겠다"]) : telecomPickLine(["저도 궁금하네요", "아시는 분 계실까요?", "조금 더 봐야겠어요"]);
  }
  if (previousMember && prev) {
    if (nick === "mouse14") return casual ? `${prev} 말이 맞는 듯 ㅋㅋ` : `${prev}님 말이 맞는 것 같네요 ㅋㅋ`;
    if (nick === "soulman") return casual ? `${prev} 말에 이어서 보면 그렇죠` : `${prev}님 말씀에 이어서 보면 그렇네요`;
    if (nick === "enfant") return `${prev}님 말도 조금 알 것 같아요...`;
  }
  return casual ? telecomPickLine(["응", "맞아", "그러게", "그건 좀 그렇네", "나도 보고 있었어"]) : telecomPickLine(["네", "맞아요", "그러게요", "저도 그렇게 봤어요", "조금 알 것 같아요"]);
}
function telecomKakaoPrimaryLine(member, analysis, rawText = "") {
  const fixed = analysis.fixed || telecomCanonicalInput(rawText);
  const intent = analysis.intent || telecomIntent(fixed);
  if (telecomHasTypoCorrection(rawText, fixed) && Math.random() < 0.35) {
    return telecomMemberUsesCasual(member)
      ? telecomPickLine(["오타 있어도 무슨 말인진 알겠어", "ㅋㅋ 알아들었어", "글자 좀 튀어도 흐름은 보여"])
      : telecomPickLine(["오타가 있어도 뜻은 알겠어요", "네, 무슨 말씀인지 이해했습니다", "글자가 조금 섞였지만 흐름은 보여요"]);
  }
  return telecomPersonaModelLine(member, analysis, fixed, "answer") || telecomHumanMemberLine(member, intent, fixed, "answer") || telecomKakaoTinyReaction(member, intent, fixed);
}
function telecomMemberAskMemberLine(asker, listener, intent = "chat", seed = "") {
  const askerCasual = telecomMemberUsesCasual(asker);
  const listenerName = telecomGivenName(listener?.name || listener?.nick || "") || listener?.nick || "";
  const call = askerCasual ? telecomNameWithAh(listenerName) : `${listenerName}님`;
  const songTitle = telecomExtractSongTitle(seed || "");
  if (intent === "doing") return askerCasual ? `${call}는 뭐하고 있었어?` : `${call}은 뭐하고 계셨어요?`;
  if (intent === "music") {
    if (songTitle) return askerCasual ? `${call}, '${songTitle}' 들어봤어?` : `${call}, '${songTitle}' 자료 보신 적 있어요?`;
    return askerCasual ? `${call}, 무슨 노래 얘기였지?` : `${call}, 혹시 곡명 들으셨어요?`;
  }
  if (["sad", "comfort"].includes(intent)) return askerCasual ? `${call}, 너는 이럴 때 뭐 들어?` : `${call}, 이런 날엔 어떤 노래 들으세요?`;
  if (["fight", "angry", "curse"].includes(intent)) return askerCasual ? `${call}, 이거 좀 말려봐` : `${call}, 이 분위기 조금 정리해 주실래요?`;
  if (["laugh", "joke"].includes(intent)) return askerCasual ? `${call}, 방금 봤어? ㅋㅋ` : `${call}, 방금 말 좀 웃기지 않았어요?`;
  return askerCasual ? `${call}, 너는 어떻게 봐?` : `${call}, 어떻게 보세요?`;
}
function telecomMemberAnswerMemberLine(listener, asker, intent = "chat", seed = "") {
  const askerName = telecomGivenName(asker?.name || asker?.nick || "") || asker?.nick || "";
  const casual = telecomMemberUsesCasual(listener);
  const base = telecomKakaoTinyReaction(listener, intent, seed, asker);
  if (!askerName) return base;
  if (intent === "doing") return casual ? `${askerName}아, 난 ${base.replace(/^저는\s*/, "").replace(/^난\s*/, "")}` : `${askerName}님, 저는 ${base.replace(/^저는\s*/, "")}`;
  if (["fight", "angry", "curse"].includes(intent)) return base;
  return base;
}
function telecomSchedulePeerExchange(intent = "chat", seed = "", after = 6500, exclude = []) {
  const active = telecomActiveMemberNicks().filter((n) => !exclude.includes(n));
  if (active.length < 2) return false;
  const a = telecomWeightedPersonaMembers(intent, 1, exclude)[0] || telecomPickMember(exclude);
  const b = telecomPickMember([a?.nick].concat(exclude));
  if (!a || !b || a.nick === b.nick) return false;
  telecomQueue(() => {
    if (!telecomRoomOpen() || !telecomIsMemberActive(a.nick) || !telecomIsMemberActive(b.nick)) return;
    const asked = telecomSayMember(a, telecomMemberAskMemberLine(a, b, intent, seed));
    if (!asked) return;
    telecomQueue(() => {
      if (!telecomRoomOpen() || !telecomIsMemberActive(b.nick)) return;
      telecomSayMember(b, telecomMemberAnswerMemberLine(b, a, intent, seed));
    }, telecomRand(3600, 8200));
  }, after);
  return true;
}
function telecomScheduleConversationFlow(userText) {
  const rawText = String(userText || "");
  const analysis = telecomEmotionModel(rawText);
  const fixedText = analysis.fixed;
  const intent = analysis.intent;
  telecomUpdateRoomMood(analysis);
  telecomSetThread(intent, fixedText);
  telecomRememberTopic(intent);

  const allTargeted = /다들|여러분|님들|회원|팬들|방에|방/.test(fixedText);
  const mentionedMember = telecomFindMentionedMember(fixedText);
  const kksTargeted = telecomKksMentioned(fixedText);
  if (mentionedMember) telecomMemberJoin(mentionedMember, false);

  if (kksTargeted && !allTargeted) {
    if (telecomKksActive()) telecomQueueKks(telecomHumanKksReply(intent, fixedText, "user"), telecomKksTypingDelay(3000));
    else {
      const helper = telecomFindMemberByNick("녹차향기") || telecomPickMember();
      if (helper) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(helper, "광석 아찌 지금은 안 계신 것 같아요. 글 남겨두면 보실거예요"); }, telecomRand(1800, 3600));
    }
    if (Math.random() < 0.36) telecomSchedulePeerExchange(intent, fixedText, telecomRand(6200, 11000), [mentionedMember?.nick].filter(Boolean));
    return;
  }

  if (intent === "greeting") {
    const greeter = telecomFindMemberByNick("녹차향기") || telecomPickMember();
    const second = allTargeted ? telecomPickMember([greeter?.nick]) : (Math.random() < 0.28 ? telecomPickMember([greeter?.nick]) : null);
    if (greeter) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(greeter, telecomGreetingAnswerLine(greeter, fixedText)); }, telecomRand(700, 1700));
    if (second) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(second, telecomGreetingAnswerLine(second, fixedText)); }, telecomRand(2300, 4600));
    if (telecomKksActive() && Math.random() < 0.35) telecomQueueKks(telecomKksGreetingAnswerLine(fixedText), telecomKksTypingDelay(2000));
    return;
  }

  if (mentionedMember && !allTargeted) {
    const follow = telecomPickMember([mentionedMember.nick]);
    telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(mentionedMember, telecomKakaoPrimaryLine(mentionedMember, analysis, rawText)); }, telecomRand(1100, 2900));
    if (follow && Math.random() < 0.55) telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(follow, telecomKakaoTinyReaction(follow, intent, fixedText, mentionedMember)); }, telecomRand(4300, 7800));
    return;
  }

  const members = telecomWeightedPersonaMembers(intent, allTargeted ? 3 : 2);
  const m1 = members[0] || telecomPickMember();
  const m2 = members[1] || telecomPickMember([m1?.nick]);
  const m3 = members[2] || telecomPickMember([m1?.nick, m2?.nick]);
  if (!m1) return;

  telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m1, telecomKakaoPrimaryLine(m1, analysis, rawText)); }, telecomRand(900, 2400));
  if (m2 && Math.random() < (allTargeted ? 0.78 : 0.62)) {
    telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m2, telecomKakaoTinyReaction(m2, intent, fixedText, m1)); }, telecomRand(3600, 6900));
  }

  // 단체대화 느낌: 전체 질문, 감정이 큰 말, 웃긴 말, 음악 이야기는 가끔 회원끼리 바로 묻고 답한다.
  const peerChance = allTargeted ? 0.50
    : ["fight", "angry", "curse", "sad", "comfort"].includes(intent) ? 0.42
    : ["laugh", "joke"].includes(intent) ? 0.36
    : intent === "music" ? 0.40
    : intent === "doing" ? 0.32
    : 0.18;
  if (m2 && Math.random() < peerChance) {
    telecomSchedulePeerExchange(intent, fixedText, telecomRand(7200, 12500), [m1.nick, m2.nick].filter(Boolean));
  } else if (allTargeted && m3 && Math.random() < 0.34) {
    telecomQueue(() => { if (telecomRoomOpen()) telecomSayMember(m3, telecomKakaoTinyReaction(m3, intent, fixedText, m2 || m1)); }, telecomRand(7200, 11800));
  }

  const emotionalForKks = TELECOM_EMOTION_INTENTS.has(intent) || intent === "comfort";
  const kksChance = intent === "music" ? 0.34 : emotionalForKks ? 0.30 : telecomIsKksTypingContext(fixedText) ? 0.55 : 0.08;
  if (telecomKksActive() && Math.random() < kksChance) {
    // 김광석은 즉답하지 않고, 단체방을 읽다가 늦게 한 줄 보낸다.
    telecomQueueKks(telecomHumanKksReply(intent, fixedText, "user"), telecomKksTypingDelay(18000));
  }

  const exchangeChance = intent === "music" ? 0.30
    : ["sad", "comfort", "fight", "angry", "curse"].includes(intent) ? 0.26
    : telecomIsKksTypingContext(fixedText) ? 0.48
    : 0.07;
  telecomMaybeScheduleMemberKksExchange(intent, fixedText, { chance: exchangeChance, askDelay: telecomRand(15000, 26000), minGap: 80000 });
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
    telecomQueueKks(telecomGenerateKksOpener(), telecomKksTypingDelay(4000));
    telecomQueue(() => {
      const greeter = telecomFindMemberByNick("녹차향기") || telecomPickMember();
      if (telecomRoomOpen() && greeter) telecomSayMember(greeter, "광석 아찌 어서오세요");
    }, telecomRand(3200, 6200));
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

