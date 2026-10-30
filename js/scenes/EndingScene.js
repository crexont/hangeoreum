// 엔딩: 배려 지수로 엔딩 선택 → 공통 메시지 → 설문/민우 버튼
class EndingScene extends Phaser.Scene {
  constructor() {
    super('Ending');
  }

  create() {
    const script = this.registry.get('script');
    const cfg = this.registry.get('config');
    const ui = script.ui;
    const W = THEME.W;
    this.cameras.main.setBackgroundColor(THEME.color.bg);
    this.cameras.main.fadeIn(500);

    // 위에서부터 확인해서 requires(플래그)·minScore를 모두 만족하는 첫 엔딩
    const endings = script.endings;
    const ending = endings.find((e) =>
      (e.requires || []).every((f) => GameState.check(f)) && GameState.score >= (e.minScore ?? -Infinity)
    ) || endings[endings.length - 1];
    const maxScore = script.heartsMax || 5;

    const items = [];
    const add = (o) => { o.setAlpha(0); items.push(o); return o; };

    // 화면이 길면 위쪽 내용을 조금 아래로 내려 균형 맞추기
    const top = Math.min(80, (THEME.H - 1180) / 2);
    add(txt(this, W / 2, top + 110, ending.art, { size: 64 }));
    add(txt(this, W / 2, top + 205, ui.endingLabel, { size: 26, bold: true, color: THEME.color.accent }));
    add(txt(this, W / 2, top + 262, ending.title, { size: 60, bold: true }));

    const filled = Phaser.Math.Clamp(GameState.score, 0, maxScore);
    add(txt(this, W / 2, top + 340, `${ui.scoreLabel}  ${'💛'.repeat(filled)}${'🤍'.repeat(maxScore - filled)}`, { size: 30, color: THEME.color.sub }));

    let y = top + 395;
    for (const line of ending.lines) {
      const t = add(txt(this, W / 2, y, line, { size: 32, wrap: 620, oy: 0 }));
      y += t.height + 16;
    }

    // 공통 메시지 카드
    y += 14;
    const msg = txt(this, W / 2, 0, script.endingMessage, { size: 32, bold: true, wrap: 600, color: THEME.color.ink, lineSpacing: 10 });
    const cardH = msg.height + 56;
    msg.setY(y + cardH / 2);
    const card = this.add.graphics();
    card.fillStyle(0xffffff, 1).fillRoundedRect(40, y, W - 80, cardH, 28);
    card.lineStyle(4, hex(THEME.color.accent), 1).strokeRoundedRect(40, y, W - 80, cardH, 28);
    const cardWrap = this.add.container(0, 0, [card, msg]);
    add(cardWrap);

    // 하단 버튼 영역 (화면 아래에 붙여서 엄지로 누르기 쉽게)
    const H = THEME.H;
    add(txt(this, W / 2, H - 322, ui.surveyQuestion, { size: 36, bold: true }));
    add(makeButton(this, W / 2, H - 236, 600, 100, ui.surveyButton, () => {
      if (cfg.surveyUrl) window.open(cfg.surveyUrl, '_blank', 'noopener');
      else showToast(this, ui.surveyMissing, { y: H - 380 });
    }, { size: 34 }));
    add(makeButton(this, W / 2, H - 122, 600, 100, ui.tryMinwoo, () => {
      showToast(this, ui.comingSoon, { y: H - 380 });
    }, { fill: '#7FA7D9', size: 34 }));
    const restart = add(txt(this, W / 2, H - 22, ui.restart, { size: 30, color: THEME.color.sub, oy: 1 }));
    restart.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('Title'));

    // 순서대로 나타나기
    items.forEach((o, i) => {
      this.tweens.add({ targets: o, alpha: 1, duration: 450, delay: 300 + i * 260 });
    });
  }
}
