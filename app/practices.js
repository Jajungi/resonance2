/** 작은 실천 — 설교·숙제 없이 한 걸음만. 기본은 건너뛰기. */

export const PRACTICE_CARDS = {
  breath: {
    kicker: '한 걸음',
    title: '숨 세 번',
    body: '오늘, 숨만 세 번 천천히 쉬어 보셔도 됩니다. 안 하셔도 됩니다.',
  },
  word: {
    kicker: '한 걸음',
    title: '짧은 한 마디',
    body: '마음에 걸리는 분께, 안부 한 마디만 해 보셔도 됩니다. 안 하셔도 됩니다.',
  },
  norepay: {
    kicker: '한 걸음',
    title: '같은 말로 갚지 않기',
    body: '미운 마음이 있어도, 오늘은 같은 말로 갚지 않기만 지켜 보셔도 됩니다. 안 하셔도 됩니다.',
  },
  still: {
    kicker: '한 걸음',
    title: '잠깐 앉아 있기',
    body: '답을 찾지 않아도 됩니다. 잠깐 여기 앉아 그 마음을 두기만 하셔도 됩니다.',
  },
  thanks: {
    kicker: '한 걸음',
    title: '감사 한 줄',
    body: '감사한 일 하나만, 소리 내어 말해 보셔도 됩니다. 누구를 위한 숙제가 아닙니다.',
  },
  person: {
    kicker: '다음 문',
    title: '사람 쪽',
    body: '원하시면, 이야기 나눌 수 있는 사람 안내를 드릴 수 있습니다. 지금 아니어도 됩니다.',
  },
};

const TRADITION_TAIL = {
  common: '',
  catholic: '원하시면 마음에만, 짧게 평화를 청하셔도 됩니다.',
  protestant: '원하시면, 그 짐을 혼자 지지 않아도 된다고 한 번만 떠올리셔도 됩니다.',
  buddhist: '원하시면 숨과 함께, 있는 그대로만 보아도 됩니다.',
  won: '원하시면 오늘 스친 은혜 하나만 떠올리셔도 됩니다.',
};

export function pickPractice(text, tags = []) {
  const t = String(text || '');
  if (/자살|죽고\s*싶|살고\s*싶지/.test(t)) return 'person';
  if (/미워|복수|갚|원망/.test(t)) return 'norepay';
  if (/감사|고맙/.test(t)) return 'thanks';
  if (/앉아|아무\s*말|기도|하느님|하나님|부처|믿|용서|죄/.test(t)) return 'still';
  if (/가족|부모|친구|연애|연락/.test(t) || tags.includes('가족') || tags.includes('외로움')) {
    return 'word';
  }
  return 'breath';
}

export function practiceCard(id, tradition = 'common') {
  const card = PRACTICE_CARDS[id] || PRACTICE_CARDS.breath;
  const tail = TRADITION_TAIL[tradition] || '';
  return {
    ...card,
    id: PRACTICE_CARDS[id] ? id : 'breath',
    body: tail ? `${card.body} ${tail}` : card.body,
  };
}
