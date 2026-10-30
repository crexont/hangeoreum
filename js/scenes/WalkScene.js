// 걷기 파트: 탑다운 캠퍼스 맵, 쉬는 시간 타이머, 바람 타는 연기, 터치 이동(길찾기)
class WalkScene extends Phaser.Scene {
  constructor() {
    super('Walk');
  }

  create() {
    this.cfg = this.registry.get('config');
    this.script = this.registry.get('script');
    this.text = this.script.walk;

    this.started = false;   // 첫 이동부터 시계가 흘러요
    this.elapsed = 0;
    this.met = false;       // 흡연구역 대화를 했는지
    this.arrived = false;
    this.inSmoke = false;
    this.breath = 1;
    this.coughUntil = 0;
    this.path = [];
    this.stuck = 0;
    this.pos = { x: MAP.start.x, y: MAP.start.y };
    this.facing = 1;

    this.buildGrid();
    this.drawMap();
    this.createCharacters();
    this.createSmoke();
    this.createHud();
    this.createInput();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP.width, MAP.height);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.fadeIn(300);

    if (this.cfg.debug) this.drawDebug();

    this.events.on('resume', this.onResume, this);
    this.events.once('shutdown', () => this.events.off('resume', this.onResume, this));

    this.time.delayedCall(400, () => this.openDialogue('intro'));
  }

  // ───────── 맵 ─────────

  buildGrid() {
    const c = MAP.cell;
    this.cols = Math.ceil(MAP.width / c);
    this.rows = Math.ceil(MAP.height / c);
    this.grid = new Uint8Array(this.cols * this.rows);
    for (const r of MAP.walkable) {
      const x0 = Math.floor(r.x / c), x1 = Math.ceil((r.x + r.w) / c);
      const y0 = Math.floor(r.y / c), y1 = Math.ceil((r.y + r.h) / c);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) this.grid[y * this.cols + x] = 1;
      }
    }
  }

  isWalkable(x, y) {
    const cx = Math.floor(x / MAP.cell), cy = Math.floor(y / MAP.cell);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return false;
    return this.grid[cy * this.cols + cx] === 1;
  }

  drawMap() {
    if (this.textures.exists('map')) {
      this.add.image(0, 0, 'map').setOrigin(0).setDisplaySize(MAP.width, MAP.height).setDepth(0);
      return;
    }
    const g = this.add.graphics().setDepth(0);
    const rnd = new Phaser.Math.RandomDataGenerator(['hangeoreum']);

    // 잔디
    g.fillStyle(0xc4e5a8, 1).fillRect(0, 0, MAP.width, MAP.height);
    g.fillStyle(0xb2da93, 1);
    for (let i = 0; i < 220; i++) g.fillCircle(rnd.between(0, MAP.width), rnd.between(0, MAP.height), rnd.between(3, 7));

    // 산책로 (가장자리 먼저, 그다음 안쪽)
    const paths = MAP.walkable.filter((r) => r.kind !== 'stairs');
    g.fillStyle(0xdcc49a, 1);
    for (const r of paths) g.fillRoundedRect(r.x - 5, r.y - 5, r.w + 10, r.h + 10, 16);
    g.fillStyle(0xf3e3c3, 1);
    for (const r of paths) g.fillRoundedRect(r.x, r.y, r.w, r.h, 12);

    // 계단
    const s = MAP.stairs;
    g.fillStyle(0xa9a196, 1).fillRect(s.x - 6, s.y, s.w + 12, s.h);
    g.fillStyle(0xddd7ce, 1).fillRect(s.x, s.y, s.w, s.h);
    g.lineStyle(3, 0xbdb5a9, 1);
    for (let y = s.y + 20; y < s.y + s.h; y += 26) g.lineBetween(s.x, y, s.x + s.w, y);

    // 계단 양옆 울타리 수풀
    g.fillStyle(0x8fc472, 1);
    g.fillRoundedRect(254, 470, 30, 1100, 14);
    g.fillRoundedRect(436, 470, 30, 600, 14);

    // 흡연구역
    const z = MAP.smokingArea;
    g.fillStyle(0xb9b1a5, 1).fillRoundedRect(z.x - 4, z.y - 4, z.w + 8, z.h + 8, 22);
    g.fillStyle(0xd3ccc1, 1).fillRoundedRect(z.x, z.y, z.w, z.h, 18);
    g.fillStyle(0x9c8f7d, 1);
    for (let y = z.y + 10; y < z.y + z.h - 10; y += 34) g.fillRect(z.x + 4, y, 10, 22); // 계단 쪽 울타리
    for (let x = z.x + 24; x < z.x + z.w - 10; x += 34) g.fillRect(x, z.y + 4, 22, 10);
    g.fillStyle(0x8a6d4a, 1).fillRoundedRect(z.x + 150, z.y + 200, 60, 140, 10); // 벤치
    this.sign(z.x + z.w / 2, z.y + 46, this.text.signs.smoking);
    txt(this, z.x + 60, z.y + z.h - 60, '🧯', { size: 40 }).setDepth(2);

    // 건물
    const b1 = MAP.buildings.start;
    g.fillStyle(0xe9d8c4, 1).fillRect(b1.x, b1.y, b1.w, b1.h);
    g.fillStyle(0xd6c0a5, 1).fillRect(b1.x, b1.y, b1.w, 16);
    g.fillStyle(0xfff6e6, 1);
    for (let x = 60; x < 700; x += 110) g.fillRoundedRect(x, b1.y + 120, 60, 80, 8);
    g.fillStyle(0x8a6d4a, 1).fillRoundedRect(b1.door.x - 45, b1.y + 4, 90, 50, 8);
    this.sign(b1.door.x, b1.y + 260, this.text.signs.start);

    const b2 = MAP.buildings.goal;
    g.fillStyle(0xcfe0ef, 1).fillRect(b2.x, b2.y, b2.w, b2.h);
    g.fillStyle(0xb5cde2, 1).fillRect(b2.x, b2.y + b2.h - 16, b2.w, 16);
    g.fillStyle(0xf4f9ff, 1);
    for (let x = 60; x < 700; x += 110) g.fillRoundedRect(x, 60, 60, 80, 8);
    g.fillStyle(0x5d7a96, 1).fillRoundedRect(b2.door.x - 45, b2.y + b2.h - 54, 90, 54, 8);
    this.sign(b2.door.x, 200, this.text.signs.goal);

    // 도착 표시
    const star = txt(this, b2.door.x, b2.y + b2.h + 40, '⭐', { size: 44 }).setDepth(3);
    this.tweens.add({ targets: star, scale: 1.25, duration: 600, yoyo: true, repeat: -1 });

    // 갈림길 표지판
    this.sign(150, 1700, this.text.signs.ramp, 24);
    this.sign(360, 1640, this.text.signs.stairs, 24);

    for (const d of MAP.decor) txt(this, d.x, d.y, d.e, { size: 48 }).setDepth(d.y);
  }

  sign(x, y, label, size = 26) {
    const t = txt(this, x, y, label, { size, bold: true }).setDepth(4);
    const bg = this.add.graphics().setDepth(3);
    bg.fillStyle(0xffffff, 0.92);
    bg.fillRoundedRect(x - t.width / 2 - 16, y - t.height / 2 - 8, t.width + 32, t.height + 16, 14);
    return t;
  }

  // ───────── 캐릭터 ─────────

  createCharacters() {
    this.smokerPos = { x: MAP.smoker.x, y: MAP.smoker.y };
    this.minwooShadow = this.add.ellipse(this.smokerPos.x, this.smokerPos.y + 4, 60, 18, 0x000000, 0.18);
    this.minwoo = this.add.image(this.smokerPos.x, this.smokerPos.y, 'minwoo').setOrigin(0.5, 1).setDisplaySize(84, 84);
    this.minwoo.setDepth(this.smokerPos.y);
    this.tweens.add({ targets: this.minwoo, scaleY: this.minwoo.scaleY * 0.97, duration: 900, yoyo: true, repeat: -1 });

    this.playerShadow = this.add.ellipse(this.pos.x, this.pos.y + 4, 60, 18, 0x000000, 0.2);
    this.player = this.add.image(this.pos.x, this.pos.y, 'jieun').setOrigin(0.5, 1).setDisplaySize(84, 84);
    this.baseScale = this.player.scaleX;

    this.bubble = txt(this, 0, 0, this.text.holdBreath, { size: 24, bold: true }).setDepth(6000).setVisible(false);
    this.bubbleBg = this.add.graphics().setDepth(5999).setVisible(false);
    this.bubbleBg.fillStyle(0xffffff, 0.95);
    this.bubbleBg.fillRoundedRect(-this.bubble.width / 2 - 14, -this.bubble.height / 2 - 8, this.bubble.width + 28, this.bubble.height + 16, 16);

    this.marker = this.add.circle(0, 0, 14, hex(THEME.color.accent), 0.6).setDepth(2).setVisible(false);
    this.tweens.add({ targets: this.marker, scale: 1.6, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
  }

  // ───────── 연기 ─────────

  createSmoke() {
    const w = this.cfg.wind;
    this.windBase = w.strength * w.dirX;
    this.windX = this.windBase;
    this.smokeLife = 4600;
    const R = Phaser.Math;

    // 입자 좌표 = 월드 좌표가 되도록 이미터는 (0,0)에 두고 발생 위치를 직접 지정
    this.smoke = this.add.particles(0, 0, 'smoke', {
      x: { onEmit: () => this.smokerPos.x - 14 + R.Between(-10, 10) },
      y: { onEmit: () => this.smokerPos.y - 60 + R.Between(-8, 8) },
      speedX: { onEmit: () => this.windX * R.FloatBetween(0.7, 1.25) },
      speedY: { onEmit: () => R.FloatBetween(-40, 24) },
      lifespan: { onEmit: () => this.smokeLife * R.FloatBetween(0.85, 1.15) },
      scale: { start: 0.4, end: 1.9 },
      alpha: { start: 0.75, end: 0 },
      rotate: { min: 0, max: 360 },
      frequency: 100
    }).setDepth(5000);

    this.time.addEvent({
      delay: w.gustEvery * 1000,
      loop: true,
      callback: () => {
        const target = this.windBase * R.FloatBetween(0.6, 1.4);
        this.tweens.add({ targets: this, windX: target, duration: 900, onUpdate: () => this.updateWindHud() });
      }
    });
  }

  touchingSmoke() {
    const px = this.pos.x, py = this.pos.y - 40;
    for (const p of this.smoke.alive) {
      if (p.alpha < 0.2) continue;
      const r = 48 * p.scaleX * 0.7;
      const dx = p.x - px, dy = p.y - py;
      if (dx * dx + dy * dy < r * r) return true;
    }
    return false;
  }

  // ───────── HUD ─────────

  createHud() {
    const D = 10000;
    const fix = (o) => o.setScrollFactor(0).setDepth(D);

    this.fog = this.add.rectangle(0, 0, THEME.W, THEME.H, 0xbdbdbd, 0).setOrigin(0).setScrollFactor(0).setDepth(D - 1);

    const panel = fix(this.add.graphics());
    panel.fillStyle(0xffffff, 0.94);
    panel.fillRoundedRect(16, 16, THEME.W - 32, 92, 26);

    this.clockText = fix(txt(this, 44, 62, '', { size: 34, bold: true, ox: 0 }));
    this.windText = fix(txt(this, THEME.W - 44, 62, '', { size: 26, ox: 1, color: THEME.color.sub }));
    this.smellBadge = fix(txt(this, 430, 62, this.text.smellBadge, { size: 24, bold: true, color: '#8a6d4a' })).setVisible(false);
    this.updateClock();
    this.updateWindHud();

    // 숨 게이지
    this.breathBox = this.add.container(THEME.W / 2, 140).setScrollFactor(0).setDepth(D).setVisible(false);
    const bbg = this.add.graphics();
    bbg.fillStyle(0xffffff, 0.94).fillRoundedRect(-200, -22, 400, 44, 22);
    const label = txt(this, -170, 0, this.text.breathLabel, { size: 24, bold: true, ox: 0 });
    const barBg = this.add.rectangle(-110, 0, 290, 16, 0xe6e0d6).setOrigin(0, 0.5);
    this.breathBar = this.add.rectangle(-110, 0, 290, 16, 0x6fb3e0).setOrigin(0, 0.5);
    this.breathBox.add([bbg, label, barBg, this.breathBar]);
  }

  updateClock() {
    const limit = this.cfg.clock.realSecondsLimit;
    const total = this.cfg.clock.startMinutes * 60;
    const remain = Math.round(total * (1 - this.elapsed / limit));
    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (remain >= 0) {
      this.clockText.setText(`⏰ ${this.text.clockLabel} ${fmt(remain)}`);
      this.clockText.setColor(remain < total * 0.25 ? THEME.color.late : THEME.color.ink);
    } else {
      this.clockText.setText(`⏰ ${this.text.lateLabel} +${fmt(-remain)}`);
      this.clockText.setColor(THEME.color.late);
    }
  }

  updateWindHud() {
    const arrow = this.windX < 0 ? '←' : '→';
    const strong = Math.abs(this.windX) > Math.abs(this.windBase) * 1.15;
    this.windText.setText(`🍃 ${this.text.windLabel} ${strong ? arrow + arrow : arrow}`);
  }

  // ───────── 입력 ─────────

  createInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys('W,A,S,D');
    this.lastRetarget = 0;

    const retarget = (pointer) => {
      if (this.arrived) return;
      if (pointer.y < 120) return; // 상단 HUD 영역
      const p = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.moveTo(p.x, p.y);
    };
    this.input.on('pointerdown', (pointer) => {
      this.lastRetarget = this.time.now;
      retarget(pointer);
    });
    // 누른 채로 끌면 따라가기
    this.input.on('pointermove', (pointer) => {
      if (!pointer.isDown || this.time.now - this.lastRetarget < 150) return;
      this.lastRetarget = this.time.now;
      retarget(pointer);
    });
  }

  moveTo(tx, ty) {
    const goal = this.nearestWalkable(tx, ty);
    if (!goal) return;
    const path = this.findPath(this.pos.x, this.pos.y, goal.x, goal.y);
    if (!path) return;
    this.path = this.smoothPath(path);
    this.stuck = 0;
    this.marker.setPosition(goal.x, goal.y).setVisible(true);
  }

  nearestWalkable(x, y) {
    if (this.isWalkable(x, y)) return { x, y };
    const c = MAP.cell;
    for (let r = 1; r <= 8; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx * c, ny = y + dy * c;
          if (this.isWalkable(nx, ny)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  // 격자 BFS (8방향) → 셀 중심 좌표 목록
  findPath(sx, sy, tx, ty) {
    const c = MAP.cell, cols = this.cols, rows = this.rows;
    const start = Math.floor(sy / c) * cols + Math.floor(sx / c);
    const goal = Math.floor(ty / c) * cols + Math.floor(tx / c);
    if (this.grid[start] !== 1 || this.grid[goal] !== 1) return null;
    const prev = new Int32Array(cols * rows).fill(-1);
    const queue = new Int32Array(cols * rows);
    let head = 0, tail = 0;
    queue[tail++] = start;
    prev[start] = start;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    while (head < tail) {
      const cur = queue[head++];
      if (cur === goal) break;
      const cx = cur % cols, cy = (cur / cols) | 0;
      for (const [dx, dy] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const n = ny * cols + nx;
        if (this.grid[n] !== 1 || prev[n] !== -1) continue;
        // 대각선은 양옆이 모두 길일 때만 (모서리 끼임 방지)
        if (dx && dy && (this.grid[cy * cols + nx] !== 1 || this.grid[ny * cols + cx] !== 1)) continue;
        prev[n] = cur;
        queue[tail++] = n;
      }
    }
    if (prev[goal] === -1) return null;
    const out = [{ x: tx, y: ty }];
    for (let cur = prev[goal]; cur !== start; cur = prev[cur]) {
      out.push({ x: (cur % cols) * c + c / 2, y: ((cur / cols) | 0) * c + c / 2 });
    }
    return out.reverse();
  }

  lineClear(a, b) {
    const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
    const steps = Math.ceil(dist / 5);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!this.isWalkable(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false;
    }
    return true;
  }

  // 보이는 곳까지는 직선으로 가도록 경유점 줄이기
  smoothPath(path) {
    const out = [];
    let from = { x: this.pos.x, y: this.pos.y };
    let i = 0;
    while (i < path.length) {
      let j = path.length - 1;
      while (j > i && !this.lineClear(from, path[j])) j--;
      out.push(path[j]);
      from = path[j];
      i = j + 1;
    }
    return out;
  }

  tryMove(dx, dy) {
    const { x, y } = this.pos;
    if (this.isWalkable(x + dx, y + dy)) { this.pos.x += dx; this.pos.y += dy; return; }
    if (dx && this.isWalkable(x + dx, y)) { this.pos.x += dx; return; }
    if (dy && this.isWalkable(x, y + dy)) { this.pos.y += dy; }
  }

  // ───────── 진행 ─────────

  update(time, delta) {
    if (this.arrived) return;
    const dt = Math.min(delta, 50) / 1000;

    let vx = 0, vy = 0;
    const k = this.cursors, w = this.wasd;
    if (k.left.isDown || w.A.isDown) vx -= 1;
    if (k.right.isDown || w.D.isDown) vx += 1;
    if (k.up.isDown || w.W.isDown) vy -= 1;
    if (k.down.isDown || w.S.isDown) vy += 1;

    if (vx || vy) {
      this.path = [];
      this.marker.setVisible(false);
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
    } else if (this.path.length) {
      const wp = this.path[0];
      const dx = wp.x - this.pos.x, dy = wp.y - this.pos.y;
      const d = Math.hypot(dx, dy);
      if (d < 6) {
        this.path.shift();
        if (!this.path.length) this.marker.setVisible(false);
      } else {
        vx = dx / d; vy = dy / d;
      }
    }

    const coughing = time < this.coughUntil;
    const moving = (vx || vy) && !coughing;
    if (moving) {
      if (!this.started) this.started = true;
      const step = this.cfg.player.speed * dt;
      const before = this.pos.x + this.pos.y;
      this.tryMove(vx * step, vy * step);
      if (vx) this.facing = vx < 0 ? -1 : 1;
      // 길찾기 중 막히면 다음 경유점으로
      if (this.path.length && Math.abs(this.pos.x + this.pos.y - before) < 0.01) {
        this.stuck += dt;
        if (this.stuck > 0.3) { this.path.shift(); this.stuck = 0; }
      } else {
        this.stuck = 0;
      }
    }

    if (this.started) {
      this.elapsed += dt;
      if (!GameState.has('late') && this.elapsed >= this.cfg.clock.realSecondsLimit) {
        GameState.setFlag('late');
        showToast(this, this.text.lateToast, { y: 220, fill: THEME.color.late });
      }
      this.updateClock();
    }

    this.updateSmokeEffect(time, dt);
    this.syncSprites(time, moving);

    if (!this.met && this.pos.y < MAP.encounterY) {
      this.met = true;
      this.openDialogue('smoking_area');
      return;
    }
    const g = MAP.goal;
    if (this.pos.x > g.x && this.pos.x < g.x + g.w && this.pos.y > g.y && this.pos.y < g.y + g.h) this.arrive();
  }

  updateSmokeEffect(time, dt) {
    const s = this.cfg.smoke;
    const touching = this.touchingSmoke();
    if (touching) {
      if (!GameState.has('smelly')) {
        GameState.setFlag('smelly');
        this.smellBadge.setVisible(true);
        showToast(this, this.text.smokeToast, { y: 220 });
      }
      this.breath -= dt / s.breathSeconds;
      if (this.breath <= 0) this.cough(time);
    } else {
      this.breath = Math.min(1, this.breath + dt * 0.8);
    }
    if (touching !== this.inSmoke) {
      this.inSmoke = touching;
      this.tweens.add({ targets: this.fog, fillAlpha: touching ? 0.28 : 0, duration: 250 });
    }
    this.bubble.setVisible(touching);
    this.bubbleBg.setVisible(touching);
    this.breathBox.setVisible(touching || this.breath < 1);
    this.breathBar.width = 290 * Math.max(0, this.breath);
  }

  cough(time) {
    this.coughUntil = time + this.cfg.smoke.coughStopSeconds * 1000;
    this.breath = 0.5;
    this.cameras.main.shake(220, 0.006);
    const t = txt(this, this.pos.x + 50, this.pos.y - 110, this.text.cough, { size: 34, bold: true, color: THEME.color.late }).setDepth(6001);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  syncSprites(time, moving) {
    const bob = moving ? Math.abs(Math.sin(time * 0.018)) * 10 : 0;
    this.player.setPosition(this.pos.x, this.pos.y - bob);
    this.player.setScale(this.baseScale * this.facing, this.baseScale);
    this.player.setDepth(this.pos.y);
    this.playerShadow.setPosition(this.pos.x, this.pos.y + 4);
    this.bubble.setPosition(this.pos.x, this.pos.y - 120);
    this.bubbleBg.setPosition(this.pos.x, this.pos.y - 120);
  }

  // ───────── 대화·도착 ─────────

  openDialogue(id) {
    this.path = [];
    this.marker.setVisible(false);
    this.scene.launch('Dialogue', { id, resume: 'Walk' });
    this.scene.pause();
  }

  onResume() {
    const effects = GameState.pendingEffects.splice(0);
    if (effects.includes('minwooMoves')) this.moveSmokerAway();
  }

  moveSmokerAway() {
    const to = MAP.smokerFar;
    this.tweens.add({
      targets: [this.smokerPos],
      x: to.x, y: to.y, duration: 1600, ease: 'Sine.inOut',
      onUpdate: () => {
        this.minwoo.setPosition(this.smokerPos.x, this.smokerPos.y).setDepth(this.smokerPos.y);
        this.minwooShadow.setPosition(this.smokerPos.x, this.smokerPos.y + 4);
      }
    });
    // 구석에서는 연기가 계단까지 닿기 전에 흩어져요
    this.smokeLife = 2000;
    this.smoke.frequency = 160;
    showToast(this, this.text.smokeMovedToast, { y: 220 });
  }

  arrive() {
    this.arrived = true;
    this.smoke.stop();
    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Dialogue', { id: 'classroom', then: 'Ending' });
    });
  }

  drawDebug() {
    const g = this.add.graphics().setDepth(9000);
    g.lineStyle(2, 0xff0000, 0.6);
    for (const r of MAP.walkable) g.strokeRect(r.x, r.y, r.w, r.h);
    g.lineStyle(3, 0x0000ff, 0.8).lineBetween(0, MAP.encounterY, MAP.width, MAP.encounterY);
    g.lineStyle(3, 0x00aa00, 0.8).strokeRect(MAP.goal.x, MAP.goal.y, MAP.goal.w, MAP.goal.h);
  }
}
