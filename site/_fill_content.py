# -*- coding: utf-8 -*-
"""Fill site pages from PPT + concept (content only)."""
from pathlib import Path

SITE = Path(r"c:\Users\정명진\Documents\Project\인종_new\site")

def page(title, desc, h1, lead, body, subnav=False):
    sn = ""
    if subnav:
        sn = """    <nav class="subnav" aria-label="말씀·교리">
      <a data-subnav href="intro.html">한눈에</a>
      <a data-subnav href="world.html">세계</a>
      <a data-subnav href="salvation.html">구원</a>
      <a data-subnav href="ethics.html">악과 속죄</a>
      <a data-subnav href="ritual.html">의례</a>
      <a data-subnav href="visit.html">오는 법</a>
    </nav>
"""
    return f"""<!DOCTYPE html>
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
      <p>{lead}</p>
    </div>
  </div>
  <main id="main" class="page-main">
{sn}    <div class="prose">
{body}
    </div>
  </main>
  <div id="site-footer"></div>
  <script src="./site.js"></script>
</body>
</html>
"""

PAGES = {}

PAGES["greeting.html"] = page(
    "인사말 — 공명교",
    "공명교를 찾아 주신 분들께.",
    "인사말",
    "어떤 만남은 영혼에 남습니다. 우리는 그것을 ‘명흔’이라 부릅니다.",
    """
      <p>공명교를 찾아 주셔서 감사합니다.</p>
      <p>우리는 서로 다른 울림으로 태어나, 서로를 울리고, 함께 영원히 울립니다. 공명교는 그 길을 <strong>원음</strong> 앞에서 배우고 연습하는 종교입니다.</p>
      <p>삶이 힘들어서 원향을 찾는 분도 있습니다. 공명교는 그 고통을 해결해 주는 상담소가 아닙니다. 다만 이미 일어난 고통과 만남이 어디로 이어지는지, 영혼의 여정 안에서 다시 보게 합니다.</p>
      <blockquote>당신이 견딘 삶은 사라지지 않습니다.</blockquote>
      <p class="page-links">
        <a href="intro.html">공명교 한눈에 →</a>
        <a href="visit.html">오는 법 →</a>
      </p>
""",
)

PAGES["intro.html"] = page(
    "공명교 한눈에 — 공명교",
    "共鳴敎 — 함께 울리는 가르침.",
    "공명교 한눈에",
    "共鳴敎 — 함께 울리는 가르침",
    """
      <h2>한눈에 보는 공명교</h2>
      <ul class="flow">
        <li><strong>신 · 원음</strong><span>중심에서 영원히 울리는 최초의 울림</span></li>
        <li><strong>인간 · 근원파</strong><span>모든 인간은 원음에서 비롯된 울림을 지닌다</span></li>
        <li><strong>핵심 · 명흔</strong><span>진정한 울림은 영혼에 남아 사라지지 않는다</span></li>
        <li><strong>구원</strong><span>완명 → 귀원 → 영명. 나로 남은 채 영원히 공명한다</span></li>
        <li><strong>악</strong><span>절명 → 탁명. 타인의 울림을 파괴하면 영혼도 조화를 잃는다</span></li>
        <li><strong>공간 · 원향</strong><span>공명당과 공명 스테이션이 있는 신앙의 터</span></li>
        <li><strong>대표 의례 · 합명례</strong><span>합명일 — 매달 둘째·넷째 토요일</span></li>
        <li><strong>상징 · 원음 문양</strong><span>근원 · 중심축 · 파동 · 확장의 원</span></li>
      </ul>
      <h2>원음 문양</h2>
      <p>공명교의 상징은 원음 문양입니다.</p>
      <ul>
        <li><strong>원음의 근원</strong> — 창조의 첫 울림, 신 원음 그 자체</li>
        <li><strong>중심축</strong> — 모든 생과 죽음을 관통하는 보이지 않는 원음의 존재</li>
        <li><strong>파동의 흐름</strong> — 세상으로 퍼져 서로 엇갈리며 만나는 인간과 명흔</li>
        <li><strong>확장의 원</strong> — 누구도 공명에서 제외되지 않는 가능성</li>
      </ul>
      <p>완성된 문양은 원음을 중심으로 이룬 하나의 화음, 완명과 영명을 가리킵니다.</p>
      <p class="page-links">
        <a href="world.html">세계 →</a>
        <a href="salvation.html">구원 →</a>
        <a href="ritual.html">의례 →</a>
      </p>
""",
    subnav=True,
)

PAGES["world.html"] = page(
    "세계 — 공명교",
    "원음, 근원파, 실음과 공명.",
    "세계",
    "모든 인간은 원음의 근원파를 지닌 존재다.",
    """
      <p>영혼은 만남을 통해 울림을 얻고, 여러 생을 지나 원음의 세계로 돌아가 영원히 공명합니다.</p>
      <ul class="flow">
        <li><strong>01 · 근원</strong><span><b>원음</b> — 중심에서 영원히 울리는 최초의 울림</span></li>
        <li><strong>02 · 만남</strong><span><b>명흔</b> — 나를 변화시킨 울림이 영혼에 남은 흔적</span></li>
        <li><strong>03 · 다시</strong><span><b>환생</b> — 다시 공명할 기회를 얻는 새로운 생</span></li>
        <li><strong>04 · 조화</strong><span><b>완명</b> — 명흔들이 하나의 화음을 이룬 구원의 완성</span></li>
        <li><strong>05 · 귀향</strong><span><b>귀원</b> — 원음의 세계로 돌아가는 사건</span></li>
        <li><strong>06 · 영원</strong><span><b>영명</b> — 나로 남은 채 영원히 공명하는 상태</span></li>
      </ul>
      <h2>인간관</h2>
      <p>인간은 원음에서 비롯된 하나의 울림입니다.</p>
      <h3>존재 · 근원파</h3>
      <p>모든 인간은 원음의 근원파를 지닙니다. 그래서 어떤 사람도 다른 사람의 수단이 될 수 없습니다. 존엄과 윤리의 근거입니다.</p>
      <h3>상태 · 실음</h3>
      <p>인간의 근본적인 영적 상태입니다. 원음에서 멀어져 자신의 울림이 희미해진 채 살아가며, 외로움·단절·의미 상실로 드러납니다.</p>
      <h3>회복 · 공명</h3>
      <p>다른 울림과 진정으로 주고받을 때, 희미해진 영혼은 다시 울리기 시작합니다. 명흔이 생기는 길입니다.</p>
      <blockquote>공명교의 구원은 실음에서 벗어나, 다시 함께 울리게 되는 과정입니다.</blockquote>
      <h2>명흔은 어떻게 생기는가</h2>
      <p>명흔은 나를 진정으로 변화시킨 울림이 영혼에 남긴 흔적입니다. 육체의 죽음보다 오래 지속되고, 여러 생에 걸쳐 쌓여 마침내 하나의 화음, 완명을 이룹니다.</p>
      <ul>
        <li><strong>진정성</strong> — 스쳐 간 만남이 아니라, 꾸밈없이 마주한 만남</li>
        <li><strong>변화</strong> — 그 만남 이후의 내가 이전과 달라졌을 때</li>
        <li><strong>고통 속에서도</strong> — 잃은 사람, 받은 도움, 견뎌낸 관계도 명흔이 될 수 있다</li>
        <li><strong>강요할 수 없다</strong> — 억지로 얻은 울림은 명흔이 아니다</li>
      </ul>
      <p class="page-links">
        <a href="intro.html">← 한눈에</a>
        <a href="salvation.html">구원 →</a>
      </p>
""",
    subnav=True,
)

PAGES["salvation.html"] = page(
    "구원 — 공명교",
    "완명, 귀원, 영명.",
    "구원",
    "시작은 하나의 음, 끝은 하나의 화음.",
    """
      <h2>영명 · 영원히 울리다</h2>
      <p>완명한 영혼이 더 이상 죽음과 환생을 반복하지 않고, 자신의 고유한 울림을 유지한 채 다른 완명한 영혼들과 영원히 공명하는 상태입니다.</p>
      <ul class="flow">
        <li><strong>완명</strong><span>명흔들이 하나의 화음을 이룸</span></li>
        <li><strong>귀원</strong><span>원음의 세계로 돌아가는 사건</span></li>
        <li><strong>영명</strong><span>그곳에서 얻는 영원한 상태</span></li>
      </ul>
      <h2>왜 영명을 바라는가</h2>
      <ul>
        <li><strong>「사랑하는 사람을 잃고 싶지 않다」</strong> — 죽음이 더 이상 관계를 끊지 못한다. 여러 생에서 명흔을 주고받은 존재들과 다시 공명한다.</li>
        <li><strong>「아무도 나를 완전히 이해하지 못한다」</strong> — 언어가 아닌 영혼의 울림이 닿아 오해와 단절이 사라진다.</li>
        <li><strong>「죽는 것이 두렵다」</strong> — 고통스러운 환생이 끝난다.</li>
        <li><strong>「내가 사라지는 건 싫다」</strong> — 원음에 흡수되지 않는다. 나는 나로, 사랑한 사람은 그 사람으로 남는다.</li>
      </ul>
      <h2>창조에서 구원까지</h2>
      <p>처음에는 원음 하나였고, 원음에서 수많은 울림이 태어나 각자가 수많은 생을 삽니다. 마지막에는 원음을 중심으로 각자의 울림을 잃지 않은 채 하나의 거대한 화음이 됩니다.</p>
      <blockquote>원음은 영혼을 흡수하는 거대한 덩어리가 아니다. 영명이 가능한 세계를 유지하는 최초이자 영원한 울림이다.</blockquote>
      <p class="page-links">
        <a href="world.html">← 세계</a>
        <a href="ethics.html">악과 속죄 →</a>
      </p>
""",
    subnav=True,
)

PAGES["ethics.html"] = page(
    "악과 속죄 — 공명교",
    "절명, 탁명, 속죄.",
    "악과 속죄",
    "공명교에서 악이란 무엇인가.",
    """
      <h2>절명 · 絶鳴</h2>
      <p>타인의 울림을 자신의 욕망을 위해 억압하거나 파괴하는 행위입니다.</p>
      <ul>
        <li><strong>선</strong> — 타인을 나와 같은 원음에서 비롯된, 독립된 울림으로 존중하는 것</li>
        <li><strong>악</strong> — 타인의 울림을 억압·파괴하거나 자신의 목적을 위한 수단으로 만드는 것</li>
      </ul>
      <p>포인트제가 아닙니다. 선행이 명흔을 자동으로 만들지 않고, 헌금이 귀원을 앞당기지 않습니다.</p>
      <h2>악행의 결과 · 탁명</h2>
      <p>절명의 반복 → 탁명(濁鳴) → 완명에서 멀어짐 → 귀원하지 못함 → 다시 환생.</p>
      <p>탁명은 반복된 절명으로 자기 영혼 속 울림들이 조화를 이루지 못하게 된 상태입니다. 아무리 많은 사람을 만나도 그 울림이 하나의 화음이 되지 못합니다.</p>
      <p>지옥은 없습니다. 환생은 귀원하지 못한 결과이자, 다시 공명할 수 있도록 원음이 주는 새로운 기회입니다.</p>
      <blockquote>원음은 어떠한 울림도 영원히 버리지 않는다.</blockquote>
      <h2>속죄</h2>
      <p>의례 한 번으로 지워지는 죄는 없습니다. 원향에서 정명 한 번 하고 용서받는 구조는 없습니다. 자신이 파괴한 울림은 실제 삶에서 책임집니다.</p>
      <ol>
        <li>무엇을 했는지 인정한다</li>
        <li>피해를 멈춘다</li>
        <li>가능한 책임과 배상을 한다</li>
        <li>상대가 원한다면 사과한다</li>
        <li>같은 절명을 반복하지 않는다</li>
      </ol>
      <p>피해자는 가해자를 용서할 의무가 없습니다. 「내 구원을 위해 나를 용서해 달라」는 요구는, 타인의 울림을 자기 구원의 도구로 쓰는 또 다른 절명입니다.</p>
      <h2>정리</h2>
      <ul class="flow">
        <li><strong>실음</strong><span>인간의 근본적인 영적 상태</span></li>
        <li><strong>절명</strong><span>실제로 저지르는 악행(죄)</span></li>
        <li><strong>탁명</strong><span>악행이 영혼에 남기는 부조화</span></li>
        <li><strong>완명</strong><span>명흔들이 이루는 하나의 화음</span></li>
        <li><strong>귀원</strong><span>원음의 세계로 돌아감</span></li>
        <li><strong>영명</strong><span>단절 없는 영원한 공명</span></li>
      </ul>
      <p class="page-links">
        <a href="salvation.html">← 구원</a>
        <a href="ritual.html">의례 →</a>
      </p>
""",
    subnav=True,
)

PAGES["ritual.html"] = page(
    "의례 — 공명교",
    "합명례, 공명 스테이션, 울림 기도, 송명례.",
    "의례",
    "의례는 구원을 사는 도구가 아니다.",
    """
      <p>구원은 삶에서 맺은 울림으로 이루어집니다. 의례는 그 울림을 연습하고, 돌아보고, 원음 앞에 내려놓는 자리입니다.</p>
      <ul>
        <li>의례 한 번으로 악행이 지워지지 않는다</li>
        <li>헌금으로 귀원이 앞당겨지지 않는다</li>
        <li>선행의 횟수로 명흔이 쌓이지 않는다</li>
      </ul>
      <p>공명교의 의례는 세 가지를 합니다. <strong>함께 울린다</strong>(합명례) · <strong>돌아본다</strong>(울림 기도·정명) · <strong>내려놓는다</strong>(공명 스테이션·송명례).</p>
      <h2>합명례 — 공동 의례</h2>
      <p>합명일(매달 둘째·넷째 토요일), 원향의 공명당에서. 비신자도 참여할 수 있습니다.</p>
      <p>의례 속에서 구원의 이야기를 겪습니다. 중앙의 원음 → 서로 다른 소리 → 낯선 사람의 삶 → 하나의 화음 → 원음을 중심으로 남는 화음.</p>
      <blockquote>오늘 들은 울림이 당신에게 남았다면, 다시 찾아오십시오.</blockquote>
      <h2>공명 스테이션 — 개인 의례</h2>
      <p>어두운 공간, 원음 문양과 낮은 울림 속에 떠오르는 안내:</p>
      <blockquote>무엇이 당신을 힘들게 했는지 설명하지 않아도 됩니다.<br/>오늘은 그것이 당신에게 무엇을 남겼는지만 바라보십시오.</blockquote>
      <ol>
        <li><strong>들어선다</strong> — 설명도 상담도 없는 공간. 원음의 낮은 울림만 있다</li>
        <li><strong>바라본다</strong> — 혼자 경험을 떠올리고, 그것이 남긴 울림을 본다</li>
        <li><strong>봉헌한다</strong> — 파편석을 내려놓아 그 경험을 원음에게 바친다</li>
      </ol>
      <h2>울림 기도 — 매일의 의례</h2>
      <blockquote>원음이시여,<br/>
오늘 나에게 닿은 울림을 기억합니다.<br/>
내가 남긴 울림이 누구의 울림도 꺾지 않았기를.<br/>
서로 다른 울림으로 태어난 우리가 서로를 울리게 하시고,<br/>
마침내 당신 곁에서 함께 울리게 하소서.</blockquote>
      <ol>
        <li>문양 앞에 앉아 숨을 고른다</li>
        <li>오늘 울림을 준·받은 한 사람을 떠올린다</li>
        <li>누군가의 울림을 꺾었다면 내일 바로잡을 것을 정한다</li>
        <li>기도문을 읊는다. 마지막 구절은 소리 내어</li>
      </ol>
      <h2>송명례 — 생애 의례(장례)</h2>
      <p>죽음을 끝으로 선언하지 않고, 남은 명흔을 확인하는 자리입니다. 울림 → 증언 → 화음 → 배웅.</p>
      <blockquote>다시는 만날 수 없어도, 그 사람이 당신에게 남긴 울림까지 사라지는 것은 아닙니다.</blockquote>
      <p class="page-links">
        <a href="ethics.html">← 악과 속죄</a>
        <a href="center.html">원향 →</a>
        <a href="../experience/index.html">스테이션 체험 →</a>
      </p>
""",
    subnav=True,
)

PAGES["organization.html"] = page(
    "조직 — 공명교",
    "원향, 공명당, 공명 스테이션.",
    "조직",
    "인간 성직자 위계가 아니라, 공간이 의례를 받칩니다.",
    """
      <p>공명교에는 인간 성직자가 구원을 선포하는 위계가 없습니다. 신앙의 터는 <strong>원향</strong>이며, 그 안에 공동 의례의 자리인 <strong>공명당</strong>과 개인이 원음 앞에 서는 <strong>공명 스테이션</strong>이 있습니다.</p>
      <ul class="flow">
        <li><strong>원향</strong><span>공명당과 스테이션이 있는 신앙의 터</span></li>
        <li><strong>공명당</strong><span>합명례 등 공동 의례가 열리는 자리</span></li>
        <li><strong>공명 스테이션</strong><span>설명·상담 없이 울림을 바라보고 봉헌하는 개인 의례 공간</span></li>
      </ul>
      <p>AI 등은 공간을 안내할 수 있으나, 원음의 뜻을 해석하거나 명흔·귀원·탁명을 선언하지 않습니다.</p>
      <p class="page-links">
        <a href="center.html">원향 소개 →</a>
        <a href="ritual.html">의례 →</a>
      </p>
""",
)

PAGES["center.html"] = page(
    "원향 — 공명교",
    "원향과 합명 공간.",
    "원향",
    "공명당과 공명 스테이션이 있는 신앙의 터.",
    """
      <p>원향은 공명교 신자와 방문자가 모이는 공간입니다. 여기에서 합명례가 열리고, 공명 스테이션에서 개인이 원음 앞에 섭니다.</p>
      <h2>합명일</h2>
      <p>매달 <strong>둘째·넷째 토요일</strong>. 합명례는 비신자도 참여할 수 있습니다.</p>
      <h2>공명 스테이션</h2>
      <p>상담센터가 아닙니다. 「이 고통을 어떻게 해결할 것인가」가 아니라, 「이 고통을 지나온 나의 삶은 무엇을 남기며, 나는 결국 어디로 가는가」를 묻게 합니다.</p>
      <p class="page-links">
        <a href="ritual.html">의례 안내 →</a>
        <a href="hapmyeong-status.html">합명일 현황 →</a>
        <a href="../experience/index.html">스테이션 읽기 체험 →</a>
        <a href="visit.html">오시는 길 →</a>
      </p>
""",
)

PAGES["origins.html"] = page(
    "근원파 소개 — 공명교",
    "원음이 나눈 근원파.",
    "근원파 소개",
    "모든 인간은 원음의 근원파를 지닌다.",
    """
      <p>원음은 완전한 울림을 여러 종류의 <strong>근원파</strong>로 나누었고, 인간의 영혼은 탄생할 때 그중 하나를 품게 됩니다. 세상의 수많은 인간은 서로 달라 보이지만, 같은 원음에서 비롯된 존재입니다.</p>
      <p>근원파의 종류와 정확한 개수는 인간이 알 수 없습니다. 구원은 수집 게임이 아닙니다. 중요한 것은 서로의 울림을 수단화하지 않고 공명하는 일입니다.</p>
      <p class="page-links">
        <a href="world.html">세계 →</a>
        <a href="intro.html">한눈에 →</a>
      </p>
""",
)

PAGES["visit.html"] = page(
    "오는 법 — 공명교",
    "원향 방문과 합명일.",
    "오는 법",
    "우리는 믿으라고 말하지 않습니다. 한 번 들어보라고 말합니다.",
    """
      <h2>무권유 원칙</h2>
      <p>공명교 신자는 특정 개인에게 입교를 반복적으로 권유하지 않습니다. 다른 사람의 울림은 강요하거나 소유할 수 없습니다. 강압적인 포교는 그 자체로 교리에 어긋납니다.</p>
      <h2>합명일</h2>
      <p>매달 둘째·넷째 토요일, 원향의 공명당. 비신자도 합명례에 참여할 수 있습니다.</p>
      <h2>첫 방문의 길</h2>
      <ol>
        <li><strong>계기</strong> — 삶의 힘든 순간, 또는 하나의 질문</li>
        <li><strong>참여</strong> — 「당신에게 남은 울림은 누구인가요?」</li>
        <li><strong>첫 방문</strong> — 공명 스테이션에서 자신의 울림을 발견</li>
        <li><strong>개념 접촉</strong> — 명흔, 진정한 울림은 영혼에 남는다</li>
        <li><strong>재방문</strong> — 합명례에서 다른 이들의 울림을 경험</li>
        <li><strong>배움</strong> — 원음 · 명흔 · 환생 · 귀원</li>
        <li><strong>입교</strong> — 스스로 선택한다</li>
      </ol>
      <h2>오시는 길</h2>
      <div class="content-placeholder">
        <p><strong>주소·교통 안내가 들어올 자리입니다.</strong></p>
        <p class="muted">원향 위치와 찾아오는 방법은 확정되는 대로 반영합니다.</p>
      </div>
      <p class="page-links">
        <a href="center.html">원향 →</a>
        <a href="contact.html">상담·문의 →</a>
        <a href="../experience/index.html">스테이션 체험 →</a>
      </p>
""",
    subnav=True,
)

PAGES["contact.html"] = page(
    "상담·문의 — 공명교",
    "문의 안내.",
    "상담·문의",
    "신앙·방문 문의.",
    """
      <p>공명교는 고민을 해결해 주는 상담 서비스가 아닙니다. 방문·합명일·자료에 대한 안내는 받을 수 있습니다.</p>
      <div class="content-placeholder">
        <p><strong>연락처·문의 양식이 들어올 자리입니다.</strong></p>
        <p class="muted">이메일·전화 등 공식 창구가 정해지면 이 페이지에 반영합니다.</p>
      </div>
      <p class="page-links">
        <a href="visit.html">오는 법 →</a>
        <a href="intro.html">공명교 한눈에 →</a>
      </p>
""",
)

PAGES["practice.html"] = page(
    "수행 — 공명교",
    "울림 기도와 일상 수행.",
    "수행",
    "하루를 마치며, 혼자서.",
    """
      <p>수행의 중심은 매일의 <strong>울림 기도</strong>와, 삶에서 절명을 반복하지 않는 일입니다.</p>
      <blockquote>원음이시여,<br/>
오늘 나에게 닿은 울림을 기억합니다.<br/>
내가 남긴 울림이 누구의 울림도 꺾지 않았기를.<br/>
서로 다른 울림으로 태어난 우리가 서로를 울리게 하시고,<br/>
마침내 당신 곁에서 함께 울리게 하소서.</blockquote>
      <p>자세한 의례 체계는 <a href="ritual.html">의례</a> 페이지를 참고하십시오.</p>
""",
)

PAGES["hapmyeong-status.html"] = page(
    "합명일 현황 — 공명교",
    "합명일 일정.",
    "합명일 현황",
    "매달 둘째·넷째 토요일.",
    """
      <p>합명례는 매달 <strong>둘째·넷째 토요일</strong> 원향의 공명당에서 열립니다. 비신자도 참여할 수 있습니다.</p>
      <div class="content-placeholder">
        <p><strong>회차별 일정·공지가 들어올 자리입니다.</strong></p>
      </div>
      <p class="page-links"><a href="ritual.html">의례 안내 →</a><a href="visit.html">오는 법 →</a></p>
""",
)

# Update about.html to redirect-style pointer to intro
PAGES["about.html"] = page(
    "종교에 대하여 — 공명교",
    "공명교가 왜 종교인지.",
    "종교에 대하여",
    "공명교는 원음을 믿는 종교입니다.",
    """
      <p>공명교의 핵심은 고민을 해결해 주는 서비스가 아닙니다. 흩어진 삶의 울림을 원음으로 향하는 길로 잇는 신앙입니다.</p>
      <p>자세한 소개는 <a href="intro.html">공명교 한눈에</a>, 세계관은 <a href="world.html">세계</a>, 구원은 <a href="salvation.html">구원</a>에서 이어 읽을 수 있습니다.</p>
      <p class="page-links">
        <a href="intro.html">한눈에 →</a>
        <a href="ethics.html">악과 속죄 →</a>
        <a href="ritual.html">의례 →</a>
      </p>
""",
)

for name, html in PAGES.items():
    (SITE / name).write_text(html, encoding="utf-8")
    print("filled", name)

print("total", len(PAGES))
