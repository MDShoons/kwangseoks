// 광석이네 통신방 - Cloudflare Workers AI 전용 Worker
// 저장된 회원 멘트/무료 자동 반응/고정 답변 없음.
// 최근 대화와 사용자 입력만 보고 Workers AI가 매번 새 대사를 생성합니다.
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
const DEFAULT_MEMBER_NAMES = DEFAULT_MEMBER_PROFILES.map((m) => m.nickname);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function extractText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    const candidates = [value.text, value.message, value.content, value.reply, value.response, value.value];
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

function similarity(a, b) {
  const aa = compact(a), bb = compact(b);
  if (!aa || !bb) return 0;
  if (aa === bb) return 1;
  if (aa.includes(bb) || bb.includes(aa)) {
    return Math.min(0.96, Math.min(aa.length, bb.length) / Math.max(aa.length, bb.length));
  }
  const ag = new Set(aa.match(/.{1,2}/g) || []);
  const bg = new Set(bb.match(/.{1,2}/g) || []);
  let inter = 0;
  for (const x of ag) if (bg.has(x)) inter++;
  return inter / Math.max(1, Math.min(ag.size, bg.size));
}

function hangulCount(s) {
  return (String(s || "").match(/[가-힣]/g) || []).length;
}

function latinCount(s) {
  return (String(s || "").match(/[A-Za-z]/g) || []).length;
}

function looksBrokenKorean(text) {
  const t = cleanText(text, 220);
  if (!t || t.length < 4) return true;
  if (/\[object Object\]/i.test(t)) return true;
  if (/[A-Z]{5,}|_[A-Z]{3,}|[A-Za-z]{12,}/.test(t)) return true;
  if (/(GENRE|GENDER|CAPEC|CUREMENT|Programme|Radiation|Cakeour|ttkiz|alto|Waart|Smart call)/i.test(t)) return true;
  const h = hangulCount(t);
  const l = latinCount(t);
  // 닉네임/PC통신 같은 짧은 영문은 허용하지만, 대사의 중심은 한국어여야 함.
  if (h < 3) return true;
  if (l > h * 0.9 && l > 8) return true;
  return false;
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
function memberNamesFromBody(body) {
  return memberProfilesFromBody(body).map((m) => m.nickname);
}

function recentLogFromBody(body) {
  const recent = Array.isArray(body.recentMessages) ? body.recentMessages.slice(-MAX_RECENT) : [];
  return recent
    .map((m) => `${cleanText(m.nickname || m.role || "통신방", 20)}: ${cleanText(m.text || "", 180)}`)
    .filter((line) => !line.includes("[object Object]") && !looksBrokenKorean(line.replace(/^[^:]+:\s*/, "")))
    .join("\n");
}

function buildPrompt(body, retry = false) {
  const userText = cleanText(body.userText || "", MAX_INPUT);
  const userNick = cleanText(body.userNick || "손님", 20);
  const mode = cleanText(body.mode || "chat", 40);
  const close = cleanText(body.close || "known", 40);
  const recentLog = recentLogFromBody(body) || "아직 정상 대화가 거의 없음";
  const kksActive = body.kksActive === true;
  const triggerType = cleanText(body.triggerType || "userMessage", 40);
  let memberProfiles = memberProfilesFromBody(body);
  if (!kksActive) memberProfiles = memberProfiles.filter((m) => m.nickname !== "김광석");
  memberProfiles = shuffle(memberProfiles).slice(0, 8);
  const memberNames = memberProfiles.map((m) => m.nickname);
  const memberTable = memberProfiles.map((m) => `${m.nickname}(${m.realName || "이름미상"})`).join(", ");
  const replyCount = triggerType === "kksFirstMessage" ? 3 : (2 + Math.floor(Math.random() * 2)); // 일반 2~3개, 김광석 첫 수신 3개
  const avoidTexts = uniqueStrings([
    ...(Array.isArray(body.avoidTexts) ? body.avoidTexts : []),
    ...(Array.isArray(body.recentMessages) ? body.recentMessages.map(m => m.text || "") : [])
  ], 24).filter(t => !looksBrokenKorean(t));
  const requestId = cleanText(body.requestId || `${Date.now()}-${Math.random()}`, 80);

  const system = `너는 '광석이네 통신방'의 가상 회원 대사를 생성한다.
저장된 답변이나 템플릿은 없다. 매번 지금 대화만 보고 새로 쓴다.
실제 김광석 본인 사칭 금지. 실제 발언처럼 단정 금지. 노래 가사 장문 인용 금지.

절대 조건:
- 반드시 자연스러운 한국어 문장만 쓴다.
- 무작위 영어, 코드, 변수명, 번역투, 외국어 단어 나열 금지.
- [object Object] 같은 문자열 금지.
- JSON 외의 해설, 마크다운, 코드블록 금지.
- 최근 대화와 같은 문장 구조를 반복하지 않는다.
- 상담사/챗봇 안내문처럼 말하지 않는다.
- 각 회원은 서로 다른 반응을 한다.
- 한 대사는 12~55자 정도로 짧게 쓴다.
- 1990년대 PC통신 느낌은 살리되 과하게 흉내 내지 않는다.
- 사용자는 oldsong0106처럼 방에 참여한 사람 중 한 명이다. 사용자를 상담 대상으로만 보지 말고, 여러 회원이 서로 대화한다.
- 다른 일반 회원들은 사용자와 서로에게 기본적으로 존댓말을 쓴다. 단, PC통신식 짧은 감탄이나 웃음은 허용한다.
- 대화 모드는 전체 대화 흐름이다. 친한 정도는 오직 사용자와 김광석 사이의 거리감이며, 다른 회원과 사용자의 친분이 아니다.
- 김광석과 다른 회원, 사용자와 다른 회원, 다른 회원끼리도 서로 반응할 수 있다.
- 매 응답이 김광석의 1:1 답변처럼 되면 안 된다. 방 전체가 움직이는 느낌이어야 한다.

김광석 호출 상태: ${kksActive ? "김광석이 수신 가능 상태로 접속해 있음. 필요할 때만 김광석 한 줄을 포함할 수 있음." : "김광석은 방에 없음. 김광석 닉네임으로 말하게 하지 말 것."}
김광석이 말할 경우의 규칙:
- 김광석이 방에 있을 때만 사용한다.
- 실제 발언이나 실제 기억처럼 꾸미지 말고, 가상 통신방 속 짧은 반응으로만 쓴다.
- 너무 자주 말하지 않는다. 한 번 응답 묶음 안에서 김광석은 최대 1줄만 가능하다.
- 말투는 느리고 소박하게, 짧게 쓴다.
- 사용자가 말을 쳤다고 해서 김광석이 항상 바로 답하면 안 된다. 다른 회원들이 먼저 받아도 된다.

트리거: ${triggerType}
${triggerType === "kksFirstMessage" ? "지금은 김광석이 수신 가능 상태가 된 직후다. replies에는 김광석의 첫 짧은 인사 1개와 일반 회원 반응 1~2개를 포함한다." : ""}
상황값: mode=${mode}, close=${close}, requestId=${requestId}
사용 가능한 회원: ${memberTable}
생성할 대사 수: ${replyCount}개
${retry ? "재시도 지시: 직전 출력이 깨졌거나 한국어가 아니었다. 이번에는 반드시 자연스러운 한국어만 생성한다." : ""}`;

  const avoid = avoidTexts.length ? avoidTexts.map(t => `- ${cleanText(t, 100)}`).join("\n") : "없음";
  const user = `최근 정상 대화:
${recentLog}

반복하면 안 되는 최근 문장:
${avoid}

${userNick}의 마지막 말:
${userText}

아래 JSON 하나만 출력한다. replies 배열에는 ${replyCount}개를 넣는다.
{"replies":[{"nickname":"${memberNames[0]}","realName":"${memberProfiles[0]?.realName || ""}","text":"여기에 자연스러운 한국어 대사"}]}`;

  return { system, user, memberNames, memberProfiles, replyCount, avoidTexts, body, kksActive };
}

async function runAi(env, prompt, temperature = 0.92) {
  const result = await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ],
    temperature,
    top_p: 0.86,
    max_tokens: 430
  });
  return result?.response || result?.result?.response || result?.text || "";
}

function parseReplies(rawText, ctx) {
  const raw = cleanText(rawText, 2000);
  let items = [];
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    const parsed = JSON.parse(jsonText);
    items = Array.isArray(parsed.replies) ? parsed.replies : [];
  } catch (_) {
    // JSON 파싱 실패 시에도 템플릿 대체문을 넣지 않는다. AI 원문을 줄 단위로만 검사한다.
    items = raw.split(/\n+/).map(line => ({ text: line.replace(/^[-*•\s]+/, "") }));
  }

  const allowed = new Set(ctx.memberNames || DEFAULT_MEMBER_NAMES);
  const profileMap = new Map((ctx.memberProfiles || DEFAULT_MEMBER_PROFILES).map((m) => [m.nickname, m.realName || ""]));
  const fallbackNames = shuffle([...allowed]);
  const avoid = uniqueStrings(ctx.avoidTexts || [], 40);
  const cleaned = [];
  const seen = new Set();
  let kksLineUsed = false;

  for (const item of items) {
    let nickname = cleanText(item?.nickname || "", 16);
    if (nickname === "김광석" && ctx.kksActive !== true) continue;
    if (nickname === "김광석" && kksLineUsed) continue;
    if (!allowed.has(nickname)) nickname = fallbackNames[cleaned.length % fallbackNames.length] || "통신방";
    if (nickname === "김광석") kksLineUsed = true;

    const realName = cleanText(item?.realName || profileMap.get(nickname) || "", 16);
    let text = cleanText(item?.text ?? item?.message ?? item?.content ?? item, 180);
    text = text.replace(/^\s*[^:：]{1,16}\s*[:：]\s*/, "").trim();
    text = text.replace(/["“”]+/g, "").trim();
    if (looksBrokenKorean(text)) continue;

    const key = compact(text);
    if (!key || seen.has(key)) continue;
    if (avoid.some(old => similarity(text, old) > 0.62)) continue;

    seen.add(key);
    cleaned.push({ nickname, realName, text: text.slice(0, 120) });
    if (cleaned.length >= (ctx.replyCount || 2)) break;
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
      let prompt = buildPrompt(body, false);
      let content = await runAi(env, prompt, 0.92);
      let replies = parseReplies(content, prompt);

      if (!replies.length) {
        prompt = buildPrompt(body, true);
        content = await runAi(env, prompt, 0.78);
        replies = parseReplies(content, prompt);
      }

      // 고정 fallback 문장 없음. 깨진 출력이면 빈 배열로 반환한다.
      return json({ ok: true, replies, model: MODEL, generatedOnly: true });
    } catch (err) {
      return json({ ok: false, replies: [], error: String(err?.message || err || "Workers AI 호출 실패") }, 500);
    }
  }
};
