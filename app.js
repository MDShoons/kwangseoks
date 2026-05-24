import { firebaseConfig, ADMIN_EMAILS, ADMIN_LOGIN_IDS, GITHUB_UPLOAD_WORKER_URL } from "./firebase-config.js";

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
  getDoc,
  runTransaction,
  updateDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";


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

window.showPage = showPage;
window.showAdminForm = showAdminForm;
window.changeTemplate = changeTemplate;
window.loadContents = loadContents;
window.renderAdminManageList = renderAdminManageList;
window.editContent = editContent;
window.deleteContentItem = deleteContentItem;

const pages = 



loadSiteSettings();
  await loadPageCategories();
  await loadContents();
});



async function loadPageCategories() {
  try {
    const snapshot = await getDocs(query(collection(db, "pageCategories"), orderBy("createdAt", "asc")));
    pageCategories = {};

    snapshot.forEach((docSnap) => {
      const item = { id: docSnap.id, ...docSnap.data() };
      if (!item.page || !item.name) return;
      if (!pageCategories[item.page]) pageCategories[item.page] = [];
      pageCategories[item.page].push(item);
    });

    populateAllCategoryFilters();
    populateContentSubCategorySelect(document.getElementById("contentCategory")?.value || "videos");
    renderCategoryList();
  } catch (error) {
    console.warn("카테고리 불러오기 오류:", error);
  }
}

function populateAllCategoryFilters() {
  const pages = ["videos", "songs", "radios", "photos", "stories", "about", "oneum"];

  pages.forEach((page) => {
    const select = document.getElementById(`${page}CategoryFilter`);
    if (!select) return;

    const current = select.value;
    select.innerHTML = '<option value="">전체 카테고리</option>';

    (pageCategories[page] || []).forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.name;
      option.textContent = cat.name;
      select.appendChild(option);
    });

    select.value = current;
  });
}


function populateSpecificSubCategorySelect(page, selectId, selectedValue = "") {
  const select = document.getElementById(selectId);
  if (!select) return;

  const current = selectedValue || select.value;
  select.innerHTML = '<option value="">카테고리 없음</option>';

  (pageCategories[page] || []).forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.name;
    option.textContent = cat.name;
    select.appendChild(option);
  });

  if (current) select.value = current;
}

function populateContentSubCategorySelect(page, selectedValue = "") {
  const select = document.getElementById("contentSubCategory");
  if (!select) return;

  const current = selectedValue || select.value;
  select.innerHTML = '<option value="">카테고리 없음</option>';

  (pageCategories[page] || []).forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat.name;
    option.textContent = cat.name;
    select.appendChild(option);
  });

  if (current) select.value = current;
}

async function saveCustomCategory() {
  if (!isAdmin) {
    alert("관리자만 카테고리를 만들 수 있습니다.");
    return;
  }

  const page = document.getElementById("categoryPage").value;
  const name = document.getElementById("newCategoryName").value.trim();

  if (!page || !name) {
    alert("페이지와 카테고리 이름을 입력하세요.");
    return;
  }

  const exists = (pageCategories[page] || []).some((cat) => cat.name === name);
  if (exists) {
    alert("이미 있는 카테고리입니다.");
    return;
  }

  try {
    await addDoc(collection(db, "pageCategories"), {
      page,
      name,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp()
    });

    document.getElementById("newCategoryName").value = "";
    await loadPageCategories();
    alert("카테고리가 생성되었습니다. 이제 글/자료 등록 시 선택할 수 있습니다.");
  } catch (error) {
    alert("카테고리 생성 오류: " + error.message);
  }
}

function renderCategoryList() {
  const box = document.getElementById("categoryList");
  if (!box) return;

  const page = document.getElementById("categoryPage")?.value || "videos";
  const cats = pageCategories[page] || [];

  box.innerHTML = "";

  if (cats.length === 0) {
    box.innerHTML = "<p>아직 생성된 카테고리가 없습니다.</p>";
    return;
  }

  cats.forEach((cat) => {
    const div = document.createElement("div");
    div.className = "category-chip";
    div.innerHTML = `
      <span>${escapeHtml(cat.name)}</span>
      <button type="button" onclick="deleteCustomCategory('${cat.id}')">삭제</button>
    `;
    box.appendChild(div);
  });
}

window.deleteCustomCategory = async function deleteCustomCategory(id) {
  if (!isAdmin) {
    alert("관리자만 삭제할 수 있습니다.");
    return;
  }

  const ok = confirm("이 카테고리를 삭제하시겠습니까? 기존 글에 지정된 카테고리명은 그대로 남을 수 있습니다.");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "pageCategories", id));
    await loadPageCategories();
    alert("카테고리가 삭제되었습니다.");
  } catch (error) {
    alert("카테고리 삭제 오류: " + error.message);
  }
};


async function fileToCompressedDataUrl(file, maxWidth = 1600, quality = 0.78) {
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

  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  let output = canvas.toDataURL("image/jpeg", quality);

  if (output.length > 850000) {
    output = canvas.toDataURL("image/jpeg", 0.6);
  }
  if (output.length > 850000) {
    const smallerCanvas = document.createElement("canvas");
    smallerCanvas.width = Math.round(canvas.width * 0.8);
    smallerCanvas.height = Math.round(canvas.height * 0.8);
    const sctx = smallerCanvas.getContext("2d");
    sctx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
    output = smallerCanvas.toDataURL("image/jpeg", 0.55);
  }

  if (output.length > 900000) {
    throw new Error("배경 이미지가 너무 큽니다. 더 작은 이미지로 다시 시도하세요.");
  }

  return output;
}

async function uploadImageToGitHubWorker(file, folder = "images") {
  if (!file) return "";

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

  const response = await fetch(GITHUB_UPLOAD_WORKER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`
    },
    body: formData
  });

  let result = {};
  try {
    result = await response.json();
  } catch {
    result = {};
  }

  if (!response.ok) {
    throw new Error(result.error || "GitHub 이미지 업로드에 실패했습니다.");
  }

  return result.imageUrl;
}


async function uploadFileToGitHubWorker(file, folder = "images") {
  return await uploadImageToGitHubWorker(file, folder);
}


async function getImageDataUrlOrDirectUrl(file, directUrl, maxWidth = 1400) {
  if (file) {
    return await fileToCompressedDataUrl(file, maxWidth, 0.74);
  }
  return directUrl && directUrl.trim() ? directUrl.trim() : "";
}

function pickDirectUrlOrUploadedUrl(directUrl, uploadedUrl) {
  return directUrl && directUrl.trim() ? directUrl.trim() : uploadedUrl;
}

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

document.getElementById("saveContentBtn").addEventListener("click", async () => {
  if (!isAdmin) {
    alert("관리자만 등록/수정할 수 있습니다.");
    return;
  }

  const editId = document.getElementById("editContentId").value;
  const category = document.getElementById("contentCategory").value;
  const subCategory = document.getElementById("contentSubCategory").value;
  const title = document.getElementById("contentTitle").value.trim();
  const body = document.getElementById("contentBody").value.trim();
  const year = document.getElementById("contentYear").value.trim();
  const source = document.getElementById("contentSource").value.trim();
  const directImageUrl = document.getElementById("contentImageUrl").value.trim();
  const imageFile = document.getElementById("contentImageFile").files[0];
  const isFeatured = document.getElementById("contentFeatured").checked;

  if (!title || !body) {
    alert("제목과 본문을 입력하세요.");
    return;
  }

  try {
    const imageUrl = await getImageDataUrlOrDirectUrl(imageFile, directImageUrl, 1400);

    const payload = {
      category,
      mediaType: imageUrl ? "imageText" : "text",
      title,
      subCategory,
      body,
      description: body,
      year,
      source,
      isFeatured,
      isPublic: true,
      updatedAt: serverTimestamp()
    };

    if (imageUrl) payload.mediaUrl = imageUrl;

    if (editId) {
      await updateDoc(doc(db, "contents", editId), payload);
      alert("자료가 수정되었습니다.");
    } else {
      await addDoc(collection(db, "contents"), {
        ...payload,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });
      alert("자료가 저장되었습니다.");
    }

    resetContentForm();
    await loadContents();
    renderAdminManageList();
  } catch (error) {
    alert("자료 저장 오류: " + error.message);
  }
});

document.getElementById("resetContentBtn").addEventListener("click", resetContentForm);

function resetContentForm() {
  document.getElementById("editContentId").value = "";
  document.getElementById("adminContentForm").reset();
  document.getElementById("saveContentBtn").textContent = "저장하기";
}

document.getElementById("saveVideoBtn").addEventListener("click", async () => {
  if (!isAdmin) {
    alert("관리자만 등록할 수 있습니다.");
    return;
  }

  const subCategory = document.getElementById("videoSubCategory").value;
  const title = document.getElementById("videoTitle").value.trim();
  const youtubeUrl = document.getElementById("youtubeUrl").value.trim();
  const videoFile = document.getElementById("videoFile").files[0];
  const directVideoUrl = document.getElementById("videoFileUrl").value.trim();
  const year = document.getElementById("videoYear").value.trim();
  const source = document.getElementById("videoSource").value.trim();
  const description = document.getElementById("videoDescription").value.trim();
  const directThumbnailUrl = document.getElementById("videoImageUrl").value.trim();
  const thumbnailFile = document.getElementById("videoImageFile").files[0];

  if (!title) {
    alert("영상 제목을 입력하세요.");
    return;
  }

  if (!youtubeUrl && !videoFile && !directVideoUrl) {
    alert("유튜브 URL, mp4 파일, 또는 영상 파일 URL 중 하나를 입력하세요.");
    return;
  }

  if (videoFile && videoFile.type !== "video/mp4") {
    alert("영상 파일은 mp4만 업로드할 수 있습니다.");
    return;
  }

  try {
    const embedUrl = youtubeUrl ? getYoutubeEmbedUrl(youtubeUrl) : "";
    if (youtubeUrl && !embedUrl) {
      alert("올바른 유튜브 URL을 입력하세요.");
      return;
    }

    const uploadedVideoUrl = videoFile ? await uploadFileToGitHubWorker(videoFile, "images/videos") : "";
    const mediaUrl = embedUrl || pickDirectUrlOrUploadedUrl(directVideoUrl, uploadedVideoUrl);
    const thumbnailUrl = await getImageDataUrlOrDirectUrl(thumbnailFile, directThumbnailUrl, 1000);

    await addDoc(collection(db, "contents"), {
      category: "videos",
      subCategory,
      mediaType: embedUrl ? "youtube" : "video",
      title,
      youtubeUrl,
      mediaUrl,
      thumbnailUrl,
      year,
      source,
      description,
      body: description,
      isPublic: true,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    alert("영상이 Videos에 저장되었습니다.");
    document.getElementById("adminVideoForm").reset();
    await loadContents();
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
  const directImageUrl = document.getElementById("photoImageUrl").value.trim();
  const photoFile = document.getElementById("photoFile").files[0];
  const year = document.getElementById("photoYear").value.trim();
  const source = document.getElementById("photoSource").value.trim();
  const description = document.getElementById("photoDescription").value.trim();

  if (!title || (!photoFile && !directImageUrl)) {
    alert("사진 제목과 사진 파일 또는 이미지 URL을 입력하세요.");
    return;
  }

  try {
    const imageUrl = await getImageDataUrlOrDirectUrl(photoFile, directImageUrl, 1400);

    await addDoc(collection(db, "contents"), {
      category: "photos",
      mediaType: "image",
      title,
      mediaUrl: imageUrl,
      year,
      source,
      description,
      body: description,
      isPublic: true,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    alert("사진 URL이 저장되었습니다.");
    document.getElementById("adminPhotoForm").reset();
    await loadContents();
  } catch (error) {
    alert("사진 URL 저장 오류: " + error.message);
  }
});


document.getElementById("saveAudioBtn").addEventListener("click", async () => {
  if (!isAdmin) {
    alert("관리자만 등록할 수 있습니다.");
    return;
  }

  const subCategory = document.getElementById("audioSubCategory").value;
  const title = document.getElementById("audioTitle").value.trim();
  const audioFile = document.getElementById("audioFile").files[0];
  const directAudioUrl = document.getElementById("audioFileUrl").value.trim();
  const year = document.getElementById("audioYear").value.trim();
  const source = document.getElementById("audioSource").value.trim();
  const description = document.getElementById("audioDescription").value.trim();
  const imageFile = document.getElementById("audioImageFile").files[0];
  const directImageUrl = document.getElementById("audioImageUrl").value.trim();

  if (!title || (!audioFile && !directAudioUrl)) {
    alert("음원 제목과 mp3/wav 파일 또는 음원 URL을 입력하세요.");
    return;
  }

  if (audioFile && !["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"].includes(audioFile.type) && !audioFile.name.match(/\.(mp3|wav)$/i)) {
    alert("음원 파일은 mp3 또는 wav만 업로드할 수 있습니다.");
    return;
  }

  try {
    const uploadedAudioUrl = audioFile ? await uploadFileToGitHubWorker(audioFile, "images/audios") : "";
    const mediaUrl = pickDirectUrlOrUploadedUrl(directAudioUrl, uploadedAudioUrl);
    const imageUrl = await getImageDataUrlOrDirectUrl(imageFile, directImageUrl, 1000);

    await addDoc(collection(db, "contents"), {
      category: "songs",
      subCategory,
      mediaType: "audio",
      title,
      mediaUrl,
      thumbnailUrl: imageUrl,
      year,
      source,
      description,
      body: description,
      isPublic: true,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    alert("음원이 Songs에 저장되었습니다.");
    document.getElementById("adminAudioForm").reset();
    await loadContents();
  } catch (error) {
    alert("음원 저장 오류: " + error.message);
  }
});

document.getElementById("saveRadioBtn").addEventListener("click", async () => {
  if (!isAdmin) {
    alert("관리자만 등록할 수 있습니다.");
    return;
  }

  const subCategory = document.getElementById("radioSubCategory").value;
  const title = document.getElementById("radioTitle").value.trim();
  const radioFile = document.getElementById("radioFile").files[0];
  const directRadioUrl = document.getElementById("radioFileUrl").value.trim();
  const year = document.getElementById("radioYear").value.trim();
  const source = document.getElementById("radioSource").value.trim();
  const description = document.getElementById("radioDescription").value.trim();
  const imageFile = document.getElementById("radioImageFile").files[0];
  const directImageUrl = document.getElementById("radioImageUrl").value.trim();

  if (!title || (!radioFile && !directRadioUrl)) {
    alert("라디오 제목과 mp3/wav 파일 또는 라디오 URL을 입력하세요.");
    return;
  }

  if (radioFile && !["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"].includes(radioFile.type) && !radioFile.name.match(/\.(mp3|wav)$/i)) {
    alert("라디오 파일은 mp3 또는 wav만 업로드할 수 있습니다.");
    return;
  }

  try {
    const uploadedRadioUrl = radioFile ? await uploadFileToGitHubWorker(radioFile, "images/radios") : "";
    const mediaUrl = pickDirectUrlOrUploadedUrl(directRadioUrl, uploadedRadioUrl);
    const imageUrl = await getImageDataUrlOrDirectUrl(imageFile, directImageUrl, 1000);

    await addDoc(collection(db, "contents"), {
      category: "radios",
      subCategory,
      mediaType: "audio",
      title,
      mediaUrl,
      thumbnailUrl: imageUrl,
      year,
      source,
      description,
      body: description,
      isPublic: true,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    alert("라디오가 Radios에 저장되었습니다.");
    document.getElementById("adminRadioForm").reset();
    await loadContents();
  } catch (error) {
    alert("라디오 저장 오류: " + error.message);
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

    applyTemplate(page, template);
    await loadContents();

    alert("템플릿이 저장되었습니다. 제목/설명/배경을 바꾼 경우에는 아래의 '사이트 문구/배경 저장'도 눌러야 합니다.");
  } catch (error) {
    alert("템플릿 저장 오류: " + error.message);
  }
});

document.getElementById("saveSiteSettingsBtn").addEventListener("click", async () => {
  if (!isAdmin) {
    alert("관리자만 변경할 수 있습니다.");
    return;
  }

  try {
    const homeBgFile = document.getElementById("settingHomeBgFile").files[0];
    const homeBgUrlInput = document.getElementById("settingHomeBgUrl").value.trim();

    let homeBgDataUrl = currentSettings.homeBgDataUrl || "";
    let homeBgUrl = currentSettings.homeBgUrl || "";

    if (homeBgFile) {
      homeBgDataUrl = await fileToCompressedDataUrl(homeBgFile, 1600, 0.78);
      homeBgUrl = "";
    } else if (homeBgUrlInput) {
      homeBgUrl = homeBgUrlInput;
      homeBgDataUrl = "";
    }

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
      ...readDesignSettingsFromForm(),
      homeBgUrl,
      homeBgDataUrl,
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, "siteSettings", "main"), settings);
    currentSettings = { ...DEFAULT_SETTINGS, ...settings };
    applySiteSettings(currentSettings);
    applyDesignSettings(currentSettings);
    fillSettingsFormFromCurrent();
    document.getElementById("settingHomeBgUrl").value = "";
    document.getElementById("settingHomeBgFile").value = "";
    alert("사이트 문구/배경 이미지가 저장되었습니다. 이제 파일 선택 후 저장만 눌러도 메인 배경이 바뀝니다.");
  } catch (error) {
    alert("사이트 설정 저장 오류: " + error.message);
  }
});

let currentSettings = { ...DEFAULT_SETTINGS };





function applyDesignSettings(settings = currentSettings) {
  const root = document.documentElement;

  const safe = {
    bodyBgColor: settings.bodyBgColor || DEFAULT_SETTINGS.bodyBgColor || "#f6f0e7",
    headerBgColor: settings.headerBgColor || DEFAULT_SETTINGS.headerBgColor || "#2d241f",
    buttonColor: settings.buttonColor || DEFAULT_SETTINGS.buttonColor || "#7a4d35",
    cardBgColor: settings.cardBgColor || DEFAULT_SETTINGS.cardBgColor || "#fffaf4",
    textColor: settings.textColor || DEFAULT_SETTINGS.textColor || "#2f2924",
    heroTextColor: settings.heroTextColor || DEFAULT_SETTINGS.heroTextColor || "#ffffff",
    navTextColor: settings.navTextColor || DEFAULT_SETTINGS.navTextColor || "#f8eee3",
    baseFontSize: settings.baseFontSize || DEFAULT_SETTINGS.baseFontSize || "16",
    heroTitleSize: settings.heroTitleSize || DEFAULT_SETTINGS.heroTitleSize || "46",
    heroDescSize: settings.heroDescSize || DEFAULT_SETTINGS.heroDescSize || "20"
  };

  root.style.setProperty("--body-bg", safe.bodyBgColor);
  root.style.setProperty("--header-bg", safe.headerBgColor);
  root.style.setProperty("--button-bg", safe.buttonColor);
  root.style.setProperty("--card-bg", safe.cardBgColor);
  root.style.setProperty("--text-color", safe.textColor);
  root.style.setProperty("--hero-text-color", safe.heroTextColor);
  root.style.setProperty("--nav-text-color", safe.navTextColor);
  root.style.setProperty("--base-font-size", `${safe.baseFontSize}px`);
  root.style.setProperty("--hero-title-size", `${safe.heroTitleSize}px`);
  root.style.setProperty("--hero-desc-size", `${safe.heroDescSize}px`);

  // CSS 변수를 못 받는 일부 브라우저/캐시 상황 대비 직접 적용
  document.body.style.backgroundColor = safe.bodyBgColor;
  document.body.style.color = safe.textColor;
  document.body.style.fontSize = `${safe.baseFontSize}px`;

  document.querySelectorAll(".site-header, footer").forEach((el) => {
    el.style.backgroundColor = safe.headerBgColor;
  });

  document.querySelectorAll("nav button").forEach((el) => {
    el.style.color = safe.navTextColor;
  });

  document.querySelectorAll(".auth-area button, .hero button, .admin-tabs button, .admin-form button, .auth-page button").forEach((el) => {
    el.style.backgroundColor = safe.buttonColor;
  });

  document.querySelectorAll(".content-section, .page-title, .article-box, .auth-page, .admin-form, .list-box, .card").forEach((el) => {
    el.style.backgroundColor = safe.cardBgColor;
    el.style.color = safe.textColor;
  });

  const hero = document.getElementById("homeHero");
  if (hero) {
    hero.style.color = safe.heroTextColor;
  }

  const homeTitle = document.getElementById("homeTitle");
  if (homeTitle) {
    homeTitle.style.color = safe.heroTextColor;
    homeTitle.style.fontSize = `${safe.heroTitleSize}px`;
  }

  const homeDescription = document.getElementById("homeDescription");
  if (homeDescription) {
    homeDescription.style.color = safe.heroTextColor;
    homeDescription.style.fontSize = `${safe.heroDescSize}px`;
  }
}

function fillDesignFormFromCurrent() {
  const pairs = {
    settingBodyBgColor: currentSettings.bodyBgColor || DEFAULT_SETTINGS.bodyBgColor || "#f6f0e7",
    settingHeaderBgColor: currentSettings.headerBgColor || DEFAULT_SETTINGS.headerBgColor || "#2d241f",
    settingButtonColor: currentSettings.buttonColor || DEFAULT_SETTINGS.buttonColor || "#7a4d35",
    settingCardBgColor: currentSettings.cardBgColor || DEFAULT_SETTINGS.cardBgColor || "#fffaf4",
    settingTextColor: currentSettings.textColor || DEFAULT_SETTINGS.textColor || "#2f2924",
    settingHeroTextColor: currentSettings.heroTextColor || DEFAULT_SETTINGS.heroTextColor || "#ffffff",
    settingNavTextColor: currentSettings.navTextColor || DEFAULT_SETTINGS.navTextColor || "#f8eee3",
    settingBaseFontSize: currentSettings.baseFontSize || DEFAULT_SETTINGS.baseFontSize || "16",
    settingHeroTitleSize: currentSettings.heroTitleSize || DEFAULT_SETTINGS.heroTitleSize || "46",
    settingHeroDescSize: currentSettings.heroDescSize || DEFAULT_SETTINGS.heroDescSize || "20"
  };

  Object.entries(pairs).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.value = value;
  });
}

function readDesignSettingsFromForm() {
  return {
    bodyBgColor: document.getElementById("settingBodyBgColor")?.value || DEFAULT_SETTINGS.bodyBgColor,
    headerBgColor: document.getElementById("settingHeaderBgColor")?.value || DEFAULT_SETTINGS.headerBgColor,
    buttonColor: document.getElementById("settingButtonColor")?.value || DEFAULT_SETTINGS.buttonColor,
    cardBgColor: document.getElementById("settingCardBgColor")?.value || DEFAULT_SETTINGS.cardBgColor,
    textColor: document.getElementById("settingTextColor")?.value || DEFAULT_SETTINGS.textColor,
    heroTextColor: document.getElementById("settingHeroTextColor")?.value || DEFAULT_SETTINGS.heroTextColor,
    navTextColor: document.getElementById("settingNavTextColor")?.value || DEFAULT_SETTINGS.navTextColor,
    baseFontSize: document.getElementById("settingBaseFontSize")?.value || DEFAULT_SETTINGS.baseFontSize,
    heroTitleSize: document.getElementById("settingHeroTitleSize")?.value || DEFAULT_SETTINGS.heroTitleSize,
    heroDescSize: document.getElementById("settingHeroDescSize")?.value || DEFAULT_SETTINGS.heroDescSize
  };
}

function bindDesignPreviewEvents() {
  const selector = "#settingBodyBgColor, #settingHeaderBgColor, #settingButtonColor, #settingCardBgColor, #settingTextColor, #settingHeroTextColor, #settingNavTextColor, #settingBaseFontSize, #settingHeroTitleSize, #settingHeroDescSize";

  document.querySelectorAll(selector).forEach((el) => {
    if (el.dataset.designBound === "1") return;
    el.dataset.designBound = "1";

    el.addEventListener("input", () => {
      const previewSettings = { ...currentSettings, ...readDesignSettingsFromForm() };
      applyDesignSettings(previewSettings);
    });

    el.addEventListener("change", () => {
      const previewSettings = { ...currentSettings, ...readDesignSettingsFromForm() };
      applyDesignSettings(previewSettings);
    });
  });

  const previewBtn = document.getElementById("applyDesignPreviewBtn");
  if (previewBtn && previewBtn.dataset.designBound !== "1") {
    previewBtn.dataset.designBound = "1";
    previewBtn.addEventListener("click", () => {
      const previewSettings = { ...currentSettings, ...readDesignSettingsFromForm() };
      applyDesignSettings(previewSettings);
      alert("현재 선택한 색상과 글씨 크기를 화면에 미리 적용했습니다. 저장하려면 ‘사이트 문구/배경 저장’을 누르세요.");
    });
  }

  const resetBtn = document.getElementById("resetDesignBtn");
  if (resetBtn && resetBtn.dataset.designBound !== "1") {
    resetBtn.dataset.designBound = "1";
    resetBtn.addEventListener("click", () => {
      const defaults = {
        settingBodyBgColor: DEFAULT_SETTINGS.bodyBgColor || "#f6f0e7",
        settingHeaderBgColor: DEFAULT_SETTINGS.headerBgColor || "#2d241f",
        settingButtonColor: DEFAULT_SETTINGS.buttonColor || "#7a4d35",
        settingCardBgColor: DEFAULT_SETTINGS.cardBgColor || "#fffaf4",
        settingTextColor: DEFAULT_SETTINGS.textColor || "#2f2924",
        settingHeroTextColor: DEFAULT_SETTINGS.heroTextColor || "#ffffff",
        settingNavTextColor: DEFAULT_SETTINGS.navTextColor || "#f8eee3",
        settingBaseFontSize: DEFAULT_SETTINGS.baseFontSize || "16",
        settingHeroTitleSize: DEFAULT_SETTINGS.heroTitleSize || "46",
        settingHeroDescSize: DEFAULT_SETTINGS.heroDescSize || "20"
      };

      Object.entries(defaults).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if (el) el.value = value;
      });

      applyDesignSettings({
        bodyBgColor: defaults.settingBodyBgColor,
        headerBgColor: defaults.settingHeaderBgColor,
        buttonColor: defaults.settingButtonColor,
        cardBgColor: defaults.settingCardBgColor,
        textColor: defaults.settingTextColor,
        heroTextColor: defaults.settingHeroTextColor,
        navTextColor: defaults.settingNavTextColor,
        baseFontSize: defaults.settingBaseFontSize,
        heroTitleSize: defaults.settingHeroTitleSize,
        heroDescSize: defaults.settingHeroDescSize
      });

      alert("기본 색상으로 미리 되돌렸습니다. 실제 저장은 ‘사이트 문구/배경 저장’을 눌러야 합니다.");
    });
  }
}


async function loadSiteSettings() {
  try {
    const snap = await getDoc(doc(db, "siteSettings", "main"));
    currentSettings = snap.exists() ? { ...DEFAULT_SETTINGS, ...snap.data() } : { ...DEFAULT_SETTINGS };
    applySiteSettings(currentSettings);
  } catch (error) {
    console.warn("사이트 설정 불러오기 오류:", error);
    currentSettings = { ...DEFAULT_SETTINGS };
    applySiteSettings(currentSettings);
  }
}

function applySiteSettings(settings) {
  applyDesignSettings(settings);
  document.getElementById("siteLogoText").textContent = settings.siteName;
  document.getElementById("siteLogoSubText").textContent = settings.siteSubName;
  document.getElementById("homeTitle").textContent = settings.homeTitle;
  document.getElementById("homeDescription").textContent = settings.homeDescription;
  document.getElementById("videosDesc").textContent = settings.videosDesc;
  document.getElementById("songsDesc").textContent = settings.songsDesc;
  document.getElementById("radiosDesc").textContent = settings.radiosDesc;
  document.getElementById("photosDesc").textContent = settings.photosDesc;
  document.getElementById("storiesDesc").textContent = settings.storiesDesc;
  document.getElementById("aboutDesc").textContent = settings.aboutDesc;
  document.getElementById("oneumDesc").textContent = settings.oneumDesc;
  document.getElementById("footerTitle").textContent = `${settings.siteName} | ${settings.siteSubName}`;

  const homeHero = document.getElementById("homeHero");
  const directBg = settings.homeBgDataUrl || "";
  if (directBg) {
    homeHero.style.backgroundImage = `url("${directBg}")`;
    homeHero.classList.add("has-bg");
    homeHero.classList.remove("no-bg");
  } else if (settings.homeBgUrl) {
    const separator = settings.homeBgUrl.includes("?") ? "&" : "?";
    const bgUrl = `${settings.homeBgUrl}${separator}v=${Date.now()}`;
    homeHero.style.backgroundImage = `url("${bgUrl}")`;
    homeHero.classList.add("has-bg");
    homeHero.classList.remove("no-bg");
  } else {
    homeHero.style.backgroundImage = "";
    homeHero.classList.add("no-bg");
    homeHero.classList.remove("has-bg");
  }
}

function fillSettingsFormFromCurrent() {
  fillDesignFormFromCurrent();
  bindDesignPreviewEvents();
  fillDesignFormFromCurrent();
  if (!document.getElementById("settingSiteName")) return;
  document.getElementById("settingSiteName").value = currentSettings.siteName || "";
  document.getElementById("settingSiteSubName").value = currentSettings.siteSubName || "";
  document.getElementById("settingHomeTitle").value = currentSettings.homeTitle || "";
  document.getElementById("settingHomeDescription").value = currentSettings.homeDescription || "";
  document.getElementById("settingVideosDesc").value = currentSettings.videosDesc || "";
  document.getElementById("settingSongsDesc").value = currentSettings.songsDesc || "";
  document.getElementById("settingRadiosDesc").value = currentSettings.radiosDesc || "";
  document.getElementById("settingPhotosDesc").value = currentSettings.photosDesc || "";
  document.getElementById("settingStoriesDesc").value = currentSettings.storiesDesc || "";
  document.getElementById("settingAboutDesc").value = currentSettings.aboutDesc || "";
  document.getElementById("settingOneumDesc").value = currentSettings.oneumDesc || "";
  const bgInput = document.getElementById("settingHomeBgUrl");
  if (bgInput) bgInput.placeholder = currentSettings.homeBgUrl ? "현재 배경 이미지가 저장되어 있습니다. 새 파일 또는 URL을 입력하면 교체됩니다." : "메인 배경 이미지 URL 직접 입력 선택 사항";
}

async function changeTemplate(page, template) {
  applyTemplate(page, template);
}

async function applySavedTemplates() {
  const templatePages = ["home", "videos", "songs", "radios", "photos", "stories", "about", "oneum"];

  for (const page of templatePages) {
    const snap = await getDoc(doc(db, "templateSettings", page));
    if (snap.exists()) {
      applyTemplate(page, snap.data().template);
    }
  }
}

function applyTemplate(page, template) {
  const containers = {
    videos: document.getElementById("videoList"),
    songs: document.getElementById("songList"),
    radios: document.getElementById("radioList"),
    photos: document.getElementById("photoList"),
    stories: document.getElementById("storyList"),
    about: document.getElementById("aboutList"),
    oneum: document.getElementById("oneumList")
  };

  const pageSections = {
    home: document.getElementById("home"),
    videos: document.getElementById("videos"),
    songs: document.getElementById("songs"),
    radios: document.getElementById("radios"),
    photos: document.getElementById("photos"),
    stories: document.getElementById("stories"),
    about: document.getElementById("about"),
    oneum: document.getElementById("oneum")
  };

  const classNames = [
    "template-gallery",
    "template-card",
    "template-list",
    "template-timeline",
    "template-wide",
    "gallery-template",
    "card-template",
    "timeline-template"
  ];

  const section = pageSections[page];
  if (section) {
    section.classList.remove(...classNames);
    section.classList.add(`template-${template}`);
  }

  if (page === "home") {
    const hero = document.getElementById("homeHero");
    if (hero) {
      hero.classList.remove(...classNames);
      hero.classList.add(`template-${template}`);
    }
    return;
  }

  const target = containers[page];
  if (!target) return;

  target.classList.remove(...classNames);
  target.classList.add(`template-${template}`);

  if (page === "photos") {
    target.classList.add(template === "gallery" ? "gallery-template" : template === "timeline" ? "timeline-template" : "card-template");
  }
}

async function loadContents() {
  try {
    const q = query(collection(db, "contents"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);

    const contents = [];
    snapshot.forEach((docSnap) => {
      const item = {
        id: docSnap.id,
        ...docSnap.data()
      };
      if (item.isPublic !== false) contents.push(item);
    });

    allContents = contents;

    renderLatest(contents);
    renderVideos(filterBySelectedSubCategory("videos", contents.filter((item) => item.category === "videos")));
    renderPhotos(filterBySelectedSubCategory("photos", contents.filter((item) => item.category === "photos")));
    renderList("songList", filterBySelectedSubCategory("songs", contents.filter((item) => item.category === "songs")));
    renderList("radioList", filterBySelectedSubCategory("radios", contents.filter((item) => item.category === "radios")));
    renderList("storyList", filterBySelectedSubCategory("stories", contents.filter((item) => item.category === "stories")));
    renderList("aboutList", filterBySelectedSubCategory("about", contents.filter((item) => item.category === "about")));
    renderList("oneumList", filterBySelectedSubCategory("oneum", contents.filter((item) => item.category === "oneum")));

    const aboutItems = contents.filter((item) => item.category === "about");
    document.querySelector(".default-about")?.classList.toggle("hidden", aboutItems.length > 0);

    await applySavedTemplates();
    renderAdminManageList();
  } catch (error) {
    console.error("자료 불러오기 오류:", error);
  }
}


function filterBySelectedSubCategory(page, items) {
  const selected = document.getElementById(`${page}CategoryFilter`)?.value || "";
  if (!selected) return items;
  return items.filter((item) => item.subCategory === selected);
}

function renderLatest(contents) {
  const latest = document.getElementById("latestContents");
  if (!latest) return;

  latest.innerHTML = "";

  const featured = contents.filter((item) => item.isFeatured);
  const source = featured.length > 0 ? featured : contents;

  if (source.length === 0) {
    latest.innerHTML = "<p>등록된 최신 자료가 없습니다.</p>";
    return;
  }

  source.slice(0, 4).forEach((item) => {
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

function renderList(elementId, items) {
  const box = document.getElementById(elementId);
  if (!box) return;

  box.innerHTML = "";

  if (items.length === 0) {
    box.innerHTML = "<p>등록된 자료가 없습니다.</p>";
    return;
  }

  items.forEach((item) => {
    const div = document.createElement("div");
    div.className = item.mediaUrl ? "list-item with-image" : "list-item";
    let imageHtml = "";
    if (item.mediaType === "audio") {
      imageHtml = item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title || "")}" />` : "";
    } else if (item.mediaType === "video") {
      imageHtml = item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title || "")}" />` : "";
    } else if (item.mediaUrl && item.mediaType !== "youtube") {
      imageHtml = `<img src="${item.mediaUrl}" alt="${escapeHtml(item.title || "")}" />`;
    }

    div.innerHTML = `
      ${imageHtml}
      <div>
        <h3>${escapeHtml(item.title || "")}</h3>
        ${item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : ""}
        <p>${escapeHtml(item.body || item.description || "")}</p>
        ${item.mediaType === "audio" ? `<audio class="media-player" controls src="${item.mediaUrl}"></audio>` : ""}
        ${item.mediaType === "video" ? `<video class="media-player" controls src="${item.mediaUrl}" poster="${escapeHtml(item.thumbnailUrl || "")}"></video>` : ""}
        <p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p>
        <p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>
      </div>
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
  } else if (item.mediaType === "video") {
    mediaHtml = `<video controls src="${item.mediaUrl}" poster="${escapeHtml(item.thumbnailUrl || "")}"></video>`;
  } else if (item.mediaType === "audio") {
    const cover = item.thumbnailUrl ? `<img src="${item.thumbnailUrl}" alt="${escapeHtml(item.title || "")}" />` : `<div class="card-placeholder">음원 자료</div>`;
    mediaHtml = `${cover}<audio class="media-player" controls src="${item.mediaUrl}"></audio>`;
  } else if (item.mediaUrl) {
    mediaHtml = `<img src="${item.mediaUrl}" alt="${escapeHtml(item.title || "")}" />`;
  } else {
    mediaHtml = `<div class="card-placeholder">글 자료</div>`;
  }

  card.innerHTML = `
    ${mediaHtml}
    <div class="card-body">
      <h3>${escapeHtml(item.title || "")}</h3>
      ${item.subCategory ? `<span class="category-badge">${escapeHtml(item.subCategory)}</span>` : ""}
      <p>${escapeHtml(item.description || item.body || "")}</p>
      <p><strong>분류:</strong> ${escapeHtml(item.category || "")}</p>
      <p><strong>연도:</strong> ${escapeHtml(item.year || "미상")}</p>
      <p><strong>출처:</strong> ${escapeHtml(item.source || "미기재")}</p>
    </div>
  `;

  return card;
}

function renderAdminManageList() {
  const box = document.getElementById("adminContentList");
  if (!box || !isAdmin) return;

  const filter = document.getElementById("manageCategoryFilter")?.value || "";
  const items = filter ? allContents.filter((item) => item.category === filter) : allContents;

  box.innerHTML = "";

  if (items.length === 0) {
    box.innerHTML = "<p>관리할 자료가 없습니다.</p>";
    return;
  }

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "admin-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.title || "")}</strong>
        <p>${escapeHtml(item.category || "")}${item.subCategory ? " / " + escapeHtml(item.subCategory) : ""} / ${escapeHtml(item.year || "미상")} / ${escapeHtml(item.source || "미기재")}</p>
      </div>
      <div class="admin-row-actions">
        <button type="button" onclick="editContent('${item.id}')">수정</button>
        <button type="button" class="delete-btn" onclick="deleteContentItem('${item.id}')">삭제</button>
      </div>
    `;
    box.appendChild(row);
  });
}

function editContent(id) {
  const item = allContents.find((content) => content.id === id);
  if (!item) return;

  showAdminForm("content");
  document.getElementById("editContentId").value = item.id;
  document.getElementById("contentCategory").value = item.category || "stories";
  populateContentSubCategorySelect(item.category || "stories", item.subCategory || "");
  document.getElementById("contentTitle").value = item.title || "";
  document.getElementById("contentBody").value = item.body || item.description || "";
  document.getElementById("contentYear").value = item.year || "";
  document.getElementById("contentSource").value = item.source || "";
  document.getElementById("contentFeatured").checked = Boolean(item.isFeatured);
  document.getElementById("saveContentBtn").textContent = "수정 저장하기";

  alert("수정할 내용을 불러왔습니다. 사진을 새로 선택하지 않으면 기존 사진이 유지됩니다.");
}

async function deleteContentItem(id) {
  if (!isAdmin) {
    alert("관리자만 삭제할 수 있습니다.");
    return;
  }

  const ok = confirm("정말 이 자료를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "contents", id));
    alert("삭제되었습니다.");
    await loadContents();
  } catch (error) {
    alert("삭제 오류: " + error.message);
  }
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


const previewHomeBgBtn = document.getElementById("previewHomeBgBtn");
if (previewHomeBgBtn) {
  previewHomeBgBtn.addEventListener("click", async () => {
    const file = document.getElementById("settingHomeBgFile").files[0];
    const url = document.getElementById("settingHomeBgUrl").value.trim();
    try {
      if (file) {
        const dataUrl = await fileToCompressedDataUrl(file, 1600, 0.78);
        document.getElementById("homeHero").style.backgroundImage = `url("${dataUrl}")`;
        alert("선택한 파일을 메인 배경에 임시 미리보기로 적용했습니다. 실제 저장은 ‘사이트 문구/배경 저장’을 눌러야 합니다.");
        return;
      }
      if (!url) {
        alert("먼저 파일을 선택하거나 메인 배경 이미지 URL을 입력하세요.");
        return;
      }
      const separator = url.includes("?") ? "&" : "?";
      document.getElementById("homeHero").style.backgroundImage = `url("${url}${separator}preview=${Date.now()}")`;
      alert("입력한 URL을 메인 배경에 임시 미리보기로 적용했습니다. 실제 저장은 ‘사이트 문구/배경 저장’을 눌러야 합니다.");
    } catch (error) {
      alert("배경 미리보기 오류: " + error.message);
    }
  });
}

loadSiteSettings();
loadPageCategories();
loadContents();
