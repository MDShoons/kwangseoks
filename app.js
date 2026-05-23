import { firebaseConfig, ADMIN_UIDS } from "./firebase-config.js";

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
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let isAdmin = false;

window.showPage = showPage;
window.showAdminForm = showAdminForm;
window.changeTemplate = changeTemplate;
window.loadContents = loadContents;

const pages = document.querySelectorAll(".page");

function showPage(pageId) {
  pages.forEach((page) => page.classList.remove("active"));

  const target = document.getElementById(pageId);
  if (target) target.classList.add("active");

  if (["videos", "photos", "songs", "radios", "stories", "oneum"].includes(pageId)) {
    loadContents();
  }

  if (pageId === "admin" && !isAdmin) {
    alert("관리자만 접근할 수 있습니다.");
    showPage("home");
  }
}

function showAdminForm(type) {
  document.getElementById("adminVideoForm").classList.add("hidden");
  document.getElementById("adminPhotoForm").classList.add("hidden");
  document.getElementById("adminTextForm").classList.add("hidden");
  document.getElementById("adminTemplateForm").classList.add("hidden");

  if (type === "video") document.getElementById("adminVideoForm").classList.remove("hidden");
  if (type === "photo") document.getElementById("adminPhotoForm").classList.remove("hidden");
  if (type === "text") document.getElementById("adminTextForm").classList.remove("hidden");
  if (type === "template") document.getElementById("adminTemplateForm").classList.remove("hidden");
}

document.getElementById("doSignupBtn").addEventListener("click", async () => {
  const name = document.getElementById("signupName").value.trim();
  const phone = document.getElementById("signupPhone").value.trim();
  const loginId = document.getElementById("signupLoginId").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const privacyAgree = document.getElementById("privacyAgree").checked;

  if (!name || !phone || !loginId || !email || !password) {
    alert("모든 필수 항목을 입력하세요.");
    return;
  }

  if (!privacyAgree) {
    alert("개인정보 수집 및 이용에 동의해야 가입할 수 있습니다.");
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
      role: "user",
      createdAt: serverTimestamp()
    });

    alert("회원가입이 완료되었습니다.");
    showPage("home");
  } catch (error) {
    alert("회원가입 오류: " + error.message);
  }
});

document.getElementById("doLoginBtn").addEventListener("click", async () => {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value;

  if (!email || !password) {
    alert("이메일과 비밀번호를 입력하세요.");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, password);
    alert("로그인되었습니다.");
    showPage("home");
  } catch (error) {
    alert("로그인 오류: " + error.message);
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  alert("로그아웃되었습니다.");
  showPage("home");
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  isAdmin = user ? ADMIN_UIDS.includes(user.uid) : false;

  const userStatus = document.getElementById("userStatus");
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    userStatus.textContent = isAdmin ? "관리자 로그인" : user.email;
    loginBtn.classList.add("hidden");
    signupBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");

    if (isAdmin && !document.getElementById("adminNavBtn")) {
      const adminBtn = document.createElement("button");
      adminBtn.id = "adminNavBtn";
      adminBtn.textContent = "관리자";
      adminBtn.onclick = () => showPage("admin");
      document.querySelector("nav").appendChild(adminBtn);
    }
  } else {
    userStatus.textContent = "로그인 전";
    loginBtn.classList.remove("hidden");
    signupBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");

    const adminBtn = document.getElementById("adminNavBtn");
    if (adminBtn) adminBtn.remove();
  }

  loadContents();
});

function getYoutubeEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtube.com")) {
      const videoId = parsedUrl.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    if (parsedUrl.hostname.includes("youtu.be")) {
      const videoId = parsedUrl.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    return "";
  } catch {
    return "";
  }
}

document.getElementById("saveVideoBtn").addEventListener("click", async () => {
  if (!isAdmin) {
    alert("관리자만 등록할 수 있습니다.");
    return;
  }

  const title = document.getElementById("videoTitle").value.trim();
  const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
  const year = document.getElementById("videoYear").value.trim();
  const source = document.getElementById("videoSource").value.trim();
  const description = document.getElementById("videoDescription").value.trim();

  const embedUrl = getYoutubeEmbedUrl(youtubeUrl);

  if (!title || !youtubeUrl || !embedUrl) {
    alert("영상 제목과 올바른 유튜브 URL을 입력하세요.");
    return;
  }

  try {
    await addDoc(collection(db, "contents"), {
      category: "videos",
      mediaType: "youtube",
      title,
      youtubeUrl,
      mediaUrl: embedUrl,
      year,
      source,
      description,
      isPublic: true,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp()
    });

    alert("영상이 저장되었습니다.");
    document.getElementById("adminVideoForm").reset();
    loadContents();
  } catch (error) {
    alert("영상 저장 오류: " + error.message);
  }
});

document.getElementById("savePhotoBtn").addEventListener("click", async () => {
  if (!isAdmin) {
    alert("관리자만 등록할 수 있습니다.");
    return;
  }

  const title = document.getElementById("photoTitle").value.trim();
  const file = document.getElementById("photoFile").files[0];
  const year = document.getElementById("photoYear").value.trim();
  const source = document.getElementById("photoSource").value.trim();
  const description = document.getElementById("photoDescription").value.trim();

  if (!title || !file) {
    alert("사진 제목과 파일을 선택하세요.");
    return;
  }

  try {
    const filePath = `photos/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, filePath);

    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);

    await addDoc(collection(db, "contents"), {
      category: "photos",
      mediaType: "image",
      title,
      mediaUrl: downloadUrl,
      year,
      source,
      description,
      isPublic: true,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp()
    });

    alert("사진이 저장되었습니다.");
    document.getElementById("adminPhotoForm").reset();
    loadContents();
  } catch (error) {
    alert("사진 저장 오류: " + error.message);
  }
});

document.getElementById("saveTextBtn").addEventListener("click", async () => {
  if (!isAdmin) {
    alert("관리자만 등록할 수 있습니다.");
    return;
  }

  const category = document.getElementById("textCategory").value;
  const title = document.getElementById("textTitle").value.trim();
  const body = document.getElementById("textBody").value.trim();
  const year = document.getElementById("textYear").value.trim();
  const source = document.getElementById("textSource").value.trim();

  if (!title || !body) {
    alert("제목과 본문을 입력하세요.");
    return;
  }

  try {
    await addDoc(collection(db, "contents"), {
      category,
      mediaType: "text",
      title,
      body,
      year,
      source,
      isPublic: true,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp()
    });

    alert("글이 저장되었습니다.");
    document.getElementById("adminTextForm").reset();
    loadContents();
  } catch (error) {
    alert("글 저장 오류: " + error.message);
  }
});

document.getElementById("saveTemplateBtn").addEventListener("click", async () => {
  if (!isAdmin) {
    alert("관리자만 변경할 수 있습니다.");
    return;
  }

  const page = document.getElementById("templatePage").value;
  const template = document.getElementById("templateType").value;

  try {
    await setDoc(doc(db, "templateSettings", page), {
      page,
      template,
      updatedAt: serverTimestamp()
    });

    alert("템플릿이 저장되었습니다.");
    applyTemplate(page, template);
  } catch (error) {
    alert("템플릿 저장 오류: " + error.message);
  }
});

async function changeTemplate(page, template) {
  applyTemplate(page, template);
}

async function applySavedTemplates() {
  const templatePages = ["photos", "videos", "songs"];

  for (const page of templatePages) {
    const snap = await getDoc(doc(db, "templateSettings", page));
    if (snap.exists()) {
      applyTemplate(page, snap.data().template);
    }
  }
}

function applyTemplate(page, template) {
  if (page === "photos") {
    const photoList = document.getElementById("photoList");

    photoList.classList.remove("gallery-template", "card-template", "timeline-template");

    if (template === "gallery") photoList.classList.add("gallery-template");
    if (template === "card") photoList.classList.add("card-template");
    if (template === "timeline") photoList.classList.add("timeline-template");
  }
}

async function loadContents() {
  try {
    const q = query(collection(db, "contents"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const contents = [];
    snapshot.forEach((docSnap) => {
      contents.push({
        id: docSnap.id,
        ...docSnap.data()
      });
    });

    renderLatest(contents);
    renderVideos(contents.filter((item) => item.category === "videos"));
    renderPhotos(contents.filter((item) => item.category === "photos"));
    renderTextList("songList", contents.filter((item) => item.category === "songs"));
    renderTextList("radioList", contents.filter((item) => item.category === "radios"));
    renderTextList("storyList", contents.filter((item) => item.category === "stories"));
    renderTextList("oneumList", contents.filter((item) => item.category === "oneum"));

    applySavedTemplates();
  } catch (error) {
    console.error("자료 불러오기 오류:", error);
  }
}

function renderLatest(contents) {
  const latest = document.getElementById("latestContents");
  if (!latest) return;

  latest.innerHTML = "";

  contents.slice(0, 4).forEach((item) => {
    latest.appendChild(createCard(item));
  });
}

function renderVideos(videos) {
  const list = document.getElementById("videoList");
  if (!list) return;

  const search = document.getElementById("videoSearch")?.value?.trim() || "";
  const year = document.getElementById("videoYearFilter")?.value || "";

  let filtered = videos;

  if (search) {
    filtered = filtered.filter((item) => (item.title || "").includes(search));
  }

  if (year) {
    filtered = filtered.filter((item) => item.year === year);
  }

  list.innerHTML = "";

  if (filtered.length === 0) {
    list.innerHTML = "<p>등록된 영상이 없습니다.</p>";
    return;
  }

  filtered.forEach((item) => {
    list.appendChild(createCard(item));
  });
}

function renderPhotos(photos) {
  const list = document.getElementById("photoList");
  if (!list) return;

  list.innerHTML = "";

  if (photos.length === 0) {
    list.innerHTML = "<p>등록된 사진이 없습니다.</p>";
    return;
  }

  photos.forEach((item) => {
    list.appendChild(createCard(item));
  });
}

function renderTextList(elementId, items) {
  const box = document.getElementById(elementId);
  if (!box) return;

  box.innerHTML = "";

  if (items.length === 0) {
    box.innerHTML = "<p>등록된 자료가 없습니다.</p>";
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.innerHTML = `
      <h3>${escapeHtml(item.title || "")}</h3>
      <p>${escapeHtml(item.body || item.description || "")}</p>
      <p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p>
      <p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>
    `;
    box.appendChild(div);
  });
}

function createCard(item) {
  const card = document.createElement("div");
  card.className = "card";

  let mediaHtml = "";

  if (item.mediaType === "youtube") {
    mediaHtml = `<iframe src="${item.mediaUrl}" allowfullscreen></iframe>`;
  } else if (item.mediaType === "image") {
    mediaHtml = `<img src="${item.mediaUrl}" alt="${escapeHtml(item.title || "")}" />`;
  } else {
    mediaHtml = `<div style="height:180px;display:flex;align-items:center;justify-content:center;background:#e8d8c7;">자료</div>`;
  }

  card.innerHTML = `
    ${mediaHtml}
    <div class="card-body">
      <h3>${escapeHtml(item.title || "")}</h3>
      <p>${escapeHtml(item.description || item.body || "")}</p>
      <p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p>
      <p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>
    </div>
  `;

  return card;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadContents();
