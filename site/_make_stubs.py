"""Create Shincheonji-parallel IA stub pages for 공명교. Content TBD by user."""
from pathlib import Path

SITE = Path(r"c:\Users\정명진\Documents\Project\인종_new\site")

PAGES = [
    # (file, title, h1, lead)
    ("greeting.html", "인사말 — 공명교", "인사말", "공명교를 찾아 주신 분들께 인사드립니다."),
    ("intro.html", "소개 — 공명교", "소개", "공명교가 무엇인지 소개합니다."),
    ("history.html", "연혁 — 공명교", "연혁", "공명교가 걸어온 길을 기록합니다."),
    ("organization.html", "조직 — 공명교", "조직", "공명교의 조직과 운영을 안내합니다."),
    ("origins.html", "근원파 소개 — 공명교", "근원파 소개", "원음이 나눈 근원파와 구원의 구조를 안내합니다."),
    ("word.html", "말씀 — 공명교", "말씀", "공명교의 말씀을 모았습니다."),
    ("video.html", "영상 — 공명교", "영상", "공명교 관련 영상을 모았습니다."),
    ("center.html", "원향 — 공명교", "원향", "원향과 합명 공간을 소개합니다."),
    ("hapmyeong-status.html", "합명일 현황 — 공명교", "합명일 현황", "합명일·모임의 현황을 안내합니다."),
    ("hapmyeong-photos.html", "합명 사진 — 공명교", "합명 사진", "합명·행사 사진을 모았습니다."),
    ("press.html", "보도자료 — 공명교", "보도자료", "공명교 보도자료를 모았습니다."),
    ("media.html", "언론보도 — 공명교", "언론보도", "언론에 소개된 공명교 소식을 모았습니다."),
    ("event-photos.html", "행사사진 — 공명교", "행사사진", "행사 사진을 모았습니다."),
    ("newsletter.html", "소식지 — 공명교", "소식지", "공명교 소식지를 모았습니다."),
    ("news.html", "소식 — 공명교", "소식", "공명교의 새 소식을 전합니다."),
    ("service.html", "봉사활동 — 공명교", "봉사활동", "공명교의 봉사·실천 활동을 안내합니다."),
    ("service-activity.html", "활동내역 — 공명교", "활동내역", "봉사 활동 내역을 기록합니다."),
    ("service-awards.html", "수상내역 — 공명교", "수상내역", "수상·표창 내역을 안내합니다."),
    ("service-media.html", "봉사 언론보도 — 공명교", "언론보도", "봉사 관련 언론보도를 모았습니다."),
    ("contact.html", "상담·문의 — 공명교", "상담·문의", "문의 방법을 안내합니다."),
]

TPL = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{title}</title>
  <meta name="description" content="{lead}" />
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
      <p>{lead}</p>
    </div>
  </div>
  <main id="main" class="page-main">
    <div class="prose">
      <div class="content-placeholder">
        <p><strong>본문 내용이 들어올 자리입니다.</strong></p>
        <p class="muted">구성을 먼저 맞춰 두었습니다. 상세 설명·본문은 이후 반영합니다.</p>
      </div>
    </div>
  </main>
  <div id="site-footer"></div>
  <script src="./site.js"></script>
</body>
</html>
"""

for file, title, h1, lead in PAGES:
    (SITE / file).write_text(
        TPL.format(title=title, h1=h1, lead=lead), encoding="utf-8"
    )
    print("wrote", file)

print("done", len(PAGES))
