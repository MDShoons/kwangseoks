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

const APP_VERSION = "v43-stable-appjs-member";
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
window.showAdminForm = showAdminForm;
window.loadContents = loadContents;
window.renderAdminManageList = renderAdminManageList;
window.editContent = editContent;
window.deleteContentItem = deleteContentItem;
window.deleteCustomCategory = deleteCustomCategory;
window.openContentDetail = openContentDetail;
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

  if (["videos", "songs", "radios", "photos", "stories", "about", "oneum"].includes(pageId)) {
    loadContents();
  }

  if (typeof installBasicContentProtection === "function") {
    installBasicContentProtection();
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

async function uploadFileToGitHubWorker(file, folder = "images") {
  if (!file) return "";

  const maxBytes = 95 * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`파일 용량이 너무 큽니다. 현재 ${(file.size / 1024 / 1024).toFixed(1)}MB입니다. 이 구조에서는 95MB 이하 파일만 업로드하세요.`);
  }

  if (!GITHUB_UPLOAD_WORKER_URL) {
    throw new Error("Cloudflare Worker 업로드 주소가 설정되지 않았습니다. firebase-config.js의 GITHUB_UPLOAD_WORKER_URL을 입력하세요.");
  }

  if (!currentUser) {
    throw new Error("로그인 후 업로드할 수 있습니다.");
  }

  const idToken = await currentUser.getIdToken();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  let res;
  try {
    res = await fetch(GITHUB_UPLOAD_WORKER_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${idToken}` },
      body: formData
    });
  } catch (error) {
    throw new Error(
      "Cloudflare Worker에 연결하지 못했습니다. 현재 사이트가 새 Worker 주소를 읽어야 합니다. 새 Worker health 확인: https://kwangseoks-uploader.kos20050627.workers.dev/health. " +
      "브라우저에서 https://kwangseoks-uploader.kos20050627.workers.dev/health 를 열었을 때 ok:true JSON이 보여야 정상입니다."
    );
  }

  const text = await res.text();
  let result = {};
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { error: text };
  }

  if (!res.ok) {
    const message = result.error || result.message || `Worker 오류: HTTP ${res.status}`;
    const details = result.details?.message ? ` / GitHub: ${result.details.message}` : "";
    throw new Error(message + details);
  }

  if (!result.imageUrl) {
    throw new Error("Worker가 파일 URL을 반환하지 않았습니다. Worker 코드가 최신 v23인지 확인하세요.");
  }

  return result.imageUrl;
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
  const title = document.getElementById(`${prefix}Title`).value.trim();
  if (!title) return alert("제목을 입력하세요.");
  const file = document.getElementById(`${prefix}File`).files[0];
  const directUrl = document.getElementById(`${prefix}FileUrl`).value.trim();
  if (!file && !directUrl) return alert("파일 또는 URL을 입력하세요.");
  try {
    const uploadedUrl = file ? await uploadFileToGitHubWorker(file, category === "songs" ? "audios" : "radios") : "";
    const mediaUrl = directUrl || uploadedUrl;
    const imageUrl = await getImageDataUrlOrDirectUrl(document.getElementById(`${prefix}ImageFile`).files[0], document.getElementById(`${prefix}ImageUrl`).value, 1000);
    await addDoc(collection(db, "contents"), { category, subCategory:document.getElementById(`${prefix}SubCategory`).value, mediaType:"audio", title, mediaUrl, thumbnailUrl:imageUrl,
      year:document.getElementById(`${prefix}Year`).value.trim(), source:document.getElementById(`${prefix}Source`).value.trim(),
      description:document.getElementById(`${prefix}Description`).value.trim(), body:document.getElementById(`${prefix}Description`).value.trim(),
      isPublic:true, createdBy:currentUser.uid, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
    alert(category === "songs" ? "음원이 저장되었습니다." : "라디오가 저장되었습니다.");
    document.getElementById(category === "songs" ? "adminAudioForm" : "adminRadioForm").reset(); await loadContents();
  } catch(e) { alert("미디어 파일 저장 오류: " + e.message); }
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
      ...readDesignSettingsFromForm(), homeBgUrl, homeBgDataUrl, updatedAt: serverTimestamp()
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
  renderVideos(filterBySelectedSubCategory("videos", allContents.filter(i => i.category === "videos")));
  renderPhotos(filterBySelectedSubCategory("photos", allContents.filter(i => i.category === "photos")));
  renderList("songList", filterBySelectedSubCategory("songs", allContents.filter(i => i.category === "songs")));
  renderList("radioList", filterBySelectedSubCategory("radios", allContents.filter(i => i.category === "radios")));
  renderList("storyList", filterBySelectedSubCategory("stories", allContents.filter(i => i.category === "stories")));
  renderList("aboutList", filterBySelectedSubCategory("about", allContents.filter(i => i.category === "about")));
  renderList("oneumList", filterBySelectedSubCategory("oneum", allContents.filter(i => i.category === "oneum")));
  renderAdminManageList();
}

async function loadContents() {
  try {
    const snap = await getDocs(query(collection(db, "contents"), orderBy("createdAt", "desc")));
    allContents = [];
    snap.forEach(d => { const item = { id:d.id, ...d.data() }; if (item.isPublic !== false) allContents.push(item); });
    renderAllContentSections();
    await applySavedTemplates();
  } catch(e) { console.error(e); }
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
    about: "About Seok 최신",
    oneum: "Oneum 최신"
  };

  const pages = ["videos", "songs", "radios", "photos", "stories", "about", "oneum"];
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
          <p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>
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
function renderList(id, items) {
  const box = document.getElementById(id); box.innerHTML = "";
  if (!items.length) { box.innerHTML = "<p>등록된 자료가 없습니다.</p>"; return; }
  items.forEach(item => {
    const div = document.createElement("div");
    div.className = (item.mediaUrl || item.thumbnailUrl) && item.mediaType !== "youtube" ? "list-item with-image" : "list-item";
    div.onclick = () => openContentDetail(item.id);
    const img = item.thumbnailUrl || (item.mediaType !== "audio" && item.mediaType !== "video" ? item.mediaUrl : "");
    div.innerHTML = `${img ? `<img src="${img}" alt="${escapeHtml(item.title)}">` : ""}<div><h3>${escapeHtml(item.title)}</h3>${item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : ""}<p>${escapeHtml(item.body || item.description || "")}</p>${item.mediaType === "audio" ? `<audio controls controlsList="nodownload noplaybackrate" oncontextmenu="return false" src="${item.mediaUrl}"></audio>` : ""}<p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p><p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p></div>`;
    box.appendChild(div);
  });
}
function createCard(item) {
  const card = document.createElement("div"); card.className = "card"; card.onclick = () => openContentDetail(item.id);
  let media = "";
  if (item.mediaType === "youtube") media = `<iframe src="${item.mediaUrl}" allowfullscreen></iframe>`;
  else if (item.mediaType === "video") media = `<video controls controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false" src="${item.mediaUrl}" poster="${escapeHtml(item.thumbnailUrl || "")}"></video>`;
  else if (item.mediaType === "audio") media = `${item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title)}">` : `<div class="card-placeholder">음원 자료</div>`}<audio controls controlsList="nodownload noplaybackrate" oncontextmenu="return false" src="${item.mediaUrl}"></audio>`;
  else if (item.mediaUrl) media = `<img src="${item.mediaUrl}" alt="${escapeHtml(item.title)}">`;
  else media = `<div class="card-placeholder">글 자료</div>`;
  card.innerHTML = `${media}<div class="card-body"><h3>${escapeHtml(item.title)}</h3>${item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : ""}<p>${escapeHtml(item.description || item.body || "")}</p><p><strong>분류:</strong> ${escapeHtml(item.category)}</p><p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p><p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p></div>`;
  return card;
}

function openContentDetail(id) {
  const item = allContents.find(i => i.id === id); if (!item) return;
  document.getElementById("detailTitle").textContent = item.title || "제목 없음";
  document.getElementById("detailCategory").textContent = [item.category ? `분류: ${item.category}` : "", item.subCategory ? `카테고리: ${item.subCategory}` : ""].filter(Boolean).join(" / ");
  document.getElementById("detailMeta").textContent = `${item.year ? "연도: "+item.year : "연도: 미상"} / ${item.source ? "출처: "+item.source : "출처: 미기재"}`;
  document.getElementById("detailDescription").textContent = item.body || item.description || "";
  const area = document.getElementById("detailMediaArea"); area.innerHTML = "";
  if (item.mediaType === "youtube") area.innerHTML = `<iframe src="${item.mediaUrl}" allowfullscreen></iframe>`;
  else if (item.mediaType === "video") area.innerHTML = `<video controls controlsList="nodownload noplaybackrate" disablePictureInPicture oncontextmenu="return false" src="${item.mediaUrl}" poster="${escapeHtml(item.thumbnailUrl || "")}"></video>`;
  else if (item.mediaType === "audio") area.innerHTML = `${item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title)}">` : ""}<audio controls controlsList="nodownload noplaybackrate" oncontextmenu="return false" src="${item.mediaUrl}"></audio>`;
  else if (item.mediaUrl) area.innerHTML = `<img src="${item.mediaUrl}" alt="${escapeHtml(item.title)}">`;
  else area.innerHTML = `<div class="card-placeholder">글 자료</div>`;
  document.getElementById("contentDetailModal").classList.remove("hidden");
  hardenMediaDownloadControls();
  document.body.style.overflow = "hidden";
}
function closeContentDetail(event) {
  if (event && event.target !== event.currentTarget) return;
  document.getElementById("detailMediaArea").innerHTML = "";
  document.getElementById("contentDetailModal").classList.add("hidden");
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
