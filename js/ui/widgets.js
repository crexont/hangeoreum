// 통통한 파스텔 버튼: 아래 두께(어두운 색) 위에 윗면이 얹혀 있고, 누르면 윗면이 쏙 내려가요.
// 손을 뗄 때(pointerup) 실행돼서, 다른 곳을 누르다 넘어와도 실수로 눌리지 않아요.
// 버튼에 그림(이모지 등)을 더 얹으려면 c.face.add(...)
function makeButton(scene, x, y, w, h, label, onClick, opts = {}) {
  const fillColor = opts.fill || THEME.color.accent;
  const outline = !!opts.stroke;              // 흰 바탕 + 테두리 버튼
  const depth = 7;                            // 버튼 두께
  const r = Math.min(30, h / 2);
  const c = scene.add.container(x, y);

  const base = scene.add.graphics();
  base.fillStyle(outline ? hex(THEME.color.shadow) : darken(fillColor, 0.2), 1);
  base.fillRoundedRect(-w / 2, -h / 2 + depth, w, h, r);

  const face = scene.add.container(0, 0);
  const g = scene.add.graphics();
  g.fillStyle(hex(fillColor), 1);
  g.fillRoundedRect(-w / 2, -h / 2, w, h, r);
  if (outline) {
    g.lineStyle(4, hex(opts.stroke), 1);
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
  } else {
    // 윗면 반짝임 한 줄
    g.fillStyle(0xffffff, 0.25);
    g.fillRoundedRect(-w / 2 + 14, -h / 2 + 8, w - 28, Math.min(14, h / 5), 7);
  }
  const t = txt(scene, 0, 0, label, {
    size: opts.size || 32,
    color: opts.textColor || '#ffffff',
    bold: opts.bold ?? true,
    wrap: w > 160 ? w - 48 : undefined // 아이콘만 있는 작은 버튼은 줄바꿈 안 함
  });
  face.add([g, t]);
  c.add([base, face]);
  c.setSize(w, h + depth);
  c.setInteractive({ useHandCursor: true });

  let pressed = false;
  const down = () => { face.y = depth - 2; };
  const up = () => { face.y = 0; };
  c.on('pointerdown', () => { pressed = true; down(); });
  c.on('pointerout', () => { pressed = false; up(); });
  c.on('pointerup', () => {
    up();
    if (!pressed) return;
    pressed = false;
    if (onClick) onClick();
  });
  c.label = t;
  c.face = face;
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

// 캐릭터 루트 시작 (타이틀·엔딩에서 공용). 판마다 오늘의 바람을 뽑아요.
function startRoute(scene, character) {
  GameState.reset(character, pickWeather(scene.registry.get('config').weathers), GameState.load('short', false));
  scene.cameras.main.fadeOut(300);
  scene.cameras.main.once('camerafadeoutcomplete', () => scene.scene.start('Walk'));
}

// weight(가중치)대로 하나 뽑기
function pickWeather(list) {
  if (!list || !list.length) return null;
  const total = list.reduce((s, w) => s + (w.weight || 1), 0);
  let r = Math.random() * total;
  for (const w of list) {
    r -= w.weight || 1;
    if (r <= 0) return w;
  }
  return list[list.length - 1];
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
