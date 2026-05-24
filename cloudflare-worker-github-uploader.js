// cloudflare-worker-github-uploader.js
// 역할:
// 1. GitHub Pages 사이트에서 받은 이미지 파일을 검증
// 2. Firebase ID Token을 검증해서 관리자 이메일인지 확인
// 3. GitHub REST API로 저장소 images 폴더에 파일 생성
// 4. 생성된 GitHub Pages 이미지 URL을 반환

const PROJECT_ID = "kksarchive";
const FIREBASE_ISSUER = `https://securetoken.google.com/${PROJECT_ID}`;
const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 8 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      const url = new URL(request.url);

      if (url.pathname !== "/upload") {
        return json({ error: "Not found" }, 404, corsHeaders);
      }

      if (request.method !== "POST") {
        return json({ error: "POST only" }, 405, corsHeaders);
      }

      const adminEmails = parseAdminEmails(env.ADMIN_EMAILS);
      const authHeader = request.headers.get("Authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

      if (!idToken) {
        return json({ error: "Firebase ID Token이 없습니다." }, 401, corsHeaders);
      }

      const verified = await verifyFirebaseIdToken(idToken);
      const email = String(verified.email || "").toLowerCase();

      if (!adminEmails.includes(email)) {
        return json({ error: "관리자 이메일이 아닙니다." }, 403, corsHeaders);
      }

      const formData = await request.formData();
      const file = formData.get("file");
      const folderInput = String(formData.get("folder") || "images").trim();

      if (!file || typeof file === "string") {
        return json({ error: "업로드할 파일이 없습니다." }, 400, corsHeaders);
      }

      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return json({ error: "jpg, png, webp, gif 이미지만 업로드할 수 있습니다." }, 400, corsHeaders);
      }

      if (file.size > MAX_FILE_SIZE) {
        return json({ error: "이미지는 8MB 이하만 업로드할 수 있습니다." }, 400, corsHeaders);
      }

      const safeFolder = sanitizeFolder(folderInput);
      const ext = extensionFromMime(file.type);
      const safeName = makeSafeFileName(file.name, ext);
      const githubPath = `${safeFolder}/${Date.now()}-${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const base64Content = arrayBufferToBase64(arrayBuffer);

      const owner = env.GITHUB_OWNER;
      const repo = env.GITHUB_REPO;
      const branch = env.GITHUB_BRANCH || "main";
      const token = env.GITHUB_TOKEN;

      if (!owner || !repo || !token) {
        return json({ error: "Worker 환경변수 GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN이 필요합니다." }, 500, corsHeaders);
      }

      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponentPath(githubPath)}`;

      const ghRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "gwangseok-archive-uploader"
        },
        body: JSON.stringify({
          message: `Upload image: ${githubPath}`,
          content: base64Content,
          branch
        })
      });

      const ghData = await ghRes.json();

      if (!ghRes.ok) {
        return json({
          error: ghData.message || "GitHub 업로드 실패",
          details: ghData
        }, ghRes.status, corsHeaders);
      }

      const imageUrl = buildImageUrl(env, owner, repo, branch, githubPath);

      return json({
        ok: true,
        path: githubPath,
        imageUrl,
        githubUrl: ghData.content?.html_url || ""
      }, 200, corsHeaders);
    } catch (error) {
      return json({ error: error.message || "업로드 처리 중 오류가 발생했습니다." }, 500, corsHeaders);
    }
  }
};

function getCorsHeaders(env) {
  const origin = env.ALLOWED_ORIGIN || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function parseAdminEmails(value) {
  return String(value || "shinestone0106@kakao.com,kos20050627@gmail.com")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

async function verifyFirebaseIdToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("잘못된 Firebase ID Token 형식입니다.");

  const header = JSON.parse(base64UrlDecodeToString(parts[0]));
  const payload = JSON.parse(base64UrlDecodeToString(parts[1]));

  if (payload.iss !== FIREBASE_ISSUER) {
    throw new Error("Firebase ID Token issuer가 올바르지 않습니다.");
  }

  if (payload.aud !== PROJECT_ID) {
    throw new Error("Firebase ID Token audience가 올바르지 않습니다.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) {
    throw new Error("Firebase ID Token이 만료되었습니다.");
  }

  if (payload.iat > now + 60) {
    throw new Error("Firebase ID Token 발급 시간이 올바르지 않습니다.");
  }

  const certs = await fetchFirebaseCerts();
  const pem = certs[header.kid];

  if (!pem) {
    throw new Error("Firebase 인증서 kid를 찾을 수 없습니다.");
  }

  const verified = await verifyJwtSignature(parts[0], parts[1], parts[2], pem);
  if (!verified) {
    throw new Error("Firebase ID Token 서명 검증 실패");
  }

  return payload;
}

async function fetchFirebaseCerts() {
  const res = await fetch(FIREBASE_CERTS_URL);
  if (!res.ok) throw new Error("Firebase 인증서를 가져오지 못했습니다.");
  return await res.json();
}

async function verifyJwtSignature(encodedHeader, encodedPayload, encodedSignature, pem) {
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = base64UrlToUint8Array(encodedSignature);
  const key = await crypto.subtle.importKey(
    "spki",
    pemToArrayBuffer(pem),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
}

function pemToArrayBuffer(pem) {
  const b64 = pem
    .replace("-----BEGIN CERTIFICATE-----", "")
    .replace("-----END CERTIFICATE-----", "")
    .replace(/\s/g, "");

  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function base64UrlDecodeToString(value) {
  const bytes = base64UrlToUint8Array(value);
  return new TextDecoder().decode(bytes);
}

function base64UrlToUint8Array(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function sanitizeFolder(folder) {
  const cleaned = folder
    .replace(/\\/g, "/")
    .replace(/^\//, "")
    .replace(/\.\./g, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "-");

  if (!cleaned || !cleaned.startsWith("images")) return "images";
  return cleaned;
}

function extensionFromMime(mime) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function makeSafeFileName(name, fallbackExt) {
  const base = String(name || "image")
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60) || "image";

  return `${base}.${fallbackExt}`;
}

function encodeURIComponentPath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

function buildImageUrl(env, owner, repo, branch, githubPath) {
  if (env.GITHUB_PAGES_BASE_URL) {
    return `${env.GITHUB_PAGES_BASE_URL.replace(/\/$/, "")}/${githubPath}`;
  }

  return `https://${owner}.github.io/${repo}/${githubPath}`;
}
