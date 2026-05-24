const PROJECT_ID = "kksarchive";
const FIREBASE_ISSUER = `https://securetoken.google.com/${PROJECT_ID}`;
const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

const ALLOWED_FILE_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4",
  "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"
];
const MAX_FILE_SIZE = 95 * 1024 * 1024;

export default {
  async fetch(request, env) {
    const corsHeaders = getCorsHeaders(env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

    try {
      const url = new URL(request.url);
      if (url.pathname !== "/upload") return json({ error: "Not found" }, 404, corsHeaders);
      if (request.method !== "POST") return json({ error: "POST only" }, 405, corsHeaders);

      const adminEmails = parseAdminEmails(env.ADMIN_EMAILS);
      const authHeader = request.headers.get("Authorization") || "";
      const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!idToken) return json({ error: "Firebase ID Token이 없습니다." }, 401, corsHeaders);

      const verified = await verifyFirebaseIdToken(idToken);
      const email = String(verified.email || "").toLowerCase();
      if (!adminEmails.includes(email)) return json({ error: "관리자 이메일이 아닙니다." }, 403, corsHeaders);

      const formData = await request.formData();
      const file = formData.get("file");
      const folderInput = String(formData.get("folder") || "images").trim();
      if (!file || typeof file === "string") return json({ error: "업로드할 파일이 없습니다." }, 400, corsHeaders);
      if (!ALLOWED_FILE_TYPES.includes(file.type) && !String(file.name || "").match(/\.(jpg|jpeg|png|webp|gif|mp4|mp3|wav)$/i)) {
        return json({ error: "jpg, png, webp, gif, mp4, mp3, wav 파일만 업로드할 수 있습니다." }, 400, corsHeaders);
      }
      if (file.size > MAX_FILE_SIZE) return json({ error: "파일은 95MB 이하만 업로드할 수 있습니다." }, 400, corsHeaders);

      const owner = env.GITHUB_OWNER;
      const repo = env.GITHUB_REPO;
      const branch = env.GITHUB_BRANCH || "main";
      const token = env.GITHUB_TOKEN;
      if (!owner || !repo || !token) return json({ error: "Worker 환경변수 GITHUB_OWNER, GITHUB_REPO, GITHUB_TOKEN이 필요합니다." }, 500, corsHeaders);

      const safeFolder = sanitizeFolder(folderInput);
      const ext = extensionFromMime(file.type, file.name);
      const safeName = makeSafeFileName(file.name, ext);
      const githubPath = `${safeFolder}/${Date.now()}-${safeName}`;

      const base64Content = arrayBufferToBase64(await file.arrayBuffer());
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponentPath(githubPath)}`;
      const ghRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "gwangseok-archive-uploader"
        },
        body: JSON.stringify({ message: `Upload media: ${githubPath}`, content: base64Content, branch })
      });
      const ghData = await ghRes.json();
      if (!ghRes.ok) return json({ error: ghData.message || "GitHub 업로드 실패", details: ghData }, ghRes.status, corsHeaders);

      const imageUrl = buildFileUrl(env, owner, repo, githubPath);
      return json({ ok: true, path: githubPath, imageUrl, githubUrl: ghData.content?.html_url || "" }, 200, corsHeaders);
    } catch (error) {
      return json({ error: error.message || "업로드 처리 중 오류가 발생했습니다." }, 500, corsHeaders);
    }
  }
};

function getCorsHeaders(env) {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400"
  };
}
function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
}
function parseAdminEmails(value) {
  return String(value || "shinestone0106@kakao.com,kos20050627@gmail.com").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
}
async function verifyFirebaseIdToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("잘못된 Firebase ID Token 형식입니다.");
  const header = JSON.parse(base64UrlDecodeToString(parts[0]));
  const payload = JSON.parse(base64UrlDecodeToString(parts[1]));
  if (payload.iss !== FIREBASE_ISSUER) throw new Error("Firebase ID Token issuer가 올바르지 않습니다.");
  if (payload.aud !== PROJECT_ID) throw new Error("Firebase ID Token audience가 올바르지 않습니다.");
  if (payload.exp <= Math.floor(Date.now() / 1000)) throw new Error("Firebase ID Token이 만료되었습니다.");
  const certs = await (await fetch(FIREBASE_CERTS_URL)).json();
  const pem = certs[header.kid];
  if (!pem) throw new Error("Firebase 인증서 kid를 찾을 수 없습니다.");
  const ok = await verifyJwtSignature(parts[0], parts[1], parts[2], pem);
  if (!ok) throw new Error("Firebase ID Token 서명 검증 실패");
  return payload;
}
async function verifyJwtSignature(encodedHeader, encodedPayload, encodedSignature, pem) {
  const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const signature = base64UrlToUint8Array(encodedSignature);
  const key = await crypto.subtle.importKey("spki", pemToArrayBuffer(pem), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  return await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
}
function pemToArrayBuffer(pem) {
  const b64 = pem.replace("-----BEGIN CERTIFICATE-----", "").replace("-----END CERTIFICATE-----", "").replace(/\s/g, "");
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
function base64UrlDecodeToString(value) { return new TextDecoder().decode(base64UrlToUint8Array(value)); }
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
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}
function sanitizeFolder(folder) {
  const cleaned = folder.replace(/\\/g, "/").replace(/^\//, "").replace(/\.\./g, "").replace(/[^a-zA-Z0-9/_-]/g, "-");
  const allowed = ["images", "videos", "audios", "radios"];
  return allowed.some(a => cleaned === a || cleaned.startsWith(a + "/")) ? cleaned : "images";
}
function extensionFromMime(mime, name = "") {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  if (mime === "video/mp4") return "mp4";
  if (mime === "audio/mpeg" || mime === "audio/mp3") return "mp3";
  if (mime === "audio/wav" || mime === "audio/x-wav") return "wav";
  const m = String(name).match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "bin";
}
function makeSafeFileName(name, ext) {
  const base = String(name || "file").toLowerCase().replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file";
  return `${base}.${ext}`;
}
function encodeURIComponentPath(path) { return path.split("/").map(encodeURIComponent).join("/"); }
function buildFileUrl(env, owner, repo, path) {
  if (env.GITHUB_PAGES_BASE_URL) return `${env.GITHUB_PAGES_BASE_URL.replace(/\/$/, "")}/${path}`;
  return `https://${owner}.github.io/${repo}/${path}`;
}
