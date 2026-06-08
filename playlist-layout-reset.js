
(function () {
  "use strict";

  function qs(id) {
    return document.getElementById(id);
  }

  function clearInlineLayout() {
    const ids = [
      "userPlaylistPlayer",
      "playlistPlayerCover",
      "playlistPlayerTitle",
      "playlistPlayerSub",
      "playlistPlayerPrevBtn",
      "playlistPlayerPlayBtn",
      "playlistPlayerNextBtn",
      "playlistPlayerCurrent",
      "playlistPlayerDuration",
      "playlistPlayerProgress",
      "playlistPlayerMuteBtn",
      "playlistPlayerVolume",
      "playlistPlayerRemoveBtn",
      "playlistPlayerListBtn",
      "playlistQueuePanel"
    ];

    ids.forEach((id) => {
      const el = qs(id);
      if (!el) return;
      [
        "left","right","top","bottom","width","height","minWidth","maxWidth","minHeight","maxHeight",
        "margin","marginTop","padding","transform","position","display","fontSize","lineHeight",
        "zIndex","gridArea","gridColumn","gridRow"
      ].forEach((prop) => {
        try { el.style.removeProperty(prop.replace(/[A-Z]/g, m => "-" + m.toLowerCase())); } catch (e) {}
      });
    });

    const volumeRow = document.querySelector("#userPlaylistPlayer .playlist-volume-row");
    if (volumeRow) {
      [
        "width","max-width","min-width","height","max-height","min-height","margin","margin-top",
        "padding","display","align-items","gap","position","transform"
      ].forEach((prop) => volumeRow.style.removeProperty(prop));
    }

    const card = document.querySelector("#userPlaylistPlayer .playlist-player-card");
    if (card) {
      ["width","max-width","min-width","height","max-height","min-height","margin","padding","display","position","transform"].forEach((prop) => {
        card.style.removeProperty(prop);
      });
    }
  }

  function applyStableClass() {
    const player = qs("userPlaylistPlayer");
    if (!player) return;
    player.classList.add("ks-playlist-stable");
  }

  function run() {
    clearInlineLayout();
    applyStableClass();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }

  window.addEventListener("resize", run);
  window.addEventListener("hashchange", run);

  const mo = new MutationObserver(() => {
    window.requestAnimationFrame(run);
  });

  const startObserver = () => {
    const player = qs("userPlaylistPlayer");
    if (player) {
      mo.observe(player, { attributes: true, childList: true, subtree: true, attributeFilter: ["class", "style"] });
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }

  window.ksPlaylistLayoutReset = run;
})();



(function () {
  "use strict";

  function ensureMobileQueueRemoveButton() {
    const panel = document.getElementById("playlistQueuePanel");
    const head = panel ? panel.querySelector(".playlist-queue-head") : null;
    const existingRemove = document.getElementById("playlistPlayerRemoveBtn");
    if (!panel || !head || !existingRemove) return;

    let btn = document.getElementById("mobileQueueRemoveBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "mobileQueueRemoveBtn";
      btn.textContent = "현재곡 빼기";
      head.insertBefore(btn, head.firstChild);
      btn.addEventListener("click", function () {
        existingRemove.click();
        setTimeout(function () {
          if (window.ksPlaylistLayoutReset) window.ksPlaylistLayoutReset();
        }, 30);
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureMobileQueueRemoveButton);
  } else {
    ensureMobileQueueRemoveButton();
  }

  document.addEventListener("click", function (event) {
    if (event.target && event.target.id === "playlistPlayerListBtn") {
      setTimeout(ensureMobileQueueRemoveButton, 30);
    }
  });

  window.addEventListener("resize", ensureMobileQueueRemoveButton);
})();






/* ===== v244 safe playlist queue toggle: no observer loop ===== */
(function () {
  "use strict";

  function qs(id) {
    return document.getElementById(id);
  }

  function ensureCurrentRemoveInQueue() {
    const panel = qs("playlistQueuePanel");
    const head = panel ? panel.querySelector(".playlist-queue-head") : null;
    const removeBtn = qs("playlistPlayerRemoveBtn");
    if (!panel || !head || !removeBtn) return;

    let btn = qs("mobileQueueRemoveBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "mobileQueueRemoveBtn";
      btn.textContent = "현재곡 빼기";
      btn.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        removeBtn.click();
      });
    }

    if (head.firstElementChild !== btn) {
      head.insertBefore(btn, head.firstElementChild);
    }
  }

  function openQueue(open) {
    const panel = qs("playlistQueuePanel");
    const btn = qs("playlistPlayerListBtn");
    if (!panel || !btn) return;

    ensureCurrentRemoveInQueue();

    panel.classList.toggle("open", open);
    panel.classList.toggle("force-open", open);
    panel.setAttribute("aria-hidden", open ? "false" : "true");
    btn.setAttribute("aria-expanded", open ? "true" : "false");

    /* 인라인 스타일을 계속 쓰지 않는다. CSS class만 변경해서 멈춤 방지 */
  }

  function bindQueueButton() {
    const btn = qs("playlistPlayerListBtn");
    const panel = qs("playlistQueuePanel");
    if (!btn || !panel || btn.dataset.safeQueueV244 === "1") return;

    btn.dataset.safeQueueV244 = "1";
    btn.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();

      const willOpen = !(panel.classList.contains("open") || panel.classList.contains("force-open"));
      openQueue(willOpen);
    }, true);
  }

  function init() {
    ensureCurrentRemoveInQueue();
    bindQueueButton();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("resize", init);
  window.addEventListener("hashchange", init);
})();
