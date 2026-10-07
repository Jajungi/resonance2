from pathlib import Path
import re

SITE = Path(r"c:\Users\정명진\Documents\Project\인종_new\site")
SUBNAV_PAGES = {
    "explain.html",
    "world.html",
    "human.html",
    "salvation.html",
    "practice.html",
    "ritual.html",
    "ethics.html",
}
SUBNAV = """    <nav class="subnav" aria-label="설명 안의 페이지">
      <a data-subnav href="explain.html">개요</a>
      <a data-subnav href="world.html">세계</a>
      <a data-subnav href="human.html">인간</a>
      <a data-subnav href="salvation.html">구원</a>
      <a data-subnav href="practice.html">수행</a>
      <a data-subnav href="ritual.html">의례</a>
      <a data-subnav href="ethics.html">윤리</a>
    </nav>
"""

TPL = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{desc}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=Song+Myung&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <a class="skip" href="#main">본문으로 건너뛰기</a>
  <div id="site-header"></div>
  <div class="page-hero-bar">
    <div class="inner">
      <h1>{h1}</h1>
      {lead}
    </div>
  </div>
  <main id="main" class="page-main">
{subnav}    <div class="prose">
{prose}
    </div>
  </main>
  <div id="site-footer"></div>
  <script src="./site.js"></script>
</body>
</html>
"""

for path in SITE.glob("*.html"):
    if path.name.startswith("_") or path.name == "index.html":
        continue
    text = path.read_text(encoding="utf-8")
    if 'id="site-header"' in text and 'page-hero-bar' in text and path.name not in (
        # re-fix only unpatched-with-subnav leftovers; about etc already ok
    ):
        # still rewrite if old wrap/footer remains somehow
        if 'id="site-footer"' in text and "site-header" in text and '<header class="site-header">' not in text:
            print("ok:", path.name)
            continue

    title = re.search(r"<title>(.*?)</title>", text, re.S)
    desc = re.search(r'name="description" content="(.*?)"', text, re.S)
    h1 = re.search(r"<h1>(.*?)</h1>", text, re.S)
    # lead is first p after h1 inside page-head, or page-hero
    lead_m = re.search(
        r"<h1>.*?</h1>\s*<p>(.*?)</p>",
        text,
        re.S,
    )
    prose_m = re.search(r'<div class="prose">(.*?)</div>\s*</main>', text, re.S)
    if not (title and h1 and prose_m):
        print("fail extract:", path.name)
        continue

    lead = f"<p>{lead_m.group(1)}</p>" if lead_m else ""
    prose = prose_m.group(1).strip()
    # indent prose lines
    prose = "\n".join(("      " + ln if ln.strip() else ln) for ln in prose.splitlines())

    out = TPL.format(
        title=title.group(1).strip(),
        desc=(desc.group(1).strip() if desc else ""),
        h1=h1.group(1).strip(),
        lead=lead,
        subnav=SUBNAV if path.name in SUBNAV_PAGES else "",
        prose=prose,
    )
    path.write_text(out, encoding="utf-8")
    print("rewrote", path.name)
