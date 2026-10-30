// 미연시 스타일 하단 대화창: 이름표 + 타자기 효과 본문 + ▼ 표시
class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.x = 24;
    this.w = THEME.W - 48;
    this.h = 360;
    this.y = THEME.H - this.h - 30; // 화면 아래에 붙여서 엄지로 탭하기 쉽게
    this.typing = false;
    this.onDone = null;

    const g = scene.add.graphics().setDepth(100);
    g.fillStyle(0x000000, 0.12);
    g.fillRoundedRect(this.x, this.y + 8, this.w, this.h, 32);
    g.fillStyle(0xffffff, 0.97);
    g.fillRoundedRect(this.x, this.y, this.w, this.h, 32);
    g.lineStyle(4, hex(THEME.color.line), 1);
    g.strokeRoundedRect(this.x, this.y, this.w, this.h, 32);

    this.nameBg = scene.add.graphics().setDepth(101);
    this.nameText = txt(scene, 0, this.y, '', { size: 30, bold: true, color: '#ffffff' }).setDepth(102);

    this.body = txt(scene, this.x + 44, this.y + 56, '', {
      size: 36, wrap: this.w - 88, align: 'left', ox: 0, oy: 0, lineSpacing: 14
    }).setDepth(102);

    this.arrow = txt(scene, this.x + this.w - 44, this.y + this.h - 40, '▼', { size: 26, color: THEME.color.accent }).setDepth(102);
    scene.tweens.add({ targets: this.arrow, y: this.arrow.y + 8, duration: 450, yoyo: true, repeat: -1 });
    this.arrow.setVisible(false);
  }

  // speaker: { name, color } / 내레이션이면 name이 빈 값
  show(speaker, text, onDone) {
    this.stopTyping();
    this.onDone = onDone || null;
    this.arrow.setVisible(false);

    const name = speaker && speaker.name;
    this.nameBg.clear();
    if (name) {
      this.nameText.setText(name);
      const w = this.nameText.width + 48;
      const nx = this.x + 36, ny = this.y - 28;
      this.nameBg.fillStyle(hex(speaker.color || THEME.color.accent), 1);
      this.nameBg.fillRoundedRect(nx, ny, w, 56, 28);
      this.nameText.setPosition(nx + w / 2, ny + 28).setVisible(true);
    } else {
      this.nameText.setVisible(false);
    }
    this.body.setColor(name ? THEME.color.ink : THEME.color.sub);

    // 이모지가 깨지지 않게 글자 단위(코드포인트)로 쪼개기
    this.chars = Array.from(text);
    this.shown = 0;
    this.body.setText('');
    this.typing = true;
    this.timer = this.scene.time.addEvent({
      delay: 28,
      repeat: this.chars.length - 1,
      callback: () => {
        this.shown++;
        this.body.setText(this.chars.slice(0, this.shown).join(''));
        if (this.shown >= this.chars.length) this.finishTyping();
      }
    });
    if (this.chars.length === 0) this.finishTyping();
  }

  // 타자 중에 탭하면 문장 전체를 바로 보여줌
  complete() {
    if (!this.typing) return;
    this.stopTyping();
    this.body.setText(this.chars.join(''));
    this.finishTyping();
  }

  stopTyping() {
    if (this.timer) this.timer.remove(false);
    this.timer = null;
  }

  finishTyping() {
    this.typing = false;
    this.stopTyping();
    const cb = this.onDone;
    this.onDone = null;
    if (cb) cb();
    else this.arrow.setVisible(true);
  }

  hideArrow() {
    this.arrow.setVisible(false);
  }
}
