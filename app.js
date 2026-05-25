
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

const APP_VERSION = "v118-playlist-midnight-cover-sync";
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


const VALID_PAGES = ["home", "siteinfo", "videos", "songs", "radios", "photos", "stories", "about", "oneum", "login", "signup", "mypage", "loginRequired", "admin"];
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


function getKoreanDateTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function getMsUntilNextKoreanMidnight() {
  const now = new Date();
  const kst = getKoreanDateTimeParts(now);
  const elapsedToday = ((kst.hour * 60 + kst.minute) * 60 + kst.second) * 1000 + now.getMilliseconds();
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1000, dayMs - elapsedToday + 300);
}

function getItemVisualImageUrl(item) {
  const candidates = [
    item?.thumbnailUrl,
    item?.imageUrl,
    item?.coverUrl,
    item?.albumCoverUrl,
    item?.albumCover,
    item?.photoUrl,
    item?.posterUrl
  ];
  const found = candidates.map((value) => String(value || "").trim()).find(Boolean);
  return found ? normalizeMediaUrlForPlayback(found, "image") : "";
}

function pauseOtherMediaElements(activeMedia) {
  document.querySelectorAll("audio, video").forEach((media) => {
    if (media === activeMedia) return;
    if (!media.paused && !media.ended) {
      try { media.pause(); } catch (_) {}
    }
  });
}

let globalSingleMediaPlaybackInstalled = false;
function installSingleMediaPlaybackGuard() {
  if (globalSingleMediaPlaybackInstalled) return;
  globalSingleMediaPlaybackInstalled = true;
  document.addEventListener("play", (event) => {
    const target = event.target;
    if (target && (target.tagName === "AUDIO" || target.tagName === "VIDEO")) {
      pauseOtherMediaElements(target);
    }
  }, true);
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
        pauseOtherMediaElements(audio);
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

function getUserPlaylistDateKeyStorageKey() {
  return "kwangseoks_user_playlist_date_key_v1";
}

function ensureUserPlaylistForToday() {
  const todayKey = getKoreanDateKey();
  const savedDateKey = localStorage.getItem(getUserPlaylistDateKeyStorageKey());
  if (savedDateKey && savedDateKey !== todayKey) {
    localStorage.removeItem(getUserPlaylistStorageKey());
    localStorage.setItem(getUserPlaylistDateKeyStorageKey(), todayKey);
    playlistCurrentItemId = "";
    playlistRequestedItemId = "";
    return false;
  }
  if (!savedDateKey) localStorage.setItem(getUserPlaylistDateKeyStorageKey(), todayKey);
  return true;
}

function loadUserPlaylistIds() {
  ensureUserPlaylistForToday();
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
  localStorage.setItem(getUserPlaylistDateKeyStorageKey(), getKoreanDateKey());
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
  const card = player?.querySelector(".playlist-player-card");

  if (!player || !audio || !title || !sub || !playBtn || !progress || !current || !duration || !muteBtn || !volumeSlider) return;

  const songs = getUserPlaylistSongs();
  if (!songs.length) {
    player.classList.add("closed");
    playlistCurrentItemId = "";
    title.textContent = "선택한 곡이 없습니다";
    sub.textContent = "Songs에서 듣고 싶은 곡을 담으면 표시됩니다.";
    if (card) {
      card.classList.remove("has-playlist-cover");
      card.style.removeProperty("--playlist-cover-image");
    }
    resetPlaylistPlayerUi(audio, playBtn, progress, current, duration);
    return;
  }

  // 플레이리스트에 곡이 있으면 새로고침 후에도 다시 표시합니다.
  player.classList.remove("closed");

  const requestedIndex = playlistRequestedItemId ? songs.findIndex((item) => String(item.id) === String(playlistRequestedItemId)) : -1;
  const currentIndex = playlistCurrentItemId ? songs.findIndex((item) => String(item.id) === String(playlistCurrentItemId)) : -1;
  const selectedIndex = requestedIndex >= 0 ? requestedIndex : (currentIndex >= 0 ? currentIndex : 0);
  const selected = songs[selectedIndex] || songs[0];
  const sourceUrl = normalizeMediaUrlForPlayback(getPlayableAudioUrl(selected), "audio");
  const coverUrl = getItemVisualImageUrl(selected);
  if (card) {
    if (coverUrl) {
      card.classList.add("has-playlist-cover");
      card.style.setProperty("--playlist-cover-image", `url("${coverUrl.replace(/"/g, "%22")}")`);
    } else {
      card.classList.remove("has-playlist-cover");
      card.style.removeProperty("--playlist-cover-image");
    }
  }

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
      if (audio.paused) {
        pauseOtherMediaElements(audio);
        await audio.play();
      } else {
        audio.pause();
      }
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


let koreanMidnightTimer = null;
function refreshPlayersAtKoreanMidnight() {
  clearUserPlaylist();
  dailyRecommendedItemId = "";
  const dailyAudio = document.getElementById("dailyPlayerAudio");
  if (dailyAudio) {
    dailyAudio.pause();
    dailyAudio.removeAttribute("src");
    dailyAudio.load?.();
  }
  setupDailyRecommendPlayer();
  setupUserPlaylistPlayer({ forceOpen: false });
  updatePlaylistAddButtons();
  scheduleNextKoreanMidnightRefresh();
}

function scheduleNextKoreanMidnightRefresh() {
  if (koreanMidnightTimer) clearTimeout(koreanMidnightTimer);
  koreanMidnightTimer = setTimeout(refreshPlayersAtKoreanMidnight, getMsUntilNextKoreanMidnight());
}

async function loadContents() {
  try {
    const snap = await getDocs(query(collection(db, "contents"), orderBy("createdAt", "desc")));
    allContents = [];
    snap.forEach(d => { const item = { id:d.id, ...d.data() }; if (item.isPublic !== false) allContents.push(item); });
    renderAllContentSections();
    setupDailyRecommendPlayer();
    setupUserPlaylistPlayer({ forceOpen: false });
    updatePlaylistAddButtons();
    scheduleNextKoreanMidnightRefresh();
    installSingleMediaPlaybackGuard();
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
  else if (item.mediaType === "video" || (item.category === "videos" && videoMediaUrl)) media = `<video controls playsinline webkit-playsinline preload="metadata" controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false" src="${normalizeMediaUrlForPlayback(videoMediaUrl, "video")}" poster="${escapeHtml(item.thumbnailUrl || "")}"></video>`;
  else if (isAudioContentItem(item)) media = `${item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title)}">` : `<div class="card-placeholder">음원 자료</div>`}<audio controls controlsList="nodownload noplaybackrate" oncontextmenu="return false" src="${normalizeMediaUrlForPlayback(getPlayableAudioUrl(item), "audio")}"></audio>`;
  else if (item.mediaUrl) media = `<img src="${normalizeMediaUrlForPlayback(item.mediaUrl, "image")}" alt="${escapeHtml(item.title)}">`;
  else media = `<div class="card-placeholder">글 자료</div>`;
  card.innerHTML = `${media}<div class="card-body"><h3>${escapeHtml(item.title)}</h3>${item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : ""}<p class="text-preview">${escapeHtml(makeTextPreview(item.description || item.body || "", 90))}</p><p><strong>분류:</strong> ${escapeHtml(item.category)}</p>${isOneumItem(item) ? oneumMetaMarkup(item) : `<p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p><p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>`}${createdDateMarkup(item)}</div>`;
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
      return `<div class="detail-media-box"><video controls playsinline webkit-playsinline preload="metadata" controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false" src="${escapeHtml(playbackMediaUrl)}"></video></div>`;
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

  mediaArea.innerHTML = mediaHtml || "";
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
