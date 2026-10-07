(function () {
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  const ICONS = {
    menu: '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16.5 16.5L21 21"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>',
    top: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 14l6-6 6 6"/></svg>',
  };

  /* 골격: 신천지형 기관 메뉴 / 본문 흐름: 한눈에·세계·구원·악과 속죄·의례·오는 법·스테이션 */
  const MENU = [
    {
      title: "공명교소개",
      href: "intro.html",
      subs: [
        ["greeting.html", "인사말"],
        ["intro.html", "공명교 한눈에"],
        ["intro-guide.html", "입문"],
        ["history.html", "연혁"],
        ["organization.html", "조직"],
        ["world.html", "세계"],
      ],
    },
    {
      title: "말씀",
      href: "salvation.html",
      subs: [
        ["salvation.html", "구원"],
        ["ethics.html", "악과 속죄"],
        ["text-gyeong.html", "공명경"],
        ["text-haeseol.html", "교리 해설"],
        ["video.html", "영상"],
      ],
    },
    {
      title: "원향",
      href: "center.html",
      subs: [
        ["center.html", "원향 소개"],
        ["ritual.html", "의례"],
        ["hapmyeong-status.html", "합명일 현황"],
        ["hapmyeong-photos.html", "합명 사진"],
        ["../experience/index.html?go=1", "스테이션"],
      ],
    },
    {
      title: "소식",
      href: "news.html",
      subs: [
        ["press.html", "보도자료"],
        ["media.html", "언론보도"],
        ["event-photos.html", "행사사진"],
        ["newsletter.html", "소식지"],
      ],
    },
    {
      title: "봉사활동",
      href: "service.html",
      subs: [
        ["service-activity.html", "활동내역"],
        ["service-awards.html", "수상내역"],
        ["service-media.html", "언론보도"],
      ],
    },
    {
      title: "안내",
      href: "visit.html",
      subs: [
        ["visit.html", "오는 법"],
        ["contact.html", "상담·문의"],
      ],
    },
  ];

  function headerHTML() {
    const topNav = MENU.map(
      (g) => `<a class="header-nav-link" href="${g.href}" data-nav>${g.title}</a>`
    ).join("");
    return `
<header class="site-header">
  <div class="header-inner">
    <a class="brand" href="index.html">
      <img class="brand-mark" src="./assets/wonum-symbol.png" alt="" width="48" height="48" />
      <span class="brand-text">
        <strong>공명교</strong>
        <span>원음으로 돌아가는 종교</span>
      </span>
    </a>
    <nav class="header-nav" aria-label="주요 메뉴">${topNav}</nav>
    <div class="header-tools">
      <button type="button" class="tool-btn menu-toggle" data-open-menu aria-label="전체 메뉴">${ICONS.menu}</button>
      <button type="button" class="tool-btn" data-open-search aria-label="검색">${ICONS.search}</button>
      <button type="button" class="tool-btn lang-btn" aria-label="언어">KO ${ICONS.chevron}</button>
    </div>
  </div>
</header>
<div class="menu-overlay" data-menu-overlay></div>
<aside class="mega-menu" data-mega-menu aria-hidden="true" aria-label="전체 메뉴">
  <div class="mega-head">
    <h2>메뉴</h2>
    <button type="button" class="tool-btn" data-close-menu aria-label="닫기">${ICONS.close}</button>
  </div>
  <div class="mega-body">
    ${MENU.map(
      (g) => `
      <div class="mega-group">
        <a href="${g.href}">${g.title}</a>
        <div class="mega-subs">
          ${g.subs.map(([h, t]) => `<a href="${h}">${t}</a>`).join("")}
        </div>
      </div>`
    ).join("")}
  </div>
</aside>
<div class="search-overlay" data-search-overlay>
  <div class="search-panel">
    <form class="search-row" data-search-form action="#" method="get">
      <input type="search" name="q" placeholder="공명교에서 찾고 싶은 주제를 검색해 보세요" aria-label="검색어" />
      <button type="button" class="tool-btn" data-close-search aria-label="검색 닫기">${ICONS.close}</button>
    </form>
  </div>
</div>`;
  }

  function footerHTML() {
    return `
<footer class="site-footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <img src="./assets/wonum-symbol.png" alt="" width="48" height="48" />
      <div>
        <strong>공명교</strong>
        <span>원음에서 비롯되어 다시 원음으로 향하는 종교</span>
      </div>
    </div>
    <ul class="footer-links" aria-label="하단 바로가기">
      <li><a href="intro.html">한눈에</a></li>
      <li><a href="salvation.html">구원</a></li>
      <li><a href="ritual.html">의례</a></li>
      <li><a href="center.html">원향</a></li>
      <li><a href="visit.html">오는 법</a></li>
      <li><a href="../experience/index.html?go=1">스테이션</a></li>
      <li><a href="contact.html">상담·문의</a></li>
    </ul>
    <p class="footer-copy">우리는 서로 다른 울림으로 태어나, 서로를 울리고, 하나의 원음으로 돌아간다.<br/>© 공명교</p>
  </div>
</footer>
<button type="button" class="to-top" data-to-top aria-label="맨 위로">${ICONS.top}</button>`;
  }

  const headerMount = document.getElementById("site-header");
  const footerMount = document.getElementById("site-footer");
  if (headerMount) headerMount.outerHTML = headerHTML();
  if (footerMount) footerMount.outerHTML = footerHTML();

  document.querySelectorAll("[data-nav], [data-subnav]").forEach((a) => {
    const href = (a.getAttribute("href") || "").toLowerCase();
    if (href === path) a.setAttribute("aria-current", "page");
  });
  /* 상단 탭: 하위 페이지에서도 소속 대메뉴 표시 */
  MENU.forEach((g) => {
    const inGroup =
      (g.href || "").toLowerCase() === path ||
      g.subs.some(([h]) => (h || "").toLowerCase() === path);
    if (!inGroup) return;
    document.querySelectorAll(`.header-nav-link[href="${g.href}"]`).forEach((a) => {
      a.setAttribute("aria-current", "page");
    });
  });

  const mega = document.querySelector("[data-mega-menu]");
  const menuOverlay = document.querySelector("[data-menu-overlay]");
  const searchOverlay = document.querySelector("[data-search-overlay]");

  function openMenu() {
    mega?.classList.add("is-open");
    mega?.setAttribute("aria-hidden", "false");
    menuOverlay?.classList.add("is-open");
    document.body.classList.add("menu-open");
  }
  function closeMenu() {
    mega?.classList.remove("is-open");
    mega?.setAttribute("aria-hidden", "true");
    menuOverlay?.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  }
  function openSearch() {
    searchOverlay?.classList.add("is-open");
    document.body.classList.add("menu-open");
    searchOverlay?.querySelector("input")?.focus();
  }
  function closeSearch() {
    searchOverlay?.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  }

  document.querySelector("[data-open-menu]")?.addEventListener("click", openMenu);
  document.querySelector("[data-close-menu]")?.addEventListener("click", closeMenu);
  menuOverlay?.addEventListener("click", closeMenu);
  document.querySelector("[data-open-search]")?.addEventListener("click", openSearch);
  document.querySelector("[data-close-search]")?.addEventListener("click", closeSearch);
  searchOverlay?.addEventListener("click", (e) => {
    if (e.target === searchOverlay) closeSearch();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      closeSearch();
    }
  });

  document.querySelector("[data-search-form]")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const q = (e.target.querySelector("input")?.value || "").trim().toLowerCase();
    const map = [
      [["인사"], "greeting.html"],
      [["한눈", "소개"], "intro.html"],
      [["입문"], "intro-guide.html"],
      [["세계", "근원파"], "world.html"],
      [["구원", "완명", "귀원", "영명"], "salvation.html"],
      [["악", "속죄", "절명", "탁명"], "ethics.html"],
      [["연혁", "대침묵", "충격파", "과거"], "history.html"],
      [["조직"], "organization.html"],
      [["공명경", "경전", "말씀"], "text-gyeong.html"],
      [["해설"], "text-haeseol.html"],
      [["영상"], "video.html"],
      [["원향", "센터"], "center.html"],
      [["합명"], "hapmyeong-status.html"],
      [["소식", "보도"], "news.html"],
      [["봉사"], "service.html"],
      [["오는", "길", "방문"], "visit.html"],
      [["문의", "상담"], "contact.html"],
      [["의례", "청음", "정명"], "ritual.html"],
      [["스테이션"], "../experience/index.html"],
    ];
    for (const [keys, href] of map) {
      if (keys.some((k) => q.includes(k))) {
        location.href = href;
        return;
      }
    }
    location.href = "intro.html";
  });

  document.querySelector("[data-to-top]")?.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  const carousel = document.querySelector("[data-carousel]");
  if (carousel) {
    const track = carousel.querySelector("[data-track]");
    const slides = [...carousel.querySelectorAll(".hero-slide")];
    const dotsWrap = carousel.querySelector("[data-dots]");
    let i = 0;
    let timer;

    slides.forEach((_, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", `${idx + 1}번째 슬라이드`);
      if (idx === 0) b.setAttribute("aria-current", "true");
      b.addEventListener("click", () => go(idx));
      dotsWrap.appendChild(b);
    });

    function go(n) {
      i = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${i * 100}%)`;
      dotsWrap.querySelectorAll("button").forEach((b, idx) => {
        if (idx === i) b.setAttribute("aria-current", "true");
        else b.removeAttribute("aria-current");
      });
      restart();
    }
    function restart() {
      clearInterval(timer);
      timer = setInterval(() => go(i + 1), 6000);
    }

    carousel.querySelector("[data-prev]")?.addEventListener("click", () => go(i - 1));
    carousel.querySelector("[data-next]")?.addEventListener("click", () => go(i + 1));
    restart();
  }

  /* 연혁 — 시대 탭 (남는 마크업용) */
  const historyRoot = document.querySelector("[data-history]");
  if (historyRoot) {
    const tabs = [...historyRoot.querySelectorAll("[data-era]")];
    const panels = [...historyRoot.querySelectorAll("[data-era-panel]")];
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const era = tab.getAttribute("data-era");
        tabs.forEach((t) => {
          if (t === tab) t.setAttribute("aria-current", "true");
          else t.removeAttribute("aria-current");
        });
        panels.forEach((p) => {
          p.hidden = p.getAttribute("data-era-panel") !== era;
        });
      });
    });
  }

  /* 처음 읽는 길 — 가로 레일 */
  document.querySelectorAll("[data-rail]").forEach((wrap) => {
    const track = wrap.querySelector("[data-rail-track]");
    if (!track) return;
    const step = () => Math.min(240, track.clientWidth * 0.7);
    wrap.querySelector("[data-rail-prev]")?.addEventListener("click", () => {
      track.scrollBy({ left: -step(), behavior: "smooth" });
    });
    wrap.querySelector("[data-rail-next]")?.addEventListener("click", () => {
      track.scrollBy({ left: step(), behavior: "smooth" });
    });
  });
})();
