// 광석이네 통신방 - Cloudflare Workers AI 전용 Worker
// 이번 버전은 "사용자의 마지막 말에 직접 답하는 것"을 최우선으로 한다.
// 고정 멘트/무료 자동반응 없음. Workers AI가 만든 문장만 반환한다.
// 필요 바인딩: Workers AI binding 이름 = AI

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_INPUT = 700;
const MAX_RECENT = 8;
const REPLY_COUNT = 2;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8"
};

const DEFAULT_MEMBER_PROFILES = [
  { nickname: "녹차향기", realName: "변수진" },
  { nickname: "mouse14", realName: "장민석" },
  { nickname: "soriboy", realName: "김영호" },
  { nickname: "학궁뎅이", realName: "오승준" },
  { nickname: "외기러기", realName: "이연수" },
  { nickname: "열린고백", realName: "김은주" },
  { nickname: "enfant", realName: "이희정" },
  { nickname: "강서대묘", realName: "김동준" },
  { nickname: "sixs", realName: "육영수" },
  { nickname: "아인타인", realName: "박영근" },
  { nickname: "gonswing", realName: "신성철" },
  { nickname: "뜨라기", realName: "고지은" },
  { nickname: "mcgyver", realName: "박성재" },
  { nickname: "raincoat", realName: "이효연" },
  { nickname: "영원의꿈", realName: "박재완" },
  { nickname: "avril", realName: "조해성" },
  { nickname: "아주사", realName: "엄준호" },
  { nickname: "jeejone", realName: "지정엽" },
  { nickname: "btsmania", realName: "박재완" },
  { nickname: "keis", realName: "김응일" },
  { nickname: "byungari", realName: "이석권" },
  { nickname: "점등인", realName: "최훈철" },
  { nickname: "mjs1", realName: "목진설" },
  { nickname: "gksdml", realName: "윤유석" },
  { nickname: "작은기억", realName: "채원중" },
  { nickname: "hakjeon", realName: "최만석" },
  { nickname: "넋두리", realName: "최종희" },
  { nickname: "낙원", realName: "이명훈" },
  { nickname: "shim31", realName: "심수일" },
  { nickname: "cupite", realName: "김홍준" },
  { nickname: "경화", realName: "송경화" },
  { nickname: "소금밭", realName: "김도현" },
  { nickname: "hj8454", realName: "전상섭" },
  { nickname: "ekjw123", realName: "강은경" },
  { nickname: "하늘마음", realName: "김종구" },
  { nickname: "w6012923", realName: "김관수" },
  { nickname: "almanix", realName: "임현진" },
  { nickname: "김치찌개", realName: "진성일" },
  { nickname: "자아성찰", realName: "홍준수" },
  { nickname: "nkotb2", realName: "김연수" },
  { nickname: "swk3", realName: "신세호" },
  { nickname: "그불", realName: "박순영" },
  { nickname: "jhm10", realName: "장현민" },
  { nickname: "rnchunji", realName: "장춘지" },
  { nickname: "chika", realName: "오현주" },
  { nickname: "michelle", realName: "최지영" },
  { nickname: "lionsj", realName: "이수진" },
  { nickname: "네생각", realName: "모우진" },
  { nickname: "맑고푸른", realName: "이향표" },
  { nickname: "proam", realName: "김삼연" },
  { nickname: "아킬레스", realName: "노언진" },
  { nickname: "레몬tea", realName: "조지연" },
  { nickname: "huge", realName: "김정준" },
  { nickname: "lseokgoo", realName: "이석구" },
  { nickname: "daffodil", realName: "한희정" },
  { nickname: "한글날", realName: "신소희" },
  { nickname: "sawa92", realName: "설재훈" },
  { nickname: "mecander", realName: "이성일" },
  { nickname: "화랑소년", realName: "최대우" },
  { nickname: "주환이", realName: "김주환" },
  { nickname: "lovetony", realName: "이지영" },
  { nickname: "알레카스", realName: "노경현" },
  { nickname: "이끄는이", realName: "김경하" },
  { nickname: "mountie", realName: "이동산" },
  { nickname: "sensi", realName: "박수진" },
  { nickname: "ych2", realName: "여행스케" },
  { nickname: "mahakama", realName: "김용배" },
  { nickname: "몬스키", realName: "김문숙" },
  { nickname: "zet3", realName: "배진환" },
  { nickname: "ok0606", realName: "이봉옥" },
  { nickname: "iam75", realName: "박성화" },
  { nickname: "야구도사", realName: "홍준선" },
  { nickname: "아모로스", realName: "송현욱" },
  { nickname: "rpg3", realName: "고현주" },
  { nickname: "tajang", realName: "장병희" },
  { nickname: "elohim77", realName: "김선기" },
  { nickname: "바보나라", realName: "김용경" },
  { nickname: "kroi", realName: "강한나" },
  { nickname: "dr스쿠르", realName: "김종은" },
  { nickname: "a245", realName: "서홍석" },
  { nickname: "박영기", realName: "박영기" },
  { nickname: "kfardor", realName: "김태호" },
  { nickname: "이율배반", realName: "김동욱" },
  { nickname: "sky1130", realName: "송기용" },
  { nickname: "ose53", realName: "오세은" },
  { nickname: "chirisan", realName: "강수천" },
  { nickname: "비바9", realName: "서상혁" },
  { nickname: "사과쥬스", realName: "송기훈" },
  { nickname: "환경사랑", realName: "문양수" },
  { nickname: "w6024140", realName: "한태규" },
  { nickname: "soulman", realName: "서보균" },
  { nickname: "popboy", realName: "김정수" },
  { nickname: "colusvi", realName: "노남석" },
  { nickname: "moguly", realName: "조은성" },
  { nickname: "built", realName: "박종찬" },
  { nickname: "butfor", realName: "안정철" },
  { nickname: "조은인상", realName: "이준화" },
  { nickname: "사랑예감", realName: "김성남" },
  { nickname: "솔기", realName: "유석창" },
  { nickname: "park71", realName: "박명식" },
  { nickname: "steven", realName: "최재혁" },
  { nickname: "lebleu", realName: "홍승일" },
  { nickname: "76jeho", realName: "정제호" },
  { nickname: "canni", realName: "조인식" },
  { nickname: "pendia", realName: "김장환" },
  { nickname: "metalbar", realName: "김동수" },
  { nickname: "epigram", realName: "송수연" },
  { nickname: "blubosco", realName: "이은산" },
  { nickname: "giraffe7", realName: "한승훈" },
  { nickname: "opt7", realName: "이광철" },
  { nickname: "kyhpia", realName: "김용효" },
  { nickname: "ncnd", realName: "이은석" },
  { nickname: "w9011769", realName: "물방울" },
  { nickname: "satware", realName: "구인회" },
  { nickname: "ajeegang", realName: "김승민" },
  { nickname: "슈퍼토끼", realName: "송영인" },
  { nickname: "홍정훈", realName: "홍정훈" },
  { nickname: "channel1", realName: "정재훈" },
  { nickname: "skywatch", realName: "박성호" },
  { nickname: "킹카95", realName: "장효선" },
  { nickname: "깨비혜승", realName: "양혜승" },
  { nickname: "사르막스", realName: "이승영" },
  { nickname: "시종일관", realName: "김제효" },
  { nickname: "jimcarry", realName: "장성석" },
  { nickname: "besti", realName: "최현아" },
  { nickname: "고뿔이", realName: "박지훈" },
  { nickname: "상원잭슨", realName: "박상원" },
  { nickname: "이빨교정", realName: "송한식" },
  { nickname: "comhero", realName: "강희국" },
  { nickname: "포세이돈", realName: "최영돈" },
  { nickname: "극단두레", realName: "노진희" },
  { nickname: "망중한", realName: "최선옥" },
  { nickname: "ecology", realName: "이득만" },
  { nickname: "1656", realName: "박지수" },
  { nickname: "몽실95", realName: "이세영" }
];



const PREFERRED_ACTIVE_NICKS = [
  "녹차향기", "mouse14", "soriboy", "raincoat", "소금밭", "enfant",
  "ajeegang", "hakjeon", "낙원", "gonswing", "keis", "mountie",
  "점등인", "아주사", "하늘마음", "경화", "btsmania", "jeejone"
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function extractText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const candidates = [value.response, value.text, value.message, value.content, value.reply, value.result, value.output, value.output_text, value.value];
    for (const item of candidates) {
      const out = extractText(item).trim();
      if (out) return out;
    }
  }
  return "";
}

function cleanText(value, max = 500) {
  return extractText(value)
    .replace(/\[object Object\]/g, "")
    .replace(/[<>]/g, "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function cleanLine(value, max = 80) {
  return cleanText(value, max)
    .replace(/^['"“”‘’`]+|['"“”‘’`]+$/g, "")
    .replace(/^(대사|답변|text|message)\s*[:：]\s*/i, "")
    .trim();
}

function hangulCount(s) { return (String(s || "").match(/[가-힣]/g) || []).length; }
function latinCount(s) { return (String(s || "").match(/[A-Za-z]/g) || []).length; }

function looksBrokenText(text) {
  const t = cleanText(text, 260);
  if (!t) return true;
  if (/\[object Object\]/i.test(t)) return true;
  if (/(GENRE|GENDER|CAPEC|CUREMENT|Programme|Radiation|Cakeour|ttkiz|alto|Waart|Smart call|Auto Resolver|Import Regular|possesses roles|subset R false|Local ICC|Resolver spawns|JSON|function|const|return|undefined|null|네이버|구글|1월|게시판 글 하나|예전 게시판)/i.test(t)) return true;
  if (/[A-Z]{7,}|_[A-Z]{3,}|[A-Za-z]{18,}/.test(t)) return true;
  const h = hangulCount(t);
  const l = latinCount(t);
  if (h < 2) return true;
  if (l > h * 0.8 && l > 8) return true;
  return false;
}

function compact(value) {
  return cleanText(value, 300).replace(/[\s~!?.。！？….,，'"“”‘’()\[\]{}:：;；\-_/\\]/g, "").toLowerCase();
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function profileMap(profiles) { return new Map((profiles || []).map(m => [m.nickname, m.realName || ""])); }

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

function selectActiveProfiles(allProfiles, kksActive) {
  const map = new Map(allProfiles.map(m => [m.nickname, m]));
  const preferred = PREFERRED_ACTIVE_NICKS.map(n => map.get(n)).filter(Boolean);
  const rest = allProfiles.filter(m => m.nickname !== "김광석" && !PREFERRED_ACTIVE_NICKS.includes(m.nickname));
  const selected = [...shuffle(preferred).slice(0, 8), ...shuffle(rest).slice(0, 4)];
  if (kksActive) selected.unshift({ nickname: "김광석", realName: "김광석" });
  return selected;
}

function recentLogFromBody(body) {
  const recent = Array.isArray(body.recentMessages) ? body.recentMessages.slice(-MAX_RECENT) : [];
  return recent
    .map((m) => {
      const speaker = `${cleanText(m.nickname || m.role || "Chat", 20)}${m.realName ? `(${cleanText(m.realName, 16)})` : ""}`;
      const text = cleanText(m.text || "", 120);
      return { speaker, text };
    })
    .filter((m) => m.text && !looksBrokenText(m.text))
    .map((m) => `${m.speaker}: ${m.text}`)
    .join("\n");
}

function inferIntent(userText, kksActive) {
  const u = cleanText(userText, 300);
  const hasKks = /김광석|광석이|광석형|광석이형|광석님/.test(u);
  const greeting = /^(안녕|안녕하세요|하이|반가|처음|첨 뵙|ㅎㅇ|hi)/i.test(u);
  const whatDoing = /뭐해|뭐하세요|뭐 하|다들|계세요|있어요|안 와|안오|오나요|오세요/.test(u);
  const sad = /슬퍼|힘들|우울|헤어졌|속상|외로|눈물|울/.test(u);
  if (hasKks) return kksActive ? "김광석이 접속 중이다. 첫 회원은 김광석에게 넘기지 말고, 사용자의 김광석 관련 말에 짧게 직접 답한다." : "김광석은 아직 접속 중이 아니다. 첫 회원은 '아직 안 오신 것 같다'는 취지로 직접 답한다.";
  if (greeting) return "사용자가 인사했다. 첫 회원은 반드시 인사를 받아주고, 새로 들어온 사람을 맞이한다.";
  if (whatDoing) return "사용자가 방 사람들에게 현재 무엇을 하는지 물었다. 첫 회원은 자신이 지금 방을 보고 있거나 접속해 있었다고 직접 답한다.";
  if (sad) return "사용자가 감정을 털어놓았다. 첫 회원은 짧게 받아주되 상담문처럼 길게 위로하지 않는다.";
  return "첫 회원은 반드시 사용자의 마지막 말에 직접 답한다. 다른 주제로 넘어가지 않는다.";
}

function buildPrompt(body, retryLevel = 0) {
  const userText = cleanText(body.userText || "", MAX_INPUT);
  const userNick = cleanText(body.userNick || "손님", 20);
  const userName = cleanText(body.userName || "", 20);
  const mode = cleanText(body.mode || "chat", 40);
  const close = cleanText(body.close || "known", 40);
  const kksActive = body.kksActive === true;
  const allProfiles = memberProfilesFromBody(body).filter(m => m.nickname !== userNick);
  const activeProfiles = selectActiveProfiles(allProfiles, kksActive);
  const allowedNames = activeProfiles.map(m => m.nickname);
  const profilesText = activeProfiles.map(m => `${m.nickname}|${m.realName || "이름미상"}`).join("\n");
  const recentLog = recentLogFromBody(body) || "정상 대화가 아직 거의 없음";
  const intent = inferIntent(userText, kksActive);

  const bannedTopicRule = /게시판|공연|자료|녹음|소식|구글|네이버|1월/.test(userText)
    ? "사용자가 꺼낸 소재는 이어갈 수 있다."
    : "사용자가 먼저 말하지 않은 게시판, 공연, 자료, 녹음본, 구글, 네이버, 1월 이야기를 절대 꺼내지 않는다.";

  const system = `너는 1995년 PC통신 동호회 "둥근소리" 대화방의 회원 대사를 생성한다.

가장 중요한 규칙:
- 첫 번째 줄은 반드시 사용자의 마지막 말에 직접 답한다.
- 최근 대화보다 사용자의 마지막 입력을 우선한다.
- AI가 자기들끼리 새 주제를 만들지 않는다.
- 출력은 정확히 ${REPLY_COUNT}줄만 쓴다.
- 한 줄 형식은 닉네임|대사 이다. 이름은 쓰지 마라.
- 닉네임은 사용 가능한 목록에서만 고른다.
- 같은 닉네임을 반복하지 않는다.
- 김광석은 접속 중일 때만 쓸 수 있고, 없어도 된다.
- 다른 회원들은 기본적으로 존댓말을 쓴다.
- 1995년 PC통신 느낌으로 짧고 자연스럽게 말한다.
- 설명문, 번호, 따옴표, JSON, 마크다운 금지.
- 영어, 코드, 변수명, 깨진 텍스트 금지.
- 노래 가사나 실제 사적 발언을 지어내지 않는다.
- "천천히 얘기해도 돼요", "편하게 말해요", "더 이야기해 주세요", "오늘도 좋은 하루" 같은 상담형 상투문장 금지.
- ${bannedTopicRule}

사용 가능한 회원:
${profilesText}

사용자 입력 해석:
${intent}

대화 모드: ${mode}
김광석과 사용자 친한 정도: ${close}
이 친한 정도는 김광석과 사용자 사이에만 적용한다. 다른 회원에게 적용하지 마라.
${retryLevel ? "\n재시도다. 형식을 어기지 말고 정상 한국어 2줄만 출력한다." : ""}`;

  const user = `사용자: ${userNick}${userName ? `(${userName})` : ""}
김광석 접속 상태: ${kksActive ? "connected" : "absent"}

최근 정상 대화:
${recentLog}

사용자의 마지막 입력:
${userText}

출력 형식:
닉네임|대사
닉네임|대사

이제 실제 대사 2줄만 출력하라.`;

  return { system, user, allowedNames, profiles: activeProfiles, kksActive };
}

async function runAi(env, prompt, temperature = 0.58, maxTokens = 110) {
  const result = await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ],
    temperature,
    top_p: 0.7,
    max_tokens: maxTokens
  });
  return extractText(result);
}

function parseLineReplies(rawText) {
  const raw = extractText(rawText);
  const lines = raw.split(/\n+/).map(line => line.replace(/^[-*•\d.\s]+/, "").trim()).filter(Boolean);
  const out = [];
  for (const line of lines) {
    const parts = line.split("|").map(x => cleanText(x, 160));
    if (parts.length >= 2) {
      out.push({ nickname: parts[0], text: parts.slice(1).join(" ") });
      continue;
    }
    const m = line.match(/^([가-힣A-Za-z0-9_]+)\s*(?:\([^)]{1,12}\))?\s*[:：]\s*(.+)$/);
    if (m) out.push({ nickname: m[1], text: m[2] });
  }
  return out;
}

function normalizeReplies(items, ctx) {
  const allowed = new Set(ctx.allowedNames || []);
  const pMap = profileMap(ctx.profiles);
  const fallbackNames = ctx.allowedNames.filter(n => n !== "김광석");
  const out = [];
  const seenNick = new Set();
  const seenText = new Set();
  for (const item of items) {
    let nickname = cleanText(item?.nickname || "", 16);
    let text = cleanLine(item?.text || item?.message || item?.content || "", 90);
    if (!nickname || !allowed.has(nickname)) nickname = fallbackNames[out.length % Math.max(1, fallbackNames.length)] || "soriboy";
    if (nickname === "김광석" && ctx.kksActive !== true) continue;
    if (seenNick.has(nickname)) continue;
    text = text.replace(/^.*?\|/, "").trim();
    if (looksBrokenText(text)) continue;
    const key = compact(text);
    if (!key || seenText.has(key)) continue;
    seenNick.add(nickname);
    seenText.add(key);
    out.push({ nickname, realName: pMap.get(nickname) || "", text });
    if (out.length >= REPLY_COUNT) break;
  }
  return out;
}

function parseReplies(rawText, ctx) {
  return normalizeReplies(parseLineReplies(rawText), ctx);
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
      for (let retry = 0; retry < 4 && replies.length < 1; retry++) {
        const prompt = buildPrompt(body, retry);
        raw = await runAi(env, prompt, retry === 0 ? 0.58 : 0.35, retry >= 2 ? 90 : 120);
        replies = parseReplies(raw, prompt);
      }
      return json({
        ok: true,
        replies,
        model: MODEL,
        generatedOnly: true,
        emptyReason: replies.length ? "" : "AI 출력이 형식에 맞지 않아 저장하지 않았습니다.",
        rawPreview: replies.length ? "" : cleanText(raw, 500)
      });
    } catch (err) {
      return json({ ok: false, replies: [], error: String(err?.message || err || "Workers AI 호출 실패") }, 500);
    }
  }
};
