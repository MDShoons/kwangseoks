// 광석이네 통신방 - Cloudflare Workers AI 전용 Worker
// 고정 멘트/무료 자동반응 없음. Workers AI가 만든 문장만 반환한다.
// 필요 바인딩: Workers AI binding 이름 = AI

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_INPUT = 900;
const MAX_RECENT = 10;

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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function extractText(value) {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(extractText).filter(Boolean).join("\n");
  if (typeof value === "object") {
    const candidates = [
      value.response,
      value.text,
      value.message,
      value.content,
      value.reply,
      value.result,
      value.output,
      value.output_text,
      value.value
    ];
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
    .trim()
    .slice(0, max);
}

function hangulCount(s) {
  return (String(s || "").match(/[가-힣]/g) || []).length;
}

function latinCount(s) {
  return (String(s || "").match(/[A-Za-z]/g) || []).length;
}

function compact(value) {
  return cleanText(value, 300)
    .replace(/[\s~!?.。！？….,，'"“”‘’()\[\]{}:：;；\-_/\\]/g, "")
    .toLowerCase();
}

function looksBrokenText(text) {
  const t = cleanText(text, 260);
  if (!t) return true;
  if (/\[object Object\]/i.test(t)) return true;
  if (/(GENRE|GENDER|CAPEC|CUREMENT|Programme|Radiation|Cakeour|ttkiz|alto|Waart|Smart call|Auto Resolver|Import Regular|possesses roles|subset R false|Local ICC|Resolver spawns|JSON|function|const|return|undefined|null)/i.test(t)) return true;
  if (/[A-Z]{7,}|_[A-Z]{3,}|[A-Za-z]{18,}/.test(t)) return true;
  const h = hangulCount(t);
  const l = latinCount(t);
  if (h < 1) return true;
  if (l > h * 0.9 && l > 10) return true;
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

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function uniqueStrings(arr, max = 30) {
  const seen = new Set();
  const out = [];
  for (const item of arr || []) {
    const v = cleanText(item, 160);
    const key = compact(v);
    if (!key || seen.has(key) || looksBrokenText(v)) continue;
    seen.add(key);
    out.push(v);
    if (out.length >= max) break;
  }
  return out;
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
    .map((m) => {
      const speaker = `${cleanText(m.nickname || m.role || "Chat", 20)}${m.realName ? `(${cleanText(m.realName, 16)})` : ""}`;
      const text = cleanText(m.text || "", 160);
      return { speaker, text };
    })
    .filter((m) => m.text && !looksBrokenText(m.text))
    .map((m) => `${m.speaker}: ${m.text}`)
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
  const profileLines = availableProfiles.map((m) => `${m.nickname}|${m.realName || "이름미상"}`).join("\n");
  const avoidTexts = uniqueStrings([
    ...(Array.isArray(body.avoidTexts) ? body.avoidTexts : []),
    ...(Array.isArray(body.recentMessages) ? body.recentMessages.map(m => m.text || "") : [])
  ], 22);
  const avoid = avoidTexts.length ? avoidTexts.map(t => `- ${cleanText(t, 90)}`).join("\n") : "없음";
  const replyCount = triggerType === "kksFirstMessage" ? 3 : 3;

  const kksStatusText = kksActive ? "connected" : "absent";
  const system = `너는 1995년 PC통신 동호회 "둥근소리"의 실시간 대화방을 재현하는 대화 생성 엔진이다.

너의 역할은 사용자의 말에 대해, 실제 둥근소리 회원들이 대화방에서 자연스럽게 반응하는 것처럼 새 대사를 생성하는 것이다.
저장된 고정 멘트나 반복 문장을 쓰지 말고, 매번 현재 대화 흐름에 맞는 새 문장을 만들어야 한다.

[중요 원칙]
1. 사용자는 둥근소리 대화방에 접속한 한 명의 회원이다.
2. 대화는 사용자와 김광석의 1:1 대화가 아니다.
3. 여러 둥근소리 회원들이 함께 있는 공개 대화방이다.
4. 회원들은 사용자에게만 말하지 않고, 서로에게도 반응할 수 있다.
5. 김광석이 접속 중이면 김광석도 가끔 대화에 참여할 수 있다.
6. 김광석이 접속 중이 아니면 김광석의 대사를 절대 생성하지 않는다.
7. 다른 회원들은 기본적으로 존댓말을 쓴다.
8. 다만 1995년 PC통신 분위기처럼 짧고 자연스럽게 말한다.
9. 과하게 현대적인 말투, 이모지, 인터넷 신조어, SNS 말투는 쓰지 않는다.
10. 설명문, 요약문, 해설문처럼 쓰지 말고 실제 채팅 대사처럼 쓴다.
11. 같은 문장, 같은 위로, 같은 반응을 반복하지 않는다.
12. "천천히 얘기해도 돼요", "편하게 말해요", "괜찮아요", "더 이야기해 주세요" 같은 상투적 문장은 피한다.
13. 사용자의 마지막 말에 들어 있는 구체적인 단어, 감정, 질문, 상황을 반영한다.
14. 대화가 짧아도 반드시 다른 회원 2명 이상이 반응하게 한다.
15. 김광석이 접속 중이어도 일반 회원 반응이 먼저 나오고, 김광석은 늦게 짧게 참여할 수 있다.
16. 김광석은 답변 기계처럼 바로 대답하지 않는다. 말수가 많지 않고, 가끔 생각하다가 짧게 말한다.
17. 김광석의 실제 발언이라고 단정하지 않는다.
18. 김광석을 신격화하거나 과장하지 않는다.
19. 노래 가사를 길게 쓰지 않는다.
20. 정치, 혐오, 선정적 대화, 위험한 요청은 자연스럽게 피한다.

[대화 분위기]
- 1995년 PC통신 동호회 대화방
- 둥근소리 회원들이 밤에 접속해 잡담, 공연, 음악, 녹음본, 일상 이야기를 나누는 느낌
- 말투는 짧고 사람 같아야 한다
- 회원마다 조금씩 성격 차이가 있어야 한다
- 모두가 동시에 길게 말하지 않는다
- 한 줄 대화 중심
- 반응은 구체적이어야 한다
- 질문만 반복하지 않는다
- 너무 감성적이거나 시적인 문장만 쓰지 않는다

[김광석 대화 규칙]
김광석이 접속 중일 때만 김광석 대사를 만들 수 있다.
김광석은 닉네임/이름을 다음처럼 사용한다.
김광석|김광석|대사

김광석의 말투:
- 소박하고 짧다
- 장황하게 설명하지 않는다
- 팬들의 말에 즉답하기보다 약간 늦게 끼어드는 느낌
- 농담을 할 수 있지만 과장하지 않는다
- 자기 노래를 분석가처럼 설명하지 않는다
- "나는 김광석입니다" 같은 자기소개를 반복하지 않는다
- 살아 돌아온 사람처럼 연기하지 않는다
- 실제 김광석의 확인되지 않은 사적 발언처럼 말하지 않는다

[일반 회원 말투]
일반 회원들은 서로 존댓말을 기본으로 한다.
다만 PC통신 대화방 특유의 짧은 반응, 농담, 오타 느낌은 약간 허용한다.
너무 현대적인 말투는 금지한다.

[나쁜 출력]
녹차향기|변수진|천천히 이야기해도 괜찮아요.
mouse14|장민석|편하게 말씀해 주세요.
soriboy|김영호|더 이야기해 주세요.
raincoat|이효연|오늘도 좋은 하루 보내세요.

[출력 제한]
- 출력은 반드시 ${replyCount}줄이다.
- 형식은 반드시 닉네임|이름|대사 이다.
- 설명, 번호, 따옴표, JSON, 마크다운을 쓰지 않는다.
- 각 줄은 하나의 대사만 쓴다.
- 같은 닉네임을 한 번의 응답 안에서 반복하지 않는다.
- 대사는 8자 이상 70자 이하로 한다.
- 의미 없는 감탄사만 쓰지 않는다.
- 영어, 코드, 변수명, JSON, function, const, return 같은 텍스트를 쓰지 않는다.
${retryLevel ? "- 재시도다. 이번에는 형식을 반드시 지키고 정상 한국어 대사만 출력한다." : ""}`;

  const user = `[현재 대화 모드]
${mode || "일상 잡담"}

[김광석 접속 상태]
${kksStatusText}
- connected: 김광석 접속 중
- absent: 김광석 없음
- cooldown: 김광석 바빠서 재호출 대기 중

[김광석과 사용자 친한 정도]
${close || "보통"}
※ 이 친한 정도는 김광석과 사용자 사이에만 적용한다.
※ 다른 회원들과 사용자의 친한 정도로 해석하지 마라.

[사용자 정보]
닉네임: ${userNick}
이름: ${userName || ""}

[사용 가능한 둥근소리 회원 목록]
아래 목록에 있는 닉네임과 이름만 사용한다.
김광석은 접속 상태가 connected일 때만 사용한다.

${profileLines}

[최근 대화]
${recentLog}

[반복 금지 문장]
${avoid}

[사용자의 마지막 입력]
${userText}

[생성 지시]
위 대화 흐름을 보고, 둥근소리 회원들이 자연스럽게 이어 말하는 대사를 생성하라.

반드시 지킬 것:
1. 일반 회원 대사 2~4개를 생성한다.
2. 김광석 접속 상태가 connected이면, 필요할 때만 김광석 대사 0~1개를 추가한다.
3. 김광석이 absent 또는 cooldown이면 김광석 대사를 절대 만들지 않는다.
4. 사용자의 말에만 줄줄이 답하지 말고, 회원끼리도 서로 반응하게 한다.
5. 출력은 반드시 아래 형식만 사용한다.
6. 설명, 번호, 따옴표, JSON, 마크다운을 쓰지 않는다.
7. 각 줄은 하나의 대사만 쓴다.
8. 같은 닉네임을 한 번의 응답 안에서 반복하지 않는다.
9. 대사는 8자 이상 70자 이하로 한다.
10. 의미 없는 감탄사만 쓰지 않는다.

[출력 형식]
닉네임|이름|대사
닉네임|이름|대사
닉네임|이름|대사

[출력 예시]
녹차향기|변수진|그 얘기 들으니까 예전 게시판 글 하나 생각나네요.
mouse14|장민석|잠깐만요, 지금 그 자료 어디서 보신 거예요?
raincoat|이효연|저도 듣고 있었는데, 그 부분은 좀 확인해봐야겠네요.

이제 실제 대사만 출력하라.`;

  return { system, user, allowedNames, profiles: availableProfiles, replyCount, avoidTexts, kksActive };
}

async function runAi(env, prompt, temperature = 0.82, maxTokens = 220) {
  const result = await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: prompt.system },
      { role: "user", content: prompt.user }
    ],
    temperature,
    top_p: 0.82,
    max_tokens: maxTokens
  });
  return extractText(result);
}

function parseJsonReplies(rawText) {
  const raw = extractText(rawText);
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return [];
    const parsed = JSON.parse(raw.slice(start, end + 1));
    return Array.isArray(parsed.replies) ? parsed.replies : [];
  } catch (_) {
    return [];
  }
}

function parseLineReplies(rawText) {
  const raw = extractText(rawText);
  const lines = raw
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•\d.\s]+/, "").trim())
    .filter(Boolean);

  const out = [];
  for (const line of lines) {
    const pipeParts = line.split("|").map((x) => cleanText(x, 180));
    if (pipeParts.length >= 3) {
      out.push({ nickname: pipeParts[0], realName: pipeParts[1], text: pipeParts.slice(2).join(" ") });
      continue;
    }

    const colon = line.match(/^([가-힣A-Za-z0-9_]+)\s*(?:\(([^)]{1,12})\))?\s*[:：]\s*(.+)$/);
    if (colon) out.push({ nickname: colon[1], realName: colon[2] || "", text: colon[3] });
  }
  return out;
}

function normalizeReplies(items, ctx) {
  const allowed = new Set(ctx.allowedNames || DEFAULT_MEMBER_PROFILES.map(m => m.nickname));
  const profileMap = new Map((ctx.profiles || DEFAULT_MEMBER_PROFILES).map((m) => [m.nickname, m.realName || ""]));
  const normalNames = [...allowed].filter(n => n !== "김광석");
  const fallbackNames = shuffle(normalNames.length ? normalNames : [...allowed]);
  const avoid = uniqueStrings(ctx.avoidTexts || [], 35);
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
    let text = cleanLine(item?.text ?? item?.message ?? item?.content ?? item, 120);
    text = text.replace(/^\s*[^:：|]{1,20}\s*[:：|]\s*/, "").trim();

    if (looksBrokenText(text)) continue;
    const key = compact(text);
    if (!key || seen.has(key)) continue;
    // 너무 엄격하면 짧은 대화가 모두 사라져서 사용자가 혼자 말하는 문제가 생긴다.
    if (avoid.some(old => similarity(text, old) > 0.86)) continue;

    seen.add(key);
    cleaned.push({ nickname, realName, text: text.slice(0, 120) });
    if (cleaned.length >= (ctx.replyCount || 3)) break;
  }
  return cleaned;
}

function rawKoreanFallbackReplies(rawText, ctx) {
  // 고정 멘트가 아니라 AI 원문에서 한국어 문장을 건져서 회원 발화로 저장한다.
  const raw = extractText(rawText);
  const profileMap = new Map((ctx.profiles || DEFAULT_MEMBER_PROFILES).map((m) => [m.nickname, m.realName || ""]));
  const allowed = (ctx.allowedNames || []).filter(n => n !== "김광석");
  const names = shuffle(allowed.length ? allowed : DEFAULT_MEMBER_PROFILES.map(m => m.nickname));
  const candidates = raw
    .split(/[\n.!?。！？]+/)
    .map(x => cleanLine(x, 70))
    .filter(x => x && !looksBrokenText(x) && hangulCount(x) >= 2)
    .slice(0, 3);
  return candidates.map((text, i) => {
    const nickname = names[i % names.length] || "soriboy";
    return { nickname, realName: profileMap.get(nickname) || "", text };
  });
}

function parseReplies(rawText, ctx) {
  let replies = normalizeReplies([...parseJsonReplies(rawText), ...parseLineReplies(rawText)], ctx);
  if (replies.length < 1) replies = rawKoreanFallbackReplies(rawText, ctx);
  return replies.slice(0, ctx.replyCount || 3);
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
      for (let retry = 0; retry < 5 && replies.length < 1; retry++) {
        const prompt = buildPrompt(body, retry);
        raw = await runAi(env, prompt, retry === 0 ? 0.84 : 0.62, retry >= 2 ? 180 : 240);
        replies = parseReplies(raw, prompt);
      }

      return json({
        ok: true,
        replies,
        model: MODEL,
        generatedOnly: true,
        emptyReason: replies.length ? "" : "AI 출력이 비었거나 깨져서 저장하지 않았습니다.",
        rawPreview: replies.length ? "" : cleanText(raw, 500)
      });
    } catch (err) {
      return json({ ok: false, replies: [], error: String(err?.message || err || "Workers AI 호출 실패") }, 500);
    }
  }
};
