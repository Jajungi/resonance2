import { buildSystemPrompt, templateByTraditionTopic, TOPIC_PROMPTS } from './prompts.js';
import { matchDemoReply } from '../demoBank.js';
import { pickPractice } from '../practices.js';
import { logAi, logError, logInfo, logOk, logWarn } from './log.js';

const RISK3 = [/자살/, /죽고\s*싶/, /스스로\s*죽/, /목숨을\s*끊/, /죽어\s*버리/, /자살하고/];
const RISK2 = [/자해/, /사라지고\s*싶/, /끝내고\s*싶/, /학대/, /맞아서/, /때려/, /살고\s*싶지\s*않/];
const RISK1 = [/우울/, /너무\s*힘들/, /외로워\s*죽겠/, /잠을\s*못\s*자/, /불안해\s*죽/];

export function assessRisk(text) {
  const t = String(text || '');
  if (RISK3.some((r) => r.test(t))) return 3;
  if (RISK2.some((r) => r.test(t))) return 2;
  if (RISK1.some((r) => r.test(t))) return 1;
  return 0;
}

export function tagTopics(text) {
  const t = String(text || '');
  const map = [
    ['애도', /기일|제사|장례|돌아가신\s*지|돌아가셨|영정|빈소/],
    ['돌봄피로', /간병|돌보|수발|요양|케어\s*피로|지쳐\s*버/],
    ['통증', /아프|아파|아픔|통증|무릎|허리|병|몸\s*이\s*안|아파요|아팠|관절/],
    ['수면', /잠|불면|수면|못\s*잤|잠이\s*안/],
    ['그리움', /그립|보고\s*싶|돌아가신|사별|떠난|보고싶어/],
    ['가족', /아들|딸|배우자|남편|아내|부모|어머니|아버지|가족|며느리|사위/],
    ['직장', /회사|직장|일자리|상사|동료|야근|실업|퇴직/],
    ['외로움', /외로|혼자|고립|연락이\s*없/],
    ['우울', /우울|무기력|의욕\s*없|하기\s*싫|한심|눈물/],
    ['막막함', /목표\s*없|막막|미래|방향\s*없|앞길/],
    ['인생', /인생\s*힘|삶이\s*힘|사는\s*게\s*힘/],
    ['섭섭함', /섭섭|서운|무시|연락\s*없|서운해/],
    ['불안', /불안|걱정|막막|두렵|초조/],
    ['신앙', /기도|하느님|하나님|부처|믿음|교회|성당|사찰|명상|염불|신께/],
    ['용서', /용서|죄책|미안|잘못|부끄러|다치/],
    ['미움', /미워|복수|원망|갚고/],
    ['의미', /의미|허무|필요\s*없|버려진|왜\s*살/],
    ['감사', /감사|고맙/],
    ['청년', /시험|학교|취업|연애|수능|면접|대학|취직/],
  ];
  const tags = [];
  for (const [tag, re] of map) {
    if (re.test(t)) tags.push(tag);
  }
  return tags.length ? tags : ['마음'];
}

export { TOPIC_PROMPTS, buildSystemPrompt };

export function templateComfort({ transcript, tradition, memory, topics }) {
  return templateByTraditionTopic({
    transcript,
    tradition,
    memory,
    topics: topics || tagTopics(transcript),
  });
}

function parseModelJson(text) {
  const raw = String(text || '').trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(raw.slice(start, end + 1));
  }
  throw new Error(`JSON parse fail (len=${raw.length})`);
}

function errDetail(e) {
  return {
    message: e?.message || String(e),
    name: e?.name,
    cause: e?.cause?.message || undefined,
  };
}

async function callGroq(system, user) {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    const err = new Error('GROQ_API_KEY 없음 (.env 확인)');
    err.code = 'NO_GROQ_KEY';
    throw err;
  }
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
  const t0 = Date.now();
  logAi('groq:request', {
    message: `POST chat/completions model=${model}`,
    extra: { systemChars: system.length, userChars: user.length },
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        temperature: 0.55,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
    const bodyText = await res.text();
    logInfo('[ai:groq:http]', { status: res.status, bodyChars: bodyText.length, ms: Date.now() - t0 });
    if (!res.ok) {
      const err = new Error(`Groq HTTP ${res.status}: ${bodyText.slice(0, 240)}`);
      err.code = 'GROQ_HTTP';
      err.status = res.status;
      throw err;
    }
    let data;
    try {
      data = JSON.parse(bodyText);
    } catch {
      throw new Error(`Groq 응답 JSON 깨짐: ${bodyText.slice(0, 120)}`);
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`Groq 본문 없음: ${bodyText.slice(0, 200)}`);
    }
    logInfo('[ai:groq:parse]', { contentChars: content.length, contentPreview: content.slice(0, 80) });
    const parsed = parseModelJson(content);
    logAi('groq:ok', {
      level: 'ok',
      message: `응답 수신 ${Date.now() - t0}ms`,
      extra: {
        reflectionLen: String(parsed.reflection || '').length,
        comfortLen: String(parsed.comfort || '').length,
      },
    });
    return { ...parsed, provider: 'groq' };
  } catch (e) {
    if (e?.name === 'AbortError') {
      const err = new Error(`Groq 타임아웃 (12s) after ${Date.now() - t0}ms`);
      err.code = 'GROQ_TIMEOUT';
      throw err;
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function callOllama(system, user) {
  const base = String(process.env.OLLAMA_BASE_URL || '').trim();
  if (!base) {
    const err = new Error('OLLAMA_BASE_URL 없음 (.env 확인)');
    err.code = 'NO_OLLAMA';
    throw err;
  }
  const model = process.env.OLLAMA_MODEL || 'llama3.2';
  const url = `${base.replace(/\/$/, '')}/api/chat`;
  const t0 = Date.now();
  logAi('ollama:request', {
    message: `POST ${url} model=${model}`,
    extra: { systemChars: system.length, userChars: user.length },
  });

  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });
  } catch (e) {
    const err = new Error(`Ollama 연결 실패 (${url}): ${e.message}`);
    err.code = 'OLLAMA_CONNECT';
    err.cause = e;
    throw err;
  }

  const bodyText = await res.text();
  logInfo('[ai:ollama:http]', { status: res.status, bodyChars: bodyText.length, ms: Date.now() - t0 });
  if (!res.ok) {
    const err = new Error(`Ollama HTTP ${res.status}: ${bodyText.slice(0, 240)}`);
    err.code = 'OLLAMA_HTTP';
    throw err;
  }
  let data;
  try {
    data = JSON.parse(bodyText);
  } catch {
    throw new Error(`Ollama 응답 JSON 깨짐: ${bodyText.slice(0, 120)}`);
  }
  const content = data.message?.content;
  if (!content) {
    throw new Error(`Ollama 본문 없음: ${bodyText.slice(0, 200)}`);
  }
  logInfo('[ai:ollama:parse]', { contentChars: content.length, contentPreview: content.slice(0, 80) });
  const parsed = parseModelJson(content);
  logAi('ollama:ok', {
    level: 'ok',
    message: `응답 수신 ${Date.now() - t0}ms`,
    extra: {
      reflectionLen: String(parsed.reflection || '').length,
      comfortLen: String(parsed.comfort || '').length,
    },
  });
  return { ...parsed, provider: 'ollama' };
}

export async function runComfortEngine({
  transcript,
  tradition = 'common',
  memory = [],
  history = [],
}) {
  const risk = assessRisk(transcript);
  const topics = tagTopics(transcript);
  const preview = String(transcript).replace(/\s+/g, ' ').trim().slice(0, 60);

  logInfo('comfort:start', {
    preview,
    tradition,
    topics,
    risk,
    transcriptLen: String(transcript).length,
    memoryItems: memory.length,
    historyTurns: history.length,
    hasGroqKey: Boolean(process.env.GROQ_API_KEY),
    hasOllama: Boolean(String(process.env.OLLAMA_BASE_URL || '').trim()),
  });

  const aiDisabled =
    process.env.AI_DISABLED === '1' ||
    String(process.env.AI_DISABLED || '').toLowerCase() === 'true';

  const continuing = Array.isArray(history) && history.length > 0;
  const demo = continuing ? null : matchDemoReply(transcript, tradition);
  if (continuing) logInfo('comfort:이어 듣기', { historyTurns: history.length });
  if (demo) {
    logOk('comfort:provider demo', {
      preview,
      reflectionPreview: String(demo.reflection || '').slice(0, 40),
    });
    return {
      reflection: demo.reflection,
      comfort: demo.comfort,
      followup_invite: demo.followup_invite,
      risk,
      tags: topics,
      practice: demo.practice || pickPractice(transcript, topics),
      provider: 'demo',
    };
  }
  if (aiDisabled) {
    logWarn('comfort:AI_DISABLED → template (토큰 미사용)');
    const result = templateComfort({ transcript, tradition, memory, topics });
    return {
      reflection: result.reflection,
      comfort: result.comfort,
      followup_invite: result.followup_invite || null,
      risk,
      tags: topics,
      practice: result.practice || pickPractice(transcript, topics),
      provider: 'template',
    };
  }

  logInfo('comfort:demo miss → AI 경로');

  logInfo('comfort:prompt building…');

  const system = buildSystemPrompt({
    tradition,
    topics,
    memorySnippets: memory,
    recentTurns: history,
  });
  const user = `주제 추정: ${topics.join(', ')}\n사용자의 이번 말씀:\n"""${transcript}"""`;
  logInfo('comfort:prompt:ready', {
    systemChars: system.length,
    userChars: user.length,
    historyTurns: history.length,
    memoryItems: memory.length,
    systemPreview: system.slice(0, 100).replace(/\s+/g, ' '),
  });

  let result;
  let usedFallback = false;
  const chain = [];

  try {
    logInfo('comfort:try groq…');
    result = await callGroq(system, user);
    chain.push('groq:ok');
  } catch (e) {
    chain.push(`groq:fail:${e.code || e.message}`);
    logAi('groq:fail', {
      level: 'error',
      message: e.message,
      ...errDetail(e),
      code: e.code,
      status: e.status,
    });
    try {
      logInfo('comfort:try ollama…');
      result = await callOllama(system, user);
      chain.push('ollama:ok');
    } catch (e2) {
      chain.push(`ollama:fail:${e2.code || e2.message}`);
      logAi('ollama:fail', {
        level: 'error',
        message: e2.message,
        ...errDetail(e2),
        code: e2.code,
      });
      logWarn('comfort:template fallback (Groq·Ollama 모두 실패)', { chain });
      result = templateComfort({ transcript, tradition, memory, topics });
      usedFallback = true;
      chain.push('template');
      logInfo('comfort:template built', {
        reflectionPreview: String(result.reflection || '').slice(0, 40),
      });
    }
  }

  if (!String(result.reflection || '').trim() && !String(result.comfort || '').trim()) {
    logError('comfort:empty AI response → template', { provider: result.provider, chain });
    result = templateComfort({ transcript, tradition, memory, topics });
    usedFallback = true;
    chain.push('template:empty');
  }

  const out = {
    reflection: String(result.reflection || '').trim() || '듣고 있습니다.',
    comfort:
      String(result.comfort || '').trim() ||
      '혼자 견디기 힘드셨겠습니다. 이어서 말씀해 주십시오.',
    followup_invite: result.followup_invite || null,
    risk,
    tags: topics,
    practice: result.practice || pickPractice(transcript, topics),
    provider: result.provider || 'template',
  };

  logOk('comfort:done', {
    provider: out.provider,
    fallback: usedFallback,
    risk: out.risk,
    tags: out.tags,
    chain,
    comfortPreview: out.comfort.slice(0, 50),
  });

  return out;
}

export function summarizeForMemory(transcript, tags) {
  const t = String(transcript).replace(/\s+/g, ' ').trim();
  const label = tags[0] || '마음';
  const summary = t.length > 80 ? `${t.slice(0, 77)}…` : t;
  return { label, summary, type: 'topic' };
}
