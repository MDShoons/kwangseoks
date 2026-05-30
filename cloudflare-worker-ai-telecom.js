// 광석이네 통신방 - Cloudflare Workers AI 전용 Worker
// 저장된 회원 멘트/무료 자동 반응/고정 답변 없음.
// 사용자 입력과 최근 대화만 보고 Workers AI가 매번 새 대사를 생성합니다.
// 필요 바인딩: Workers AI binding 이름 = AI

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_INPUT = 900;
const MAX_RECENT = 24;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

const DEFAULT_MEMBER_PROFILES = [
  { nickname: "소금발", realName: "김도현" },
  { nickname: "mouse14", realName: "장민석" },
  { nickname: "raincoat", realName: "이효연" },
  { nickname: "ajeegang", realName: "김승민" },
  { nickname: "soriboy", realName: "김영호" },
  { nickname: "enfant", realName: "이희정" },
  { nickname: "ekjw123", realName: "강은경" },
  { nickname: "녹차향기", realName: "박은정" },
  { nickname: "푸른카세트", realName: "정수진" },
  { nickname: "먼지낀LP", realName: "오세훈" }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function extractText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    const candidates = [value.text, value.message, value.content, value.reply, value.response, value.value, value.output_text];
    for (const item of candidates) {
      const out = extractText(item).trim();
      if (out) return out;
    }
    return "";
  }
  return "";
}

function cleanText(value, max = 500) {
  return extractText(value)
    .replace(/\[object Object\]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function compact(value) {
  return cleanText(value, 300)
    .replace(/[\s~!?.。！？….,，'"“”‘’()\[\]{}:：;；\-_/\\]/g, "")
    .toLowerCase();
}

function uniqueStrings(arr, max = 30) {
  const seen = new Set();
  const out = [];
  for (const item of arr || []) {
    const v = cleanText(item, 180);
    const key = compact(v);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hangulCount(s) {
  return (String(s || "").match(/[가-힣]/g) || []).length;
}

function latinCount(s) {
  return (String(s || "").match(/[A-Za-z]/g) || []).length;
}

function looksBrokenText(text) {
  const t = cleanText(text, 260);
  if (!t || t.length < 2) return true;
  if (/\[object Object\]/i.test(t)) return true;
  if (/[A-Z]{5,}|_[A-Z]{3,}|[A-Za-z]{12,}/.test(t)) return true;
  if (/(GENRE|GENDER|CAPEC|CUREMENT|Programme|Radiation|Cakeour|ttkiz|alto|Waart|Smart call|Auto Resolver|Import Regular|possesses roles|subset R false)/i.test(t)) return true;
  const h = hangulCount(t);
  const l = latinCount(t);
  if (h < 1) return true;
  if (l > h * 0.8 && l > 6) return true;
  return false;
}

function similarity(a, b) {
  const aa = compact(a), bb = compact(b);
  if (!aa || !bb) return 0;
  if (aa === bb) return 1;
  if (aa.includes(bb) || bb.includes(aa)) return Math.min(0.95, Math.min(aa.length, bb.length) / Math.max(aa.length, bb.length));
  const ag = new Set(aa.match(/.{1,2}/g) || []);
  const bg = new Set(bb.match(/.{1,2}/g) || []);
  let inter = 0;
  for (const x of ag) if (bg.has(x)) inter++;
  return inter / Math.max(1, Math.min(ag.size, bg.size));
}

function memberProfilesFromBody(body) {
  const rawProfiles = Array.isArray(body.memberProfiles) ? body.memberProfiles : DEFAULT_MEMBER_PROFILES;
  const profiles = [];
  const seen = new Set();
  for (const item of rawProfiles) {
    const nickname = cleanText(item?.nickname || item, 16);
    const realName = cleanText(item?.realName || "", 16);
    if (!nickname || seen.has(nickname)) continue;
    seen.add(nickname);
    profiles.push({ nickname, realName });
  }
  return profiles.length ? profiles : DEFAULT_MEMBER_PROFILES;
}

function recentLogFromBody(body) {
  const recent = Array.isArray(body.recentMessages) ? body.recentMessages.slice(-MAX_RECENT) : [];
  return recent
    .map((m) => `${cleanText(m.nickname || m.role || "Chat", 20)}${m.realName ? `(${cleanText(m.realName, 16)})` : ""}: ${cleanText(m.text || "", 180)}`)
    .filter((line) => {
      const text = line.replace(/^[^:]+:\s*/, "");
      // 입장/수신 안내는 로그로 넘겨도 되지만, 깨진 AI 출력은 넘기지 않는다.
      if (/님이 접속하셨습니다|수신\[가능\]/.test(text)) return true;
      return !looksBrokenText(text);
    })
    .join("\n");
}

function buildPrompt(body, retryLevel = 0) {
  const userText = cleanText(body.userText || "", MAX_INPUT);
  const userNick = cleanText(body.userNick || "손님", 20);
  const userName = cleanText(body.userName || "", 20);
  const mode = cleanText(body.mode || "chat", 40);
  const close = cleanText(body.close || "known", 40);
  const recentLog = recentLogFromBody(body) || "아직 정상 대화가 거의 없음";
  const kksActive = body.kksActive === true;
  const triggerType = cleanText(body.triggerType || "userMessage", 40);
  let profiles = memberProfilesFromBody(body);
  if (!kksActive) profiles = profiles.filter((m) => m.nickname !== "김광석");
  if (!profiles.length) profiles = DEFAULT_MEMBER_PROFILES;

  const normalProfiles = profiles.filter((m) => m.nickname !== "김광석");
  const shuffledNormal = shuffle(normalProfiles).slice(0, 7);
  const kksProfile = profiles.find((m) => m.nickname === "김광석");
  const availableProfiles = kksProfile ? [kksProfile, ...shuffledNormal] : shuffledNormal;
  const allowedNames = availableProfiles.map((m) => m.nickname);
  const table = availableProfiles.map((m) => `${m.nickname}(${m.realName || "이름미상"})`).join(", ");

  let replyCount = triggerType === "kksFirstMessage" ? 3 : 3;
  if (retryLevel >= 2) replyCount = 2;

  const avoidTexts = uniqueStrings([
    ...(Array.isArray(body.avoidTexts) ? body.avoidTexts : []),
    ...(Array.isArray(body.recentMessages) ? body.recentMessages.map(m => m.text || "") : [])
  ], 24).filter(t => !looksBrokenText(t));
  const avoid = avoidTexts.length ? avoidTexts.map(t => `- ${cleanText(t, 100)}`).join("\n") : "없음";

  const system = `너는 1995년 PC통신 대화방 '광석이네 통신방'의 여러 회원 대사를 생성한다.
너의 임무는 사용자의 말 뒤에 이어질 다른 회원들의 실제 채팅 줄을 만드는 것이다.
저장된 문장, 고정 멘트, 예시문 복붙은 금지한다. 매번 지금 대화 흐름만 보고 새로 쓴다.

출력 형식은 반드시 JSON 하나만:
{"replies":[{"nickname":"닉네임","realName":"이름","text":"대사"}]}

중요 규칙:
- replies는 반드시 ${replyCount}개.
- 대사는 자연스러운 한국어만. 무작위 영어, 코드, 변수명, 번역투 금지.
- [object Object] 금지.
- 한 대사는 2~55자. 너무 긴 설명 금지.
- 모든 대사를 ${userNick} 혼자 말하게 하지 말고, 반드시 다른 회원 닉네임으로 말하게 한다.
- 일반 회원들은 사용자와 서로에게 기본적으로 존댓말을 쓴다.
- 회원끼리 서로 반응해야 한다. 사용자에게만 1:1 답변하지 말 것.
- 상담사처럼 '편하게 말씀하세요', '천천히 이야기해요' 같은 반복 멘트 금지.
- 최근 대화와 같은 문장을 반복하지 말 것.
- 대화 모드=${mode}. 이 값은 전체 대화 분위기다.
- 친한 정도=${close}. 이 값은 사용자와 김광석 사이에만 적용한다.
- 실제 김광석 본인의 응답이나 실제 발언으로 꾸미지 말 것.
- 노래 가사 장문 인용 금지.

김광석 상태:
${kksActive ? "김광석은 수신 가능 상태로 방에 있다. 단, 한 묶음에서 김광석은 최대 1줄만 말할 수 있고, 일반 회원 대사가 먼저 나와야 한다." : "김광석은 지금 방에 없다. 김광석 닉네임 사용 금지."}
${triggerType === "kksFirstMessage" ? "지금은 김광석이 수신 가능 상태가 된 직후다. 김광석의 첫 짧은 인사 1개와 일반 회원 반응 2개를 만든다." : ""}
${retryLevel ? "재시도: 이전 출력이 깨졌거나 비어 있었다. 이번에는 반드시 유효한 JSON과 자연스러운 한국어만 출력한다." : ""}

사용 가능한 회원: ${table}`;

  const user = `최근 대화:
${recentLog}

반복하면 안 되는 최근 문장:
${avoid}

${userNick}${userName ? `(${userName})` : ""}의 마지막 말:
${userText}

조건:
- replies ${replyCount}개를 반드시 생성.
- 첫 번째 replies는 일반 회원이어야 함.
- ${kksActive ? "김광석은 필요할 때만 마지막 쪽에 1줄 가능." : "김광석은 절대 넣지 말 것."}
- JSON 외에는 아무것도 쓰지 말 것.`;

  return { system, user, allowedNames, profiles: availableProfiles, replyCount, avoidTexts, kksActive };
}

async function runAi(env, prompt, temperature = 0.82, maxTokens = 360) {
  const result = await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ],
    temperature,
    top_p: 0.82,
    max_tokens: maxTokens
  });
  return result?.response || result?.result?.response || result?.text || "";
}

function parseReplies(rawText, ctx) {
  const rawOriginal = extractText(rawText);
  const raw = cleanText(rawOriginal, 2500);
  let items = [];

  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    const parsed = JSON.parse(jsonText);
    items = Array.isArray(parsed.replies) ? parsed.replies : [];
  } catch (_) {
    // JSON 실패 시 AI 원문을 줄 단위로 검사한다. 고정 대체문은 넣지 않는다.
    items = rawOriginal.split(/\n+/).map(line => {
      const m = line.match(/([가-힣A-Za-z0-9_]+)\s*(?:\(([^)]{1,12})\))?\s*[:：]\s*(.+)$/);
      if (m) return { nickname: m[1], realName: m[2] || "", text: m[3] };
      return { text: line.replace(/^[-*•\s]+/, "") };
    });
  }

  const allowed = new Set(ctx.allowedNames || DEFAULT_MEMBER_PROFILES.map(m => m.nickname));
  const profileMap = new Map((ctx.profiles || DEFAULT_MEMBER_PROFILES).map((m) => [m.nickname, m.realName || ""]));
  const normalNames = [...allowed].filter(n => n !== "김광석");
  const fallbackNames = shuffle(normalNames.length ? normalNames : [...allowed]);
  const avoid = uniqueStrings(ctx.avoidTexts || [], 40);
  const cleaned = [];
  const seen = new Set();
  let kksLineUsed = false;

  for (const item of items) {
    let nickname = cleanText(item?.nickname || "", 16);
    if (nickname === "김광석" && ctx.kksActive !== true) continue;
    if (nickname === "김광석" && kksLineUsed) continue;
    if (!allowed.has(nickname)) nickname = fallbackNames[cleaned.length % fallbackNames.length] || "soriboy";
    if (nickname === "김광석") kksLineUsed = true;

    const realName = cleanText(item?.realName || profileMap.get(nickname) || "", 16);
    let text = cleanText(item?.text ?? item?.message ?? item?.content ?? item, 180);
    text = text.replace(/^\s*[^:：]{1,16}\s*[:：]\s*/, "").trim();
    text = text.replace(/["“”]+/g, "").trim();

    if (looksBrokenText(text)) continue;
    const key = compact(text);
    if (!key || seen.has(key)) continue;
    if (avoid.some(old => similarity(text, old) > 0.68)) continue;

    seen.add(key);
    cleaned.push({ nickname, realName, text: text.slice(0, 120) });
    if (cleaned.length >= (ctx.replyCount || 3)) break;
  }
  return cleaned;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

    let body;
    try { body = await request.json(); }
    catch (_) { return json({ ok: false, error: "JSON body가 필요합니다." }, 400); }

    body.userText = cleanText(body.userText || "", MAX_INPUT);
    if (!body.userText) return json({ ok: false, error: "userText가 비어 있습니다." }, 400);
    if (!env.AI) return json({ ok: false, error: "Workers AI binding(AI)이 없습니다. binding 이름을 AI로 추가하세요." }, 500);

    try {
      let replies = [];
      let raw = "";
      for (let retry = 0; retry < 3 && replies.length < 2; retry++) {
        const prompt = buildPrompt(body, retry);
        raw = await runAi(env, prompt, retry === 0 ? 0.88 : 0.72, retry === 2 ? 260 : 380);
        replies = parseReplies(raw, prompt);
      }

      // 고정 fallback 없음. 다만 Worker가 왜 대사를 저장하지 못했는지 브라우저가 알 수 있게 rawPreview를 짧게 돌려준다.
      return json({
        ok: true,
        replies,
        model: MODEL,
        generatedOnly: true,
        emptyReason: replies.length ? "" : "AI 출력이 비었거나 깨져서 저장하지 않았습니다.",
        rawPreview: replies.length ? "" : cleanText(raw, 300)
      });
    } catch (err) {
      return json({ ok: false, replies: [], error: String(err?.message || err || "Workers AI 호출 실패") }, 500);
    }
  }
};
