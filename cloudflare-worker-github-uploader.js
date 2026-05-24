
// kwangseoks Cloudflare Worker GitHub uploader
// v73: CORS-safe upload. Accepts token via formData idToken or Authorization.

function buildCorsHeaders(request, env) {
  const requestOrigin = request.headers.get("Origin") || "";
  const allowed = env.ALLOWED_ORIGIN || "https://mdshoons.github.io";
  const origin = requestOrigin && requestOrigin === allowed ? requestOrigin : allowed;

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}

function jsonResponse(data, status, request, env) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...buildCorsHeaders(request, env)
    }
  });
}

function optionsResponse(request, env) {
  return new Response(null, {
    status: 204,
    headers: buildCorsHeaders(request, env)
  });
}

function sanitizeFilename(name) {
  const raw = String(name || "file").normalize("NFKC");
  const cleaned = raw
    .replace(/[\\/:*?"<>|#%{}^~[\]`]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 150);

  return cleaned || `file-${Date.now()}`;
}

function pickFolder(kind, filename) {
  const lower = String(filename || "").toLowerCase();

  if (kind === "videos" || /\.(mp4|webm|mov|m4v)$/i.test(lower)) return "videos";
  if (kind === "radios" || kind === "radio") return "radios";
  if (kind === "audios" || kind === "audio" || kind === "songs" || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(lower)) return "audios";
  if (kind === "photos" || kind === "images" || /\.(png|jpe?g|webp|gif)$/i.test(lower)) return "images/photos";

  return "uploads";
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function githubFetch(env, path, options = {}) {
  const owner = env.GITHUB_OWNER;
  const repo = env.GITHUB_REPO;
  const token = env.GITHUB_TOKEN;

  if (!owner || !repo || !token) {
    throw new Error("Worker 환경변수 GITHUB_OWNER / GITHUB_REPO / GITHUB_TOKEN이 필요합니다.");
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}${path}`, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "kwangseoks-cloudflare-worker",
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg = data?.message || text || `GitHub API error ${res.status}`;
    throw new Error(`GitHub: ${msg}`);
  }

  return data;
}

async function uploadViaGitDataAPI(env, filePath, base64Content, message) {
  const branch = env.GITHUB_BRANCH || "main";

  const ref = await githubFetch(env, `/git/ref/heads/${encodeURIComponent(branch)}`);
  const latestCommitSha = ref.object.sha;

  const latestCommit = await githubFetch(env, `/git/commits/${latestCommitSha}`);
  const baseTreeSha = latestCommit.tree.sha;

  const blob = await githubFetch(env, `/git/blobs`, {
    method: "POST",
    body: JSON.stringify({
      content: base64Content,
      encoding: "base64"
    })
  });

  const tree = await githubFetch(env, `/git/trees`, {
    method: "POST",
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: [
        {
          path: filePath,
          mode: "100644",
          type: "blob",
          sha: blob.sha
        }
      ]
    })
  });

  const commit = await githubFetch(env, `/git/commits`, {
    method: "POST",
    body: JSON.stringify({
      message,
      tree: tree.sha,
      parents: [latestCommitSha]
    })
  });

  await githubFetch(env, `/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    body: JSON.stringify({
      sha: commit.sha,
      force: false
    })
  });

  return {
    commitSha: commit.sha,
    blobSha: blob.sha,
    treeSha: tree.sha
  };
}

function getTokenFromRequest(request, form) {
  const auth = request.headers.get("Authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const formToken = form.get("idToken");

  return bearer || String(formToken || "");
}

async function handleUpload(request, env) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return jsonResponse({ ok: false, error: "multipart/form-data 요청만 지원합니다." }, 400, request, env);
  }

  const form = await request.formData();

  const idToken = getTokenFromRequest(request, form);
  if (!idToken) {
    return jsonResponse({ ok: false, error: "Firebase ID Token이 없습니다." }, 401, request, env);
  }

  const file = form.get("file");
  const kind = String(form.get("kind") || form.get("folder") || form.get("category") || "");

  if (!file || typeof file === "string") {
    return jsonResponse({ ok: false, error: "file 필드가 필요합니다." }, 400, request, env);
  }

  const maxBytes = Number(env.MAX_UPLOAD_BYTES || 95 * 1024 * 1024);
  if (file.size > maxBytes) {
    return jsonResponse({
      ok: false,
      error: `파일이 너무 큽니다. 현재 Worker 제한은 ${Math.floor(maxBytes / 1024 / 1024)}MB입니다. 더 큰 파일은 Cloudflare R2/Firebase Storage를 사용해야 합니다.`,
      size: file.size,
      maxBytes
    }, 413, request, env);
  }

  const safeName = sanitizeFilename(file.name);
  const folder = pickFolder(kind, safeName);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = `${folder}/${timestamp}-${safeName}`;

  const buffer = await file.arrayBuffer();
  const base64 = arrayBufferToBase64(buffer);

  const result = await uploadViaGitDataAPI(
    env,
    filePath,
    base64,
    `Add media file: ${filePath}`
  );

  const pagesBase = env.GITHUB_PAGES_BASE_URL || `https://${env.GITHUB_OWNER}.github.io/${env.GITHUB_REPO}`;
  const url = `${pagesBase.replace(/\/$/, "")}/${filePath}`;

  return jsonResponse({
    ok: true,
    url,
    path: filePath,
    size: file.size,
    type: file.type || "",
    name: file.name,
    commitSha: result.commitSha
  }, 200, request, env);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return optionsResponse(request, env);
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === "/" || url.pathname === "/health") {
        return jsonResponse({
          ok: true,
          service: "kwangseoks-github-uploader",
          version: "v73-cors-safe-upload",
          hasOwner: Boolean(env.GITHUB_OWNER),
          hasRepo: Boolean(env.GITHUB_REPO),
          hasToken: Boolean(env.GITHUB_TOKEN),
          branch: env.GITHUB_BRANCH || "main",
          allowedOrigin: env.ALLOWED_ORIGIN || "https://mdshoons.github.io"
        }, 200, request, env);
      }

      if (url.pathname === "/upload") {
        if (request.method !== "POST") {
          return jsonResponse({ ok: false, error: "POST만 지원합니다." }, 405, request, env);
        }

        return await handleUpload(request, env);
      }

      return jsonResponse({ ok: false, error: "Not found" }, 404, request, env);
    } catch (error) {
      return jsonResponse({
        ok: false,
        error: error?.message || String(error)
      }, 500, request, env);
    }
  }
};
