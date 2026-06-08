
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
