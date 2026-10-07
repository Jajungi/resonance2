const KEY = 'resonance_chats_v1';

function uid() {
  return (crypto.randomUUID && crypto.randomUUID()) || `c_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { chats: [] };
    const data = JSON.parse(raw);
    return { chats: Array.isArray(data.chats) ? data.chats : [] };
  } catch {
    return { chats: [] };
  }
}

function save(data) {
  // Never keep empty conversations
  data.chats = (data.chats || []).filter((c) => hasContent(c));
  localStorage.setItem(KEY, JSON.stringify(data));
}

function hasContent(chat) {
  return (chat.messages || []).some((m) => m.role === 'you' || m.role === 'ai');
}

export function listChats({ userId = null, guest = true } = {}) {
  const { chats } = load();
  return chats
    .filter((c) => {
      if (c.archived) return false;
      if (!hasContent(c)) return false;
      if (guest && !c.userId) return true;
      if (userId && c.userId === userId) return true;
      return false;
    })
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

export function getChat(id) {
  return load().chats.find((c) => c.id === id) || null;
}

/** In-memory draft only — not written until first real message */
export function createChat({ tradition = 'common', userId = null, title = '대화' } = {}) {
  const now = Date.now();
  return {
    id: uid(),
    title,
    tradition,
    userId: userId || null,
    createdAt: now,
    updatedAt: now,
    messages: [],
    archived: false,
    _draft: true,
  };
}

export function updateChat(id, patch) {
  const data = load();
  const idx = data.chats.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  data.chats[idx] = { ...data.chats[idx], ...patch, updatedAt: Date.now() };
  if (!hasContent(data.chats[idx])) {
    data.chats.splice(idx, 1);
    save(data);
    return null;
  }
  save(data);
  return data.chats[idx] || null;
}

export function replaceMessages(id, messages, meta = {}) {
  const meaningful = (messages || []).filter((m) => m.role === 'you' || m.role === 'ai');
  if (!meaningful.length) {
    deleteChat(id);
    return null;
  }

  const data = load();
  let idx = data.chats.findIndex((c) => c.id === id);
  const firstYou = meaningful.find((m) => m.role === 'you');
  const title = firstYou
    ? firstYou.text.replace(/\s+/g, ' ').trim().slice(0, 28) + (firstYou.text.length > 28 ? '…' : '')
    : meta.title || '대화';

  if (idx < 0) {
    data.chats.unshift({
      id,
      title,
      tradition: meta.tradition || 'common',
      userId: meta.userId || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: meaningful,
      archived: false,
    });
  } else {
    data.chats[idx] = {
      ...data.chats[idx],
      ...meta,
      messages: meaningful,
      title,
      updatedAt: Date.now(),
    };
  }
  save(data);
  return getChat(id);
}

export function deleteChat(id) {
  const data = load();
  data.chats = data.chats.filter((c) => c.id !== id);
  save(data);
}

export function pruneEmptyChats() {
  const data = load();
  const before = data.chats.length;
  save(data);
  return before - load().chats.length;
}

export function archiveChat(id) {
  return updateChat(id, { archived: true });
}

export function groupChatsByDate(chats) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startYesterday = startToday - 86400000;

  const groups = new Map();
  for (const chat of chats) {
    const t = chat.updatedAt || chat.createdAt || Date.now();
    const d = new Date(t);
    let label;
    if (t >= startToday) label = '오늘';
    else if (t >= startYesterday) label = '어제';
    else if (d.getFullYear() === now.getFullYear()) label = `${d.getMonth() + 1}월 ${d.getDate()}일`;
    else label = `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;

    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(chat);
  }
  return [...groups.entries()].map(([label, items]) => ({ label, items }));
}

export function formatChatWhen(ts) {
  const d = new Date(ts || Date.now());
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  if (sameDay) return `오늘 ${hm}`;
  if (d.getFullYear() === now.getFullYear()) return `${d.getMonth() + 1}월 ${d.getDate()}일 ${hm}`;
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

// one-time cleanup of already-saved empties
pruneEmptyChats();
