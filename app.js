// 광석이네집 GitHub Pages + Firebase 샘플 코드
// 1) Firebase Console에서 웹 앱을 추가한 뒤 아래 firebaseConfig 값을 본인 프로젝트 값으로 교체하세요.
// 2) Firebase Authentication에서 Email/Password 로그인을 활성화하세요.
// 3) Firestore Database를 생성하세요.

// Firebase Web SDK - modular API
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// TODO: 본인의 Firebase 설정값으로 반드시 바꾸세요.
const firebaseConfig = {
  apiKey: "AIzaSyDPGi_MBLGkap_VTdo07j_fXw6Sy4TTPeo",
  authDomain: "kksarchive.firebaseapp.com",
  projectId: "kksarchive",
  storageBucket: "kksarchive.firebasestorage.app",
  messagingSenderId: "322477795788",
  appId: "1:322477795788:web:9f6a9c2c8d26c1a76d5569",
  measurementId: "G-9RG0YXC
};

let app;
let auth;
let db;
let firebaseReady = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseReady = !firebaseConfig.apiKey.includes("여기에");
} catch (error) {
  console.warn("Firebase 초기화 확인 필요:", error);
}

// 샘플 콘텐츠 데이터
const archiveData = {
  videos: [
    { title: "1995 라이브 공연 영상", year: "1995", source: "자료 출처 확인 필요", category: "공연", desc: "공연 영상 샘플 설명입니다." },
    { title: "방송 출연 영상", year: "1994", source: "방송사 출처 확인 필요", category: "방송", desc: "방송 영상 샘플 설명입니다." },
    { title: "인터뷰 기록 영상", year: "1993", source: "소장자 확인 필요", category: "인터뷰", desc: "인터뷰 영상 샘플 설명입니다." }
  ],
  songs: [
    { title: "서른 즈음에", album: "4집", year: "1994", desc: "곡 정보 샘플입니다. 실제 음원 공개 전 권리 확인이 필요합니다." },
    { title: "거리에서", album: "다시부르기", year: "1993", desc: "곡 정보 샘플입니다." },
    { title: "사랑했지만", album: "2집", year: "1991", desc: "곡 정보 샘플입니다." }
  ],
  radios: [
    { title: "라디오 인터뷰 자료", date: "1994.00.00", source: "방송명 확인 필요", desc: "라디오 출연 자료 요약입니다." },
    { title: "라이브 라디오 방송", date: "1995.00.00", source: "출처 확인 필요", desc: "방송 중 라이브 자료 요약입니다." }
  ],
  photos: [
    { title: "공연 사진", year: "1995", source: "촬영자 확인 필요" },
    { title: "방송 사진", year: "1994", source: "방송사 확인 필요" },
    { title: "앨범 관련 사진", year: "1993", source: "출처 확인 필요" },
    { title: "일상 기록 사진", year: "미상", source: "소장자 확인 필요" }
  ],
  stories: [
    { title: "일기 샘플 1", date: "1992.00.00", source: "출처 확인 필요", body: "이곳에는 일기 본문만 들어갑니다. 기사, 팬글, 편지 등은 넣지 않습니다." },
    { title: "일기 샘플 2", date: "1993.00.00", source: "출처 확인 필요", body: "공개 가능 여부를 확인한 일기만 등록하는 것을 권장합니다." }
  ],
  oneum: [
    { title: "둥근소리글 샘플 1", date: "작성일 확인 필요", source: "출처 확인 필요", body: "둥근소리글 본문 또는 설명을 넣는 공간입니다." },
    { title: "둥근소리글 샘플 2", date: "작성일 확인 필요", source: "출처 확인 필요", body: "원문 공개 전 권리 확인이 필요합니다." }
  ]
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

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

function detailTemplate(item, type) {
  return `
    <p class="eyebrow">${type}</p>
    <h2>${item.title}</h2>
    <p class="meta">${item.year || item.date || ""} · ${item.source || item.album || ""}</p>
    <div class="notice-box">
      <strong>자료 공개 전 확인</strong>
      <p>음악, 영상, 사진, 글 자료는 저작권·출처·공개 가능 여부를 확인한 뒤 공개해야 합니다.</p>
    </div>
    <p>${item.desc || item.body || "상세 설명이 없습니다."}</p>
  `;
}

function renderHome() {
  const latest = [
    ...archiveData.videos.slice(0, 1).map((x) => ({ ...x, type: "videos" })),
    ...archiveData.songs.slice(0, 1).map((x) => ({ ...x, type: "songs" })),
    ...archiveData.photos.slice(0, 1).map((x) => ({ ...x, type: "photos" })),
    ...archiveData.stories.slice(0, 1).map((x) => ({ ...x, type: "stories" }))
  ];

  $("#homeLatest").innerHTML = latest.map((item) => `
    <article class="archive-card" data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="${item.type}">
      <div class="thumb">${item.type}</div>
      <h3>${item.title}</h3>
      <p class="meta">${item.year || item.date || ""} · ${item.source || item.album || ""}</p>
    </article>
  `).join("");
}

function renderVideos() {
  const search = ($("#videoSearch")?.value || "").toLowerCase();
  const filter = $("#videoFilter")?.value || "all";
  const items = archiveData.videos.filter((item) => {
    const matchedSearch = `${item.title} ${item.year} ${item.source}`.toLowerCase().includes(search);
    const matchedFilter = filter === "all" || item.category === filter;
    return matchedSearch && matchedFilter;
  });

  $("#videosList").innerHTML = items.map((item) => `
    <article class="archive-card" data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="videos">
      <div class="thumb">VIDEO</div>
      <h3>${item.title}</h3>
      <p class="meta">${item.year} · ${item.category} · ${item.source}</p>
    </article>
  `).join("");
}

function renderSongs() {
  const search = ($("#songSearch")?.value || "").toLowerCase();
  const items = archiveData.songs.filter((item) =>
    `${item.title} ${item.album} ${item.year}`.toLowerCase().includes(search)
  );

  $("#songsList").innerHTML = items.map((item) => `
    <tr>
      <td>${item.title}</td>
      <td>${item.album}</td>
      <td>${item.year}</td>
      <td><button class="play-btn" data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="songs">▶</button></td>
    </tr>
  `).join("");
}

function renderRadios() {
  $("#radiosList").innerHTML = archiveData.radios.map((item) => `
    <article class="list-item" data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="radios">
      <h3>${item.title}</h3>
      <p class="meta">${item.date} · ${item.source}</p>
      <p>${item.desc}</p>
    </article>
  `).join("");
}

function renderPhotos() {
  $("#photosList").innerHTML = archiveData.photos.map((item) => `
    <article class="photo-card" data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="photos">
      <div class="thumb">PHOTO</div>
      <h3>${item.title}</h3>
      <p class="meta">${item.year} · ${item.source}</p>
    </article>
  `).join("");
}

function renderStories() {
  $("#storiesList").innerHTML = archiveData.stories.map((item) => `
    <article class="list-item" data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="stories">
      <h3>${item.title}</h3>
      <p class="meta">작성일: ${item.date} · ${item.source}</p>
      <p>${item.body}</p>
    </article>
  `).join("");
}

function renderOneum() {
  $("#oneumList").innerHTML = archiveData.oneum.map((item) => `
    <article class="list-item" data-detail='${encodeURIComponent(JSON.stringify(item))}' data-type="oneum">
      <h3>${item.title}</h3>
      <p class="meta">${item.date} · ${item.source}</p>
      <p>${item.body}</p>
    </article>
  `).join("");
}

function renderAll() {
  renderHome();
  renderVideos();
  renderSongs();
  renderRadios();
  renderPhotos();
  renderStories();
  renderOneum();
}

function bindEvents() {
  document.addEventListener("click", async (event) => {
    const pageBtn = event.target.closest("[data-page]");
    if (pageBtn) {
      showPage(pageBtn.dataset.page);
    }

    const openBtn = event.target.closest("[data-open-modal]");
    if (openBtn) {
      openModal(openBtn.dataset.openModal);
    }

    const closeBtn = event.target.closest("[data-close-modal]");
    if (closeBtn) {
      closeModal(closeBtn.dataset.closeModal);
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
  });

  $$(".modal").forEach((modal) => {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) modal.classList.remove("active");
    });
  });

  $("#videoSearch")?.addEventListener("input", renderVideos);
  $("#videoFilter")?.addEventListener("change", renderVideos);
  $("#songSearch")?.addEventListener("input", renderSongs);

  $("#signupForm")?.addEventListener("submit", handleSignup);
  $("#loginForm")?.addEventListener("submit", handleLogin);
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
  const email = $("#signupEmail").value.trim();
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

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name,
      phone,
      loginId,
      email,
      privacyAgree,
      role: "member",
      createdAt: serverTimestamp()
    });

    alert("회원가입이 완료되었습니다.");
    closeModal("signupModal");
    event.target.reset();
  } catch (error) {
    console.error(error);
    alert("회원가입 실패: " + error.message);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  if (!firebaseReady) {
    alert("먼저 app.js의 firebaseConfig 값을 본인 Firebase 설정값으로 바꿔야 합니다.");
    return;
  }

  const email = $("#loginEmail").value.trim();
  const password = $("#loginPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("로그인되었습니다.");
    closeModal("loginModal");
    event.target.reset();
  } catch (error) {
    console.error(error);
    alert("로그인 실패: " + error.message);
  }
}

async function updateAuthUI(user) {
  const authArea = $("#authArea");

  if (!user) {
    authArea.innerHTML = `
      <button class="ghost-btn" data-open-modal="loginModal">로그인</button>
      <button class="primary-btn" data-open-modal="signupModal">회원가입</button>
    `;
    return;
  }

  let profile = { name: user.email, email: user.email };

  if (firebaseReady) {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) profile = snap.data();
    } catch (error) {
      console.warn("프로필 불러오기 실패:", error);
    }
  }

  authArea.innerHTML = `
    <button class="ghost-btn" data-page="mypage">${profile.name || user.email}님</button>
    <button class="primary-btn" id="logoutBtn">로그아웃</button>
  `;

  $("#myProfile").innerHTML = `
    <h2>${profile.name || ""}님의 회원 정보</h2>
    <p><strong>아이디:</strong> ${profile.loginId || "미입력"}</p>
    <p><strong>메일주소:</strong> ${profile.email || user.email}</p>
    <p><strong>전화번호:</strong> ${profile.phone || "미입력"}</p>
    <p class="meta">비밀번호는 보안상 화면에 표시하지 않습니다.</p>
  `;
}

function initAuth() {
  if (!firebaseReady) {
    console.warn("Firebase 설정값이 아직 기본값입니다. app.js의 firebaseConfig를 수정하세요.");
    return;
  }

  onAuthStateChanged(auth, (user) => {
    updateAuthUI(user);
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

renderAll();
bindEvents();
initAuth();
initRouter();
