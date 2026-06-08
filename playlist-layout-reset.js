
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



/* ===== v242 mobile queue current-remove insertion ===== */
(function () {
  "use strict";

  function ensureMobileQueueRemoveButton() {
    const panel = document.getElementById("playlistQueuePanel");
    const head = panel ? panel.querySelector(".playlist-queue-head") : null;
    const remove = document.getElementById("playlistPlayerRemoveBtn");
    if (!panel || !head || !remove) return;

    let btn = document.getElementById("mobileQueueRemoveBtn");
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.id = "mobileQueueRemoveBtn";
      btn.textContent = "현재곡 빼기";
      btn.addEventListener("click", function () {
        remove.click();
        setTimeout(function () {
          if (window.ksPlaylistLayoutReset) window.ksPlaylistLayoutReset();
        }, 50);
      });
    }

    if (head.firstElementChild !== btn) {
      head.insertBefore(btn, head.firstElementChild);
    }
  }

  function bind() {
    ensureMobileQueueRemoveButton();

    const listBtn = document.getElementById("playlistPlayerListBtn");
    if (listBtn && !listBtn.dataset.mobileRemoveBound) {
      listBtn.dataset.mobileRemoveBound = "1";
      listBtn.addEventListener("click", function () {
        setTimeout(ensureMobileQueueRemoveButton, 30);
        setTimeout(ensureMobileQueueRemoveButton, 180);
      });
    }

    const panel = document.getElementById("playlistQueuePanel");
    if (panel && !panel.dataset.mobileRemoveObserved) {
      panel.dataset.mobileRemoveObserved = "1";
      const mo = new MutationObserver(ensureMobileQueueRemoveButton);
      mo.observe(panel, { childList: true, subtree: true, attributes: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  window.addEventListener("resize", bind);
  window.addEventListener("hashchange", bind);
})();
