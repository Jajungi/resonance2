"""Upgrade subpages to shared chrome mounts + page hero bar."""
from pathlib import Path
import re

SITE = Path(r"c:\Users\정명진\Documents\Project\인종_new\site")

OLD_HEADER = re.compile(
    r'<a class="skip"[^>]*>.*?</a>\s*'
    r'<header class="site-header">.*?</header>\s*'
    r'<main id="main"[^>]*>\s*'
    r'(?:<header class="page-head">\s*'
    r'<h1>(.*?)</h1>\s*'
    r'(?:<p>(.*?)</p>\s*)?'
    r'</header>\s*)?',
    re.S,
)

OLD_FOOTER = re.compile(
    r'</main>\s*'
    r'<footer class="site-footer">.*?</footer>\s*'
    r'(?:<script src="\./site\.js"></script>\s*)?'
    r'</body>',
    re.S,
)

FONT_LINK = (
    'href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:'
    'wght@400;500;600;700&family=Song+Myung&display=swap"'
)

for path in SITE.glob("*.html"):
    if path.name.startswith("_") or path.name == "index.html":
        continue
    text = path.read_text(encoding="utf-8")
    m = OLD_HEADER.search(text)
    if not m:
        print("skip (no header match):", path.name)
        continue
    title = m.group(1) or path.stem
    lead = m.group(2) or ""
    lead_html = f"\n      <p>{lead}</p>" if lead else ""

    text = text.replace(
        'wght@400;500;600&family=Song+Myung&display=swap"',
        'wght@400;500;600;700&family=Song+Myung&display=swap"',
    )

    new_top = f'''<a class="skip" href="#main">본문으로 건너뛰기</a>
  <div id="site-header"></div>
  <div class="page-hero-bar">
    <div class="inner">
      <h1>{title}</h1>{lead_html}
    </div>
  </div>
  <main id="main" class="page-main">
'''
    text = OLD_HEADER.sub(new_top, text, count=1)

    new_bottom = '''</main>
  <div id="site-footer"></div>
  <script src="./site.js"></script>
</body>'''
    if OLD_FOOTER.search(text):
        text = OLD_FOOTER.sub(new_bottom, text, count=1)
    else:
        print("warn footer:", path.name)

    # ensure prose wrapper if content starts with h2/p directly after main
    # leave as-is if already has prose
    path.write_text(text, encoding="utf-8")
    print("patched", path.name)
