// 광석이네 통신방 - Cloudflare Workers AI 전용 Worker
// 저장된 회원 멘트/무료 자동 반응/고정 답변 없음.
// 이 Worker는 최근 대화와 사용자 입력을 보고 매번 새 대사를 생성합니다.
// 필요 바인딩: Workers AI binding 이름 = AI

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_INPUT = 900;
const MAX_RECENT = 36;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

const DEFAULT_MEMBER_NAMES = [
  "녹차향기", "soriboy", "낙원", "mouse14", "raincoat", "enfant",
  "새벽우체국", "먼지낀LP", "모뎀소리", "하늘연필", "푸른카세트"
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function cleanText(value, max = 500) {
  return String(value || "")
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

function memberNamesFromBody(body) {
  const names = Array.isArray(body.memberNames) ? body.memberNames : DEFAULT_MEMBER_NAMES;
  const cleaned = uniqueStrings(names, 16).filter(v => v.length <= 16);
  return cleaned.length ? cleaned : DEFAULT_MEMBER_NAMES;
}

function recentLogFromBody(body) {
  const recent = Array.isArray(body.recentMessages) ? body.recentMessages.slice(-MAX_RECENT) : [];
  return recent
    .map((m) => `${cleanText(m.nickname || m.role || "통신방", 20)}: ${cleanText(m.text || "", 260)}`)
    .join("\n");
}

function buildPrompt(body, retry = false) {
  const userText = cleanText(body.userText || "", MAX_INPUT);
  const userNick = cleanText(body.userNick || "손님", 20);
  const mode = cleanText(body.mode || "chat", 40);
  const close = cleanText(body.close || "known", 40);
  const recentLog = recentLogFromBody(body) || "아직 대화가 많지 않음";
  const memberNames = shuffle(memberNamesFromBody(body)).slice(0, 9);
  const replyCount = 2 + Math.floor(Math.random() * 3);
  const avoidTexts = uniqueStrings([
    ...(Array.isArray(body.avoidTexts) ? body.avoidTexts : []),
    ...(Array.isArray(body.recentMessages) ? body.recentMessages.map(m => m.text || "") : [])
  ], 34);
  const requestId = cleanText(body.requestId || `${Date.now()}-${Math.random()}`, 80);

  const system = `너는 '광석이네 통신방'의 가상 회원 대화를 생성한다.
중요: 코드 안에 저장된 답변 문장은 없다. 지금 대화 내용을 보고 새 문장을 직접 만들어야 한다.
실제 김광석 본인 사칭 금지. 실제 발언처럼 단정 금지. 노래 가사 장문 인용 금지.

대화 원칙:
- 사용자의 마지막 말에 구체적으로 반응한다.
- 최근 대화와 같은 문장, 같은 어미, 같은 위로 방식, 같은 인사말을 반복하지 않는다.
- 친절한 상담사 말투, 챗봇 안내문, 설명문 말투를 피한다.
- 1990년대 PC통신 느낌은 살리되 억지 복고체나 말줄임표 남발은 하지 않는다.
- 회원마다 성격이 다르게 들리게 한다. 모두 같은 온도로 말하면 실패다.
- 한 사람당 한 문장 또는 아주 짧은 두 문장만 쓴다.
- 출력은 반드시 JSON 하나만. 마크다운, 해설, 코드블록 금지.

상황값: mode=${mode}, close=${close}, requestId=${requestId}
사용 가능한 닉네임: ${memberNames.join(", ")}
생성할 대사 수: ${replyCount}개
${retry ? "재시도: 직전 출력이 반복적이거나 비어 있었다. 이번에는 더 구체적이고 다른 문장 구조로 다시 생성한다." : ""}`;

  const avoid = avoidTexts.length ? avoidTexts.map(t => `- ${cleanText(t, 120)}`).join("\n") : "없음";
  const user = `최근 대화:
${recentLog}

반복하면 안 되는 최근 문장:
${avoid}

${userNick}의 마지막 말:
${userText}

반드시 아래 JSON 형식만 출력:
{"replies":[{"nickname":"${memberNames[0]}","text":"새로 생성한 대사"}]}`;

  return { system, user, memberNames, replyCount, avoidTexts, body };
}

async function runAi(env, prompt, temperature = 1.15) {
  const result = await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ],
    temperature,
    top_p: 0.96,
    max_tokens: 520
  });
  return result?.response || result?.result?.response || "";
}

function parseReplies(rawText, ctx) {
  const raw = String(rawText || "").trim();
  let items = [];
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    const parsed = JSON.parse(jsonText);
    items = Array.isArray(parsed.replies) ? parsed.replies : [];
  } catch (_) {
    items = raw.split(/\n+/).map(line => ({ text: line.replace(/^[-*•\s]+/, "") }));
  }

  const allowed = new Set(ctx.memberNames || DEFAULT_MEMBER_NAMES);
  const fallbackNames = shuffle([...allowed]);
  const avoid = uniqueStrings(ctx.avoidTexts || [], 40);
  const cleaned = [];
  const seen = new Set();

  for (const item of items) {
    let nickname = cleanText(item?.nickname || "", 16);
    if (!allowed.has(nickname)) nickname = fallbackNames[cleaned.length % fallbackNames.length] || "통신방";

    let text = cleanText(item?.text || "", 180);
    text = text.replace(/^\s*[^:：]{1,16}\s*[:：]\s*/, "").trim();
    text = text.replace(/["“”]+/g, "").trim();
    if (!text || text.length < 4) continue;

    const key = compact(text);
    if (!key || seen.has(key)) continue;
    if (avoid.some(old => similarity(text, old) > 0.62)) continue;

    seen.add(key);
    cleaned.push({ nickname, text: text.slice(0, 140) });
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
      let prompt = buildPrompt(body, false);
      let content = await runAi(env, prompt, 1.18);
      let replies = parseReplies(content, prompt);

      if (!replies.length) {
        prompt = buildPrompt(body, true);
        content = await runAi(env, prompt, 1.32);
        replies = parseReplies(content, prompt);
      }

      return json({ ok: true, replies, model: MODEL, generatedOnly: true });
    } catch (err) {
      return json({ ok: false, replies: [], error: String(err?.message || err || "Workers AI 호출 실패") }, 500);
    }
  }
};
