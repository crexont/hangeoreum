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
    // 지금 캐릭터 루트의 대화를 먼저 찾고, 없으면 공통 대화(진엔딩 등)
    const route = this.script.routes[GameState.character];
    this.dlg = (route && route.dialogues[this.opts.id]) || this.script.dialogues[this.opts.id];
    this.done = false;
    this.choosing = false;
    this.choiceButtons = [];
    this.dizzy = null;
    this.debugText = null;

    if (!this.dlg) {
      console.warn('대화를 찾을 수 없어요:', this.opts.id);
      this.finish();
      return;
    }

    // 화면 높이가 폰마다 달라서, 대화창 위치(boxY)를 기준으로 배치
    this.boxY = THEME.H - 390;
    this.drawBackground(this.dlg.bg);
    this.povLayer = this.add.rectangle(0, 0, THEME.W, THEME.H, hex(THEME.color.pov), 0).setOrigin(0).setDepth(10);
    this.povTag = txt(this, THEME.W / 2, this.boxY - 450, '', { size: 30, bold: true, color: '#ffffff' }).setDepth(11).setVisible(false);
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
      for (let i = 0; i < 3; i++) g.fillRoundedRect(40 + i * 230, this.boxY - 50, 180, 40, 8);
      g.fillStyle(0xcfe7f5, 1).fillRect(650, 380, 60, 140); // 창문
    } else if (bg === 'cafeteria') {
      g.fillStyle(0xfbe9d0, 1).fillRect(0, 0, THEME.W, 560);
      g.fillStyle(0xf3dcc0, 1).fillRect(0, 560, THEME.W, THEME.H - 560);
      g.fillStyle(0xd9792a, 1).fillRoundedRect(110, 90, 500, 110, 18); // 메뉴판
      txt(this, 360, 145, '오늘의 메뉴  🍱 돈가스', { size: 38, bold: true, color: '#ffffff' });
      g.fillStyle(0xc9a77c, 1).fillRect(0, 380, THEME.W, 60); // 배식대
      txt(this, 360, 330, '🍚  🥗  🍲  🥤', { size: 56 });
      g.fillStyle(0xe2c49c, 1);
      for (let i = 0; i < 3; i++) g.fillRoundedRect(40 + i * 230, this.boxY - 50, 180, 40, 8);
    } else if (bg === 'stairs') {
      // 진엔딩: 계단 + 흡연구역을 정면에서 본 느낌
      g.fillStyle(0xc4e5a8, 1).fillRect(0, 0, THEME.W, THEME.H);
      g.fillStyle(0xddd7ce, 1).fillRect(200, 0, 220, THEME.H);
      g.lineStyle(4, 0xbdb5a9, 1);
      for (let y = 20; y < THEME.H; y += 34) g.lineBetween(200, y, 420, y);
      g.fillStyle(0xd3ccc1, 1).fillRoundedRect(470, 120, 230, 420, 20);
      txt(this, 585, 170, '🚬 흡연구역', { size: 28, bold: true });
      txt(this, 330, 300, '☁️', { size: 80 }).setAlpha(0.6);
      txt(this, 100, 200, '🌳', { size: 70 });
      txt(this, 90, 480, '🌷', { size: 50 });
    } else {
      // 걷기 화면 위에 겹칠 때는 살짝 어둡게
      g.fillStyle(0x000000, 0.35).fillRect(0, 0, THEME.W, THEME.H);
    }
  }

  createPortraits(cast) {
    this.portraits = {};
    const layouts = { 1: [360], 2: [190, 530], 3: [130, 360, 590] };
    const xs = layouts[Math.min(cast.length, 3)] || [];
    const size = cast.length >= 3 ? 210 : 250;
    cast.slice(0, 3).forEach((id, i) => {
      const img = this.add.image(xs[i], this.boxY - 150, id).setDisplaySize(size, size).setDepth(20).setAlpha(0.5);
      img.baseScale = img.scaleX;
      img.homeX = xs[i];
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

  // next/start가 [{if, to}, ...] 목록이면 조건에 맞는 첫 장면
  resolveNext(next) {
    if (!Array.isArray(next)) return next ?? null;
    const hit = next.find((n) => GameState.check(n.if));
    return hit ? hit.to : null;
  }

  goNode(target) {
    const id = this.resolveNext(target);
    if (!id) { this.finish(); return; }
    const node = this.dlg.nodes[id];
    if (!node) { console.warn('장면을 찾을 수 없어요:', id); this.finish(); return; }
    this.node = node;
    // 장면 자체에 붙은 점수·플래그·효과 (선택지 없이 들어와도 적용)
    GameState.addScore(node.score);
    (node.set || []).forEach((f) => GameState.setFlag(f));
    if (node.effect) this.applyEffect(node.effect);
    this.lines = (node.lines || []).filter((l) => GameState.check(l.if));
    this.choices = (node.choices || []).filter((c) => GameState.check(c.if));
    this.lineIdx = -1;
    this.nextLine();
  }

  nextLine() {
    this.lineIdx++;
    if (this.lineIdx >= this.lines.length) {
      if (this.choices.length) this.showChoices();
      else this.goNode(this.node.next);
      return;
    }
    const line = this.lines[this.lineIdx];
    if (line.effect) this.applyEffect(line.effect);
    const speaker = this.script.characters[line.who] || { name: line.who };
    const isLast = this.lineIdx === this.lines.length - 1;
    this.highlight(line.who);
    // 마지막 줄 다음에 선택지가 있으면, 글자가 다 나오자마자 선택지 표시
    // 대사 속 {glares} 같은 칸은 GameState.vars 값으로 채워요
    const text = line.text.replace(/\{(\w+)\}/g, (_, k) => GameState.vars[k] ?? '');
    this.box.show(speaker, text, isLast && this.choices.length ? () => this.showChoices() : null);
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
    const h = 108, gap = 18;
    const top = this.boxY - 30 - n * (h + gap);
    this.choiceButtons = this.choices.map((c, i) => {
      const b = makeButton(this, THEME.W / 2, top + i * (h + gap) + h / 2, 660, h, c.text, () => this.choose(c), {
        fill: '#ffffff', stroke: THEME.color.accent, textColor: THEME.color.ink, size: 33
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
    if (c.score > 0) floatHeart(this, THEME.W / 2, this.boxY - 280);
    this.goNode(c.next);
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
        .fillRoundedRect(THEME.W / 2 - this.povTag.width / 2 - 24, this.povTag.y - 28, this.povTag.width + 48, 56, 28).setVisible(true);
    } else {
      this.povTag.setVisible(false);
      this.povTagBg.setVisible(false);
    }
    const me = this.portraits[GameState.character];
    const other = this.portraits.neighbor;
    if (me) {
      me.hiddenByPov = on;
      this.tweens.add({ targets: me, alpha: on ? 0 : 0.45, duration: 300 });
    }
    if (other) {
      this.tweens.add({ targets: other, x: on ? 360 : other.homeX, duration: 400, ease: 'Sine.inOut' });
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
