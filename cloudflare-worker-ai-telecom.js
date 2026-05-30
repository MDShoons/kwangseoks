// 광석이네 통신방 - Cloudflare Workers AI Worker
// 무료 자동 멤버 반응과 AI 선발화 없이, 사용자의 입력이 있을 때만 Workers AI가 새 대사를 생성합니다.
// 필요 바인딩: Workers AI binding 이름 = AI

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_INPUT = 700;
const MAX_RECENT = 32;

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

function compact(value) {
  return cleanText(value, 200).replace(/[\s~!?.。！？….,，]/g, "").toLowerCase();
}

function uniqueItems(arr) {
  const seen = new Set();
  const out = [];
  for (const item of arr || []) {
    const key = compact(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function choose(arr, fallback = "") {
  if (!Array.isArray(arr) || !arr.length) return fallback;
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function inferMode(userText, bodyMode, autoTalk) {
  const t = cleanText(userText, 300);
  if (autoTalk) return "방이 조용할 때 먼저 말 꺼내기";
  if (/노래|음악|앨범|공연|라디오|기타|자료|녹음|라이브/.test(t)) return "김광석 음악과 자료 이야기";
  if (/힘들|우울|외롭|슬프|허전|답답|피곤|위로|마음/.test(t)) return "부담스럽지 않은 위로";
  if (/안녕|하이|접속|왔/.test(t)) return "처음 반응과 가벼운 인사";
  if (/뭐해|뭐하|조용|아무도|있어/.test(t)) return "방 안의 자연스러운 잡담";
  return {
    chat: "일상 잡담",
    comfort: "부담스럽지 않은 위로",
    music: "김광석 음악과 자료 이야기",
    memory: "1990년대 PC통신과 추억 이야기",
    worry: "짧고 현실적인 고민 반응"
  }[bodyMode] || "일상 잡담";
}

function buildPrompt(body) {
  const autoTalk = false;
  const recent = Array.isArray(body.recentMessages) ? body.recentMessages.slice(-MAX_RECENT) : [];
  const recentLog = recent.map((m) => {
    const nick = cleanText(m.nickname || m.role || "통신방", 20);
    const text = cleanText(m.text || "", 220);
    return `${nick}: ${text}`;
  }).join("\n");

  const avoidTexts = uniqueItems([
    ...(Array.isArray(body.avoidTexts) ? body.avoidTexts : []),
    ...recent.map((m) => m.text || "")
  ]).slice(-22).map((x) => `- ${cleanText(x, 90)}`).join("\n");

  const userNick = cleanText(body.userNick || "손님", 20);
  const userText = cleanText(body.userText || "", MAX_INPUT);
  const styleSeed = body.styleSeed || {};
  const theme = cleanText(styleSeed.theme || choose(["밤 접속", "자료실", "라디오", "눈팅", "낡은 모뎀", "비 오는 날"]), 30);
  const texture = cleanText(styleSeed.texture || choose(["짧게 툭", "두 문장 이하", "약간 장난", "담담하게", "질문 하나만"]), 30);
  const modeGuide = inferMode(userText, body.mode, autoTalk);

  const closeGuide = {
    first: "처음 보는 사이처럼 조심스럽게",
    known: "몇 번 본 회원처럼 자연스럽게",
    close: "조금 친한 회원처럼 따뜻하게",
    veryClose: "오래 본 회원처럼 편하게",
    best: "아주 가까운 회원처럼 짧고 친근하게"
  }[body.close] || "몇 번 본 회원처럼 자연스럽게";

  const members = shuffle(["녹차향기", "soriboy", "낙원", "mouse14", "raincoat", "enfant"]);
  const memberGuide = `
- 녹차향기: 방장 느낌, 차분하게 흐름 정리. 매번 친절한 상담사처럼 말하지 말 것.
- soriboy: 자료방/음악 쪽. 곡명·공연·녹음 얘기에 반응하되 단정하지 말 것.
- 낙원: 감성적이지만 과장 금지. 짧고 담담하게.
- mouse14: 장난기, PC통신식 농담. 너무 시끄럽지 않게.
- raincoat: 밝고 생활 잡담. 날씨·밤·접속 분위기.
- enfant: 조용한 눈팅 회원. 한 박자 늦게 짧게 말함.`;

  const system = `너는 '광석이네 통신방'의 가상 PC통신 대화 생성기다.
실제 김광석 본인이라고 주장하지 말고, 실제 발언처럼 꾸미지 않는다.
김광석을 기억하고 자료와 노래를 이야기하는 팬 대화방의 가상 회원 대사만 만든다.

중요 목표:
- 매번 새 문장을 만든다. 최근 대화와 같은 문장, 같은 구조, 같은 끝맺음을 반복하지 않는다.
- 사용자의 마지막 말에 직접 반응한다. 뜬금없는 일반 인사, 상담사 멘트, 설명문을 피한다.
- 1990년대 PC통신 느낌: 짧고 투박하고 사람처럼. 그러나 과한 사투리/욕설/도배는 금지.
- 현대 AI 말투, "제가 도와드릴게요", "더 이야기해 주세요", "소중한 감정" 같은 상담 템플릿 금지.
- 노래 가사는 길게 인용하지 않는다. 필요하면 곡 제목·분위기·자료 관점으로만 말한다.
- 출력은 JSON 하나만 한다. 앞뒤 설명 금지.

출력 형식:
{"replies":[{"nickname":"${members[0]}","text":"짧은 대사"}]}

규칙:
- replies는 ${autoTalk ? "1~2개" : "2~4개"}.
- nickname은 다음 중에서만 사용: ${members.join(", ")}.
- 같은 nickname을 연속으로 남발하지 않는다.
- 각 text는 15~80자. 길어도 100자 이내.
- 대사마다 말투와 역할이 달라야 한다.
- 한 답변 안에서 같은 표현을 반복하지 않는다.
- 대사는 실제 사람이 채팅창에 치는 문장처럼 쓴다.

회원 성격:${memberGuide}
현재 흐름: ${modeGuide}
친밀도: ${closeGuide}
오늘의 변주 키워드: ${theme}
문장 질감: ${texture}`;

  const user = `최근 대화:
${recentLog || "아직 대화가 많지 않음"}

반복 금지 문장/표현:
${avoidTexts || "없음"}

${`${userNick}의 마지막 말: ${userText}`}

위 상황에 이어지는 가상 회원 대사 JSON만 출력해라. 기존 문장을 재사용하지 말고, 구체적인 한 마디를 새로 써라.`;
  return { system, user };
}

function scoreSimilarity(a, b) {
  const aa = compact(a);
  const bb = compact(b);
  if (!aa || !bb) return 0;
  if (aa === bb) return 1;
  if (aa.includes(bb) || bb.includes(aa)) return Math.min(0.95, Math.min(aa.length, bb.length) / Math.max(aa.length, bb.length));
  const aset = new Set(aa.match(/.{1,2}/g) || []);
  const bset = new Set(bb.match(/.{1,2}/g) || []);
  let inter = 0;
  for (const x of aset) if (bset.has(x)) inter++;
  return inter / Math.max(1, Math.min(aset.size, bset.size));
}

function parseReplies(text, body) {
  const raw = String(text || "").trim();
  let replies = [];
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonText = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
    const parsed = JSON.parse(jsonText);
    replies = Array.isArray(parsed.replies) ? parsed.replies : [];
  } catch (_) {
    replies = raw.split(/\n+/).map((line) => ({ text: line.replace(/^[-*•\s]+/, "") }));
  }

  const allowed = new Set(["녹차향기", "soriboy", "낙원", "mouse14", "raincoat", "enfant"]);
  const fallbackNicks = shuffle([...allowed]);
  const avoid = uniqueItems([
    ...(Array.isArray(body.avoidTexts) ? body.avoidTexts : []),
    ...(Array.isArray(body.recentMessages) ? body.recentMessages.map((m) => m.text || "") : [])
  ]);

  const cleaned = [];
  const seen = new Set();
  for (const r of replies) {
    let nickname = cleanText(r.nickname || "", 16);
    if (!allowed.has(nickname)) nickname = fallbackNicks[cleaned.length % fallbackNicks.length] || "녹차향기";
    let t = cleanText(r.text || "", 130);
    t = t.replace(/^\s*[^:：]{1,16}\s*[:：]\s*/, "").trim();
    if (!t) continue;
    if (/더 이야기|도와드릴|소중한 감정|AI|인공지능|JSON/i.test(t)) continue;
    const key = compact(t);
    if (!key || seen.has(key)) continue;
    const tooSimilar = avoid.some((old) => scoreSimilarity(t, old) > 0.72);
    if (tooSimilar) continue;
    seen.add(key);
    cleaned.push({ nickname, text: t.slice(0, 100) });
    if (cleaned.length >= 4) break;
  }
  return cleaned;
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
      return json({ ok: false, error: "Workers AI binding(AI)이 없습니다. Cloudflare Worker 설정에서 AI binding 이름을 AI로 추가하세요." }, 500);
    }

    try {
      const { system, user } = buildPrompt({ ...body, userText });
      const result = await env.AI.run(MODEL, {
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ],
        temperature: 1.05,
        top_p: 0.92,
        max_tokens: 360
      });
      const content = result?.response || result?.result?.response || "";
      let replies = parseReplies(content, { ...body, userText });

      // 모델이 반복 필터에 걸려 모두 제거되면, 한 번 더 강하게 요청한다. 자동문장 fallback은 만들지 않는다.
      if (!replies.length) {
        const retry = await env.AI.run(MODEL, {
          messages: [
            { role: "system", content: system + "\n반드시 이전 대화와 다른 새 문장만 JSON으로 출력한다. 템플릿 표현 금지." },
            { role: "user", content: user + "\n방금 출력은 반복이 심했다. 완전히 다른 표현으로 다시." }
          ],
          temperature: 1.18,
          top_p: 0.95,
          max_tokens: 360
        });
        const retryContent = retry?.response || retry?.result?.response || "";
        replies = parseReplies(retryContent, { ...body, userText });
      }

      return json({ ok: true, replies, model: MODEL });
    } catch (err) {
      return json({
        ok: false,
        replies: [],
        error: String(err?.message || err || "Workers AI 호출 실패")
      }, 500);
    }
  }
};
