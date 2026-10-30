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
    this.makeCard(186, dy + 770, 'jieun', chars.jieun, false, () => {
      GameState.reset('jieun');
      this.cameras.main.fadeOut(300);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Walk'));
    });
    this.makeCard(534, dy + 770, 'minwoo', chars.minwoo, true, () => {
      showToast(this, ui.lockedToast, { y: dy + 1080 });
    });

    txt(this, W / 2, dy + 1120, ui.footer, { size: 26, color: THEME.color.sub });
  }

  makeCard(x, y, key, ch, locked, onClick) {
    const w = 330, h = 520;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.1);
    g.fillRoundedRect(-w / 2, -h / 2 + 8, w, h, 32);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(-w / 2, -h / 2, w, h, 32);
    g.lineStyle(5, hex(locked ? THEME.color.locked : ch.color), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 32);

    const faceY = -150;
    const face = this.add.image(0, faceY, key).setDisplaySize(170, 170);
    const name = txt(this, 0, -24, ch.name, { size: 46, bold: true });

    const tag = txt(this, 0, 36, ch.tag, { size: 28, bold: true, color: '#ffffff' });
    const tagBg = this.add.graphics();
    tagBg.fillStyle(hex(locked ? THEME.color.locked : ch.color), 1);
    tagBg.fillRoundedRect(-tag.width / 2 - 20, 36 - 23, tag.width + 40, 46, 23);

    const desc = txt(this, 0, 76, ch.desc, { size: 27, color: THEME.color.sub, wrap: w - 44, lineSpacing: 6, oy: 0 });
    c.add([g, face, name, tagBg, tag, desc]);

    if (locked) {
      c.setAlpha(0.6);
      const lock = txt(this, 0, faceY, this.registry.get('script').ui.locked, { size: 32, bold: true, color: '#ffffff' });
      const lockBg = this.add.graphics();
      lockBg.fillStyle(0x3b3027, 0.75);
      lockBg.fillRoundedRect(-lock.width / 2 - 20, faceY - 30, lock.width + 40, 60, 30);
      c.add([lockBg, lock]);
    } else {
      this.tweens.add({ targets: face, y: faceY - 12, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
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
