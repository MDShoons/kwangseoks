// 광석이네집 GitHub Pages + Firebase 관리자 편집 버전
// 관리자 계정은 Firebase Authentication에서 직접 생성하세요.
// 관리자 권한 기준 이메일: kos20050627@gmail.com
//
// 중요: 관리자 비밀번호는 절대 GitHub 코드에 넣지 않습니다.
// GitHub는 공개 저장소가 될 수 있으므로 비밀번호를 코드/README에 저장하면 위험합니다.

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

// TODO: Firebase Console에서 복사한 본인 설정값으로 교체하세요.
const firebaseConfig = {
  apiKey: "AIzaSyDPGi_MBLGkap_VTdo07j_fXw6Sy4TTPeo",
  authDomain: "kksarchive.firebaseapp.com",
  projectId: "kksarchive",
  storageBucket: "kksarchive.firebasestorage.app",
  messagingSenderId: "322477795788",
  appId: "1:322477795788:web:9f6a9c2c8d26c1a76d5569",
  measurementId: "G-9RG0YXCMY9"
};

// 관리자 계정 목록입니다.
// 비밀번호는 보안상 코드에 저장하지 않습니다.
const ADMINS = [
  {
    name: "최일훈",
    phone: "010-3143-2729",
    loginId: "oldsong0106",
    email: "kos20050627@gmail.com"
  },
  {
    name: "최민수",
    phone: "010-3016-0413",
    loginId: "shinestone0106",
    email: "shinestone0106@kakao.com"
  }
];

const ADMIN_EMAILS = ADMINS.map((admin) => admin.email);
const ADMIN_LOGIN_IDS = ADMINS.map((admin) => admin.loginId);

let app;
let auth;
let db;
let currentUser = null;
let firebaseReady = false;
let contents = [];

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseReady = !firebaseConfig.apiKey.includes("여기에");
} catch (error) {
  console.warn("Firebase 초기화 확인 필요:", error);
}

const defaultTemplate = {
  siteTitle: "광석이네집",
  heroEyebrow: "Kim Kwang-seok Digital Archive",
  heroTitle: "노래가 된 사람,\n기록으로 남은 목소리.",
  heroDescription: "김광석의 영상, 음악, 라디오, 사진, 일기와 둥근소리글을 차분히 모아두는 디지털 아카이브입니다.",
  homeCardTitle: "광석이네집에 오신 것을 환영합니다.",
  homeCardText: "이곳은 자료를 함부로 소비하기보다, 출처와 맥락을 함께 남기는 아카이브를 지향합니다.",
  aboutMainText: "이 영역은 김광석에 대한 기본 소개를 담는 공간입니다. 실제 공개 전에는 연보, 음반, 공연 기록을 신뢰 가능한 자료로 검토해야 합니다.",
  footerText: "본 사이트는 김광석 관련 자료를 보존하고 정리하기 위한 아카이브 예시입니다."
};

const sampleContents = [
  { id: "sample-video-1", category: "videos", title: "1995 라이브 공연 영상", date: "1995", type: "공연", source: "자료 출처 확인 필요", body: "공연 영상 샘플 설명입니다.", url: "", visibility: "public", sample: true },
  { id: "sample-song-1", category: "songs", title: "서른 즈음에", date: "1994", type: "정규앨범", source: "4집", body: "곡 정보 샘플입니다. 실제 음원 공개 전 권리 확인이 필요합니다.", url: "", visibility: "public", sample: true },
  { id: "sample-radio-1", category: "radios", title: "라디오 인터뷰 자료", date: "1994.00.00", type: "인터뷰", source: "방송명 확인 필요", body: "라디오 출연 자료 요약입니다.", url: "", visibility: "public", sample: true },
  { id: "sample-photo-1", category: "photos", title: "공연 사진", date: "1995", type: "공연", source: "촬영자 확인 필요", body: "사진 설명 샘플입니다.", url: "", visibility: "public", sample: true },
  { id: "sample-story-1", category: "stories", title: "일기 샘플 1", date: "1992.00.00", type: "일기", source: "출처 확인 필요", body: "이곳에는 일기 본문만 들어갑니다. 기사, 팬글, 편지 등은 넣지 않습니다.", url: "", visibility: "public", sample: true },
  { id: "sample-oneum-1", category: "oneum", title: "둥근소리글 샘플 1", date: "작성일 확인 필요", type: "글", source: "출처 확인 필요", body: "둥근소리글 본문 또는 설명을 넣는 공간입니다.", url: "", visibility: "public", sample: true }
];

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function isAdmin(user = currentUser) {
  return !!user && ADMIN_EMAILS.includes(user.email);
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
  if (pageId === "admin" && !isAdmin()) {
    alert("관리자만 접근할 수 있습니다.");
    pageId = "home";
  }

  $$(".page").forEach((page) => page.classList.remove("active"));
  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");

  $$(".main-nav a").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === pageId);
  });

  window.location.hash = pageId;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function detailTemplate(item, type) {
  const safeTitle = escapeHTML(item.title);
  const safeDate = escapeHTML(item.date || "");
  const safeSource = escapeHTML(item.source || "");
  const safeBody = escapeHTML(item.body || "상세 설명이 없습니다.").replaceAll("\n", "<br>");
  const safeUrl = escapeHTML(item.url || "");

  return `
    <p class="eyebrow">${escapeHTML(type)}</p>
    <h2>${safeTitle}</h2>
    <p class="meta">${safeDate} · ${safeSource}</p>
    ${safeUrl ? `<p><a class="primary-btn" href="${safeUrl}" target="_blank" rel="noopener">자료 링크 열기</a></p>` : ""}
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

function applyTemplate(template) {
  const data = { ...defaultTemplate, ...template };
  $("#siteLogoText").textContent = data.siteTitle;
  document.title = `${data.siteTitle} | 김광석 아카이브`;
  $("#heroEyebrow").textContent = data.heroEyebrow;
  $("#heroTitle").textContent = data.heroTitle;
  $("#heroDescription").textContent = data.heroDescription;
  $("#homeCardTitle").textContent = data.homeCardTitle;
  $("#homeCardText").textContent = data.homeCardText;
  $("#aboutMainText").textContent = data.aboutMainText;
  $("#footerText").textContent = data.footerText;

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
    if (snap.exists()) {
      applyTemplate(snap.data());
    } else {
      applyTemplate(defaultTemplate);
    }
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
    alert("관리자만 저장할 수 있습니다.");
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
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.email
  };

  try {
    await setDoc(doc(db, "settings", "siteTemplate"), template, { merge: true });
    applyTemplate(template);
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

    if (contents.length === 0) {
      contents = [...sampleContents];
    }

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
    alert("관리자만 콘텐츠를 저장할 수 있습니다.");
    return;
  }

  const id = $("#contentId").value;
  const category = $("#contentCategory").value;
  const payload = {
    category,
    title: $("#contentTitle").value.trim(),
    date: $("#contentDate").value.trim(),
    type: $("#contentType").value.trim(),
    source: $("#contentSource").value.trim(),
    url: $("#contentUrl").value.trim(),
    body: $("#contentBody").value.trim(),
    visibility: $("#contentVisibility").value,
    updatedAt: serverTimestamp(),
    updatedBy: currentUser.email
  };

  if (category === "stories" && payload.type && payload.type !== "일기") {
    const ok = confirm("stories는 일기 전용 공간입니다. 분류를 '일기'로 바꾸는 것이 좋습니다. 계속 저장할까요?");
    if (!ok) return;
  }

  try {
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
    alert("삭제되었습니다.");
    await loadContents();
  } catch (error) {
    console.error(error);
    alert("삭제 실패: " + error.message);
  }
}

function editContent(id) {
  const item = contents.find((x) => x.id === id);
  if (!item) return;

  $("#contentId").value = item.id;
  $("#contentCategory").value = item.category || "videos";
  $("#contentTitle").value = item.title || "";
  $("#contentDate").value = item.date || "";
  $("#contentType").value = item.type || "";
  $("#contentSource").value = item.source || "";
  $("#contentUrl").value = item.url || "";
  $("#contentBody").value = item.body || "";
  $("#contentVisibility").value = item.visibility || "public";
  window.scrollTo({ top: $("#admin").offsetTop, behavior: "smooth" });
}

function resetContentForm() {
  $("#contentForm").reset();
  $("#contentId").value = "";
  $("#contentCategory").value = "videos";
  $("#contentVisibility").value = "public";
}

function renderHome() {
  const latest = contents.slice(0, 4);
  $("#homeLatest").innerHTML = latest.map((item) => cardHTML(item)).join("") || emptyHTML("아직 등록된 자료가 없습니다.");
}

function cardHTML(item) {
  return `
    <article class="archive-card" data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="${escapeHTML(item.category)}">
      <div class="thumb">${escapeHTML((item.category || "ARCHIVE").toUpperCase())}</div>
      <h3>${escapeHTML(item.title)}</h3>
      <p class="meta">${escapeHTML(item.date || "")} · ${escapeHTML(item.source || "")}</p>
      <span class="status-pill">${visibilityLabel(item.visibility)}</span>
    </article>
  `;
}

function listHTML(item) {
  return `
    <article class="list-item" data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="${escapeHTML(item.category)}">
      <h3>${escapeHTML(item.title)}</h3>
      <p class="meta">${escapeHTML(item.date || "")} · ${escapeHTML(item.source || "")}</p>
      <p>${escapeHTML(item.body || "").slice(0, 120)}</p>
      <span class="status-pill">${visibilityLabel(item.visibility)}</span>
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
      <td>${escapeHTML(item.title)}</td>
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

function renderAdminList() {
  const box = $("#adminContentList");
  if (!box) return;

  if (!isAdmin()) {
    box.innerHTML = emptyHTML("관리자만 볼 수 있습니다.");
    return;
  }

  box.innerHTML = contents.map((item) => `
    <div class="admin-row">
      <div>
        <strong>${escapeHTML(item.title)}</strong>
        <p class="meta">${escapeHTML(item.category)} · ${escapeHTML(item.date || "")} · ${escapeHTML(item.source || "")} · ${visibilityLabel(item.visibility)}</p>
      </div>
      <div class="admin-row-actions">
        <button class="success-btn" data-edit-content="${escapeHTML(item.id)}">수정</button>
        ${item.sample ? "" : `<button class="danger-btn" data-delete-content="${escapeHTML(item.id)}">삭제</button>`}
      </div>
    </div>
  `).join("") || emptyHTML("등록된 콘텐츠가 없습니다.");
}

function renderAll() {
  renderHome();
  renderVideos();
  renderSongs();
  renderRadios();
  renderPhotos();
  renderStories();
  renderOneum();
  renderAdminList();
}

function bindEvents() {
  document.addEventListener("click", async (event) => {
    const pageBtn = event.target.closest("[data-page]");
    if (pageBtn) showPage(pageBtn.dataset.page);

    const openBtn = event.target.closest("[data-open-modal]");
    if (openBtn) openModal(openBtn.dataset.openModal);

    const closeBtn = event.target.closest("[data-close-modal]");
    if (closeBtn) closeModal(closeBtn.dataset.closeModal);

    const detail = event.target.closest("[data-detail]");
    if (detail) {
      const item = JSON.parse(decodeURIComponent(detail.dataset.detail));
      $("#detailContent").innerHTML = detailTemplate(item, detail.dataset.type);
      openModal("detailModal");
    }

    const editBtn = event.target.closest("[data-edit-content]");
    if (editBtn) editContent(editBtn.dataset.editContent);

    const deleteBtn = event.target.closest("[data-delete-content]");
    if (deleteBtn) await deleteContent(deleteBtn.dataset.deleteContent);

    if (event.target.id === "logoutBtn") {
      if (!firebaseReady) {
        alert("Firebase 설정값을 먼저 입력해야 로그아웃 기능을 사용할 수 있습니다.");
        return;
      }
      await signOut(auth);
    }
  });

  $$(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.classList.remove("active");
    });
  });

  $("#videoSearch")?.addEventListener("input", renderVideos);
  $("#videoFilter")?.addEventListener("change", renderVideos);
  $("#songSearch")?.addEventListener("input", renderSongs);

  $("#checkLoginIdBtn")?.addEventListener("click", checkLoginIdAvailability);
  $("#signupLoginId")?.addEventListener("input", () => {
    $("#signupLoginId").dataset.checked = "false";
    $("#signupLoginId").dataset.checkedValue = "";
    setLoginIdMessage("아이디 중복확인을 해주세요.", "");
  });

  $("#signupForm")?.addEventListener("submit", handleSignup);
  $("#loginForm")?.addEventListener("submit", handleLogin);
  $("#templateForm")?.addEventListener("submit", saveTemplate);
  $("#contentForm")?.addEventListener("submit", saveContent);
  $("#resetContentForm")?.addEventListener("click", resetContentForm);
}

async function checkLoginIdAvailability() {
  if (!firebaseReady) {
    alert("먼저 app.js의 firebaseConfig 값을 본인 Firebase 설정값으로 바꿔야 합니다.");
    return false;
  }

  const loginId = $("#signupLoginId").value.trim();

  if (!isValidLoginId(loginId)) {
    setLoginIdMessage("아이디는 영문, 숫자, 밑줄(_) 조합 4~20자로 입력하세요.", "error");
    $("#signupLoginId").dataset.checked = "false";
    return false;
  }

  try {
    const snap = await getDoc(doc(db, "loginIds", loginId));
    if (snap.exists()) {
      setLoginIdMessage("다른 사용자가 이미 사용중인 아이디 입니다.", "error");
      $("#signupLoginId").dataset.checked = "false";
      return false;
    }

    setLoginIdMessage("사용 가능한 아이디입니다.", "ok");
    $("#signupLoginId").dataset.checked = "true";
    $("#signupLoginId").dataset.checkedValue = loginId;
    return true;
  } catch (error) {
    console.error(error);
    setLoginIdMessage("아이디 중복확인 중 오류가 발생했습니다.", "error");
    $("#signupLoginId").dataset.checked = "false";
    return false;
  }
}

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
      // 아이디 예약 또는 회원정보 저장이 실패하면 방금 만든 인증 계정을 삭제해 중복/고아 계정을 줄입니다.
      try {
        await deleteUser(user);
      } catch (deleteError) {
        console.warn("인증 계정 삭제 실패:", deleteError);
      }
      throw writeError;
    }

    alert(role === "admin" ? "관리자 계정 회원가입이 완료되었습니다." : "회원가입이 완료되었습니다.");
    closeModal("signupModal");
    event.target.reset();
    setLoginIdMessage("", "");
  } catch (error) {
    console.error(error);

    if (error.code === "permission-denied" || error.message.includes("Missing or insufficient permissions")) {
      alert("다른 사용자가 이미 사용중인 아이디 입니다.");
      return;
    }

    alert("회원가입 실패: " + error.message);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  if (!firebaseReady) {
    alert("먼저 app.js의 firebaseConfig 값을 본인 Firebase 설정값으로 바꿔야 합니다.");
    return;
  }

  const loginId = $("#loginId").value.trim();
  const password = $("#loginPassword").value;

  try {
    const loginSnap = await getDoc(doc(db, "loginIds", loginId));

    if (!loginSnap.exists()) {
      alert("아이디와 비빌번호가 일치히지 않습니다.");
      return;
    }

    const { email } = loginSnap.data();

    await signInWithEmailAndPassword(auth, email, password);
    alert(ADMIN_LOGIN_IDS.includes(loginId) ? "관리자로 로그인되었습니다." : "로그인되었습니다.");
    closeModal("loginModal");
    event.target.reset();
  } catch (error) {
    console.error(error);
    alert("아이디와 비빌번호가 일치히지 않습니다.");
  }
}

async function updateAuthUI(user) {
  currentUser = user;
  const authArea = $("#authArea");

  if (!user) {
    authArea.innerHTML = `
      <button class="ghost-btn" data-open-modal="loginModal">로그인</button>
      <button class="primary-btn" data-open-modal="signupModal">회원가입</button>
    `;
    $$(".admin-only").forEach((el) => el.classList.add("hidden"));
    if (window.location.hash === "#admin") showPage("home");
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

  if (isAdmin(user)) {
    $$(".admin-only").forEach((el) => el.classList.remove("hidden"));
  } else {
    $$(".admin-only").forEach((el) => el.classList.add("hidden"));
  }

  authArea.innerHTML = `
    <button class="ghost-btn" data-page="mypage">${escapeHTML(profile.name || user.email)}님</button>
    ${isAdmin(user) ? `<button class="ghost-btn" data-page="admin">관리자</button>` : ""}
    <button class="primary-btn" id="logoutBtn">로그아웃</button>
  `;

  $("#myProfile").innerHTML = `
    <h2>${escapeHTML(profile.name || "")}님의 회원 정보</h2>
    <p><strong>권한:</strong> ${isAdmin(user) ? "관리자" : "일반회원"}</p>
    <p><strong>아이디:</strong> ${escapeHTML(profile.loginId || "미입력")}</p>
    <p><strong>메일주소:</strong> ${escapeHTML(profile.email || user.email)}</p>
    <p><strong>전화번호:</strong> ${escapeHTML(profile.phone || "미입력")}</p>
    <p class="meta">비밀번호는 보안상 화면에 표시하지 않습니다.</p>
  `;

  renderAll();
}

function initAuth() {
  if (!firebaseReady) {
    console.warn("Firebase 설정값이 아직 기본값입니다. app.js의 firebaseConfig를 수정하세요.");
    updateAuthUI(null);
    return;
  }

  onAuthStateChanged(auth, async (user) => {
    await updateAuthUI(user);
  });
}

function initRouter() {
  const hash = window.location.hash.replace("#", "");
  if (hash && document.getElementById(hash)) {
    showPage(hash);
  } else {
    showPage("home");
  }
}

async function init() {
  bindEvents();
  applyTemplate(defaultTemplate);
  await loadTemplate();
  await loadContents();
  initAuth();
  initRouter();
}

init();
