
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
  const STORAGE_KEY = "ks_home_record_daily_v2";

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

  function positionRecord() {
    const hero = document.getElementById("homeHero");
    const stage = document.getElementById("homeRecordStage");
    if (!hero || !stage) return;

    const rect = hero.getBoundingClientRect();
    const heroHeight = rect.height || hero.offsetHeight || 0;
    if (!heroHeight) return;

    const size = Math.max(180, Math.round(heroHeight - 19));
    const left = Math.round(-size / 2);
    const behindX = Math.round(size / 2);

    stage.style.setProperty("--record-size", size + "px");
    stage.style.setProperty("--record-left", left + "px");
    stage.style.setProperty("--record-behind-x", behindX + "px");

    stage.style.width = size + "px";
    stage.style.height = size + "px";
    stage.style.top = "9.5px";
    stage.style.left = left + "px";
  }

  function showRecord(stage) {
    if (!isHomeActive()) return;
    positionRecord();
    stage.classList.remove("is-hidden");
    stage.classList.add("is-entering");
    setTimeout(() => stage.classList.add("is-visible"), 30);
    setTimeout(() => stage.classList.add("is-spinning"), 1000);
  }

  function hideRecord(stage) {
    stage.classList.remove("is-entering", "is-visible", "is-spinning");
    stage.classList.add("is-hidden");
  }

  function initRecord() {
    const stage = document.getElementById("homeRecordStage");
    const img = document.getElementById("homeRecordDisc");
    if (!stage || !img || !RECORD_IMAGES.length) return;

    const daily = pickDailyRecord();
    img.src = daily.src;

    positionRecord();
    window.addEventListener("resize", positionRecord);

    // 새로고침하면 다시 2초 뒤 등장
    setTimeout(() => showRecord(stage), 2000);

    stage.addEventListener("click", function () {
      hideRecord(stage);
    });

    function scheduleMidnightReset() {
      const now = new Date();
      const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const y = kstNow.getUTCFullYear();
      const m = kstNow.getUTCMonth();
      const d = kstNow.getUTCDate();
      const nextKstMidnightUtc = Date.UTC(y, m, d + 1, 0, 0, 0) - 9 * 60 * 60 * 1000;
      const delay = Math.max(1000, nextKstMidnightUtc - now.getTime());

      setTimeout(() => {
        hideRecord(stage);
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (e) {}
        const nextDaily = pickDailyRecord();
        img.src = nextDaily.src;
        setTimeout(() => showRecord(stage), 3000);
        scheduleMidnightReset();
      }, delay);
    }

    scheduleMidnightReset();

    window.addEventListener("hashchange", function () {
      if (!isHomeActive()) return;
      positionRecord();
      if (!stage.classList.contains("is-visible") && !stage.classList.contains("is-entering")) {
        setTimeout(() => showRecord(stage), 700);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRecord);
  } else {
    initRecord();
  }
})();
