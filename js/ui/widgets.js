// 둥근 버튼. 손을 뗄 때(pointerup) 실행돼서, 다른 곳을 누르다 넘어와도 실수로 눌리지 않아요.
function makeButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const fill = hex(opts.fill || THEME.color.accent);
  const stroke = opts.stroke ? hex(opts.stroke) : null;
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  g.fillStyle(0x000000, 0.12);
  g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, 26);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 26);
  if (stroke) {
    g.lineStyle(4, stroke, 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 26);
  }
  const t = txt(scene, 0, 0, label, {
    size: opts.size || 32,
    color: opts.textColor || '#ffffff',
    bold: opts.bold ?? true,
    wrap: w - 48
  });
  c.add([g, t]);
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });

  let pressed = false;
  c.on('pointerdown', () => { pressed = true; c.setScale(0.97); });
  c.on('pointerout', () => { pressed = false; c.setScale(1); });
  c.on('pointerup', () => {
    c.setScale(1);
    if (!pressed) return;
    pressed = false;
    if (onClick) onClick();
  });
  c.label = t;
  return c;
}

// 잠깐 떴다 사라지는 안내 문구 (화면 고정)
function showToast(scene, message, opts = {}) {
  const y = opts.y ?? 200;
  const t = txt(scene, 0, 0, message, { size: opts.size || 30, color: '#ffffff', wrap: 580 });
  const padX = 28, padY = 18;
  const bg = scene.add.graphics();
  bg.fillStyle(hex(opts.fill || THEME.color.ink), 0.9);
  bg.fillRoundedRect(-t.width / 2 - padX, -t.height / 2 - padY, t.width + padX * 2, t.height + padY * 2, 24);
  const c = scene.add.container(THEME.W / 2, y + 12, [bg, t]);
  c.setScrollFactor(0, 0, true).setDepth(20000).setAlpha(0);
  scene.tweens.add({ targets: c, alpha: 1, y, duration: 220, ease: 'Back.out' });
  scene.time.delayedCall(opts.duration || 1800, () => {
    scene.tweens.add({ targets: c, alpha: 0, y: y - 12, duration: 300, onComplete: () => c.destroy() });
  });
  return c;
}

// 캐릭터 루트 시작 (타이틀·엔딩에서 공용)
function startRoute(scene, character) {
  GameState.reset(character);
  scene.cameras.main.fadeOut(300);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start('Walk'));
}

// 진엔딩 시작: 공통 대화 true_ending → 엔딩 화면
function startTrueEnding(scene) {
  GameState.reset('jieun');
  GameState.trueEnding = true;
  scene.cameras.main.fadeOut(300);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start('Dialogue', { id: 'true_ending', then: 'Ending' }));
}

// 하트가 톡 떠오르는 효과 (배려 선택 피드백)
function floatHeart(scene, x, y, label) {
  const t = txt(scene, x, y, '💛' + (label ? ' ' + label : ''), { size: 40, bold: true, color: THEME.color.accentDark });
  t.setDepth(20000).setScrollFactor(0);
  scene.tweens.add({ targets: t, y: y - 90, alpha: 0, duration: 1300, ease: 'Sine.out', onComplete: () => t.destroy() });
}
