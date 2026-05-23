import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDPGi_MBLGkap_VTdo07j_fXw6Sy4TTPeo",
  authDomain: "kksarchive.firebaseapp.com",
  projectId: "kksarchive",
  storageBucket: "kksarchive.firebasestorage.app",
  messagingSenderId: "322477795788",
  appId: "1:322477795788:web:9f6a9c2c8d26c1a76d5569",
  measurementId: "G-9RG0YXCMY9"
};

const ADMINS = [
  { name: "최일훈", phone: "010-3143-2729", loginId: "oldsong0106", email: "kos20050627@gmail.com" },
  { name: "최민수", phone: "010-3016-0413", loginId: "shinestone0106", email: "shinestone0106@kakao.com" }
];

const ADMIN_EMAILS = ADMINS.map((admin) => admin.email);
const ADMIN_LOGIN_IDS = ADMINS.map((admin) => admin.loginId);

let app;
let auth;
let db;
let storage;
let currentUser = null;
let currentProfile = null;
let firebaseReady = false;
let contents = [];
let currentTemplate = { ...defaultTemplate };
let editingPageId = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  firebaseReady = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
} catch (error) {
  console.warn("Firebase 초기화 확인 필요:", error);
  firebaseReady = false;
}

const defaultTemplate = {
  siteTitle: "광석이네집",
  heroEyebrow: "Kim Kwang-seok Digital Archive",
  heroTitle: "노래가 된 사람,\n기록으로 남은 목소리.",
  heroDescription: "김광석의 영상, 음악, 라디오, 사진, 일기와 둥근소리글을 차분히 모아두는 디지털 아카이브입니다.",
  homeCardTitle: "광석이네집에 오신 것을 환영합니다.",
  homeCardText: "이곳은 자료를 함부로 소비하기보다, 출처와 맥락을 함께 남기는 아카이브를 지향합니다.",
  aboutMainText: "이 영역은 김광석에 대한 기본 소개를 담는 공간입니다. 실제 공개 전에는 연보, 음반, 공연 기록을 신뢰 가능한 자료로 검토해야 합니다.",
  footerText: "본 사이트는 김광석 관련 자료를 보존하고 정리하기 위한 아카이브 예시입니다.",
  pageMeta: {
    videos: { eyebrow: "archive", title: "videos", desc: "김광석의 공연, 방송, 인터뷰 영상을 모아보는 공간입니다." },
    songs: { eyebrow: "archive", title: "songs", desc: "김광석의 음악 자료를 정리하는 공간입니다." },
    radios: { eyebrow: "archive", title: "radios", desc: "김광석의 라디오 출연, 인터뷰, 방송 음성 자료를 정리합니다." },
    photos: { eyebrow: "archive", title: "photos", desc: "사진 자료를 연도, 장소, 출처와 함께 보관합니다." },
    stories: { eyebrow: "diary only", title: "stories", desc: "이 공간은 김광석의 일기만을 다룹니다." },
    about: { eyebrow: "profile", title: "about seok", desc: "김광석의 생애, 음악 활동, 연보, 음반, 공연 기록을 정리합니다." },
    oneum: { eyebrow: "writing", title: "oneum", desc: "김광석의 둥근소리글을 정리하는 공간입니다." }
  }
};

const sampleContents = [
  { id: "sample-video-1", category: "videos", title: "1995 라이브 공연 영상", date: "1995", type: "공연", source: "자료 출처 확인 필요", body: "공연 영상 샘플 설명입니다.", url: "", youtubeUrl: "", visibility: "public", sample: true },
  { id: "sample-song-1", category: "songs", title: "서른 즈음에", date: "1994", type: "정규앨범", source: "4집", body: "곡 정보 샘플입니다. 실제 음원 공개 전 권리 확인이 필요합니다.", url: "", youtubeUrl: "", visibility: "public", sample: true },
  { id: "sample-radio-1", category: "radios", title: "라디오 인터뷰 자료", date: "1994.00.00", type: "인터뷰", source: "방송명 확인 필요", body: "라디오 출연 자료 요약입니다.", url: "", youtubeUrl: "", visibility: "public", sample: true },
  { id: "sample-photo-1", category: "photos", title: "공연 사진", date: "1995", type: "공연", source: "촬영자 확인 필요", body: "사진 설명 샘플입니다.", url: "", youtubeUrl: "", visibility: "public", sample: true },
  { id: "sample-story-1", category: "stories", title: "일기 샘플 1", date: "1992.00.00", type: "일기", source: "출처 확인 필요", body: "이곳에는 일기 본문만 들어갑니다.", url: "", youtubeUrl: "", visibility: "public", sample: true },
  { id: "sample-oneum-1", category: "oneum", title: "둥근소리글 샘플 1", date: "작성일 확인 필요", type: "글", source: "출처 확인 필요", body: "둥근소리글 본문 또는 설명을 넣는 공간입니다.", url: "", youtubeUrl: "", visibility: "public", sample: true }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function updateFirebaseStatus(message, type = "") {
  const el = $("#firebaseStatusText");
  if (!el) return;
  el.textContent = message;
  el.className = `small-text ${type}`;
}

function getAdminByLoginId(loginId) {
  return ADMINS.find((admin) => admin.loginId === loginId) || null;
}

function getAdminByEmail(email) {
  return ADMINS.find((admin) => admin.email === email) || null;
}

function isAdmin(user = currentUser) {
  return !!user && ADMIN_EMAILS.includes(user.email);
}

function getDisplayId() {
  if (currentProfile?.loginId) return currentProfile.loginId;
  if (currentUser?.email) return currentUser.email;
  return "";
}

function buildEmailFromSignupForm() {
  const local = $("#signupEmailLocal").value.trim();
  const domain = $("#signupEmailDomain").value;
  return `${local}@${domain}`;
}

function isValidLoginId(loginId) {
  return /^[a-zA-Z0-9_]{4,20}$/.test(loginId);
}

function setLoginIdMessage(message, type = "") {
  const box = $("#loginIdCheckMessage");
  if (!box) return;
  box.textContent = message;
  box.className = `form-message ${type}`;
}

function escapeHTML(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add("active");
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove("active");
}

function showPage(pageId) {
  $$(".page").forEach((page) => page.classList.remove("active"));
  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");

  $$(".main-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === pageId);
  });

  window.location.hash = pageId;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showAdminTools() {
  $$(".admin-only").forEach((el) => {
    el.classList.toggle("hidden", !isAdmin());
  });
}

function getYouTubeEmbedUrl(url = "") {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    let videoId = "";

    if (parsed.hostname.includes("youtu.be")) {
      videoId = parsed.pathname.replace("/", "");
    } else if (parsed.hostname.includes("youtube.com")) {
      if (parsed.pathname.startsWith("/watch")) videoId = parsed.searchParams.get("v") || "";
      if (parsed.pathname.startsWith("/shorts/")) videoId = parsed.pathname.split("/shorts/")[1]?.split("/")[0] || "";
      if (parsed.pathname.startsWith("/embed/")) videoId = parsed.pathname.split("/embed/")[1]?.split("/")[0] || "";
    }

    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  } catch {
    return "";
  }
}

async function uploadPhotoIfNeeded() {
  const fileInput = $("#contentFile");
  const file = fileInput?.files?.[0];
  if (!file) {
    return {
      url: $("#contentUrl").value.trim(),
      filePath: $("#existingFilePath").value || ""
    };
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("이미지 파일만 첨부할 수 있습니다.");
  }

  const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_");
  const filePath = `content-images/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, filePath);

  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);

  return {
    url: downloadUrl,
    filePath
  };
}

function thumbHTML(item) {
  if (item.url && item.category === "photos") {
    return `<img src="${escapeHTML(item.url)}" alt="${escapeHTML(item.title)}" />`;
  }

  if (item.youtubeUrl && getYouTubeEmbedUrl(item.youtubeUrl)) {
    return "YOUTUBE";
  }

  return escapeHTML((item.category || "ARCHIVE").toUpperCase());
}

function adminActionsHTML(item) {
  if (!isAdmin() || item.sample) return "";
  return `
    <div class="inline-card-actions admin-only">
      <button class="success-btn" data-edit-content="${escapeHTML(item.id)}">수정</button>
      <button class="danger-btn" data-delete-content="${escapeHTML(item.id)}">삭제</button>
    </div>
  `;
}

function detailTemplate(item, type) {
  const safeTitle = escapeHTML(item.title);
  const safeDate = escapeHTML(item.date || "");
  const safeSource = escapeHTML(item.source || "");
  const safeBody = escapeHTML(item.body || "상세 설명이 없습니다.").replaceAll("\n", "<br>");
  const safeUrl = escapeHTML(item.url || "");
  const embedUrl = getYouTubeEmbedUrl(item.youtubeUrl || "");

  return `
    ${adminActionsHTML(item)}
    <p class="eyebrow">${escapeHTML(type)}</p>
    <h2>${safeTitle}</h2>
    <p class="meta">${safeDate} · ${safeSource}</p>

    ${embedUrl ? `<iframe class="youtube-frame" src="${embedUrl}" allowfullscreen loading="lazy"></iframe>` : ""}
    ${safeUrl ? `<p><a class="primary-btn" href="${safeUrl}" target="_blank" rel="noopener">자료 링크 열기</a></p>` : ""}
    ${item.category === "photos" && safeUrl ? `<div class="thumb" style="height:320px"><img src="${safeUrl}" alt="${safeTitle}" /></div>` : ""}

    <div class="notice-box">
      <strong>자료 공개 전 확인</strong>
      <p>음악, 영상, 사진, 글 자료는 저작권·출처·공개 가능 여부를 확인한 뒤 공개해야 합니다.</p>
    </div>
    <p>${safeBody}</p>
  `;
}

function publicContents(category) {
  return contents.filter((item) => {
    if (item.category !== category) return false;
    if (item.visibility === "private" && !isAdmin()) return false;
    if (item.visibility === "members" && !currentUser) return false;
    return true;
  });
}


function setTextIfExists(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || "";
}

function applyPageMeta(pageMeta = {}) {
  const meta = { ...defaultTemplate.pageMeta, ...pageMeta };

  setTextIfExists("videosPageEyebrow", meta.videos?.eyebrow);
  setTextIfExists("videosPageTitle", meta.videos?.title);
  setTextIfExists("videosPageDesc", meta.videos?.desc);

  setTextIfExists("songsPageEyebrow", meta.songs?.eyebrow);
  setTextIfExists("songsPageTitle", meta.songs?.title);
  setTextIfExists("songsPageDesc", meta.songs?.desc);

  setTextIfExists("radiosPageEyebrow", meta.radios?.eyebrow);
  setTextIfExists("radiosPageTitle", meta.radios?.title);
  setTextIfExists("radiosPageDesc", meta.radios?.desc);

  setTextIfExists("photosPageEyebrow", meta.photos?.eyebrow);
  setTextIfExists("photosPageTitle", meta.photos?.title);
  setTextIfExists("photosPageDesc", meta.photos?.desc);

  setTextIfExists("storiesPageEyebrow", meta.stories?.eyebrow);
  setTextIfExists("storiesPageTitle", meta.stories?.title);
  setTextIfExists("storiesPageDesc", meta.stories?.desc);

  setTextIfExists("aboutPageEyebrow", meta.about?.eyebrow);
  setTextIfExists("aboutPageTitle", meta.about?.title);
  setTextIfExists("aboutPageDesc", meta.about?.desc);

  setTextIfExists("oneumPageEyebrow", meta.oneum?.eyebrow);
  setTextIfExists("oneumPageTitle", meta.oneum?.title);
  setTextIfExists("oneumPageDesc", meta.oneum?.desc);
}

function getPageEditableElements(pageId) {
  if (pageId === "home") {
    return ["heroEyebrow", "heroTitle", "heroDescription", "homeCardTitle", "homeCardText"]
      .map((id) => document.getElementById(id))
      .filter(Boolean);
  }

  const map = {
    videos: ["videosPageEyebrow", "videosPageTitle", "videosPageDesc"],
    songs: ["songsPageEyebrow", "songsPageTitle", "songsPageDesc"],
    radios: ["radiosPageEyebrow", "radiosPageTitle", "radiosPageDesc"],
    photos: ["photosPageEyebrow", "photosPageTitle", "photosPageDesc"],
    stories: ["storiesPageEyebrow", "storiesPageTitle", "storiesPageDesc"],
    about: ["aboutPageEyebrow", "aboutPageTitle", "aboutPageDesc", "aboutMainText"],
    oneum: ["oneumPageEyebrow", "oneumPageTitle", "oneumPageDesc"]
  };

  return (map[pageId] || []).map((id) => document.getElementById(id)).filter(Boolean);
}

function setPageEditing(pageId, editing) {
  const elements = getPageEditableElements(pageId);
  elements.forEach((el) => {
    el.contentEditable = editing ? "true" : "false";
    el.classList.toggle("editable-active", editing);
  });

  const btn = document.querySelector(`[data-edit-page="${pageId}"]`);
  if (btn) {
    btn.textContent = editing ? "✓" : "✎";
    btn.title = editing ? "저장" : "이 페이지 편집";
    btn.classList.toggle("saving", editing);
  }

  let help = document.getElementById("editingHelp");
  if (editing) {
    if (!help) {
      help = document.createElement("div");
      help.id = "editingHelp";
      help.className = "editing-help";
      help.textContent = "문구를 직접 수정한 뒤 연필 버튼을 다시 누르면 저장됩니다.";
      const page = document.getElementById(pageId);
      page?.prepend(help);
    }
  } else {
    help?.remove();
  }
}

async function toggleInlinePageEdit(pageId) {
  if (!isAdmin()) {
    alert("관리자만 수정할 수 있습니다.");
    return;
  }

  if (editingPageId && editingPageId !== pageId) {
    alert("현재 편집 중인 페이지를 먼저 저장해주세요.");
    return;
  }

  if (editingPageId === pageId) {
    await saveInlinePageEdit(pageId);
    setPageEditing(pageId, false);
    editingPageId = null;
    alert("저장되었습니다.");
    return;
  }

  editingPageId = pageId;
  setPageEditing(pageId, true);
}

async function saveInlinePageEdit(pageId) {
  if (!firebaseReady) {
    alert("Firebase 설정값을 먼저 입력해야 저장할 수 있습니다.");
    return;
  }

  const nextTemplate = { ...currentTemplate };
  nextTemplate.pageMeta = { ...(currentTemplate.pageMeta || defaultTemplate.pageMeta) };

  if (pageId === "home") {
    nextTemplate.heroEyebrow = document.getElementById("heroEyebrow")?.textContent.trim() || "";
    nextTemplate.heroTitle = document.getElementById("heroTitle")?.textContent.trim() || "";
    nextTemplate.heroDescription = document.getElementById("heroDescription")?.textContent.trim() || "";
    nextTemplate.homeCardTitle = document.getElementById("homeCardTitle")?.textContent.trim() || "";
    nextTemplate.homeCardText = document.getElementById("homeCardText")?.textContent.trim() || "";
  } else {
    const ids = {
      videos: ["videosPageEyebrow", "videosPageTitle", "videosPageDesc"],
      songs: ["songsPageEyebrow", "songsPageTitle", "songsPageDesc"],
      radios: ["radiosPageEyebrow", "radiosPageTitle", "radiosPageDesc"],
      photos: ["photosPageEyebrow", "photosPageTitle", "photosPageDesc"],
      stories: ["storiesPageEyebrow", "storiesPageTitle", "storiesPageDesc"],
      about: ["aboutPageEyebrow", "aboutPageTitle", "aboutPageDesc"],
      oneum: ["oneumPageEyebrow", "oneumPageTitle", "oneumPageDesc"]
    }[pageId];

    if (ids) {
      nextTemplate.pageMeta[pageId] = {
        eyebrow: document.getElementById(ids[0])?.textContent.trim() || "",
        title: document.getElementById(ids[1])?.textContent.trim() || "",
        desc: document.getElementById(ids[2])?.textContent.trim() || ""
      };
    }

    if (pageId === "about") {
      nextTemplate.aboutMainText = document.getElementById("aboutMainText")?.textContent.trim() || "";
    }
  }

  nextTemplate.updatedAt = serverTimestamp();
  nextTemplate.updatedBy = currentUser.email;

  await setDoc(doc(db, "settings", "siteTemplate"), nextTemplate, { merge: true });
  currentTemplate = nextTemplate;
  applyTemplate(nextTemplate);
}


function applyTemplate(template) {
  const data = { ...defaultTemplate, ...template };
  data.pageMeta = { ...defaultTemplate.pageMeta, ...(template?.pageMeta || {}) };
  currentTemplate = data;
  $("#siteLogoText").textContent = data.siteTitle;
  document.title = `${data.siteTitle} | 김광석 아카이브`;
  $("#heroEyebrow").textContent = data.heroEyebrow;
  $("#heroTitle").textContent = data.heroTitle;
  $("#heroDescription").textContent = data.heroDescription;
  $("#homeCardTitle").textContent = data.homeCardTitle;
  $("#homeCardText").textContent = data.homeCardText;
  $("#aboutMainText").textContent = data.aboutMainText;
  $("#footerText").textContent = data.footerText;
  applyPageMeta(data.pageMeta);

  $("#editSiteTitle").value = data.siteTitle;
  $("#editHeroEyebrow").value = data.heroEyebrow;
  $("#editHeroTitle").value = data.heroTitle;
  $("#editHeroDescription").value = data.heroDescription;
  $("#editHomeCardTitle").value = data.homeCardTitle;
  $("#editHomeCardText").value = data.homeCardText;
  $("#editAboutMainText").value = data.aboutMainText;
  $("#editFooterText").value = data.footerText;
}

async function loadTemplate() {
  if (!firebaseReady) {
    applyTemplate(defaultTemplate);
    return;
  }

  try {
    const snap = await getDoc(doc(db, "settings", "siteTemplate"));
    if (snap.exists()) applyTemplate(snap.data());
    else applyTemplate(defaultTemplate);
  } catch (error) {
    console.error("템플릿 불러오기 실패:", error);
    applyTemplate(defaultTemplate);
  }
}

async function saveTemplate(event) {
  event.preventDefault();

  if (!firebaseReady) {
    alert("Firebase 설정값을 먼저 입력해야 저장할 수 있습니다.");
    return;
  }

  if (!isAdmin()) {
    alert("관리자만 템플릿을 저장할 수 있습니다.");
    return;
  }

  const template = {
    siteTitle: $("#editSiteTitle").value.trim(),
    heroEyebrow: $("#editHeroEyebrow").value.trim(),
    heroTitle: $("#editHeroTitle").value.trim(),
    heroDescription: $("#editHeroDescription").value.trim(),
    homeCardTitle: $("#editHomeCardTitle").value.trim(),
    homeCardText: $("#editHomeCardText").value.trim(),
    aboutMainText: $("#editAboutMainText").value.trim(),
    footerText: $("#editFooterText").value.trim(),
    pageMeta: currentTemplate.pageMeta || defaultTemplate.pageMeta,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.email
  };

  try {
    await setDoc(doc(db, "settings", "siteTemplate"), template, { merge: true });
    applyTemplate(template);
    closeModal("templateModal");
    alert("템플릿이 저장되었습니다.");
  } catch (error) {
    console.error(error);
    alert("템플릿 저장 실패: " + error.message);
  }
}

async function loadContents() {
  if (!firebaseReady) {
    contents = [...sampleContents];
    renderAll();
    return;
  }

  try {
    const q = query(collection(db, "contents"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    contents = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    if (contents.length === 0) contents = [...sampleContents];
    renderAll();
  } catch (error) {
    console.error("콘텐츠 불러오기 실패:", error);
    contents = [...sampleContents];
    renderAll();
  }
}

async function saveContent(event) {
  event.preventDefault();

  if (!firebaseReady) {
    alert("Firebase 설정값을 먼저 입력해야 콘텐츠를 저장할 수 있습니다.");
    return;
  }

  if (!isAdmin()) {
    alert("관리자만 글을 쓸 수 있습니다.");
    return;
  }

  const id = $("#contentId").value;
  const category = $("#contentCategory").value;

  try {
    const uploaded = await uploadPhotoIfNeeded();

    const payload = {
      category,
      title: $("#contentTitle").value.trim(),
      date: $("#contentDate").value.trim(),
      type: $("#contentType").value.trim(),
      source: $("#contentSource").value.trim(),
      url: uploaded.url,
      filePath: uploaded.filePath,
      youtubeUrl: $("#contentYoutubeUrl").value.trim(),
      body: $("#contentBody").value.trim(),
      visibility: $("#contentVisibility").value,
      updatedAt: serverTimestamp(),
      updatedBy: currentUser.email
    };

    if (category === "stories" && payload.type && payload.type !== "일기") {
      const ok = confirm("stories는 일기 전용 공간입니다. 분류를 '일기'로 바꾸는 것이 좋습니다. 계속 저장할까요?");
      if (!ok) return;
    }

    if (id) {
      await updateDoc(doc(db, "contents", id), payload);
      alert("콘텐츠가 수정되었습니다.");
    } else {
      await addDoc(collection(db, "contents"), {
        ...payload,
        createdAt: serverTimestamp(),
        createdBy: currentUser.email
      });
      alert("콘텐츠가 등록되었습니다.");
    }

    resetContentForm();
    closeModal("contentModal");
    await loadContents();
  } catch (error) {
    console.error(error);
    alert("콘텐츠 저장 실패: " + error.message);
  }
}

async function deleteContent(id) {
  if (!firebaseReady || !isAdmin()) {
    alert("관리자만 삭제할 수 있습니다.");
    return;
  }

  if (!confirm("정말 삭제하시겠습니까? 삭제 후 되돌릴 수 없습니다.")) return;

  try {
    await deleteDoc(doc(db, "contents", id));
    closeModal("detailModal");
    alert("삭제되었습니다.");
    await loadContents();
  } catch (error) {
    console.error(error);
    alert("삭제 실패: " + error.message);
  }
}

function editContent(id) {
  const item = contents.find((x) => x.id === id);
  if (!item || item.sample) return;

  $("#contentModalTitle").textContent = "콘텐츠 수정";
  $("#contentId").value = item.id;
  $("#contentCategory").value = item.category || "videos";
  $("#contentTitle").value = item.title || "";
  $("#contentDate").value = item.date || "";
  $("#contentType").value = item.type || "";
  $("#contentSource").value = item.source || "";
  $("#contentUrl").value = item.url || "";
  $("#existingFilePath").value = item.filePath || "";
  $("#contentYoutubeUrl").value = item.youtubeUrl || "";
  $("#contentBody").value = item.body || "";
  $("#contentVisibility").value = item.visibility || "public";
  $("#contentFile").value = "";
  openModal("contentModal");
}

function openContentForm(category) {
  if (!isAdmin()) {
    alert("관리자만 글을 쓸 수 있습니다.");
    return;
  }
  resetContentForm();
  $("#contentModalTitle").textContent = "콘텐츠 작성";
  $("#contentCategory").value = category || "videos";
  if (category === "stories") $("#contentType").value = "일기";
  openModal("contentModal");
}

function resetContentForm() {
  $("#contentForm").reset();
  $("#contentId").value = "";
  $("#existingFilePath").value = "";
  $("#contentCategory").value = "videos";
  $("#contentVisibility").value = "public";
}

function renderHome() {
  const latest = contents.slice(0, 4);
  $("#homeLatest").innerHTML = latest.map((item) => cardHTML(item)).join("") || emptyHTML("아직 등록된 자료가 없습니다.");
}

function cardHTML(item) {
  return `
    <article class="archive-card">
      ${adminActionsHTML(item)}
      <div data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="${escapeHTML(item.category)}">
        <div class="thumb">${thumbHTML(item)}</div>
        <h3>${escapeHTML(item.title)}</h3>
        <p class="meta">${escapeHTML(item.date || "")} · ${escapeHTML(item.source || "")}</p>
        <span class="status-pill">${visibilityLabel(item.visibility)}</span>
      </div>
    </article>
  `;
}

function listHTML(item) {
  return `
    <article class="list-item">
      ${adminActionsHTML(item)}
      <div data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="${escapeHTML(item.category)}">
        <h3>${escapeHTML(item.title)}</h3>
        <p class="meta">${escapeHTML(item.date || "")} · ${escapeHTML(item.source || "")}</p>
        <p>${escapeHTML(item.body || "").slice(0, 120)}</p>
        <span class="status-pill">${visibilityLabel(item.visibility)}</span>
      </div>
    </article>
  `;
}

function emptyHTML(text) {
  return `<div class="notice-box"><p>${escapeHTML(text)}</p></div>`;
}

function visibilityLabel(value) {
  if (value === "members") return "회원 공개";
  if (value === "private") return "비공개";
  return "전체 공개";
}

function renderVideos() {
  const search = ($("#videoSearch")?.value || "").toLowerCase();
  const filter = $("#videoFilter")?.value || "all";
  const items = publicContents("videos").filter((item) => {
    const matchedSearch = `${item.title} ${item.date} ${item.source}`.toLowerCase().includes(search);
    const matchedFilter = filter === "all" || item.type === filter;
    return matchedSearch && matchedFilter;
  });

  $("#videosList").innerHTML = items.map(cardHTML).join("") || emptyHTML("등록된 영상이 없습니다.");
}

function renderSongs() {
  const search = ($("#songSearch")?.value || "").toLowerCase();
  const items = publicContents("songs").filter((item) =>
    `${item.title} ${item.source} ${item.date}`.toLowerCase().includes(search)
  );

  $("#songsList").innerHTML = items.map((item) => `
    <tr>
      <td>${adminActionsHTML(item)}${escapeHTML(item.title)}</td>
      <td>${escapeHTML(item.source || "")}</td>
      <td>${escapeHTML(item.date || "")}</td>
      <td><button class="play-btn" data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="songs">▶</button></td>
    </tr>
  `).join("") || `<tr><td colspan="4">등록된 음악이 없습니다.</td></tr>`;
}

function renderRadios() {
  const items = publicContents("radios");
  $("#radiosList").innerHTML = items.map(listHTML).join("") || emptyHTML("등록된 라디오 자료가 없습니다.");
}

function renderPhotos() {
  const items = publicContents("photos");
  $("#photosList").innerHTML = items.map(cardHTML).join("") || emptyHTML("등록된 사진이 없습니다.");
}

function renderStories() {
  const items = publicContents("stories");
  $("#storiesList").innerHTML = items.map(listHTML).join("") || emptyHTML("등록된 일기가 없습니다.");
}

function renderOneum() {
  const items = publicContents("oneum");
  $("#oneumList").innerHTML = items.map(listHTML).join("") || emptyHTML("등록된 둥근소리글이 없습니다.");
}

function renderAll() {
  renderHome();
  renderVideos();
  renderSongs();
  renderRadios();
  renderPhotos();
  renderStories();
  renderOneum();
  showAdminTools();
}

function bindEvents() {
  document.addEventListener("click", async (event) => {
    const checkIdBtn = event.target.closest("#checkLoginIdBtn");
    if (checkIdBtn) {
      await checkLoginIdAvailability();
      return;
    }

    const passwordToggle = event.target.closest("[data-toggle-password]");
    if (passwordToggle) {
      const inputId = passwordToggle.dataset.togglePassword;
      const input = document.getElementById(inputId);
      if (input) {
        const isHidden = input.type === "password";
        input.type = isHidden ? "text" : "password";
        passwordToggle.textContent = isHidden ? "🙈" : "👁";
        passwordToggle.setAttribute("aria-label", isHidden ? "비밀번호 숨기기" : "비밀번호 보기");
        passwordToggle.setAttribute("title", isHidden ? "비밀번호 숨기기" : "비밀번호 보기");
      }
      return;
    }

    const pageBtn = event.target.closest("[data-page]");
    if (pageBtn) showPage(pageBtn.dataset.page);

    const openBtn = event.target.closest("[data-open-modal]");
    if (openBtn) openModal(openBtn.dataset.openModal);

    const closeBtn = event.target.closest("[data-close-modal]");
    if (closeBtn) closeModal(closeBtn.dataset.closeModal);

    const pageEditBtn = event.target.closest("[data-edit-page]");
    if (pageEditBtn) {
      await toggleInlinePageEdit(pageEditBtn.dataset.editPage);
      return;
    }

    const templateBtn = event.target.closest("[data-edit-template]");
    if (templateBtn) {
      if (!isAdmin()) {
        alert("관리자만 템플릿을 편집할 수 있습니다.");
        return;
      }
      openModal("templateModal");
    }

    const addContentBtn = event.target.closest("[data-open-content-form]");
    if (addContentBtn) openContentForm(addContentBtn.dataset.openContentForm);

    const editBtn = event.target.closest("[data-edit-content]");
    if (editBtn) {
      event.stopPropagation();
      editContent(editBtn.dataset.editContent);
      return;
    }

    const deleteBtn = event.target.closest("[data-delete-content]");
    if (deleteBtn) {
      event.stopPropagation();
      await deleteContent(deleteBtn.dataset.deleteContent);
      return;
    }

    const detail = event.target.closest("[data-detail]");
    if (detail) {
      const item = JSON.parse(decodeURIComponent(detail.dataset.detail));
      $("#detailContent").innerHTML = detailTemplate(item, detail.dataset.type);
      openModal("detailModal");
    }

    if (event.target.id === "logoutBtn") {
      if (!firebaseReady) {
        alert("Firebase 설정값을 먼저 입력해야 로그아웃 기능을 사용할 수 있습니다.");
        return;
      }
      await signOut(auth);
    }

    if (event.target.id === "deleteAccountBtn") await handleDeleteAccount();
  });

  $$(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.classList.remove("active");
    });
  });

  $("#videoSearch")?.addEventListener("input", renderVideos);
  $("#videoFilter")?.addEventListener("change", renderVideos);
  $("#songSearch")?.addEventListener("input", renderSongs);

  $("#signupLoginId")?.addEventListener("input", () => {
    $("#signupLoginId").dataset.checked = "false";
    $("#signupLoginId").dataset.checkedValue = "";
    setLoginIdMessage("아이디 중복확인을 해주세요.", "");
  });

  $("#signupForm")?.addEventListener("submit", handleSignup);
  $("#loginForm")?.addEventListener("submit", handleLogin);
  $("#templateForm")?.addEventListener("submit", saveTemplate);
  $("#contentForm")?.addEventListener("submit", saveContent);
}

async function checkLoginIdAvailability() {
  const loginIdInput = $("#signupLoginId");
  const loginId = loginIdInput?.value.trim() || "";

  if (!loginId) {
    setLoginIdMessage("아이디를 먼저 입력하세요.", "error");
    return false;
  }

  if (!firebaseReady || !db) {
    setLoginIdMessage("Firebase 연결이 아직 준비되지 않았습니다. app.js와 Firebase 설정을 확인하세요.", "error");
    alert("Firebase 연결이 준비되지 않아 중복확인을 할 수 없습니다. Ctrl+F5 후 다시 시도하세요.");
    return false;
  }

  if (!isValidLoginId(loginId)) {
    setLoginIdMessage("아이디는 영문, 숫자, 밑줄(_) 조합 4~20자로 입력하세요.", "error");
    loginIdInput.dataset.checked = "false";
    return false;
  }

  try {
    setLoginIdMessage("아이디 중복확인 중입니다...", "");

    const snap = await getDoc(doc(db, "loginIds", loginId));

    if (snap.exists()) {
      setLoginIdMessage("다른 사용자가 이미 사용중인 아이디 입니다.", "error");
      loginIdInput.dataset.checked = "false";
      loginIdInput.dataset.checkedValue = "";
      return false;
    }

    setLoginIdMessage("사용 가능한 아이디입니다.", "ok");
    loginIdInput.dataset.checked = "true";
    loginIdInput.dataset.checkedValue = loginId;
    return true;
  } catch (error) {
    console.error("아이디 중복확인 실패:", error);
    setLoginIdMessage("아이디 중복확인에 실패했습니다. Firestore Rules가 게시되었는지 확인하세요.", "error");
    loginIdInput.dataset.checked = "false";
    loginIdInput.dataset.checkedValue = "";
    alert("아이디 중복확인 실패: Firestore Rules 또는 Firebase 연결을 확인하세요.");
    return false;
  }
}

window.checkLoginIdAvailability = checkLoginIdAvailability;

async function handleSignup(event) {
  event.preventDefault();

  if (!firebaseReady) {
    alert("먼저 app.js의 firebaseConfig 값을 본인 Firebase 설정값으로 바꿔야 합니다.");
    return;
  }

  const name = $("#signupName").value.trim();
  const phone = $("#signupPhone").value.trim();
  const loginId = $("#signupLoginId").value.trim();
  const email = buildEmailFromSignupForm();
  const password = $("#signupPassword").value;
  const passwordConfirm = $("#signupPasswordConfirm").value;
  const privacyAgree = $("#privacyAgree").checked;

  if (password !== passwordConfirm) {
    alert("비밀번호와 비밀번호 확인이 다릅니다.");
    return;
  }

  if (!privacyAgree) {
    alert("개인정보 수집 및 이용에 동의해야 회원가입할 수 있습니다.");
    return;
  }

  const checked = $("#signupLoginId").dataset.checked === "true";
  const checkedValue = $("#signupLoginId").dataset.checkedValue;

  if (!checked || checkedValue !== loginId) {
    alert("아이디 중복확인을 먼저 해주세요.");
    return;
  }

  try {
    const duplicateSnap = await getDoc(doc(db, "loginIds", loginId));
    if (duplicateSnap.exists()) {
      setLoginIdMessage("다른 사용자가 이미 사용중인 아이디 입니다.", "error");
      return;
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const role = ADMIN_EMAILS.includes(email) || ADMIN_LOGIN_IDS.includes(loginId) ? "admin" : "member";

    try {
      await setDoc(doc(db, "loginIds", loginId), {
        uid: user.uid,
        email,
        loginId,
        createdAt: serverTimestamp()
      });

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        phone,
        loginId,
        email,
        privacyAgree,
        role,
        createdAt: serverTimestamp()
      });
    } catch (writeError) {
      try { await deleteUser(user); } catch (deleteError) { console.warn("인증 계정 삭제 실패:", deleteError); }
      throw writeError;
    }

    await signOut(auth);

    alert("회원가입이 완료되었습니다. 로그인 화면에서 다시 로그인해주세요.");
    closeModal("signupModal");
    event.target.reset();
    setLoginIdMessage("", "");
    openModal("loginModal");
    $("#loginId").value = loginId;
    $("#loginPassword").value = "";
  } catch (error) {
    console.error(error);

    if (error.code === "permission-denied" || error.message.includes("Missing or insufficient permissions")) {
      alert("다른 사용자가 이미 사용중인 아이디 입니다.");
      return;
    }

    if (error.code === "auth/operation-not-allowed") {
      alert("Firebase Authentication에서 Email/Password 로그인을 활성화해야 합니다.");
      return;
    }

    if (error.code === "auth/email-already-in-use") {
      alert("이미 가입된 메일주소입니다.");
      return;
    }

    alert("회원가입 실패: " + error.message);
  }
}




async function handleLogin(event) {
  event.preventDefault();

  if (!firebaseReady) {
    alert("Firebase 연결이 준비되지 않았습니다. app.js 설정값을 확인해주세요.");
    return;
  }

  const loginId = $("#loginId").value.trim();
  const password = $("#loginPassword").value;

  if (!loginId || !password) {
    alert("아이디와 비밀번호를 입력해주세요.");
    return;
  }

  try {
    let email = "";
    let profileFromLoginId = null;

    // 1) 일반 회원: Firestore loginIds에서 아이디에 연결된 이메일을 찾습니다.
    try {
      const loginSnap = await getDoc(doc(db, "loginIds", loginId));
      if (loginSnap.exists()) {
        profileFromLoginId = loginSnap.data();
        email = profileFromLoginId.email;
      }
    } catch (lookupError) {
      console.warn("loginIds 조회 실패:", lookupError);
    }

    // 2) 관리자 예외 처리:
    // 기존에 Firebase Auth에만 관리자 계정이 있고 loginIds 문서가 없는 경우도 로그인되도록 합니다.
    if (!email) {
      const admin = getAdminByLoginId(loginId);
      if (admin) {
        email = admin.email;
      }
    }

    if (!email) {
      alert("아이디와 비빌번호가 일치히지 않습니다.");
      return;
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 3) 로그인 성공 후 누락된 Firestore 문서를 자동 보정합니다.
    //    특히 관리자 계정을 Firebase Console에서 먼저 만든 경우 필요합니다.
    const adminInfo = getAdminByEmail(user.email);
    const role = adminInfo ? "admin" : "member";
    const fixedLoginId = adminInfo?.loginId || loginId;

    try {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (!userSnap.exists()) {
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          name: adminInfo?.name || "",
          phone: adminInfo?.phone || "",
          loginId: fixedLoginId,
          email: user.email,
          privacyAgree: true,
          role,
          createdAt: serverTimestamp(),
          repairedAt: serverTimestamp()
        });
      }

      const loginIdSnap = await getDoc(doc(db, "loginIds", fixedLoginId));
      if (!loginIdSnap.exists()) {
        await setDoc(doc(db, "loginIds", fixedLoginId), {
          uid: user.uid,
          email: user.email,
          loginId: fixedLoginId,
          createdAt: serverTimestamp(),
          repairedAt: serverTimestamp()
        });
      }
    } catch (repairError) {
      console.warn("로그인 후 회원문서 보정 실패:", repairError);
      // 보정 실패가 있어도 로그인 자체는 유지합니다.
    }

    alert(role === "admin" ? "관리자로 로그인되었습니다." : "로그인되었습니다.");
    closeModal("loginModal");
    event.target.reset();
  } catch (error) {
    console.error("로그인 실패:", error);

    if (error.code === "auth/operation-not-allowed") {
      alert("Firebase Authentication에서 Email/Password 로그인을 활성화해야 합니다.");
      return;
    }

    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
      alert("아이디와 비빌번호가 일치히지 않습니다.");
      return;
    }

    alert("로그인 실패: " + error.message);
  }
}

async function handleDeleteAccount() {
  if (!currentUser || !currentProfile) {
    alert("로그인 정보가 없습니다.");
    return;
  }

  if (isAdmin()) {
    const okAdmin = confirm("관리자 계정입니다. 정말 탈퇴하시겠습니까? 탈퇴하면 관리자 권한도 사라집니다.");
    if (!okAdmin) return;
  }

  const ok = confirm("정말 회원 탈퇴하시겠습니까? 탈퇴 후 되돌릴 수 없습니다. 최근 로그인한 상태에서만 탈퇴가 가능합니다.");
  if (!ok) return;

  try {
    const uid = currentUser.uid;
    const loginId = currentProfile.loginId;

    await deleteDoc(doc(db, "users", uid));
    if (loginId) await deleteDoc(doc(db, "loginIds", loginId));
    await deleteUser(currentUser);

    alert("회원 탈퇴가 완료되었습니다.");
    showPage("home");
  } catch (error) {
    console.error(error);
    if (error.code === "auth/requires-recent-login") {
      alert("보안을 위해 다시 로그인한 뒤 탈퇴를 진행해주세요.");
      return;
    }
    alert("회원 탈퇴 실패: " + error.message);
  }
}

async function updateAuthUI(user) {
  currentUser = user;
  const authArea = $("#authArea");

  if (!user) {
    currentProfile = null;
    authArea.innerHTML = `
      <button class="ghost-btn" data-open-modal="loginModal">로그인</button>
      <button class="primary-btn" data-open-modal="signupModal">회원가입</button>
    `;
    showAdminTools();
    renderAll();
    return;
  }

  let profile = { name: user.email, email: user.email, loginId: "" };

  if (firebaseReady) {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) profile = snap.data();
    } catch (error) {
      console.warn("프로필 불러오기 실패:", error);
    }
  }

  currentProfile = profile;
  const displayId = getDisplayId();

  authArea.innerHTML = `
    <button class="ghost-btn" data-page="mypage">${escapeHTML(displayId)}님</button>
    <button class="primary-btn" id="logoutBtn">로그아웃</button>
  `;

  $("#myProfile").innerHTML = `
    <h2>${escapeHTML(displayId)}님의 마이페이지</h2>
    <p><strong>권한:</strong> ${isAdmin(user) ? "관리자" : "일반회원"}</p>
    <p><strong>이름:</strong> ${escapeHTML(profile.name || "미입력")}</p>
    <p><strong>아이디:</strong> ${escapeHTML(profile.loginId || "미입력")}</p>
    <p><strong>메일주소:</strong> ${escapeHTML(profile.email || user.email)}</p>
    <p><strong>전화번호:</strong> ${escapeHTML(profile.phone || "미입력")}</p>
    <p class="meta">비밀번호는 보안상 화면에 표시하지 않습니다.</p>
    <div class="mypage-actions">
      <button class="ghost-btn" id="logoutBtn">로그아웃</button>
      <button class="danger-btn" id="deleteAccountBtn">회원 탈퇴</button>
    </div>
  `;

  showAdminTools();
  renderAll();
}




function initAuth() {
  if (!firebaseReady) {
    console.warn("Firebase 설정값을 확인하세요.");
    updateFirebaseStatus("Firebase 설정값을 확인하세요. app.js의 firebaseConfig가 비어 있으면 가입/로그인이 저장되지 않습니다.", "error");
    updateAuthUI(null);
    return;
  }

  updateFirebaseStatus("Firebase 설정값이 입력되어 있습니다. 가입/로그인이 안 되면 Authentication의 Email/Password 활성화, Firestore Rules, Storage Rules 게시 여부를 확인하세요.", "ok");

  onAuthStateChanged(auth, async (user) => {
    await updateAuthUI(user);
  });
}

function initRouter() {
  const hash = window.location.hash.replace("#", "");
  if (hash && document.getElementById(hash)) showPage(hash);
  else showPage("home");
}

async function init() {
  bindEvents();
  window.__GWANGSEOK_APP_LOADED__ = true;
  applyTemplate(defaultTemplate);
  await loadTemplate();
  await loadContents();
  initAuth();
  initRouter();
}


init().catch((error) => {
  console.error("앱 초기화 실패:", error);
  alert("사이트 코드 초기화 중 오류가 났습니다. F12 Console 오류를 확인하세요: " + error.message);
});

