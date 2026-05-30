// 광석이네 통신방 - Cloudflare Workers AI 전용 Worker
// 고정 멘트/무료 자동반응 없음. Workers AI가 만든 문장만 반환한다.
// 필요 바인딩: Workers AI binding 이름 = AI

const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";
const MAX_INPUT = 900;
const MAX_RECENT = 18;

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

const MEMBER_STYLE_HINTS = {
  "김광석": {
    "style": "짧고 소박하게 근황을 말함 · 자판이 서툰 듯 띄어쓰기와 오타가 조금 있음 · 고맙다·미안하다·바쁘다 같은 생활감 있는 표현 · 음악·공연·술·여유 이야기를 담담히 섞음",
    "examples": [
      "아직 서툴어서 길게 답하는게 어렵군요 자판 일일이 보고 치려니 이건",
      "열심히해서 빨라지면 길~~~~게 써드리죠"
    ],
    "postCount": 77
  },
  "녹차향기": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "기다리고 기다리던 광석이아저씨의 방이 생겼네요",
      "4월부터 무진장 기다려왔는데, 이렇게 개설되고 보니 정말 기분이 좋네요"
    ],
    "postCount": 352
  },
  "mouse14": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "단합된 팬클럽이 되겠죠",
      "만들면 나 꼭사야징"
    ],
    "postCount": 349
  },
  "soriboy": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "나의 호기심과 글을 올릴 용기를 자극케한 이 공간에 무한한 경의를 표합니다",
      "여전히 풀벌레소리에 간혹 개짖는 소리도 복날에도 무사하다는 자축인지"
    ],
    "postCount": 311
  },
  "학궁뎅이": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "지금쯤 분명히 제 ID 를 보고 웃으실테지용",
      "~~~ 오홍홍홍~~~ 사실은 저도 제꺼 디따리 웃겨요"
    ],
    "postCount": 80
  },
  "외기러기": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "일주일 동안 기말고사를 보고난 뒤의 허탈감이랄까",
      "일주일 내내 학교 도서관에서"
    ],
    "postCount": 81
  },
  "열린고백": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "오늘은 참 힘든 날이네요 분명히 아닌데",
      "아는데 그아인 자꾸만 나를 힘들게만 하고 누구에게 말을 해야할지 도무지 모르겠 는데"
    ],
    "postCount": 101
  },
  "enfant": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "이곳에 가입하게 되서 무지 기쁨니다",
      "많은 분들과 함께"
    ],
    "postCount": 84
  },
  "강서대묘": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "아 행복했던 순간",
      "잊을수 없을 것같다"
    ],
    "postCount": 27
  },
  "sixs": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "수진님이 자기 밖에 없다고 한탄 하시던데",
      "저두 이제 자주 오려고 해요"
    ],
    "postCount": 140
  },
  "아인타인": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "요기 이렇게 낙서장이 있었네여",
      "쩝 전 또 공개 팬레터에다가 잔뜩 써놨으니 어쩌나"
    ],
    "postCount": 31
  },
  "gonswing": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "안녕 하셔요",
      "우선 죄송해요"
    ],
    "postCount": 313
  },
  "뜨라기": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "가입인사두 못했구",
      "오늘 첨으로 오프에 왔구요"
    ],
    "postCount": 86
  },
  "mcgyver": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "회원가입은 옛날옛날에 했는뎅",
      "글은 이제야 쓰게 되네요"
    ],
    "postCount": 102
  },
  "raincoat": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "첨 뵙겠어요",
      "전 오늘 광석아저씨 공연하고 계시는 학전에"
    ],
    "postCount": 107
  },
  "영원의꿈": {
    "style": "말끝에 점을 이어 여운을 둠 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음 · ^^, -- 같은 PC통신식 표정을 가끔 씀",
    "examples": [
      "안녕하세요 btsmania 였던 박 재 완 입니다",
      "아이디가 바껴서리"
    ],
    "postCount": 25
  },
  "avril": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "가입하고 한참이 지나서야 인사드리는 점 죄송해요",
      "후훗 원래 워낙 게을러서 흠"
    ],
    "postCount": 74
  },
  "아주사": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "얼떨결에 신청을 해서 가긴 가야 하는데",
      "방학 이라서 동생 때문에 몇번 들어와 봤는데"
    ],
    "postCount": 18
  },
  "jeejone": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "오랜 만에 김광석 2집을 들었는데요",
      "솔직히 다시 부르기 보다 더 좋은 걱 갈아요"
    ],
    "postCount": 10
  },
  "btsmania": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "이번에 새로 준회원이 된 박재완 입니다",
      "여긴 경주구요"
    ],
    "postCount": 13
  },
  "keis": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "내가 좋아하는 김광석가수가 공개채팅을 한다고 해서",
      "여기에 들렀다가"
    ],
    "postCount": 23
  },
  "byungari": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음 · 인사·축하·감사 표현이 잦음",
    "examples": [
      "안녕하신지요",
      "전 정대돈이라고 합니다"
    ],
    "postCount": 13
  },
  "점등인": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음 · 친근한 구어체와 장난스러운 호칭을 씀 · 공연·음반·노래 이야기에 잘 반응",
    "examples": [
      "하여 저자의 경고가 있을시 가차 없이 지워 집니다",
      "그래도 좋은 글이니깐 잘 읽어 보세요"
    ],
    "postCount": 10
  },
  "mjs1": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "음 전 노래를 무지사랑하는 목진설이라는 사람입니다",
      "학교에서 통기타치고 노래도 가끔 하는데요"
    ],
    "postCount": 3
  },
  "gksdml": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "이제야 가입인사를 드리게 되는군요",
      "비가 계속 내린다"
    ],
    "postCount": 19
  },
  "작은기억": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "안녕하셔요~~~~ 반갑습니다",
      "가입한지 꽤 되었는데 이제사 인사를 드리네요"
    ],
    "postCount": 29
  },
  "hakjeon": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "절 받으세요",
      "휴~ 오늘은 정말 무지힘든 날 이었 답니다"
    ],
    "postCount": 1
  },
  "넋두리": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "무지 행복했구요",
      "너무 기분좋았어요"
    ],
    "postCount": 9
  },
  "낙원": {
    "style": "말끝에 점을 이어 여운을 둠 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "오늘 노래방서",
      "노래를 좀 해볼까하구"
    ],
    "postCount": 5
  },
  "shim31": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "흐흐흐 이런 행운이~~ 자리가 비다니",
      "고마워요 광석님"
    ],
    "postCount": 4
  },
  "cupite": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "디드어 저도 가입을 했네요",
      "아직 가입결정이 안나서"
    ],
    "postCount": 7
  },
  "경화": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "어느날 갑자기 모습을 보이지 않게된 내 사랑하는 후배",
      "라고 걱정스런 마음이 없는건 아니지만 별일 없겠지라고 어"
    ],
    "postCount": 25
  },
  "소금밭": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "go mysong이란 메세지만 보고, 편지하나 읽고,",
      "그냥 가수마을 갔더니 김광석 앞에 `*'가 있어서 헤맸어요"
    ],
    "postCount": 899
  },
  "hj8454": {
    "style": "흐/헤/훗 같은 웃음소리를 섞음 · 공연·음반·노래 이야기에 잘 반응",
    "examples": [
      "여기에서 만난 여러분들은 무척 행운아들이면서도, 좋을 것 같아 부럽네요",
      "이분들이 김광석 회원에도 가입하시면 좋을텐데, 나우콤에도 조금 가입률이 높아졌나봐요"
    ],
    "postCount": 11
  },
  "ekjw123": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "무슨영문인진 모르겠지만",
      "하여튼 어제왔을때와 다른걸보니"
    ],
    "postCount": 115
  },
  "하늘마음": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "진수와 희애의 사랑이야기",
      ">> [ 진 수 ] [ 희 애 ] 나 그 희애랑 헤어졌어"
    ],
    "postCount": 56
  },
  "w6012923": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음 · 공연·음반·노래 이야기에 잘 반응 · 인사·축하·감사 표현이 잦음",
    "examples": [
      "현재 대학원에 다니고 있구요",
      "음악을 무척 좋아합니다"
    ],
    "postCount": 10
  },
  "almanix": {
    "style": "말끝에 점을 이어 여운을 둠 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "저는 임현진입니다",
      "오늘 남들 분위기도 생각안하고"
    ],
    "postCount": 5
  },
  "김치찌개": {
    "style": "말끝에 점을 이어 여운을 둠 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "오랜만에 집에서 휴일을 즐기고자 빠질수 없는 TV를 보던중",
      "MBC에서 뭐여뜨라"
    ],
    "postCount": 26
  },
  "자아성찰": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "메틀동에서 놀러온 자아성찰입니다",
      "음반들도 모으고 있습니다"
    ],
    "postCount": 5
  },
  "nkotb2": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "안녕핫십니까",
      "광역시 학생 연수입니다"
    ],
    "postCount": 5
  },
  "swk3": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "라디오에 김광것아저씨 나온다",
      "석 밤으로의 초대에 나온다"
    ],
    "postCount": 8
  },
  "그불": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "그속에서 왠지 나도 그러고 싶은 충동을 느끼곤 하구요",
      "얼마먹진 않았지만 나이라는 것이 이럴땐 참 거추장 스럽군요"
    ],
    "postCount": 3
  },
  "jhm10": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "마당세실극장에서부터",
      "벌써 그때가 93년도였으니까 햇수론 2년이네요 그리구 학전이던가요"
    ],
    "postCount": 2
  },
  "rnchunji": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "어제 강원도 깊은 계곡으로 여행을 갔었어요",
      "20대와 30대가 공감할 수 있는 연결점이 느껴졌어요"
    ],
    "postCount": 2
  },
  "chika": {
    "style": "말끝에 점을 이어 여운을 둠 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "드디어 가입 되었구나",
      "여러분들과 함께 하게 되어서 기쁘구요"
    ],
    "postCount": 9
  },
  "michelle": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "제가 알기로는 다시부르기 1집에 '사랑이라는 이유로'가 없는걸로 알고 있거든요",
      "지금 그 앨범을 레코드 점에서 찾아보면 분명히 없는데"
    ],
    "postCount": 2
  },
  "lionsj": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "저는 여치마을의 부천댁~ 이수진이라고 합니다",
      "광석아저씨 물론, 좋아하죠~ (여치보다는 쪼꼼 덜"
    ],
    "postCount": 17
  },
  "네생각": {
    "style": "말끝에 점을 이어 여운을 둠 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "저기 음악을 좋아하는 우진이라고 해요",
      "광석이 형님"
    ],
    "postCount": 7
  },
  "맑고푸른": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "광석이형이 자살하셨데요",
      "집에서 목을매고"
    ],
    "postCount": 1
  },
  "proam": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "그걸로 악보를 그려서 올려줄 사람을 게시판에서 찾아보면 누구 그려줄 사람 없을까요",
      "성재님 큰프입니다"
    ],
    "postCount": 2
  },
  "아킬레스": {
    "style": "말끝에 점을 이어 여운을 둠 · ^^, -- 같은 PC통신식 표정을 가끔 씀",
    "examples": [
      "광주에 사는 언진이라구 합니다",
      "전에 부터 가입을 할려구 했는데 여차 저차 해서"
    ],
    "postCount": 3
  },
  "레몬tea": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "요번에 새로 가입한 김광석 아저씨의 팬입니다",
      "앞으로 자주 뵙기를 바래요"
    ],
    "postCount": 4
  },
  "huge": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "음 가입했어요 음",
      "김광석노래 참좋죠"
    ],
    "postCount": 4
  },
  "lseokgoo": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "저도 어제 대화방에 가보았죠",
      "가장 큰 이유는 광석이형과 얘기 해 보기 위해서죠"
    ],
    "postCount": 7
  },
  "daffodil": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "어제 가입신청 했었는데",
      "이렇게 빨리 연락이 올줄이야"
    ],
    "postCount": 5
  },
  "한글날": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "가입인사 부터 했어야 했는데",
      "한글날 신소희고요"
    ],
    "postCount": 5
  },
  "sawa92": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "이제 막 가입허가를 받은 부산의 설 재훈이라고 합니다",
      "그럼 앞으로 자주 뵙길 빌며 이만 줄입니다"
    ],
    "postCount": 3
  },
  "mecander": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "근데 입금 확인이 금요일날 이라나",
      "글구 나두 이젠 정회원이다"
    ],
    "postCount": 3
  },
  "화랑소년": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "김광석 아저씨에요~~",
      "아저씨 싸인해줘요~~ 헤헤 안녕히계세요"
    ],
    "postCount": 2
  },
  "주환이": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "이 모임이요,,정회원 되려면 우찌 해야 하남요",
      "녹차향기님 좀 갈쳐주셔요,,,네"
    ],
    "postCount": 3
  },
  "lovetony": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "대문이 너무 이뻤어요~~ 감동적이었음~~ 음악과 함께하는 세상에",
      "무서운 피코,, 다시는 피코를 안쓰겠닷"
    ],
    "postCount": 3
  },
  "이끄는이": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "안녕하시니까",
      "저 부산에서 인사드립니다"
    ],
    "postCount": 1
  },
  "sensi": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "그대를 생각하는 것 만으로",
      "그대를 바라볼 수 있는 것 만으로도"
    ],
    "postCount": 2
  },
  "ych2": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "언니가 잘못한게 아닌데",
      "전화는 일찍 끊었는데, 접속이 잘 안됐어요"
    ],
    "postCount": 2
  },
  "mahakama": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "김용배 입니다",
      "효연이랑 같이 학전에서 가입 하게 되었는데"
    ],
    "postCount": 19
  },
  "몬스키": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "온라인 상으로 쓰는거라",
      "손이~~ 덜덜~~ 히~~ 글두"
    ],
    "postCount": 3
  },
  "zet3": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "저는 김광석씨의 얼굴말고 노래를 좋아하는 패에엔 입니다",
      "서울 있을땐 콘서트두 많이 가구 했는데"
    ],
    "postCount": 1
  },
  "ok0606": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "김광석님의 음악을 무척 좋아하는 팬입니다",
      "문제는 급작스런 일로 정신없이 지내다보니 은행에 갈시간을 놓쳤어요"
    ],
    "postCount": 2
  },
  "iam75": {
    "style": "느낌표로 반가움이나 놀람을 크게 표현 · 흐/헤/훗 같은 웃음소리를 섞음 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "아녕하요~~~ 음~ 다시~ 바루 해야징~ 히히 ` 안녕하세요~~",
      "아구~ 허리야~"
    ],
    "postCount": 2
  },
  "야구도사": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "안녕하십니까",
      "를 요즘 연습하고 있는데요"
    ],
    "postCount": 1
  },
  "아모로스": {
    "style": "느낌표로 반가움이나 놀람을 크게 표현 · 흐/헤/훗 같은 웃음소리를 섞음 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "밖에는 변함없이 비가오네요",
      "벌써 장마가"
    ],
    "postCount": 3
  },
  "rpg3": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "8월 16일 2회 공연을 보았지요",
      "처음 광석님의 노래를 접 한 것이 학교 앞 어느 주점에선가 '꽃' 이란 노래였어요"
    ],
    "postCount": 2
  },
  "tajang": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음 · 인사·축하·감사 표현이 잦음",
    "examples": [
      "정말 오랜만에 느껴본 감동의 무대였다",
      "지금 내가 생활하고 있는 곳은 우리과의 학회실이다"
    ],
    "postCount": 7
  },
  "elohim77": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "좀 처럼 시간이 나질 안아 활동을 할 겨를이 없었네요",
      "오늘 변수진(녹차향기)님의 메일(q^_^p)을 받자 마자 왔는데"
    ],
    "postCount": 3
  },
  "바보나라": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현",
    "examples": [
      "안녕하셔요 전 바보나라 왕자",
      "그런데 이 낙서장에 한가지 [건의] 할 사항 이 있습니다"
    ],
    "postCount": 2
  },
  "kroi": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "저두 수진님 의견에 동의하구요",
      "영근님 의견에두 동의해요"
    ],
    "postCount": 3
  },
  "a245": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "많이 참여하는곳이 됐으면 해요",
      "오늘이 김광석님과 대화하는 날이군요"
    ],
    "postCount": 4
  },
  "kfardor": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "방금 가입신청하고 온 태호라고합니다",
      "형에 노래 너무 좋습니다"
    ],
    "postCount": 1
  },
  "이율배반": {
    "style": "말끝에 점을 이어 여운을 둠 · 공연·음반·노래 이야기에 잘 반응",
    "examples": [
      "노래도 많이 불러 주시고 재미있고 알찼었는데요",
      "근디 한가지 아쉬웠던 점은 사람이 그리 많았는데도 불구하고 분위기가 안 뜨데 요"
    ],
    "postCount": 2
  },
  "sky1130": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      ")라도 해드리는 방향으로 하죠뭐 연락주시면 (SKY1130)도와드리 겠습니다",
      "송기용입니다"
    ],
    "postCount": 2
  },
  "ose53": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "퀮나녕하세요",
      "요즘 들어 댄스,레이브,하우스,힙합,랩에 너무 찌들어"
    ],
    "postCount": 1
  },
  "chirisan": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "이미 가입한지는 일주일이 넘은것 같은데",
      ") 또한 광석님의 노래철학 변치 않기를 빕니다"
    ],
    "postCount": 2
  },
  "비바9": {
    "style": "말끝에 점을 이어 여운을 둠 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "안냐세요,광석이 아찌",
      "저 상혁이예요,일명 수현이 누나 동생으로 광석 아찌에겐 잘 알려졌죠"
    ],
    "postCount": 2
  },
  "사과쥬스": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "광석이 형의 열열한 팬입니다",
      "저번에 쪼인트 콘서트 못간것이 지금도 한이 되지만서도"
    ],
    "postCount": 1
  },
  "환경사랑": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "공개 채팅의 인원이 확정되서 그냥 구경이나 할려구 들렸다가",
      "갑자기 삑하는 소리와 함께"
    ],
    "postCount": 2
  },
  "w6024140": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "저는 홍대 건축공학과 3학년에 재학중인 류정식 이라고 합니다",
      "개인아이디가 없어 친구가 한글 3"
    ],
    "postCount": 1
  },
  "popboy": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "봉천동『둘리』 입니다",
      "노래 첨 들은게"
    ],
    "postCount": 1
  },
  "colusvi": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "저는 김광석씨와 동물원을 아주 좋아합니다",
      "전 지금 실험실의 선배에게 id를 빌려 쓰고 있거든요"
    ],
    "postCount": 1
  },
  "moguly": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "어제가 1000번 째 공연 이시라",
      "듀 뒷 풀이로 한잔"
    ],
    "postCount": 1
  },
  "built": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "안녕하십니까",
      "이글을 읽는 모든이에게 행복과 사랑과 평화를"
    ],
    "postCount": 1
  },
  "butfor": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "생일 선물로 김광석님의 다시부르기II를 받았어요",
      "옛날 중학교때 동물원을 참 좋아했었는데"
    ],
    "postCount": 1
  },
  "조은인상": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "어제 첨 가입을 했걸랑요",
      "오늘보니 띠~~용"
    ],
    "postCount": 2
  },
  "사랑예감": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "날씨가 정말로 덥군요",
      "오늘은 광복 50주년 되는 아주 뜻깊은 날이죠"
    ],
    "postCount": 7
  },
  "park71": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "나두 받아야하나",
      "개인적으로 시간이 많지 않아서"
    ],
    "postCount": 2
  },
  "steven": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "만약 된다면 이게 그 예약이 되었으면 좋겠구요 돈은 공지사항에 있는 구좌로 넣겠습니다",
      "만약 이제 안된다면 어디서 예약이 가능하며 지금도 예약좌석이 남았는지 궁금합니다"
    ],
    "postCount": 1
  },
  "lebleu": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "어제가 오프였군요",
      "이번 오프는 꼭 가구 싶었었는데"
    ],
    "postCount": 5
  },
  "76jeho": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "안녕하세요 저는진주 경상대에 다니는 1학년 정 제 호 라고 합니다",
      "그냥 일어나 노래가 좋ㅇ나서 가입하게 되었어요"
    ],
    "postCount": 2
  },
  "canni": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "지금 막 새로 가입을 했걸랑요",
      "축하해 주세요"
    ],
    "postCount": 5
  },
  "pendia": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "여러분은 이 많은 사람들에게 인정을 못 받거나",
      "자기의 말을 인정해 주지 않은 적이 많이 나요"
    ],
    "postCount": 2
  },
  "metalbar": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "저는 metalbar입니다",
      "오늘 처음글을쓰게 되는 군요"
    ],
    "postCount": 1
  },
  "epigram": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "혹 김광석 씨가 부르신게 아닌가 해서요"
    ],
    "postCount": 1
  },
  "blubosco": {
    "style": "말끝에 점을 이어 여운을 둠 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "오늘 김광석님의 콘서트를 보았답니다 정말 기분이 좋더군요 작은 소극장에서 하는 콘서트",
      "아늑하고 편안한 분위기 그리고 하모니카"
    ],
    "postCount": 3
  },
  "giraffe7": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "안녕하세요, 이런 모임이 읍駭募",
      ", 참 반갑군요"
    ],
    "postCount": 1
  },
  "opt7": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "김광석 콘서트에 가고 싶은데",
      "8월에도 예매가 가능한가요"
    ],
    "postCount": 1
  },
  "kyhpia": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "전 음악동아리 활동을 열심히하는 학생인데요",
      "악보좀 구하려 하는데 힘들어서요"
    ],
    "postCount": 1
  },
  "ncnd": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [],
    "postCount": 1
  },
  "w9011769": {
    "style": "느낌표로 반가움이나 놀람을 크게 표현 · 짧고 담백한 존댓말 반응",
    "examples": [
      "증산도인(甑山道人) 삼풍백화점 매몰현장에서 기(氣) 진단으로 박승현양 구조하다",
      "## 천리안,하이텔,나우누리 증산도 동아리 \"go jsd\"하시면 됩니다"
    ],
    "postCount": 1
  },
  "satware": {
    "style": "말끝에 점을 이어 여운을 둠 · ^^, -- 같은 PC통신식 표정을 가끔 씀",
    "examples": [
      "^^; 이제 막 모임이 끝났네요",
      "아직도 광석이 형이랑 사람들이 남아서 이런저런 이야기도 하면서 어수선("
    ],
    "postCount": 2
  },
  "ajeegang": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "오늘 공연을 보구 왔거든요",
      "아니 정확히 말하면 어제 저녁이네요"
    ],
    "postCount": 63
  },
  "슈퍼토끼": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "매번 간다고 하다가 경제적 이유로 못간 빛돌이 엉아의 콘써트에 갔다",
      "오랜만에 나간 대학로로 새로웠고 일년만에 가는 콘서트라 무척 맘이 설레었다"
    ],
    "postCount": 1
  },
  "홍정훈": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "기억하는 것만으로도",
      "대충 이런가사가 나오는것 같던데"
    ],
    "postCount": 1
  },
  "channel1": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "이렇게 온라인상으로 뵐수 있을줄은 몰랐습니다",
      "근데 질문이 있어요"
    ],
    "postCount": 1
  },
  "skywatch": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "skywatch 성호입니다",
      "전 지금 입시를 준비하는 학생이구요, 김광석아저씨를 무지 좋아하지여"
    ],
    "postCount": 2
  },
  "킹카95": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "광석이 형을 너무 좋아하는 잘나가는 95학번 효선입니다",
      "광석이형 노래 너무 좋구요"
    ],
    "postCount": 1
  },
  "깨비혜승": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "가입인사 여기에 하는거 맞아여",
      "소개를 간단히 하자믄여"
    ],
    "postCount": 1
  },
  "사르막스": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "공연을 재미있게 보았습니다 제 여자친구가 김광석씨의 대단한 팬입니다"
    ],
    "postCount": 1
  },
  "시종일관": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [],
    "postCount": 1
  },
  "jimcarry": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "저는 별명이 `겸손맨입니다\" 만이사람해주세요",
      "많이사랑해주세요"
    ],
    "postCount": 1
  },
  "besti": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "환상적이였어요 녹차향기님은 춘천에 잘 갔다왔는지 궁금하네요 은경이는 왜 전화 안해주니",
      "광석이 아저씨 정말 어제 정팅 재미있었어요 2시까지 계실줄 알았으면 더 있을걸"
    ],
    "postCount": 23
  },
  "고뿔이": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "1000회를 볼까 하다가 너무 꽉찬 것이 싫어서 1회 부 족한 999회 를 보았다",
      "너무 행복한 이 기분"
    ],
    "postCount": 1
  },
  "상원잭슨": {
    "style": "말끝에 점을 이어 여운을 둠 · ^^, -- 같은 PC통신식 표정을 가끔 씀 · 공연·음반·노래 이야기에 잘 반응",
    "examples": [
      "이 아이디는 제 아이디는 아니고요",
      "가입도 못하네요"
    ],
    "postCount": 2
  },
  "이빨교정": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "안녕하시와여~",
      "(따블공간으로 써야징"
    ],
    "postCount": 2
  },
  "comhero": {
    "style": "말끝에 점을 이어 여운을 둠 · 친근한 구어체와 장난스러운 호칭을 씀",
    "examples": [
      "이등병의 편지\"처럼 친구들이 휴가를 왔습니다",
      "5만원 남은 돈을 아낄려고 졸업여행도 포기한 저에게 친구들은"
    ],
    "postCount": 2
  },
  "포세이돈": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "간단한 약도좀 부탁드립니다"
    ],
    "postCount": 1
  },
  "극단두레": {
    "style": "짧고 담백한 존댓말 반응",
    "examples": [
      "극단두레라고 부천에서 소극장을 운영하고 있는 연극단체입니다",
      "김광석님을 저희배우들도 굉장히 좋아 하고있지요"
    ],
    "postCount": 1
  },
  "망중한": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "제 친구 은주가요",
      "제 친구 은주는요"
    ],
    "postCount": 1
  },
  "ecology": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현",
    "examples": [
      "헤헤~ 가입이 되어 부렸네여",
      "최신 노래 몇곡 때리구"
    ],
    "postCount": 1
  },
  "1656": {
    "style": "말끝에 점을 이어 여운을 둠 · 짧고 담백한 존댓말 반응",
    "examples": [
      "정말 재미있는 콘서트",
      "김광석씨의 농담은 그 중에서도 백미 물론 노래는 말할 것도 없지만"
    ],
    "postCount": 1
  },
  "몽실95": {
    "style": "말끝에 점을 이어 여운을 둠 · 느낌표로 반가움이나 놀람을 크게 표현 · 질문으로 받아치며 대화에 끼어듦 · 흐/헤/훗 같은 웃음소리를 섞음",
    "examples": [
      "진심으로 축하 드립니다",
      "해 열심히 노력하고자 합니다"
    ],
    "postCount": 15
  }
};

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

function styleHintFor(nickname) {
  // 업로드된 게시글은 "대사 내용"이 아니라 말투 힌트로만 쓴다.
  // 실제 문장 예시는 프롬프트에 넣지 않는다. 예시까지 넣으면 AI가 "예전 게시글", "제가 올린 글" 같은 소재를 반복하기 쉽다.
  const item = MEMBER_STYLE_HINTS[nickname];
  if (!item) return "짧고 담백한 존댓말. 상대 말을 먼저 받고 한 줄로 반응.";
  return String(item.style || "짧고 담백한 존댓말. 상대 말을 먼저 받고 한 줄로 반응.")
    .replace(/게시글|게시판|공연 소식|자료/g, "")
    .slice(0, 120);
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
    profiles.push({ nickname, realName, styleHint: styleHintFor(nickname) });
  }
  return profiles.length ? profiles : DEFAULT_MEMBER_PROFILES.map((m) => ({ ...m, styleHint: styleHintFor(m.nickname) }));
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
  const shuffledNormal = shuffle(normalProfiles).slice(0, 10);
  const kksProfile = profiles.find((m) => m.nickname === "김광석");
  const availableProfiles = kksProfile ? [kksProfile, ...shuffledNormal] : shuffledNormal;
  const allowedNames = availableProfiles.map((m) => m.nickname);
  const profileLines = availableProfiles.map((m) => `${m.nickname}|${m.realName || "이름미상"}|${m.styleHint || styleHintFor(m.nickname)}`).join("\n");
  const avoidTexts = uniqueStrings([
    ...(Array.isArray(body.avoidTexts) ? body.avoidTexts : []),
    ...(Array.isArray(body.recentMessages) ? body.recentMessages.map(m => m.text || "") : [])
  ], 22);
  const avoid = avoidTexts.length ? avoidTexts.map(t => `- ${cleanText(t, 90)}`).join("\n") : "없음";
  const replyCount = triggerType === "kksFirstMessage" ? 2 : 2;
  const isGreetingOrIdle = /(안녕|하이|반갑|뭐해|뭐하세요|뭐하세|다들|오오|ㅎㅎ|ㅋㅋ|;;|ㅜㅜ|아아|여기)/.test(userText);
  const userMentionsTopic = /(게시판|공연|자료|글|소식|녹음|노래|음악|앨범|라디오|테이프|광석)/.test(userText);
  const sceneGuard = isGreetingOrIdle
    ? "- 이번 입력은 인사/잡담/상태 확인이다. 접속 인사, 지금 뭐하는지, 반가움, 장난 섞인 짧은 반응만 한다. 게시판·공연·자료·예전 글 이야기를 꺼내지 않는다."
    : "- 사용자의 마지막 입력에 직접 연결되는 말만 한다.";
  const topicGuard = userMentionsTopic
    ? "- 사용자가 꺼낸 소재 안에서만 이어간다."
    : "- 사용자가 먼저 말하지 않은 게시판, 공연, 자료, 글, 소식, 녹음, 노래 소재를 새로 꺼내지 않는다.";

  const kksStatusText = kksActive ? "connected" : "absent";
  const system = `너는 1995년 PC통신 동호회 "둥근소리"의 실시간 대화방을 재현하는 대화 생성 엔진이다.

너의 역할은 사용자의 마지막 입력에 대해, 실제 둥근소리 회원들이 대화방에서 자연스럽게 반응하는 것처럼 새 대사를 생성하는 것이다.
저장된 고정 멘트나 반복 문장을 쓰지 말고, 매번 현재 대화 흐름에 맞는 새 문장을 만들어야 한다.
가장 중요한 규칙: 첫 번째 대사는 반드시 사용자의 마지막 입력에 직접 대답해야 한다. 사용자가 인사하면 인사를 받고, 사용자가 "다들 뭐하세요"라고 하면 지금 방 사람들이 무엇을 하고 있었는지 답하고, 사용자가 물으면 그 질문에 답한다. 사용자 말을 무시하고 회원끼리만 다른 이야기로 넘어가면 실패다.

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
14. 대화가 짧으면 일반 회원 1~2명만 짧게 반응하게 한다.
15. 김광석이 접속 중이어도 일반 회원 반응이 먼저 나오고, 김광석은 늦게 짧게 참여할 수 있다.
16. 김광석은 답변 기계처럼 바로 대답하지 않는다. 말수가 많지 않고, 가끔 생각하다가 짧게 말한다.
17. 김광석의 실제 발언이라고 단정하지 않는다.
18. 김광석을 신격화하거나 과장하지 않는다.
19. 노래 가사를 길게 쓰지 않는다.
20. 정치, 혐오, 선정적 대화, 위험한 요청은 자연스럽게 피한다.

[대화 분위기]
- 1995년 PC통신 동호회 대화방
- 접속한 사람들이 짧게 안부를 묻고 농담하고, 서로의 말에 반응하는 느낌
- 사용자가 먼저 꺼내지 않은 소재를 AI가 억지로 만들지 않는다
- 말투는 짧고 사람 같아야 한다
- 회원별 게시글 자료는 문장 호흡 참고용일 뿐, 내용 소재로 쓰지 않는다
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
회원별 말투 참고가 있으면 그것을 우선한다. 예시 문장을 그대로 복사하지 말고, 말끝 처리·웃음소리·질문 방식·감정 표현 방식만 반영한다.
너무 현대적인 말투는 금지한다.

[나쁜 출력]
녹차향기|변수진|천천히 이야기해도 괜찮아요.
mouse14|장민석|편하게 말씀해 주세요.
soriboy|김영호|더 이야기해 주세요.
raincoat|이효연|오늘도 좋은 하루 보내세요.
gonswing|신성철|음악 게시판의 그 공연 소식인지요?
hakjeon|최만석|제가 올린 글이 기억나세요?

[출력 제한]
- 출력은 반드시 ${replyCount}줄이다. 일반 회원은 1~2명만 말한다. 한 번에 여러 줄을 쏟아내지 않는다.
- 첫 번째 줄은 반드시 사용자의 마지막 입력에 대한 직접 답변이다.
- 두 번째 줄은 첫 번째 회원의 말이나 사용자 말에 이어지는 짧은 반응이다.
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

[사용 가능한 둥근소리 회원 목록과 말투 참고]
아래 목록에 있는 닉네임과 이름만 사용한다.
세 번째 칸은 말투 참고다. 말투만 참고하고, 그 사람이 예전에 쓴 게시글 내용이나 소재를 현재 대화에 끌고 오지 마라.
김광석은 접속 상태가 connected일 때만 사용한다.

${profileLines}

[최근 대화]
${recentLog}

[반복 금지 문장]
${avoid}

[사용자의 마지막 입력]
${userText}

[이번 입력 처리 규칙]
${sceneGuard}
${topicGuard}

[생성 지시]
위 대화 흐름을 보고, 둥근소리 회원들이 자연스럽게 이어 말하는 대사를 생성하라.
단, 이번 응답의 첫 줄은 반드시 사용자 ${userNick}(${userName || userNick})의 마지막 말에 직접 반응해야 한다. 질문이면 답하고, 인사면 인사를 받고, 농담이면 웃거나 받아친다.

반드시 지킬 것:
1. 일반 회원 대사 1~2개만 생성한다. 너무 많이 말하지 않는다. 짧은 인사에는 짧은 인사로만 반응한다.
1-1. 첫 번째 대사는 반드시 사용자의 마지막 말에 대한 직접 답변이어야 한다. 회원끼리만 대화하거나 새로운 주제로 도망가지 마라.
2. 김광석 접속 상태가 connected이면, 필요할 때만 김광석 대사 0~1개를 추가한다. 김광석은 드물게만 말한다.
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

[입력별 반응 예시]
사용자: 안녕하세요
mouse14|장민석|안녕하세요. 지금 막 들어오신 거죠?
녹차향기|변수진|반갑습니다. 방금까지 조용했어요.

사용자: 다들 뭐하세요?
raincoat|이효연|저는 그냥 방 보고 있었어요. 다들 조용하시네요.
soriboy|김영호|저도 접속만 해놓고 있다가 이제 봤습니다.

사용자: ㅋㅋㅋㅋ
ajeegang|김승민|뭐가 그렇게 웃기셨어요. 저도 좀 압시다.
mouse14|장민석|방금 분위기 보고 웃으신 거죠?

[출력 예시]
mouse14|장민석|오셨네요. 오늘은 좀 조용했어요.
녹차향기|변수진|안녕하세요. 방금 막 들어오셨나봐요.

이제 실제 대사만 출력하라.`;

  return { system, user, allowedNames, profiles: availableProfiles, replyCount, avoidTexts, kksActive, userMentionsTopic };
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
  const usedNick = new Set();
  let kksLineUsed = false;

  for (const item of items) {
    let nickname = cleanText(item?.nickname || "", 16);
    if (nickname === "김광석" && ctx.kksActive !== true) continue;
    if (nickname === "김광석" && kksLineUsed) continue;
    if (!allowed.has(nickname)) nickname = fallbackNames[cleaned.length % Math.max(1, fallbackNames.length)] || "soriboy";
    // 같은 응답 안에서 같은 닉네임 반복 금지. 이름은 AI가 만든 값을 믿지 않고 고정 회원표에서만 매칭한다.
    if (usedNick.has(nickname)) {
      nickname = fallbackNames.find(n => !usedNick.has(n)) || nickname;
    }
    if (usedNick.has(nickname)) continue;
    if (nickname === "김광석") kksLineUsed = true;

    const realName = cleanText(profileMap.get(nickname) || "", 16);
    let text = cleanLine(item?.text ?? item?.message ?? item?.content ?? item, 120);
    text = text.replace(/^\s*[^:：|]{1,20}\s*[:：|]\s*/, "").trim();

    if (looksBrokenText(text)) continue;
    if (!ctx.userMentionsTopic && /(게시판|공연|자료|제가 올린 글|예전 글|소식|녹음본)/.test(text)) continue;
    const key = compact(text);
    if (!key || seen.has(key)) continue;
    // 너무 엄격하면 짧은 대화가 모두 사라져서 사용자가 혼자 말하는 문제가 생긴다.
    if (avoid.some(old => similarity(text, old) > 0.86)) continue;

    seen.add(key);
    usedNick.add(nickname);
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
    .slice(0, ctx.replyCount || 2);
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
