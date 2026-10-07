/**
 * 전통별 템플릿 응답이 실제로 다른지 점검
 * 실행: node scripts/check-traditions.mjs
 */
import { templateByTraditionTopic } from '../server/prompts.js';
import { tagTopics } from '../server/comfortEngine.js';

const sample = '요즘 밤에 잠이 안 오고 외로워요.';
const topics = tagTopics(sample);
const traditions = ['common', 'catholic', 'protestant', 'buddhist', 'won'];

console.log('샘플 말씀:', sample);
console.log('추정 주제:', topics.join(', '));
console.log('---');

const lines = [];
for (const tradition of traditions) {
  const r = templateByTraditionTopic({
    transcript: sample,
    tradition,
    memory: [],
    topics,
  });
  const full = `${r.reflection} ${r.comfort}`;
  lines.push({ tradition, full });
  console.log(`\n[${tradition}]`);
  console.log(full);
}

const unique = new Set(lines.map((l) => l.full));
console.log('\n---');
console.log(unique.size === lines.length ? 'OK: 전통별 문장이 서로 다릅니다.' : 'WARN: 일부 전통 응답이 동일합니다.');
process.exit(unique.size === lines.length ? 0 : 1);
