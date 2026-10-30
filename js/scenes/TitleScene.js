// 시작 화면: 제목 + 캐릭터 선택 (민우는 잠금)
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
    txt(this, W / 2, dy + 350, ui.subtitle, { size: 32, color: THEME.color.sub, wrap: 640 });

    txt(this, W / 2, dy + 460, ui.selectCharacter, { size: 38, bold: true });

    const chars = script.characters;
    const cleared = GameState.loadCleared();
    this.makeCard(186, dy + 770, 'jieun', chars.jieun, cleared.jieun, () => startRoute(this, 'jieun'));
    this.makeCard(534, dy + 770, 'minwoo', chars.minwoo, cleared.minwoo, () => startRoute(this, 'minwoo'));

    // 두 루트를 다 깨면 진엔딩 버튼, 아니면 안내 문구
    if (cleared.jieun && cleared.minwoo) {
      makeButton(this, W / 2, dy + 1090, 560, 84, ui.trueEndingButton, () => startTrueEnding(this), { size: 32 });
    } else {
      txt(this, W / 2, dy + 1080, ui.trueEndingHint, { size: 26, color: THEME.color.sub, wrap: 640 });
    }

    txt(this, W / 2, dy + 1155, ui.footer, { size: 24, color: THEME.color.sub });
  }

  makeCard(x, y, key, ch, done, onClick) {
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
