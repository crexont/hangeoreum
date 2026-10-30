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

    // minScore가 높은 엔딩부터 확인해서 처음 만족하는 것
    const endings = [...script.endings].sort((a, b) => b.minScore - a.minScore);
    const ending = endings.find((e) => GameState.score >= e.minScore) || endings[endings.length - 1];
    const maxScore = endings[0].minScore;

    const items = [];
    const add = (o) => { o.setAlpha(0); items.push(o); return o; };

    add(txt(this, W / 2, 140, ending.art, { size: 64 }));
    add(txt(this, W / 2, 250, ui.endingLabel, { size: 24, bold: true, color: THEME.color.accent }));
    add(txt(this, W / 2, 310, ending.title, { size: 58, bold: true }));

    const filled = Phaser.Math.Clamp(GameState.score, 0, maxScore);
    add(txt(this, W / 2, 395, `${ui.scoreLabel}  ${'💛'.repeat(filled)}${'🤍'.repeat(maxScore - filled)}`, { size: 28, color: THEME.color.sub }));

    let y = 470;
    for (const line of ending.lines) {
      const t = add(txt(this, W / 2, y, line, { size: 30, wrap: 600, oy: 0 }));
      y += t.height + 20;
    }

    // 공통 메시지 카드
    y += 20;
    const msg = txt(this, W / 2, 0, script.endingMessage, { size: 30, bold: true, wrap: 580, color: THEME.color.ink, lineSpacing: 12 });
    const cardH = msg.height + 56;
    msg.setY(y + cardH / 2);
    const card = this.add.graphics();
    card.fillStyle(0xffffff, 1).fillRoundedRect(40, y, W - 80, cardH, 28);
    card.lineStyle(4, hex(THEME.color.accent), 1).strokeRoundedRect(40, y, W - 80, cardH, 28);
    const cardWrap = this.add.container(0, 0, [card, msg]);
    add(cardWrap);

    // 하단 버튼 영역 (화면 아래에 고정)
    add(txt(this, W / 2, 990, ui.surveyQuestion, { size: 32, bold: true }));
    add(makeButton(this, W / 2, 1075, 560, 92, ui.surveyButton, () => {
      if (cfg.surveyUrl) window.open(cfg.surveyUrl, '_blank', 'noopener');
      else showToast(this, ui.surveyMissing, { y: 900 });
    }));
    add(makeButton(this, W / 2, 1182, 560, 92, ui.tryMinwoo, () => {
      showToast(this, ui.comingSoon, { y: 900 });
    }, { fill: '#7FA7D9' }));
    const restart = add(txt(this, W / 2, 1250, ui.restart, { size: 26, color: THEME.color.sub }));
    restart.setInteractive({ useHandCursor: true }).on('pointerup', () => this.scene.start('Title'));

    // 순서대로 나타나기
    items.forEach((o, i) => {
      this.tweens.add({ targets: o, alpha: 1, duration: 450, delay: 300 + i * 260 });
    });
  }
}
