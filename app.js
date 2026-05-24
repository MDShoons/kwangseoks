
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

const APP_VERSION = "v81-radio-raw-url-fix";
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


const VALID_PAGES = ["home", "videos", "songs", "radios", "photos", "stories", "about", "oneum", "login", "signup", "mypage", "loginRequired", "admin"];
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
  ["adminContentForm","adminVideoForm","adminPhotoForm","adminAudioForm","adminRadioForm","adminManageForm","adminTemplateForm","adminCategoryForm"].forEach(id => document.getElementById(id)?.classList.add("hidden"));
  const map = {content:"adminContentForm", video:"adminVideoForm", photo:"adminPhotoForm", audio:"adminAudioForm", radio:"adminRadioForm", manage:"adminManageForm", template:"adminTemplateForm", category:"adminCategoryForm"};
  document.getElementById(map[type])?.classList.remove("hidden");
  if (type === "video") populateSpecificSubCategorySelect("videos", "videoSubCategory");
  if (type === "audio") populateSpecificSubCategorySelect("songs", "audioSubCategory");
  if (type === "radio") populateSpecificSubCategorySelect("radios", "radioSubCategory");
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
  const category = document.getElementById("contentCategory").value;
  const subCategory = document.getElementById("contentSubCategory").value;
  const title = document.getElementById("contentTitle").value.trim();
  const body = document.getElementById("contentBody").value.trim();
  if (!title || !body) return alert("제목과 본문을 입력하세요.");
  try {
    const mediaUrl = await getImageDataUrlOrDirectUrl(document.getElementById("contentImageFile").files[0], document.getElementById("contentImageUrl").value, 1400);
    const payload = {
      category, subCategory, mediaType: mediaUrl ? "imageText" : "text", title, body, description: body,
      year: document.getElementById("contentYear").value.trim(),
      source: document.getElementById("contentSource").value.trim(),
      isFeatured: document.getElementById("contentFeatured").checked,
      isPublic: true, updatedAt: serverTimestamp()
    };
    if (mediaUrl) payload.mediaUrl = mediaUrl;
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
  const title = document.getElementById("videoTitle").value.trim();
  if (!title) return alert("영상 제목을 입력하세요.");
  const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
  const videoFile = document.getElementById("videoFile").files[0];
  const directVideoUrl = document.getElementById("videoFileUrl").value.trim();
  if (!youtubeUrl && !videoFile && !directVideoUrl) return alert("유튜브 URL, mp4 파일, 또는 영상 URL 중 하나를 입력하세요.");
  try {
    const embedUrl = youtubeUrl ? getYoutubeEmbedUrl(youtubeUrl) : "";
    if (youtubeUrl && !embedUrl) return alert("올바른 유튜브 URL을 입력하세요.");
    const uploadedVideoUrl = videoFile ? await uploadFileToGitHubWorker(videoFile, "videos") : "";
    const mediaUrl = embedUrl || directVideoUrl || uploadedVideoUrl;
    const thumbnailUrl = await getImageDataUrlOrDirectUrl(document.getElementById("videoImageFile").files[0], document.getElementById("videoImageUrl").value, 1000);
    await addDoc(collection(db, "contents"), { category:"videos", subCategory:document.getElementById("videoSubCategory").value,
      mediaType: embedUrl ? "youtube" : "video", title, youtubeUrl, mediaUrl, thumbnailUrl,
      year:document.getElementById("videoYear").value.trim(), source:document.getElementById("videoSource").value.trim(),
      description:document.getElementById("videoDescription").value.trim(), body:document.getElementById("videoDescription").value.trim(),
      isPublic:true, createdBy:currentUser.uid, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
    alert("영상이 저장되었습니다."); document.getElementById("adminVideoForm").reset(); await loadContents();
  } catch(e) { alert("영상 저장 오류: " + e.message); }
});

document.getElementById("saveAudioBtn").addEventListener("click", () => saveAudioLike("songs", "audio"));
document.getElementById("saveRadioBtn").addEventListener("click", () => saveAudioLike("radios", "radio"));

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
  const overlay = document.getElementById("screenProtectOverlay");
  if (!overlay) return;

  overlay.classList.remove("hidden");
  document.body.classList.add("screen-protect-blur");

  clearTimeout(window.__screenProtectTimer);
  window.__screenProtectTimer = setTimeout(() => {
    overlay.classList.add("hidden");
    document.body.classList.remove("screen-protect-blur");
  }, reason === "printscreen" ? 1800 : 900);
}

function installScreenProtection() {
  window.addEventListener("blur", () => {
    showScreenProtectOverlay("blur");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      document.body.classList.add("screen-protect-blur");
    } else {
      setTimeout(() => document.body.classList.remove("screen-protect-blur"), 600);
    }
  });

  window.addEventListener("beforeprint", () => {
    document.body.classList.add("print-protect");
    showScreenProtectOverlay("print");
  });

  window.addEventListener("afterprint", () => {
    document.body.classList.remove("print-protect");
  });
}

function installBasicContentProtection() {
  const allowEditable = (target) => {
    const tag = String(target?.tagName || "").toLowerCase();
    return ["input", "textarea", "select", "option"].includes(tag) || target?.isContentEditable;
  };

  const blockEvent = (event) => {
    if (allowEditable(event.target)) return true;
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

  // 오른쪽 클릭 차단
  document.addEventListener("contextmenu", blockEvent, true);

  // 드래그 저장 차단
  document.addEventListener("dragstart", blockEvent, true);

  // 일반 텍스트 선택 차단. 입력창은 허용.
  document.addEventListener("selectstart", (event) => {
    if (allowEditable(event.target)) return true;
    event.preventDefault();
    event.stopPropagation();
    return false;
  }, true);

  // 단축키 차단
  document.addEventListener("keydown", (event) => {
    const key = String(event.key || "").toLowerCase();

    const blocked =
      event.key === "F12" ||
      event.key === "PrintScreen" ||
      (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) ||
      (event.metaKey && event.altKey && ["i", "j", "c"].includes(key)) ||
      (event.ctrlKey && ["u", "s", "p"].includes(key)) ||
      (event.metaKey && ["u", "s", "p"].includes(key));

    if (blocked) {
      event.preventDefault();
      event.stopPropagation();
      showScreenProtectOverlay(event.key === "PrintScreen" ? "printscreen" : "shortcut");
      alert("이 사이트에서는 해당 기능을 사용할 수 없습니다.");
      return false;
    }

    return true;
  }, true);

  // 미디어/이미지 저장 방지 보강
  document.querySelectorAll("img, audio, video").forEach((el) => {
    el.setAttribute("draggable", "false");
    el.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }, true);
    el.addEventListener("dragstart", (event) => {
      event.preventDefault();
      event.stopPropagation();
      return false;
    }, true);
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
    const url = item.mediaUrl || item.fileUrl || item.audioUrl || "";
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


function getDailyPlayerClosedKey() {
  return `kwangseoks_daily_player_closed_${getKoreanDateKey()}`;
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

  localStorage.setItem(getDailyPlayerClosedKey(), "yes");
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

  if (!player || !audio || !title || !sub || !playBtn || !progress || !current || !duration || !muteBtn || !volumeSlider || !closeBtn) return;

  if (localStorage.getItem(getDailyPlayerClosedKey()) === "yes") {
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

  title.textContent = selected.title || "제목 없는 추천곡";
  sub.textContent = `${getKoreanDateKey()} · 매일 00:00 추천 변경`;

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
const pageState = {
  videos: 1,
  songs: 1,
  radios: 1,
  photos: 1,
  stories: 1,
  oneum: 1
};

function getItemTimestamp(item) {
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
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(pageState[page] || 1, 1), totalPages);
  pageState[page] = currentPage;

  const start = (currentPage - 1) * PAGE_SIZE;
  return {
    pageItems: items.slice(start, start + PAGE_SIZE),
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
  return `<p class="created-date"><strong>업로드일:</strong> ${escapeHtml(getItemCreatedDateText(item))}</p>`;
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
          <p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p>
          <p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>${createdDateMarkup(item)}
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

function renderList(id, items) {
  const box = document.getElementById(id);
  if (!box) return;

  box.innerHTML = "";

  if (!items.length) {
    box.innerHTML = "<p>등록된 자료가 없습니다.</p>";
    return;
  }

  const isStoryList = id === "storyList";

  items.forEach(item => {
    const div = document.createElement("div");
    div.className = (item.mediaUrl || item.thumbnailUrl) && item.mediaType !== "youtube" ? "list-item with-image" : "list-item";
    if (isStoryList) div.classList.add("story-preview-card");

    div.onclick = () => openContentDetail(item.id);

    const img = normalizeMediaUrlForPlayback(item.thumbnailUrl || (item.mediaType !== "audio" && item.mediaType !== "video" ? item.mediaUrl : ""), "image");
    const previewLength = isStoryList ? 110 : 90;
    const previewText = makeTextPreview(item.body || item.description || "", previewLength);

    div.innerHTML = `
      ${img ? `<img src="${img}" alt="${escapeHtml(item.title)}">` : ""}
      <div>
        <h3>${escapeHtml(item.title)}</h3>
        ${item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : ""}
        ${previewText ? `<p class="text-preview">${escapeHtml(previewText)}</p>` : ""}
        ${isStoryList ? `<p class="read-more-hint">전체 일기는 상세보기에서 볼 수 있습니다.</p>` : ""}
        ${item.mediaType === "audio" ? (id === "radioList" || id === "songList" ? renderRadioMonochromePlayer(normalizeMediaUrlForPlayback(item.mediaUrl, "audio"), `${id}-${item.id}`) : `<audio controls controlsList="nodownload noplaybackrate" oncontextmenu="return false" src="${normalizeMediaUrlForPlayback(item.mediaUrl, "audio")}"></audio>`) : ""}
        <p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p>
        <p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>
        ${createdDateMarkup(item)}
      </div>
    `;

    box.appendChild(div);
  });
}
function createCard(item) {
  const card = document.createElement("div"); card.className = "card"; card.onclick = () => openContentDetail(item.id);
  let media = "";
  if (item.mediaType === "youtube") media = `<iframe src="${normalizeMediaUrlForPlayback(item.mediaUrl, "audio")}" allowfullscreen></iframe>`;
  else if (item.mediaType === "video") media = `<video controls controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false" src="${normalizeMediaUrlForPlayback(item.mediaUrl, "audio")}" poster="${escapeHtml(item.thumbnailUrl || "")}"></video>`;
  else if (item.mediaType === "audio") media = `${item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title)}">` : `<div class="card-placeholder">음원 자료</div>`}<audio controls controlsList="nodownload noplaybackrate" oncontextmenu="return false" src="${normalizeMediaUrlForPlayback(item.mediaUrl, "audio")}"></audio>`;
  else if (item.mediaUrl) media = `<img src="${normalizeMediaUrlForPlayback(item.mediaUrl, "audio")}" alt="${escapeHtml(item.title)}">`;
  else media = `<div class="card-placeholder">글 자료</div>`;
  card.innerHTML = `${media}<div class="card-body"><h3>${escapeHtml(item.title)}</h3>${item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : ""}<p class="text-preview">${escapeHtml(makeTextPreview(item.description || item.body || "", 90))}</p><p><strong>분류:</strong> ${escapeHtml(item.category)}</p><p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p><p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>${createdDateMarkup(item)}</div>`;
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

function renderDetailMedia(item) {
  const category = item.category || "";
  const mediaUrl = item.mediaUrl || item.fileUrl || item.videoUrl || "";
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
      return `<div class="detail-media-box"><video controls controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false" src="${escapeHtml(playbackMediaUrl)}"></video></div>`;
    }

    if (imageUrl) {
      return `<div class="detail-media-box"><img src="${escapeHtml(playbackImageUrl)}" alt="${title}" draggable="false" oncontextmenu="return false" /></div>`;
    }

    return "";
  }

  if (category === "songs" || category === "radios") {
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
  metaEl.innerHTML = `<strong>연도:</strong> ${escapeHtml(item.year || "미상")} / <strong>출처:</strong> ${escapeHtml(item.source || "미기재")}<br><strong>업로드일:</strong> ${escapeHtml(getItemCreatedDateText(item))}`;
  descEl.innerHTML = bodyText ? escapeHtml(bodyText).replace(/\n/g, "<br>") : "";

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
}

document.addEventListener("keydown", e => { if (e.key === "Escape") closeContentDetail(); });

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
  showAdminForm("content");
  document.getElementById("editContentId").value = item.id;
  document.getElementById("contentCategory").value = item.category || "stories";
  populateContentSubCategorySelect(item.category || "stories", item.subCategory || "");
  document.getElementById("contentTitle").value = item.title || "";
  document.getElementById("contentBody").value = item.body || item.description || "";
  document.getElementById("contentYear").value = item.year || "";
  document.getElementById("contentSource").value = item.source || "";
  document.getElementById("contentImageUrl").value = item.mediaUrl || "";
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

loadSiteSettings();
loadPageCategories();
loadContents();

window.closeDailyRecommendPlayer = closeDailyRecommendPlayer;
