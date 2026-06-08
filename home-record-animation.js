
(function () {
  "use strict";

  const RECORD_IMAGES = [
  'images/record-animation/record-1.png',
  'images/record-animation/record-2.png',
  'images/record-animation/record-3.png',
  'images/record-animation/record-4.png',
  'images/record-animation/record-5.png',
  'images/record-animation/record-6.png'
];

  const STORAGE_KEY = "ks_home_record_daily_v1";
  const DISMISSED_KEY = "ks_home_record_dismissed_session_v1";

  function kstDateKey(date = new Date()) {
    const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().slice(0, 10);
  }

  function pickDailyRecord() {
    const day = kstDateKey();
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    } catch (e) {
      saved = null;
    }

    if (saved && saved.day === day && Number.isInteger(saved.index) && RECORD_IMAGES[saved.index]) {
      return { day, index: saved.index, src: RECORD_IMAGES[saved.index] };
    }

    const seed = day.split("-").join("");
    let n = 0;
    for (let i = 0; i < seed.length; i += 1) {
      n = (n * 31 + seed.charCodeAt(i)) >>> 0;
    }
    const index = n % RECORD_IMAGES.length;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ day, index }));
    } catch (e) {}

    return { day, index, src: RECORD_IMAGES[index] };
  }

  function isHomeActive() {
    const home = document.getElementById("home");
    return !!home && home.classList.contains("active");
  }

  function initRecord() {
    const stage = document.getElementById("homeRecordStage");
    const img = document.getElementById("homeRecordDisc");
    if (!stage || !img || !RECORD_IMAGES.length) return;

    const daily = pickDailyRecord();
    img.src = daily.src;


    const show = () => {
      if (!isHomeActive()) return;
      stage.classList.remove("is-hidden");
      stage.classList.add("is-entering");
      setTimeout(() => {
        stage.classList.add("is-visible");
      }, 30);
      setTimeout(() => {
        stage.classList.add("is-spinning");
      }, 1000);
    };

    // 사이트 첫 진입 후 2초 뒤, hero 사진 뒤에서 왼쪽으로 나오는 느낌
    setTimeout(show, 2000);

    stage.addEventListener("click", function () {
      stage.classList.remove("is-entering", "is-visible", "is-spinning");
      stage.classList.add("is-hidden");
    });

    // 00:00(KST) 지나면 오른쪽으로 들어갔다가 3초 뒤 새 오늘 음반으로 다시 등장
    function scheduleMidnightReset() {
      const now = new Date();
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const y = kstNow.getUTCFullYear();
      const m = kstNow.getUTCMonth();
      const d = kstNow.getUTCDate();
      const nextKstMidnightUtc = Date.UTC(y, m, d + 1, 0, 0, 0) - 9 * 60 * 60 * 1000;
      const delay = Math.max(1000, nextKstMidnightUtc - now.getTime());

      setTimeout(() => {
        stage.classList.remove("is-entering", "is-visible", "is-spinning");
        stage.classList.add("is-hidden");

        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}

        const nextDaily = pickDailyRecord();
        img.src = nextDaily.src;

        setTimeout(() => {
          stage.classList.remove("is-hidden");
          stage.classList.add("is-entering");
          setTimeout(() => stage.classList.add("is-visible"), 30);
          setTimeout(() => stage.classList.add("is-spinning"), 1000);
        }, 3000);

        scheduleMidnightReset();
      }, delay);
    }

    scheduleMidnightReset();

    // 해시/페이지 이동 후 홈에 돌아왔을 때 숨긴 상태가 아니면 다시 보이도록 보정
    window.addEventListener("hashchange", function () {
      if (!isHomeActive()) return;
      const current = pickDailyRecord();
      if (!stage.classList.contains("is-visible") && !stage.classList.contains("is-entering")) {
        setTimeout(show, 700);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRecord);
  } else {
    initRecord();
  }
})();
