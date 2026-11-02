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
  // 이번 판의 주요 선택 기록 (예: { morning: 'asked' }). 엔딩까지 가면 저장돼서 상대 루트에 반영돼요.
  memo: {},
  // 오늘의 바람 (config.weathers 중 하나)
  weather: null,
  // 대사 로그 (📜 버튼)
  log: [],

  // 짧게 하기(오전 장면 → 바로 강의실). 타이틀에서 켜고 끔
  short: false,

  // weather: startRoute에서 config.weathers 중 하나를 뽑아서 넘겨줘요
  reset(character = 'jieun', weather = null, short = false) {
    this.character = character;
    this.short = short;
    this.breakIndex = 0;
    this.score = 0;
    this.flags = new Set(short ? ['short'] : []);
    this.vars = { glares: 0 };
    this.trueEnding = false;
    this.pendingEffects = [];
    this.stats = { breathSec: 0, smellBreaks: 0, coughs: 0, detour: 0, late: 0, glares: 0, hurtPeds: 0, cornerBreaks: 0 };
    this.surveyAnswer = null;
    this.memo = {};
    this.log = [];
    this.weather = weather;
    if (weather) this.setFlag('weather_' + weather.id);

    // 상대 루트에서 내가 했던 선택 → mirror_<장면>_<선택> 플래그 (예: mirror_morning_frowned)
    const other = character === 'jieun' ? 'minwoo' : 'jieun';
    const theirs = this.load('choices', {})[other] || {};
    for (const [key, val] of Object.entries(theirs)) this.setFlag(`mirror_${key}_${val}`);
    // 민우로 배려했던 적이 있으면 (말없이 옮기기 / 옮길게요 / 처음부터 구석)
    if (other === 'minwoo' && ['silent', 'kind', 'far'].includes(theirs.morning)) this.setFlag('mirror_considerate');
  },

  // 이번 판에 할 쉬는 시간 목록. 짧게 하기면 route.short.breaks만 하고, 마지막 도착 대화를 바꿔요.
  routeBreaks(route) {
    if (!this.short || !route.short) return route.breaks;
    const list = route.breaks.filter((b) => route.short.breaks.includes(b.id));
    return list.map((b, i) => (i === list.length - 1
      ? { ...b, arrive: route.short.arrive, flagsAs: route.short.flagsAs }
      : b));
  },

  // script.json의 memo: "morning=asked"
  remember(memo) {
    const [key, val] = memo.split('=');
    this.memo[key] = val;
  },

  // 엔딩까지 간 판의 선택을 저장
  saveChoices(character) {
    const all = this.load('choices', {});
    all[character] = { ...this.memo };
    this.save('choices', all);
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
