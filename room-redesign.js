
const ROOM_PAGE_META = {
  home: { bg: 'images/rooms/home.jpg', position: 'center center', room: '거실', title: '광석이네 집', browserTitle: '광석이네집' },
  siteinfo: { bg: 'images/rooms/siteinfo.jpg', position: 'center center', room: '사이트 안내', title: '사이트 안내', browserTitle: '사이트 안내' },
  videos: { bg: 'images/rooms/videos.jpg', position: 'right center', room: '안방', title: 'Videos', browserTitle: 'Videos' },
  songs: { bg: 'images/rooms/songs.jpg', position: 'center center', room: '음악 작업실', title: 'Songs', browserTitle: 'Songs' },
  radios: { bg: 'images/rooms/radios.jpg', position: 'center center', room: '라디오방', title: 'Radios', browserTitle: 'Radios' },
  photos: { bg: 'images/rooms/photos.jpg', position: 'center center', room: '부엌', title: 'Photos', browserTitle: 'Photos' },
  stories: { bg: 'images/rooms/stories.jpg', position: 'center center', room: '글방', title: 'Stories', browserTitle: 'Stories' },
  about: { bg: 'images/rooms/about.jpg', position: 'center center', room: 'About Seok', title: 'About Seok', browserTitle: 'About Seok' },
  oneum: { bg: 'images/rooms/oneum.jpg', position: 'center center', room: '원음 사무실', title: 'Oneum', browserTitle: 'Oneum' },
  loginRequired: { bg: 'images/rooms/siteinfo.jpg', position: 'center center', room: '입장 안내', title: '입장 안내', browserTitle: '입장 안내' },
  login: { bg: 'images/rooms/siteinfo.jpg', position: 'center center', room: '로그인', title: '로그인', browserTitle: '로그인' },
  signup: { bg: 'images/rooms/siteinfo.jpg', position: 'center center', room: '회원가입', title: '회원가입', browserTitle: '회원가입' },
  mypage: { bg: 'images/rooms/siteinfo.jpg', position: 'center center', room: '내 정보', title: '내 정보', browserTitle: '내 정보' },
  admin: { bg: 'images/rooms/siteinfo.jpg', position: 'center center', room: '관리자실', title: '관리자', browserTitle: '관리자실' }
};

const PAGE_LABELS = {
  home: '광석이네집',
  siteinfo: '사이트 안내',
  videos: 'Videos',
  songs: 'Songs',
  radios: 'Radios',
  photos: 'Photos',
  stories: 'Stories',
  about: 'About Seok',
  oneum: 'Oneum',
  loginRequired: '입장 안내',
  login: '로그인',
  signup: '회원가입',
  mypage: '내 정보',
  admin: '관리자'
};

function ensureDoorTransitionOverlay() {
  let overlay = document.getElementById('roomDoorTransition');
  if (overlay) return overlay;
  overlay = document.createElement('div');
  overlay.id = 'roomDoorTransition';
  overlay.innerHTML = '<div class="door-panel left"></div><div class="door-panel right"></div>';
  document.body.appendChild(overlay);
  return overlay;
}

function getActivePageId() {
  return document.querySelector('.page.active')?.id || window.location.hash.replace('#', '').trim() || 'home';
}

function applyRoomTheme(pageId = getActivePageId()) {
  const page = ROOM_PAGE_META[pageId] ? pageId : 'home';
  const meta = ROOM_PAGE_META[page];
  document.body.dataset.currentPage = page;
  document.documentElement.style.setProperty('--room-bg', `url("${meta.bg}")`);
  document.documentElement.style.setProperty('--room-bg-position', meta.position || 'center center');

  document.querySelectorAll('#siteNav button').forEach((button) => {
    button.classList.toggle('room-active', button.getAttribute('data-page-fallback') === page);
  });

  const subtitle = document.getElementById('siteLogoSubText');
  if (subtitle) subtitle.textContent = `김광석 디지털 아카이브 · ${meta.room}`;
  document.title = `${PAGE_LABELS[page] || '광석이네 집'} | 광석이네 집`;

  const homeTitle = document.getElementById('homeTitle');
  const homeDescription = document.getElementById('homeDescription');
  if (homeTitle) homeTitle.textContent = '김광석의 노래와 기억이 머무는 집';
  if (homeDescription) homeDescription.textContent = '광석이네 집에서 김광석의 노래, 영상, 사진, 라디오, 글을 방마다 둘러보세요.';
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createDoorNavigator() {
  const originalGoPage = window.goPage ? window.goPage.bind(window) : (pageId) => { window.location.hash = `#${pageId}`; };
  let transitioning = false;

  const navigateWithDoor = async (pageId) => {
    if (!pageId) return originalGoPage('home');
    if (transitioning) return;

    const overlay = ensureDoorTransitionOverlay();
    const currentPage = getActivePageId();
    if (pageId === currentPage && window.location.hash === `#${pageId}`) {
      originalGoPage(pageId);
      applyRoomTheme(pageId);
      return;
    }

    transitioning = true;
    overlay.classList.remove('opening');
    overlay.classList.add('active', 'closing');

    await wait(290);
    originalGoPage(pageId);

    await wait(190);
    applyRoomTheme();
    overlay.classList.remove('closing');
    overlay.classList.add('opening');

    await wait(360);
    overlay.classList.remove('active', 'opening');
    transitioning = false;
    applyRoomTheme();
  };

  window.goPage = navigateWithDoor;
}

function installRoomDecor() {
  ensureDoorTransitionOverlay();
  createDoorNavigator();
  applyRoomTheme();

  window.addEventListener('hashchange', () => {
    window.setTimeout(() => applyRoomTheme(), 50);
  });

  window.setTimeout(() => applyRoomTheme(), 200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', installRoomDecor);
} else {
  installRoomDecor();
}
