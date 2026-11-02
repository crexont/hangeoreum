// 시작 화면: 제목 + 캐릭터 선택. 처음엔 평소 흡연 여부를 묻고, 반대 입장 캐릭터를 추천해요.
class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const script = this.registry.get('script');
    const ui = script.ui;
    const W = THEME.W;
    // 1180 높이 기준으로 배치하고, 화면이 더 길면 전체를 세로 가운데로
    const dy = (THEME.H - 1180) / 2;
    this.cameras.main.setBackgroundColor(THEME.color.bg);
    this.cameras.main.fadeIn(300);

    // 배경 장식: 천천히 떠다니는 구름·발자국
    const deco = ['☁️', '🐾', '🌿', '☁️', '🐾'];
    deco.forEach((e, i) => {
      const t = txt(this, 80 + i * 140, dy + 90 + (i % 2) * 80, e, { size: 44 }).setAlpha(0.35);
      this.tweens.add({ targets: t, y: t.y + 16, duration: 1800 + i * 300, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    });

    const title = txt(this, W / 2, dy + 250, ui.title, { size: 108, bold: true, color: THEME.color.ink });
    this.tweens.add({ targets: title, scale: 1.03, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    txt(this, W / 2, dy + 345, ui.subtitle, { size: 32, color: THEME.color.sub, wrap: 640 });

    // 평소 흡연 여부 → 반대 입장 추천 (흡연자에겐 지은, 비흡연자에겐 민우)
    const profile = GameState.getProfile();
    const recommend = { smoker: 'jieun', nonsmoker: 'minwoo' }[profile] || null;
    const label = profile ? ui.profileLabel[profile] : '';
    const change = txt(this, W / 2, dy + 400, label ? `${label} · ${ui.profileChange}` : ui.profileAsk,
      { size: 26, color: THEME.color.accentDark });
    change.setInteractive({ useHandCursor: true }).on('pointerup', () => this.askProfile());

    txt(this, W / 2, dy + 462, recommend ? ui.recommendPrompt : ui.selectCharacter, { size: 36, bold: true });

    const chars = script.characters;
    const cleared = GameState.loadCleared();
    this.makeCard(186, dy + 770, 'jieun', chars.jieun, cleared.jieun, () => startRoute(this, 'jieun'), recommend === 'jieun');
    this.makeCard(534, dy + 770, 'minwoo', chars.minwoo, cleared.minwoo, () => startRoute(this, 'minwoo'), recommend === 'minwoo');

    // 두 루트를 다 깨면 진엔딩 버튼, 아니면 안내 문구
    if (cleared.jieun && cleared.minwoo) {
      makeButton(this, W / 2, dy + 1090, 560, 84, ui.trueEndingButton, () => startTrueEnding(this), { size: 32 });
    } else {
      txt(this, W / 2, dy + 1080, ui.trueEndingHint, { size: 26, color: THEME.color.sub, wrap: 640 });
    }

    // 짧게 하기 토글 (흡연구역 앞에서 QR 찍은 사람은 시간이 짧을 수 있어서)
    const shortText = txt(this, W / 2, dy + 1150, '', { size: 26, bold: true });
    const shortBg = this.add.graphics();
    const paintShort = () => {
      const on = GameState.load('short', false);
      shortText.setText(on ? ui.shortOn : ui.shortOff).setColor(on ? '#ffffff' : THEME.color.accentDark);
      shortBg.clear().fillStyle(on ? hex(THEME.color.accentDark) : 0xffffff, 1)
        .fillRoundedRect(W / 2 - shortText.width / 2 - 22, dy + 1150 - 26, shortText.width + 44, 52, 26);
      if (!on) shortBg.lineStyle(3, hex(THEME.color.accent), 1).strokeRoundedRect(W / 2 - shortText.width / 2 - 22, dy + 1150 - 26, shortText.width + 44, 52, 26);
    };
    shortBg.setDepth(1);
    shortText.setDepth(2).setInteractive({ useHandCursor: true }).on('pointerup', () => {
      GameState.save('short', !GameState.load('short', false));
      paintShort();
    });
    paintShort();

    if (profile === null) this.askProfile();
    else this.remindPledge();
  }

  // 지난번 엔딩에서 고른 "오늘의 한 걸음"을 한 번 물어봐요 (페이지를 열 때 한 번만)
  remindPledge() {
    const pledge = GameState.load('pledge', null);
    if (!pledge || TitleScene.reminded) return;
    TitleScene.reminded = true;
    const ui = this.registry.get('script').ui;
    this.time.delayedCall(600, () => {
      showToast(this, ui.pledgeReminder.replace('{pledge}', pledge), { y: THEME.H / 2, duration: 4200 });
    });
  }

  // "평소에 담배를 피우시나요?" 질문 창 (처음 한 번, 또는 '바꾸기'를 눌렀을 때)
  askProfile() {
    const ui = this.registry.get('script').ui;
    const W = THEME.W, H = THEME.H;
    const D = 1000;
    const dim = this.add.rectangle(0, 0, W, H, 0x000000, 0.45).setOrigin(0).setDepth(D).setInteractive();
    const panelH = 640;
    const top = H / 2 - panelH / 2;
    const panel = this.add.graphics().setDepth(D);
    panel.fillStyle(0xffffff, 1).fillRoundedRect(40, top, W - 80, panelH, 36);
    const q = txt(this, W / 2, top + 110, ui.profileQuestion, { size: 40, bold: true, wrap: 580, lineSpacing: 12 }).setDepth(D);
    const hint = txt(this, W / 2, top + 210, ui.profileHint, { size: 26, color: THEME.color.sub, wrap: 560 }).setDepth(D);
    const parts = [dim, panel, q, hint];
    ['smoker', 'nonsmoker', 'secret'].forEach((key, i) => {
      const b = makeButton(this, W / 2, top + 320 + i * 112, 560, 92, ui.profileOptions[key], () => {
        GameState.setProfile(key);
        this.scene.restart();
      }, { fill: i === 2 ? '#ffffff' : THEME.color.accent, stroke: i === 2 ? THEME.color.line : null,
        textColor: i === 2 ? THEME.color.sub : '#ffffff', size: 32 });
      b.setDepth(D);
      parts.push(b);
    });
    parts.forEach((p) => { p.setAlpha(0); this.tweens.add({ targets: p, alpha: 1, duration: 250 }); });
  }

  makeCard(x, y, key, ch, done, onClick, recommended) {
    const w = 330, h = 520;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 32);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 32);
    g.lineStyle(5, hex(ch.color), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 32);

    const faceY = -150;
    const face = this.add.image(0, faceY, key).setDisplaySize(170, 170);
    const name = txt(this, 0, -24, ch.name, { size: 46, bold: true });

    const tag = txt(this, 0, 36, ch.tag, { size: 28, bold: true, color: '#ffffff' });
    const tagBg = this.add.graphics();
    tagBg.fillStyle(hex(ch.color), 1);
    tagBg.fillRoundedRect(-tag.width / 2 - 20, 36 - 23, tag.width + 40, 46, 23);

    const desc = txt(this, 0, 76, ch.desc, { size: 27, color: THEME.color.sub, wrap: w - 44, lineSpacing: 6, oy: 0 });
    c.add([g, face, name, tagBg, tag, desc]);

    this.tweens.add({ targets: face, y: faceY - 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // 추천 캐릭터는 왼쪽 위에 "👉 추천" + 살짝 통통
    if (recommended) {
      const ui = this.registry.get('script').ui;
      const badge = txt(this, -w / 2 + 20, -h / 2 + 30, ui.recommendBadge, { size: 24, bold: true, color: '#ffffff', ox: 0 });
      const badgeBg = this.add.graphics();
      badgeBg.fillStyle(hex(THEME.color.accentDark), 1).fillRoundedRect(-w / 2 + 6, -h / 2 + 10, badge.width + 28, 40, 20);
      c.add([badgeBg, badge]);
      this.tweens.add({ targets: c, scale: 1.03, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    }

    // 이미 끝낸 루트는 오른쪽 위에 "✔ 완료"
    if (done) {
      const mark = txt(this, w / 2 - 20, -h / 2 + 30, this.registry.get('script').ui.cleared, { size: 24, bold: true, color: '#ffffff', ox: 1 });
      const markBg = this.add.graphics();
      markBg.fillStyle(hex(ch.color), 1).fillRoundedRect(w / 2 - 20 - mark.width - 14, -h / 2 + 10, mark.width + 28, 40, 20);
      c.add([markBg, mark]);
    }

    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    let pressed = false;
    c.on('pointerdown', () => { pressed = true; c.setScale(0.97); });
    c.on('pointerout', () => { pressed = false; c.setScale(1); });
    c.on('pointerup', () => {
      c.setScale(1);
      if (pressed) onClick();
      pressed = false;
    });
    return c;
  }
}
