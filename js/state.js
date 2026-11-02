// 씬끼리 공유하는 플레이 상태 (배려 지수, 플래그)
// 플래그 예: smelly(오늘 한 번이라도 냄새 뱀), smelly_lunch(점심에 냄새 뱀),
//          late_morning(오전에 지각), asked(흡연자에게 부드럽게 부탁함), frowned, lessPerfume,
//          (민우) spot_near_morning(오전에 계단 쪽에서 피움), considerate, grumpy, smokeOutside, helpedFox, airOut, glared
const GameState = {
  character: 'jieun',
  breakIndex: 0, // 지금 몇 번째 쉬는 시간인지 (script.json의 routes[캐릭터].breaks 순서)
  score: 0,
  flags: new Set(),
  vars: { glares: 0 }, // 대사에 {glares}처럼 끼워 넣을 수 있는 값
  trueEnding: false,
  // 하루 기록 (엔딩의 "오늘의 기록" 카드). 키 이름은 script.json ui.stats와 맞춰요.
  stats: {},
  surveyAnswer: null, // 엔딩에서 고른 이모지 답
  // 대화에서 생긴 효과 중 걷기 씬이 처리할 것 (예: minwooMoves)
  pendingEffects: [],

  reset(character = 'jieun') {
    this.character = character;
    this.breakIndex = 0;
    this.score = 0;
    this.flags = new Set();
    this.vars = { glares: 0 };
    this.trueEnding = false;
    this.pendingEffects = [];
    this.stats = { breathSec: 0, smellBreaks: 0, coughs: 0, detour: 0, late: 0, glares: 0, hurtPeds: 0, cornerBreaks: 0 };
    this.surveyAnswer = null;
  },

  addStat(key, n = 1) {
    this.stats[key] = (this.stats[key] || 0) + n;
  },

  addScore(n) {
    this.score += n || 0;
  },

  setFlag(name) {
    this.flags.add(name);
  },

  has(name) {
    return this.flags.has(name);
  },

  // script.json의 "if" 조건: "smelly" 또는 "!smelly"
  check(cond) {
    if (!cond) return true;
    if (cond.startsWith('!')) return !this.flags.has(cond.slice(1));
    return this.flags.has(cond);
  },

  // ── 폰 브라우저에 남기는 기록 (localStorage). 저장이 막혀 있어도 게임은 계속돼요. ──

  load(key, fallback) {
    try {
      const v = localStorage.getItem('hangeoreum.' + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return fallback;
    }
  },

  save(key, value) {
    try {
      localStorage.setItem('hangeoreum.' + key, JSON.stringify(value));
    } catch (e) { /* 무시 */ }
  },

  // 클리어 기록 (진엔딩 해금용)
  loadCleared() {
    return this.load('cleared', {});
  },

  markCleared(character) {
    const cleared = this.loadCleared();
    cleared[character] = true;
    this.save('cleared', cleared);
    return cleared;
  },

  // 캐릭터별 마지막 하루 기록 (진엔딩에서 두 사람 비교)
  saveStats(character) {
    const all = this.load('stats', {});
    all[character] = { ...this.stats, glares: this.vars.glares };
    this.save('stats', all);
  },

  // 평소 흡연 여부: 'smoker' | 'nonsmoker' | 'secret' | null(아직 안 물어봄)
  getProfile() {
    return this.load('profile', null);
  },

  setProfile(p) {
    this.save('profile', p);
  }
};
