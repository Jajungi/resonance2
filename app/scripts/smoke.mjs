async function flow() {
  const base = 'http://localhost:8787';
  const health = await fetch(base + '/api/health').then((r) => r.json());
  console.log('health', health);
  const comfort = await fetch(base + '/api/comfort', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: '회사에서 너무 외롭고 섭섭합니다',
      tradition: 'common',
      memory: [],
    }),
  }).then((r) => r.json());
  console.log('comfort', comfort.provider, comfort.tags, comfort.risk);
  const login = await fetch(base + '/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '01099998888', pin: '5678', displayName: '테스트' }),
  }).then((r) => r.json());
  const token = login.user.token;
  await fetch(base + '/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: JSON.stringify({ transcript: '어머니 그리움이 큽니다' }),
  });
  const mem = await fetch(base + '/api/memory', {
    headers: { Authorization: 'Bearer ' + token },
  }).then((r) => r.json());
  console.log('memory items', mem.items.length, mem.items[0]?.label);
  const res = await fetch(base + '/api/resonance/match', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags: ['그리움'] }),
  }).then((r) => r.json());
  console.log('resonance', res.clip?.id);
  const page = await fetch('http://localhost:5173/').then((r) => r.text());
  console.log('has stage', page.includes('id="stage"'), 'has module', page.includes('main.js'));
}

flow().catch((e) => {
  console.error(e);
  process.exit(1);
});
