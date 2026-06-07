
(function(){
  const VALID = ["home","siteinfo","videos","songs","radios","photos","stories","about","oneum"];
  const LABELS = {
    home: "거실",
    siteinfo: "안내 공간",
    videos: "영상방",
    songs: "음악 작업실",
    radios: "부엌 라디오",
    photos: "광석의 방",
    stories: "이야기 노트",
    about: "About Seok",
    oneum: "원음 사무실"
  };

  function normalize(page){ return VALID.includes(page) ? page : "home"; }

  function setTheme(page){
    page = normalize(page);
    document.body.setAttribute('data-room', page);
    ensureScrollBackground();
    document.body.setAttribute('data-room-label', LABELS[page] || '');
    document.querySelectorAll('#siteNav button[data-page-fallback]').forEach(function(btn){
      var active = btn.getAttribute('data-page-fallback') === page;
      btn.classList.toggle('active-room', active);
      if(active) btn.setAttribute('aria-current','page');
      else btn.removeAttribute('aria-current');
    });
  }

  function ensureScrollBackground(){
    var bg = document.getElementById('roomScrollBg');
    if (bg) return bg;
    bg = document.createElement('div');
    bg.id = 'roomScrollBg';
    bg.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(bg, document.body.firstChild);
    return bg;
  }

  function updateScrollBackground(){
    var bg = ensureScrollBackground();
    var y = Math.round((window.scrollY || window.pageYOffset || 0) * -0.18);
    bg.style.setProperty('--room-scroll-shift', y + 'px');
  }

  function ensureTransitionOverlay(){
    var overlay = document.getElementById('roomTransitionOverlay');
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.id = 'roomTransitionOverlay';
    overlay.className = 'room-transition-overlay';
    overlay.innerHTML = '<div class="door door-left"></div><div class="door door-right"></div><div class="transition-note"><span class="transition-house">광석이네 집</span><strong id="roomTransitionLabel">방으로 이동 중</strong></div>';
    document.body.appendChild(overlay);
    return overlay;
  }

  var rawShow = null;
  if (typeof window.__hardShowPage === 'function') {
    rawShow = window.__hardShowPage.bind(window);
    window.__hardShowPage = function(page){
      rawShow(page);
      setTheme(page);
    };
  }

  var fallbackGoPage = typeof window.goPage === 'function' ? window.goPage.bind(window) : null;

  function transitionTo(page){
    page = normalize(page);
    if (document.body.getAttribute('data-room') === page && !document.body.dataset.transitioning) {
      if (typeof window.__hardShowPage === 'function') window.__hardShowPage(page);
      else if (fallbackGoPage) fallbackGoPage(page);
      return;
    }
    if (document.body.dataset.transitioning === '1') return;
    var overlay = ensureTransitionOverlay();
    var label = overlay.querySelector('#roomTransitionLabel');
    if (label) label.textContent = (LABELS[page] || '다음 방') + '으로 이동';
    document.body.dataset.transitioning = '1';
    overlay.classList.remove('opening');
    overlay.classList.add('is-visible','closing');

    window.setTimeout(function(){
      if (typeof window.__hardShowPage === 'function') window.__hardShowPage(page);
      else if (rawShow) { rawShow(page); setTheme(page); }
      else if (fallbackGoPage) fallbackGoPage(page);
      overlay.classList.remove('closing');
      overlay.classList.add('opening');
      window.setTimeout(function(){
        overlay.classList.remove('opening','is-visible');
        document.body.dataset.transitioning = '';
      }, 760);
    }, 290);
  }

  window.goPage = transitionTo;
  window.addEventListener('hashchange', function(){
    setTheme(location.hash.replace('#','').trim() || 'home');
  });
  document.addEventListener('DOMContentLoaded', function(){
    ensureTransitionOverlay();
    ensureScrollBackground();
    var current = location.hash.replace('#','').trim() || (document.querySelector('.page.active') && document.querySelector('.page.active').id) || 'home';
    setTheme(current);
    updateScrollBackground();
    var ticking = false;
    window.addEventListener('scroll', function(){
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function(){
        updateScrollBackground();
        ticking = false;
      });
    }, { passive: true });
    window.addEventListener('resize', updateScrollBackground, { passive: true });
  });
})();
