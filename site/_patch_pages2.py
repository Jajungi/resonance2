"""Patch remaining pages that have subnav between header and main."""
from pathlib import Path
import re

SITE = Path(r"c:\Users\정명진\Documents\Project\인종_new\site")

HEADER_BLOCK = re.compile(
    r'<a class="skip"[^>]*>.*?</a>\s*'
    r'<header class="site-header">.*?</header>\s*',
    re.S,
)

SUBNAV_BLOCK = re.compile(
    r'(<nav class="subnav"[^>]*>.*?</nav>\s*)',
    re.S,
)

PAGE_HEAD = re.compile(
    r'<main id="main"[^>]*>\s*'
    r'<header class="page-head">\s*'
    r'<h1>(.*?)</h1>\s*'
    r'(?:<p>(.*?)</p>\s*)?'
    r'</header>\s*',
    re.S,
)

FOOTER_BLOCK = re.compile(
    r'<footer class="site-footer">.*?</footer>',
    re.S,
)

SUBNAV_LINKS = """  <nav class="subnav" aria-label="설명 안의 페이지">
    <a data-subnav href="explain.html">개요</a>
    <a data-subnav href="world.html">세계</a>
    <a data-subnav href="human.html">인간</a>
    <a data-subnav href="salvation.html">구원</a>
    <a data-subnav href="practice.html">수행</a>
    <a data-subnav href="ritual.html">의례</a>
    <a data-subnav href="ethics.html">윤리</a>
  </nav>
"""

for path in SITE.glob("*.html"):
    if path.name.startswith("_") or path.name == "index.html":
        continue
    text = path.read_text(encoding="utf-8")
    if 'id="site-header"' in text:
        print("already:", path.name)
        continue
    if not HEADER_BLOCK.search(text):
        print("no header:", path.name)
        continue

    ph = PAGE_HEAD.search(text)
    title = ph.group(1) if ph else path.stem
    lead = ph.group(2) if ph and ph.group(2) else ""
    lead_html = f"\n      <p>{lead}</p>" if lead else ""

    has_subnav = "class=\"subnav\"" in text

    text = text.replace(
        'wght@400;500;600&family=Song+Myung&display=swap"',
        'wght@400;500;600;700&family=Song+Myung&display=swap"',
    )

    text = HEADER_BLOCK.sub('<a class="skip" href="#main">본문으로 건너뛰기</a>\n  <div id="site-header"></div>\n', text, count=1)

    # remove old subnav (will reinsert inside main)
    text = SUBNAV_BLOCK.sub("", text, count=1)

    hero = f'''  <div class="page-hero-bar">
    <div class="inner">
      <h1>{title}</h1>{lead_html}
    </div>
  </div>
'''
    # insert hero before main
    text = text.replace('<main id="main"', hero + '  <main id="main"', 1)

    if ph:
        text = PAGE_HEAD.sub(
            '<main id="main" class="page-main">\n'
            + (SUBNAV_LINKS if has_subnav else "")
            + ('<div class="prose">\n' if '<div class="prose">' not in text[text.find('<main id="main"'): text.find('<main id="main"') + 400] else ""),
            text,
            count=1,
        )
        # Fix: PAGE_HEAD already consumed main open - need cleaner approach
    else:
        text = re.sub(
            r'<main id="main"[^>]*>',
            '<main id="main" class="page-main">\n' + (SUBNAV_LINKS if has_subnav else ""),
            text,
            count=1,
        )

    # Fix double main tags if any from botched replace
    text = text.replace('<main id="main" class="page-main">\n<main id="main" class="page-main">', '<main id="main" class="page-main">')

    # simpler: re-read and do a cleaner second pass for remaining files
    path.write_text(text, encoding="utf-8")
    print("step1", path.name)
