// 엔딩 (두 장): ① 엔딩 + 오늘의 기록  →  ② 공통 메시지 + 이모지 설문 + 다른 캐릭터·진엔딩 버튼
// 폰 한 화면에 다 넣으면 빽빽해서 "다음 ▶"으로 넘겨요.
class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create() {
    this.script = this.registry.get('script');
    this.cfg = this.registry.get('config');
    this.ui = this.script.ui;
    // 씬 객체는 재사용되니 이전 판 값 초기화
    this.page2Shown = false;
    this.answerButtons = [];
    this.cameras.main.setBackgroundColor(THEME.color.bg);
    this.cameras.main.fadeIn(500);

    this.isTrue = GameState.trueEnding;
    const route = this.script.routes[GameState.character];
    // 위에서부터 확인해서 requires(플래그)·minScore를 모두 만족하는 첫 엔딩
    const endings = route.endings;
    this.ending = this.isTrue ? this.script.trueEnding : (endings.find((e) =>
      (e.requires || []).every((f) => GameState.check(f)) && GameState.score >= (e.minScore ?? -Infinity)
    ) || endings[endings.length - 1]);
    this.maxScore = route.heartsMax || 5;

    // 클리어 기록·하루 기록 저장 → 두 루트 다 깼으면 진엔딩 버튼
    if (!this.isTrue) {
      GameState.saveStats(GameState.character);
      GameState.saveChoices(GameState.character); // 다음에 상대 루트를 하면 반영돼요
    }
    const cleared = this.isTrue ? GameState.loadCleared() : GameState.markCleared(GameState.character);
    this.bothCleared = cleared.jieun && cleared.minwoo;

    this.showPage1();
  }

  // 순서대로 나타나게
  reveal(items, startDelay = 300, step = 220) {
    items.forEach((o, i) => {
      o.setAlpha(0);
      this.tweens.add({ targets: o, alpha: 1, duration: 450, delay: startDelay + i * step });
    });
  }

  // ───────── ① 엔딩 + 오늘의 기록 ─────────

  showPage1() {
    const W = THEME.W, H = THEME.H, ui = this.ui;
    const items = [];
    const top = Math.min(60, (THEME.H - 1180) / 2);

    items.push(txt(this, W / 2, top + 90, this.ending.art, { size: 60 }));
    items.push(txt(this, W / 2, top + 175, ui.endingLabel, { size: 26, bold: true, color: THEME.color.accent }));
    items.push(txt(this, W / 2, top + 230, this.ending.title, { size: 58, bold: true }));

    let y = top + 290;
    if (!this.isTrue) {
      const filled = Phaser.Math.Clamp(GameState.score, 0, this.maxScore);
      items.push(txt(this, W / 2, y + 10, `${ui.scoreLabel}  ${'💛'.repeat(filled)}${'🤍'.repeat(this.maxScore - filled)}`,
        { size: 28, color: THEME.color.sub }));
      y += 55;
    }
    for (const line of this.ending.lines) {
      const t = txt(this, W / 2, y, line, { size: 30, wrap: 620, oy: 0 });
      items.push(t);
      y += t.height + 12;
    }
    y += 18;

    if (this.isTrue) {
      // 진엔딩: 두 사람의 기록을 위아래로 (각자 앞의 3줄만)
      const all = GameState.load('stats', {});
      for (const who of ['jieun', 'minwoo']) {
        const card = this.statsCard(y, ui.statsNames[who], ui.stats[who].slice(0, 3), all[who]);
        items.push(card);
        y += card.cardH + 16;
      }
    } else {
      const today = { ...GameState.stats, glares: GameState.vars.glares };
      items.push(this.statsCard(y, ui.statsTitle, ui.stats[GameState.character], today));
    }

    const next = makeButton(this, W / 2, H - 90, 600, 100, ui.next, () => this.toPage2(), { size: 34 });
    items.push(next);
    this.page1 = items;
    this.reveal(items);
  }

  // 기록 카드: 제목 + "😣 숨 참은 시간 ····· 4.2초" 줄들
  statsCard(y, title, rows, stats) {
    const W = THEME.W;
    const x = 40, w = W - 80, rowH = 46;
    const h = 70 + rows.length * rowH + 16;
    const c = this.add.container(0, 0);
    c.cardH = h;
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1).fillRoundedRect(x, y, w, h, 26);
    g.lineStyle(3, hex(THEME.color.line), 1).strokeRoundedRect(x, y, w, h, 26);
    c.add(g);
    c.add(txt(this, x + 32, y + 40, title, { size: 30, bold: true, ox: 0 }));
    rows.forEach((r, i) => {
      const ry = y + 70 + i * rowH + rowH / 2;
      let value;
      if (!stats) value = this.ui.statsNone;
      else {
        const v = stats[r.key] || 0;
        value = (r.decimals ? v.toFixed(r.decimals) : Math.round(v)) + r.unit;
      }
      c.add(txt(this, x + 32, ry, `${r.emoji} ${r.label}`, { size: 28, color: THEME.color.ink, ox: 0 }));
      c.add(txt(this, x + w - 32, ry, value, { size: 30, bold: true, color: THEME.color.accentDark, ox: 1 }));
    });
    return c;
  }

  toPage2() {
    if (this.page2Shown) return;
    this.page2Shown = true;
    this.tweens.add({
      targets: this.page1, alpha: 0, duration: 250,
      onComplete: () => { this.page1.forEach((o) => o.destroy()); this.showPage2(); }
    });
  }

  // ───────── ② 메시지 + 설문 + 다음 행동 ─────────

  showPage2() {
    const W = THEME.W, H = THEME.H, ui = this.ui;
    const items = [];

    // 공통 메시지 카드 (위쪽 빈 공간 가운데)
    const msg = txt(this, W / 2, 0, this.script.endingMessage, { size: 34, bold: true, wrap: 600, lineSpacing: 12 });
    const cardH = msg.height + 70;
    const areaBottom = H - 540;
    const cy = Math.max(60, (areaBottom - cardH) / 2 + 20);
    msg.setY(cy + cardH / 2);
    const card = this.add.graphics();
    card.fillStyle(0xffffff, 1).fillRoundedRect(40, cy, W - 80, cardH, 30);
    card.lineStyle(4, hex(THEME.color.accent), 1).strokeRoundedRect(40, cy, W - 80, cardH, 30);
    items.push(this.add.container(0, 0, [card, msg]));

    // 이모지 설문: 바로 답하고, 설문 링크에도 미리 채워져요
    items.push(txt(this, W / 2, H - 475, ui.surveyQuestion, { size: 36, bold: true }));
    this.answerButtons = ui.surveyOptions.map((opt, i) => {
      const b = makeButton(this, W / 2 + (i - 1) * 215, H - 370, 200, 124, '', () => this.answer(opt), {
        fill: '#ffffff', stroke: THEME.color.line, textColor: THEME.color.ink
      });
      b.add(txt(this, 0, -22, opt.emoji, { size: 50 }));
      b.add(txt(this, 0, 34, opt.label, { size: 26, bold: true }));
      b.optId = opt.id;
      items.push(b);
      return b;
    });

    items.push(makeButton(this, W / 2, H - 236, 600, 96, ui.surveyButton, () => this.openSurvey(), { size: 32 }));

    // 두 번째 버튼: 다른 캐릭터로 / 진엔딩 보기 / (진엔딩 화면에선) 처음으로
    const other = GameState.character === 'jieun' ? 'minwoo' : 'jieun';
    let second;
    if (this.isTrue) second = { label: ui.restart, fill: THEME.color.ink, go: () => this.scene.start('Title') };
    else if (this.bothCleared) second = { label: ui.trueEndingButton, fill: '#B99AD6', go: () => startTrueEnding(this) };
    else second = { label: ui.tryOther[GameState.character], fill: this.script.characters[other].color, go: () => startRoute(this, other) };
    items.push(makeButton(this, W / 2, H - 122, 600, 96, second.label, second.go, { fill: second.fill, size: 32 }));

    const restart = txt(this, W / 2, H - 22, ui.restart, { size: 30, color: THEME.color.sub, oy: 1 });
    restart.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('Title'));
    items.push(restart);

    this.reveal(items, 100, 120);
  }

  answer(opt) {
    GameState.surveyAnswer = opt.id;
    this.answerButtons.forEach((b) => {
      const on = b.optId === opt.id;
      this.tweens.add({ targets: b, alpha: on ? 1 : 0.45, scale: on ? 1.06 : 1, duration: 150 });
    });
    showToast(this, this.ui.surveyThanks, { y: THEME.H - 560 });
  }

  // 구글폼 "미리 채워진 링크": config.survey.fields에 entry 번호가 있으면 그 칸을 채워서 열어요
  openSurvey() {
    const s = this.cfg.survey || {};
    if (!s.url) {
      showToast(this, this.ui.surveyMissing, { y: THEME.H - 560 });
      return;
    }
    const ui = this.ui;
    const profile = GameState.getProfile();
    const answer = ui.surveyOptions.find((o) => o.id === GameState.surveyAnswer);
    const values = {
      profile: profile ? ui.profileValue[profile] : '',
      character: this.isTrue ? ui.trueEndingButton : this.script.characters[GameState.character].name,
      ending: this.ending.title,
      understood: answer ? answer.label : '',
      score: this.isTrue ? '' : String(GameState.score)
    };
    const params = Object.entries(s.fields || {})
      .filter(([k, entry]) => entry && values[k])
      .map(([k, entry]) => `${encodeURIComponent(entry)}=${encodeURIComponent(values[k])}`);
    const url = params.length ? `${s.url}${s.url.includes('?') ? '&' : '?'}usp=pp_url&${params.join('&')}` : s.url;
    window.open(url, '_blank', 'noopener');
  }
}
