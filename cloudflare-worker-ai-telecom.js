// 광석이네 통신방 - Cloudflare Workers AI Worker
// 배포 후 나온 workers.dev 주소를 app.js의 FB_TELECOM_AI_WORKER_URL에 넣으세요.
// 필요 바인딩: Workers AI binding 이름 = AI

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_INPUT = 500;
const MAX_RECENT = 24;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

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

function fallbackReplies(userText) {
  const t = cleanText(userText, 120);
  if (/노래|음악|공연|라디오|앨범/.test(t)) {
    return [
      { nickname: "soriboy", text: "그 얘기 나오면 또 판 뒤져봐야죠." },
      { nickname: "녹차향기", text: "천천히 얘기해요. 자료도 같이 보면 좋겠네요." }
    ];
  }
  if (/힘들|우울|슬프|외롭|지쳤|위로/.test(t)) {
    return [
      { nickname: "낙원", text: "그럴 땐 그냥 잠깐 앉아 있어도 돼요." },
      { nickname: "raincoat", text: "오늘은 너무 애쓰지 말아요." }
    ];
  }
  if (/안녕|ㅎㅇ|하이|반가/.test(t)) {
    return [
      { nickname: "녹차향기", text: "어서오세요. 접속 잘 됐네요." },
      { nickname: "mouse14", text: "오셨군요 ㅎㅎ" }
    ];
  }
  return [
    { nickname: "녹차향기", text: "음... 그 얘기 조금 더 들어보고 싶네요." },
    { nickname: "enfant", text: "저도 조용히 보고 있었어요." }
  ];
}

function buildPrompt(body) {
  const modeGuide = {
    chat: "일상 잡담",
    comfort: "부담스럽지 않은 위로",
    music: "김광석 음악과 자료 이야기",
    memory: "1990년대 PC통신과 추억 이야기",
    worry: "짧고 현실적인 고민 반응"
  }[body.mode] || "일상 잡담";

  const closeGuide = {
    first: "처음 보는 사이처럼 조심스럽게",
    known: "몇 번 본 회원처럼 자연스럽게",
    close: "조금 친한 회원처럼 따뜻하게",
    veryClose: "오래 본 회원처럼 편하게",
    best: "아주 가까운 회원처럼 짧고 친근하게"
  }[body.close] || "몇 번 본 회원처럼 자연스럽게";

  const recent = Array.isArray(body.recentMessages) ? body.recentMessages.slice(-MAX_RECENT) : [];
  const recentLog = recent.map((m) => {
    const nick = cleanText(m.nickname || m.role || "통신방", 20);
    const text = cleanText(m.text || "", 180);
    return `${nick}: ${text}`;
  }).join("\n");

  const userNick = cleanText(body.userNick || "손님", 20);
  const userText = cleanText(body.userText || "", MAX_INPUT);

  const system = `너는 '광석이네 통신방'의 가상 PC통신 대화 생성기다.
실제 김광석 본인이라고 주장하거나, 실제 김광석의 발언처럼 단정하지 않는다.
김광석을 기억하고 이야기하는 팬 대화방 분위기의 가상 회원 대사만 만든다.
1990년대 PC통신 느낌으로 짧고 투박하게 쓴다.
현대 상담사 말투, AI라는 표현, 긴 설명문, 노래 가사 장문 인용은 금지한다.
출력은 반드시 JSON 하나만 한다.
JSON 형식: {"replies":[{"nickname":"녹차향기","text":"짧은 대사"}]}
replies는 1~3개만 만든다.
사용 가능한 닉네임: 녹차향기, soriboy, 낙원, mouse14, raincoat, enfant.
각 text는 60자 이내로 한다.
최근 대화와 비슷한 문장을 반복하지 않는다.
현재 흐름: ${modeGuide}.
친밀도: ${closeGuide}.`;

  const user = `최근 대화:\n${recentLog || "아직 대화가 많지 않음"}\n\n${userNick}의 마지막 말: ${userText}\n\n위 상황에 자연스럽게 이어지는 가상 회원 대사 JSON만 출력해라.`;
  return { system, user };
}

function parseReplies(text, userText) {
  const raw = String(text || "").trim();
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    const parsed = JSON.parse(jsonText);
    const replies = Array.isArray(parsed.replies) ? parsed.replies : [];
    const cleaned = replies.map((r) => ({
      nickname: cleanText(r.nickname || "녹차향기", 16),
      text: cleanText(r.text || "", 120)
    })).filter((r) => r.text);
    if (cleaned.length) return cleaned.slice(0, 3);
  } catch (_) {}

  const lines = raw.split(/\n+/).map((v) => cleanText(v.replace(/^[-*•\s]+/, ""), 120)).filter(Boolean);
  if (lines.length) {
    const nicks = ["녹차향기", "soriboy", "낙원"];
    return lines.slice(0, 3).map((line, idx) => ({ nickname: nicks[idx] || "녹차향기", text: line }));
  }
  return fallbackReplies(userText);
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== "POST") return json({ ok: false, error: "POST only" }, 405);

    let body;
    try {
      body = await request.json();
    } catch (_) {
      return json({ ok: false, error: "JSON body가 필요합니다." }, 400);
    }

    const userText = cleanText(body.userText || "", MAX_INPUT);
    if (!userText) return json({ ok: false, error: "userText가 비어 있습니다." }, 400);

    if (!env.AI) {
      return json({ ok: true, replies: fallbackReplies(userText), fallback: true, warning: "Workers AI binding(AI)이 없습니다." });
    }

    try {
      const { system, user } = buildPrompt({ ...body, userText });
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 0.85,
        max_tokens: 240
      });
      const content = result?.response || result?.result?.response || "";
      const replies = parseReplies(content, userText);
      return json({ ok: true, replies, model: MODEL });
    } catch (err) {
      return json({
        ok: true,
        replies: fallbackReplies(userText),
        fallback: true,
        error: String(err?.message || err || "Workers AI 호출 실패")
      });
    }
  }
};
