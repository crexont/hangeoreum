// 대화 파트: script.json의 dialogues[id]를 읽어 대사·선택지를 보여줘요.
// 걷기 위에 겹쳐 뜨면(resume) 끝난 뒤 걷기로 돌아가고, then이 있으면 그 씬으로 넘어가요.
class DialogueScene extends Phaser.Scene {
  constructor() {
    super('Dialogue');
  }

  init(data) {
    this.opts = data || {};
  }

  create() {
    this.script = this.registry.get('script');
    this.cfg = this.registry.get('config');
    this.dlg = this.script.dialogues[this.opts.id];
    this.done = false;
    this.choosing = false;
    this.choiceButtons = [];

    if (!this.dlg) {
      console.warn('대화를 찾을 수 없어요:', this.opts.id);
      this.finish();
      return;
    }

    this.drawBackground(this.dlg.bg);
    this.povLayer = this.add.rectangle(0, 0, THEME.W, THEME.H, hex(THEME.color.pov), 0).setOrigin(0).setDepth(10);
    this.povTag = txt(this, THEME.W / 2, 440, '', { size: 30, bold: true, color: '#ffffff' }).setDepth(11).setVisible(false);
    this.povTagBg = this.add.graphics().setDepth(10.5).setVisible(false);

    this.createPortraits(this.dlg.cast || []);
    this.box = new DialogueBox(this);

    if (this.cfg.debug) {
      this.debugText = txt(this, THEME.W - 20, 20, '', { size: 22, ox: 1, oy: 0, color: '#ff0000' }).setDepth(999);
    }

    this.input.on('pointerdown', () => this.advance());
    this.input.keyboard.on('keydown-SPACE', () => this.advance());
    this.input.keyboard.on('keydown-ENTER', () => this.advance());
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((k, i) => {
      this.input.keyboard.on('keydown-' + k, () => {
        if (this.choosing && this.choices[i]) this.choose(this.choices[i]);
      });
    });

    if (this.dlg.bg) this.cameras.main.fadeIn(400);
    this.goNode(this.dlg.start);
  }

  drawBackground(bg) {
    const key = bg ? 'bg_' + bg : null;
    if (key && this.textures.exists(key)) {
      this.add.image(0, 0, key).setOrigin(0).setDisplaySize(THEME.W, THEME.H);
      return;
    }
    const g = this.add.graphics();
    if (bg === 'classroom') {
      g.fillStyle(0xe7f0f7, 1).fillRect(0, 0, THEME.W, 560);
      g.fillStyle(0xf1e4cf, 1).fillRect(0, 560, THEME.W, THEME.H - 560);
      g.fillStyle(0x8a6d4a, 1).fillRect(90, 80, 540, 270);
      g.fillStyle(0x3f6b55, 1).fillRect(104, 94, 512, 242);
      txt(this, 360, 200, '다음 수업 ✏️\n디자인씽킹', { size: 34, color: '#e8f3ea' });
      g.fillStyle(0xc9a77c, 1);
      for (let i = 0; i < 3; i++) g.fillRoundedRect(40 + i * 230, 840, 180, 40, 8);
      g.fillStyle(0xcfe7f5, 1).fillRect(650, 380, 60, 140); // 창문
    } else {
      // 걷기 화면 위에 겹칠 때는 살짝 어둡게
      g.fillStyle(0x000000, 0.35).fillRect(0, 0, THEME.W, THEME.H);
    }
  }

  createPortraits(cast) {
    this.portraits = {};
    const xs = cast.length === 1 ? [360] : [190, 530];
    cast.slice(0, 2).forEach((id, i) => {
      const img = this.add.image(xs[i], 740, id).setDisplaySize(250, 250).setDepth(20).setAlpha(0.5);
      img.baseScale = img.scaleX;
      this.portraits[id] = img;
    });
  }

  highlight(who) {
    for (const [id, img] of Object.entries(this.portraits)) {
      if (img.hiddenByPov) continue;
      const active = id === who;
      this.tweens.add({
        targets: img,
        alpha: active ? 1 : (who === 'narration' ? 0.7 : 0.45),
        scale: img.baseScale * (active ? 1.06 : 1),
        duration: 180
      });
    }
  }

  // ───────── 진행 ─────────

  goNode(id) {
    if (!id) { this.finish(); return; }
    const node = this.dlg.nodes[id];
    if (!node) { console.warn('장면을 찾을 수 없어요:', id); this.finish(); return; }
    this.node = node;
    this.lines = (node.lines || []).filter((l) => GameState.check(l.if));
    this.choices = (node.choices || []).filter((c) => GameState.check(c.if));
    this.lineIdx = -1;
    this.nextLine();
  }

  nextLine() {
    this.lineIdx++;
    if (this.lineIdx >= this.lines.length) {
      if (this.choices.length) this.showChoices();
      else this.goNode(this.node.next ?? null);
      return;
    }
    const line = this.lines[this.lineIdx];
    if (line.effect) this.applyEffect(line.effect);
    const speaker = this.script.characters[line.who] || { name: line.who };
    const isLast = this.lineIdx === this.lines.length - 1;
    this.highlight(line.who);
    // 마지막 줄 다음에 선택지가 있으면, 글자가 다 나오자마자 선택지 표시
    this.box.show(speaker, line.text, isLast && this.choices.length ? () => this.showChoices() : null);
  }

  advance() {
    if (this.done || this.choosing) return;
    if (this.box.typing) { this.box.complete(); return; }
    this.box.hideArrow();
    this.nextLine();
  }

  showChoices() {
    if (this.choosing) return;
    this.choosing = true;
    this.box.hideArrow();
    const n = this.choices.length;
    const h = 100, gap = 18;
    const top = 860 - n * (h + gap);
    this.choiceButtons = this.choices.map((c, i) => {
      const b = makeButton(this, THEME.W / 2, top + i * (h + gap) + h / 2, 640, h, c.text, () => this.choose(c), {
        fill: '#ffffff', stroke: THEME.color.accent, textColor: THEME.color.ink, size: 30
      });
      b.setDepth(200).setAlpha(0);
      this.tweens.add({ targets: b, alpha: 1, y: b.y - 10, duration: 220, delay: i * 80 });
      return b;
    });
  }

  choose(c) {
    if (!this.choosing) return;
    this.choosing = false;
    this.choiceButtons.forEach((b) => b.destroy());
    this.choiceButtons = [];
    GameState.addScore(c.score);
    (c.set || []).forEach((f) => GameState.setFlag(f));
    if (c.effect) this.applyEffect(c.effect);
    if (c.score > 0) floatHeart(this, THEME.W / 2, 600);
    this.goNode(c.next ?? null);
  }

  applyEffect(effect) {
    const list = Array.isArray(effect) ? effect : [effect];
    for (const name of list) {
      if (name === 'povNeighbor') this.setPov(true);
      else if (name === 'povEnd') this.setPov(false);
      else GameState.pendingEffects.push(name); // 걷기 씬이 처리
    }
  }

  // 옆자리 학생 시점으로 잠깐 전환
  setPov(on) {
    const neighbor = this.script.characters.neighbor;
    this.tweens.add({ targets: this.povLayer, fillAlpha: on ? 0.35 : 0, duration: 400 });
    if (on) {
      this.povTag.setText(`👀 ${neighbor.name}의 시점`).setVisible(true);
      this.povTagBg.clear().fillStyle(hex(THEME.color.pov), 1)
        .fillRoundedRect(THEME.W / 2 - this.povTag.width / 2 - 24, 412, this.povTag.width + 48, 56, 28).setVisible(true);
    } else {
      this.povTag.setVisible(false);
      this.povTagBg.setVisible(false);
    }
    const me = this.portraits.jieun;
    const other = this.portraits.neighbor;
    if (me) {
      me.hiddenByPov = on;
      this.tweens.add({ targets: me, alpha: on ? 0 : 0.45, duration: 300 });
    }
    if (other) {
      this.tweens.add({ targets: other, x: on ? 360 : 530, duration: 400, ease: 'Sine.inOut' });
      if (on) {
        this.dizzy = this.tweens.add({ targets: other, angle: { from: -5, to: 5 }, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      } else if (this.dizzy) {
        this.dizzy.stop();
        other.setAngle(0);
      }
    }
  }

  update() {
    if (this.debugText) this.debugText.setText(`배려 ${GameState.score} | ${[...GameState.flags].join(',')}`);
  }

  finish() {
    if (this.done) return;
    this.done = true;
    if (this.opts.then) {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.opts.then));
      return;
    }
    if (this.opts.resume) this.scene.resume(this.opts.resume);
    this.scene.stop();
  }
}
