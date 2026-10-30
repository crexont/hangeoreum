// 씬끼리 공유하는 플레이 상태 (배려 지수, 플래그)
// 플래그 예: smelly(오늘 한 번이라도 냄새 뱀), smelly_lunch(점심에 냄새 뱀),
//          late_morning(오전에 지각), asked(흡연자에게 부드럽게 부탁함), frowned, lessPerfume
const GameState = {
  character: 'jieun',
  breakIndex: 0, // 지금 몇 번째 쉬는 시간인지 (script.json의 breaks 순서)
  score: 0,
  flags: new Set(),
  // 대화에서 생긴 효과 중 걷기 씬이 처리할 것 (예: minwooMoves)
  pendingEffects: [],

  reset(character = 'jieun') {
    this.character = character;
    this.breakIndex = 0;
    this.score = 0;
    this.flags = new Set();
    this.pendingEffects = [];
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
  }
};
