// 걷기 파트: 탑다운 캠퍼스 맵, 쉬는 시간 타이머, 바람 타는 연기, 터치 이동(길찾기)
class WalkScene extends Phaser.Scene {
  constructor() {
    super('Walk');
  }

  create() {
    this.cfg = this.registry.get('config');
    this.script = this.registry.get('script');
    this.text = this.script.walk;

    // 이번 쉬는 시간 정보 (script.json의 routes[캐릭터].breaks + config.json의 breaks[캐릭터])
    this.routeData = this.script.routes[GameState.character];
    this.brk = this.routeData.breaks[GameState.breakIndex];
    this.brkCfg = this.cfg.breaks[GameState.character][this.brk.id];
    this.from = MAP.points[this.brk.from];
    this.to = MAP.points[this.brk.to];
    // 흡연자 모드(민우): 흡연구역에서 멈춰 서서 한 대를 다 피워야 도착할 수 있어요
    this.smokerMode = this.brk.mode === 'smoker';
    this.smokeProgress = 0;
    this.smokeDone = !this.smokerMode;
    this.isSmoking = false;
    this.spotRecorded = false;
    this.zoneHintShown = false;
    // 씬 객체는 재시작해도 재사용되니, 이전 판의 값이 남지 않게 초기화
    this.myEmitter = null;
    this.actor = null;
    this.glareText = null;

    this.started = false;   // 첫 이동부터 시계가 흘러요
    this.elapsed = 0;
    this.met = false;       // 계단 아래 대화를 했는지
    this.arrived = false;
    this.inSmoke = false;
    this.smellToastShown = false;
    this.locked = true;     // 전환 화면 동안은 못 움직여요
    this.breath = 1;
    this.coughUntil = 0;
    this.path = [];
    this.stuck = 0;
    this.pos = { x: this.from.start.x, y: this.from.start.y };
    this.facing = 1;

    this.buildGrid();
    this.drawMap();
    this.createCharacters();
    this.createSmoke();
    this.createPedestrians();
    this.createHud();
    this.createInput();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, MAP.width, MAP.height);
    cam.startFollow(this.player, true, 0.12, 0.12);
    cam.fadeIn(300);

    if (this.cfg.debug) this.drawDebug();

    this.events.on('resume', this.onResume, this);
    this.events.once('shutdown', () => this.events.off('resume', this.onResume, this));

    this.showBreakCard(() => this.openDialogue(this.brk.intro));
  }

  // "— 점심시간 12:00 —" 같은 전환 화면
  showBreakCard(onDone) {
    const D = 30000;
    const bg = this.add.rectangle(0, 0, THEME.W, THEME.H, hex(THEME.color.bg), 1).setOrigin(0).setScrollFactor(0).setDepth(D);
    const time = txt(this, THEME.W / 2, THEME.H / 2 - 50, this.brk.time, { size: 44, color: THEME.color.accent, bold: true })
      .setScrollFactor(0).setDepth(D);
    const title = txt(this, THEME.W / 2, THEME.H / 2 + 20, this.brk.title, { size: 60, bold: true }).setScrollFactor(0).setDepth(D);
    const dots = txt(this, THEME.W / 2, THEME.H / 2 + 110, this.routeData.breaks.map((b, i) => (i <= GameState.breakIndex ? '●' : '○')).join('  '),
      { size: 30, color: THEME.color.sub }).setScrollFactor(0).setDepth(D);
    const parts = [bg, time, title, dots];
    this.time.delayedCall(1500, () => {
      this.tweens.add({
        targets: parts, alpha: 0, duration: 400,
        onComplete: () => { parts.forEach((p) => p.destroy()); this.locked = false; onDone(); }
      });
    });
  }

  // ───────── 맵 ─────────

  buildGrid() {
    const c = MAP.cell;
    this.cols = Math.ceil(MAP.width / c);
    this.rows = Math.ceil(MAP.height / c);
    this.grid = new Uint8Array(this.cols * this.rows);
    const rects = this.smokerMode ? MAP.walkable.concat(MAP.smokerWalkable) : MAP.walkable;
    for (const r of rects) {
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

    // 도착 표시 (이번 쉬는 시간의 목적지). 흡연자 모드면 다 피울 때까지 흡연구역에 🚬 표시
    this.goalStar = txt(this, this.to.star.x, this.to.star.y, '⭐', { size: 44 }).setDepth(3).setVisible(this.smokeDone);
    this.tweens.add({ targets: this.goalStar, scale: 1.25, duration: 600, yoyo: true, repeat: -1 });
    this.zoneMarker = txt(this, z.x + z.w / 2, z.y + z.h / 2, '⬇🚬', { size: 44 }).setDepth(3).setVisible(!this.smokeDone);
    this.tweens.add({ targets: this.zoneMarker, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });

    // 갈림길 표지판
    this.sign(205, 1715, this.text.signs.ramp, 28);
    this.sign(360, 1645, this.text.signs.stairs, 28);

    for (const d of MAP.decor) txt(this, d.x, d.y, d.e, { size: 48 }).setDepth(d.y);
  }

  sign(x, y, label, size = 32) {
    const t = txt(this, x, y, label, { size, bold: true }).setDepth(4);
    const bg = this.add.graphics().setDepth(3);
    bg.fillStyle(0xffffff, 0.92);
    bg.fillRoundedRect(x - t.width / 2 - 16, y - t.height / 2 - 8, t.width + 32, t.height + 16, 14);
    return t;
  }

  // ───────── 캐릭터 ─────────

  createCharacters() {
    // 이번 쉬는 시간에 나오는 흡연자들 (각자 위치·연기를 가져요)
    this.smokers = this.brk.smokers.map((s) => {
      const spot = MAP.smokers[s.id];
      const far = !!s.farIf && GameState.check(s.farIf);
      const at = far ? spot.far : spot.near;
      const pos = { x: at.x, y: at.y };
      const shadow = this.add.ellipse(pos.x, pos.y + 4, 60, 18, 0x000000, 0.18);
      const sprite = this.add.image(pos.x, pos.y, s.id).setOrigin(0.5, 1).setDisplaySize(84, 84).setDepth(pos.y);
      this.tweens.add({ targets: sprite, scaleY: sprite.scaleY * 0.97, duration: 900, yoyo: true, repeat: -1 });
      return { id: s.id, pos, sprite, shadow, far, life: far ? MAP.farLife : spot.nearLife };
    });

    this.playerShadow = this.add.ellipse(this.pos.x, this.pos.y + 4, 60, 18, 0x000000, 0.2);
    this.player = this.add.image(this.pos.x, this.pos.y, GameState.character).setOrigin(0.5, 1).setDisplaySize(84, 84);
    this.baseScale = this.player.scaleX;

    // 머리 위 말풍선 + 게이지 (눈이 캐릭터에 가 있으니 게이지도 여기에)
    // 지은: "숨 참는 중…" + 숨 게이지 / 민우: "한 대 피우는 중…" + 흡연 게이지
    this.bubble = this.makeBubble(this.text.holdBreath, 0x6fb3e0);
    this.smokeBubble = this.makeBubble(this.text.smokingLabel, 0xb9b1a5);

    // 민우 루트에서 대화 때 계단에 나타나는 인물 (예: 지은)
    if (this.brk.encounterActor) {
      const a = MAP.stairWalker;
      this.actor = this.add.image(a.x, a.y, this.brk.encounterActor).setOrigin(0.5, 1).setDisplaySize(84, 84)
        .setDepth(a.y).setVisible(false);
    }

    this.marker = this.add.circle(0, 0, 14, hex(THEME.color.accent), 0.6).setDepth(2).setVisible(false);
    this.tweens.add({ targets: this.marker, scale: 1.6, alpha: 0.2, duration: 600, yoyo: true, repeat: -1 });
  }

  makeBubble(labelText, barColor) {
    const label = txt(this, 0, -18, labelText, { size: 30, bold: true });
    const bw = Math.max(label.width + 40, 240);
    const bg = this.add.graphics();
    bg.fillStyle(0xffffff, 0.96);
    bg.fillRoundedRect(-bw / 2, -50, bw, 96, 20);
    const barBg = this.add.rectangle(-bw / 2 + 20, 24, bw - 40, 14, 0xe6e0d6).setOrigin(0, 0.5);
    const bar = this.add.rectangle(-bw / 2 + 20, 24, bw - 40, 14, barColor).setOrigin(0, 0.5);
    const box = this.add.container(0, 0, [bg, label, barBg, bar]).setDepth(6000).setVisible(false);
    box.bar = bar;
    box.barW = bw - 40;
    box.setRatio = (r) => { bar.width = box.barW * Phaser.Math.Clamp(r, 0, 1); };
    return box;
  }

  // ───────── 연기 ─────────

  createSmoke() {
    const w = this.cfg.wind;
    this.windBase = this.brkCfg.windStrength * w.dirX;
    this.windX = this.windBase;
    const R = Phaser.Math;

    // 흡연자마다 연기 하나씩.
    // 입자 좌표 = 월드 좌표가 되도록 이미터는 (0,0)에 두고 발생 위치를 직접 지정
    for (const s of this.smokers) {
      s.emitter = this.add.particles(0, 0, 'smoke', {
        x: { onEmit: () => s.pos.x - 14 + R.Between(-10, 10) },
        y: { onEmit: () => s.pos.y - 60 + R.Between(-8, 8) },
        speedX: { onEmit: () => this.windX * R.FloatBetween(0.7, 1.25) },
        speedY: { onEmit: () => R.FloatBetween(-40, 24) },
        lifespan: { onEmit: () => s.life * R.FloatBetween(0.85, 1.15) },
        scale: { start: 0.4, end: 1.9 },
        alpha: { start: 0.75, end: 0 },
        rotate: { min: 0, max: 360 },
        frequency: s.far ? 160 : 100
      }).setDepth(5000);
    }

    // 흡연자 모드: 내 연기. 피우는 동안만 나오고, 계단 쪽 자리면 멀리(계단까지), 구석이면 짧게 날아가요.
    if (this.smokerMode) {
      const me = { id: 'me', pos: this.pos };
      const nearLife = MAP.smokers.minwoo.nearLife;
      me.emitter = this.add.particles(0, 0, 'smoke', {
        x: { onEmit: () => this.pos.x - 14 + R.Between(-10, 10) },
        y: { onEmit: () => this.pos.y - 60 + R.Between(-8, 8) },
        speedX: { onEmit: () => this.windX * R.FloatBetween(0.7, 1.25) },
        speedY: { onEmit: () => R.FloatBetween(-40, 24) },
        lifespan: { onEmit: () => (this.pos.x < MAP.nearSpotMaxX ? nearLife : MAP.farLife) * R.FloatBetween(0.85, 1.15) },
        scale: { start: 0.4, end: 1.9 },
        alpha: { start: 0.75, end: 0 },
        rotate: { min: 0, max: 360 },
        frequency: 100,
        emitting: false
      }).setDepth(5000);
      this.myEmitter = me.emitter;
    }

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
    return this.smokeAt(this.pos.x, this.pos.y - 40, false) !== null;
  }

  // (x, y)에 연기가 있으면 'mine'(내 연기) / 'other', 없으면 null
  smokeAt(x, y, includeMine) {
    const hit = (emitter) => {
      for (const p of emitter.alive) {
        if (p.alpha < 0.2) continue;
        const r = 48 * p.scaleX * 0.7;
        const dx = p.x - x, dy = p.y - y;
        if (dx * dx + dy * dy < r * r) return true;
      }
      return false;
    };
    if (includeMine && this.myEmitter && hit(this.myEmitter)) return 'mine';
    for (const s of this.smokers) if (hit(s.emitter)) return 'other';
    return null;
  }

  // ───────── 계단 행인 ─────────
  // 계단을 오르내리는 학생들. 연기에 닿으면 😣, 민우 루트에선 흡연자를 쳐다보기도(👀 시선)

  createPedestrians() {
    this.peds = [];
    const pc = this.cfg.pedestrians;
    this.time.addEvent({ delay: pc.every * 1000, loop: true, callback: () => this.spawnPedestrian() });
    // 처음부터 계단에 몇 명 있게
    for (let i = 0; i < 4; i++) this.spawnPedestrian(Phaser.Math.Between(600, 1500));
  }

  spawnPedestrian(atY) {
    const s = MAP.stairs;
    const up = Math.random() < 0.5;
    const x = Phaser.Math.Between(s.x + 30, s.x + s.w - 30);
    const y = atY ?? (up ? s.y + s.h - 10 : s.y + 10);
    const emoji = Phaser.Utils.Array.GetRandom(MAP.pedestrians);
    const body = txt(this, x, y, emoji, { size: 54, oy: 1 }).setDepth(y);
    const face = txt(this, x + 26, y - 70, '😣', { size: 30 }).setDepth(6000).setVisible(false);
    this.peds.push({ body, face, x, y, dir: up ? -1 : 1, glanced: false, hurt: 0 });
  }

  updatePedestrians(dt) {
    const pc = this.cfg.pedestrians;
    const s = MAP.stairs;
    const smoking = this.smokerMode && this.isSmoking;
    for (let i = this.peds.length - 1; i >= 0; i--) {
      const p = this.peds[i];
      const where = this.smokeAt(p.x, p.y - 30, true);
      // 연기 속에선 숨 참고 빨리 걸어요
      p.y += p.dir * pc.speed * (where ? 1.5 : 1) * dt;
      p.hurt = where ? 0.6 : Math.max(0, p.hurt - dt);
      p.body.setPosition(p.x, p.y).setDepth(p.y);
      p.face.setPosition(p.x + 26, p.y - 70).setVisible(p.hurt > 0);

      // 민우 루트: 내 연기에 닿거나, 그냥 담배 피우는 모습을 보고 쳐다봄
      if (smoking && !p.glanced) {
        const close = Math.abs(p.y - this.pos.y) < 160;
        if (where === 'mine' || (close && Math.random() < pc.glanceChance * dt * 2)) this.glance(p);
      }

      if (p.y < s.y - 20 || p.y > s.y + s.h + 20) {
        p.body.destroy();
        p.face.destroy();
        this.peds.splice(i, 1);
      }
    }
  }

  glance(p) {
    p.glanced = true;
    GameState.vars.glares++;
    GameState.setFlag('glared');
    if (this.glareText) this.glareText.setText(`${this.text.glareLabel} ${GameState.vars.glares}`);
    const eye = txt(this, p.x + 40, p.y - 90, '👀', { size: 36 }).setDepth(6001);
    this.tweens.add({ targets: eye, x: this.pos.x, y: this.pos.y - 110, alpha: 0.2, duration: 700, ease: 'Sine.in', onComplete: () => eye.destroy() });
  }

  // ───────── HUD ─────────

  createHud() {
    const D = 10000;
    const fix = (o) => o.setScrollFactor(0).setDepth(D);

    this.fog = this.add.rectangle(0, 0, THEME.W, THEME.H, 0xbdbdbd, 0).setOrigin(0).setScrollFactor(0).setDepth(D - 1);

    const panel = fix(this.add.graphics());
    panel.fillStyle(0xffffff, 0.94);
    panel.fillRoundedRect(16, 16, THEME.W - 32, 92, 26);

    this.clockText = fix(txt(this, 40, 62, '', { size: 38, bold: true, ox: 0 }));
    this.windText = fix(txt(this, THEME.W - 40, 62, '', { size: 30, bold: true, ox: 1, color: THEME.color.sub }));
    this.updateClock();
    this.updateWindHud();

    // "냄새 뱀" 배지는 HUD 아래 둘째 줄 왼쪽
    const badgeText = txt(this, 0, 0, this.text.smellBadge, { size: 28, bold: true, color: '#ffffff' });
    const badgeBg = this.add.graphics();
    badgeBg.fillStyle(0x8a6d4a, 0.92).fillRoundedRect(-badgeText.width / 2 - 18, -24, badgeText.width + 36, 48, 24);
    this.smellBadge = this.add.container(16 + badgeText.width / 2 + 18, 148, [badgeBg, badgeText])
      .setScrollFactor(0, 0, true).setDepth(D).setVisible(!this.smokerMode && GameState.has('smelly'));

    // 민우 루트: 오늘 받은 시선 수 (둘째 줄 오른쪽)
    if (this.smokerMode) {
      const g = this.add.graphics();
      g.fillStyle(0xffffff, 0.94).fillRoundedRect(-200, -24, 200, 48, 24);
      this.glareText = txt(this, -100, 0, `${this.text.glareLabel} ${GameState.vars.glares}`, { size: 28, bold: true });
      this.add.container(THEME.W - 16, 148, [g, this.glareText]).setScrollFactor(0, 0, true).setDepth(D);
    }
  }

  updateClock() {
    const limit = this.brkCfg.realSecondsLimit;
    const total = this.brkCfg.startMinutes * 60;
    const remain = Math.round(total * (1 - this.elapsed / limit));
    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    if (remain >= 0) {
      this.clockText.setText(`⏰ ${this.brk.clockLabel} ${fmt(remain)}`);
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
      if (this.arrived || this.locked) return;
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
    if (this.arrived || this.locked) return;
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
      const lateFlag = 'late_' + this.brk.id;
      if (!GameState.has(lateFlag) && this.elapsed >= this.brkCfg.realSecondsLimit) {
        GameState.setFlag('late');
        GameState.setFlag(lateFlag);
        showToast(this, this.text.lateToast, { y: 220, fill: THEME.color.late });
      }
      this.updateClock();
    }

    if (this.smokerMode) this.updateSmoking(dt, moving);
    else this.updateSmokeEffect(time, dt);
    this.updatePedestrians(dt);
    this.syncSprites(time, moving);

    if (!this.met && this.brk.encounter && this.encounterReady()) {
      this.met = true;
      if (GameState.check(this.brk.encounterIf)) {
        this.showActor();
        this.openDialogue(this.brk.encounter);
        return;
      }
    }
    const g = this.to.goal;
    if (this.smokeDone && inRect(this.pos, g)) this.arrive();
  }

  // 대화가 시작되는 순간인지
  encounterReady() {
    const when = this.brk.encounterWhen || 'stairsBottom';
    if (when === 'smokeHalf') return this.smokeProgress >= 0.5;
    if (when === 'nearZone') return inRect(this.pos, MAP.nearZone);
    // stairsBottom: 계단 아래 광장에 들어설 때 (위에서 오면 아래로, 아래에서 오면 위로 넘을 때)
    return this.brk.from === 'top' ? this.pos.y > MAP.encounterFromTop : this.pos.y < MAP.encounterFromBottom;
  }

  // ───────── 흡연자 모드 (민우) ─────────

  canSmokeHere() {
    if (inRect(this.pos, MAP.smokingArea)) return true;
    return GameState.has('smokeOutside') && this.brk.id === 'lunch' && inRect(this.pos, MAP.outsideArea);
  }

  updateSmoking(dt, moving) {
    const here = !this.smokeDone && this.canSmokeHere();
    if (here && !this.zoneHintShown) {
      this.zoneHintShown = true;
      showToast(this, this.text.smokeHere, { y: 220 });
    }
    const smoking = here && !moving;
    if (smoking !== this.isSmoking) {
      this.isSmoking = smoking;
      if (smoking) this.myEmitter.start();
      else this.myEmitter.stop();
    }
    if (smoking) {
      this.smokeProgress += dt / this.cfg.smoking.seconds;
      // 어디서 피웠는지 기록 (절반 피웠을 때 기준) → 대화 분기에 써요
      if (this.smokeProgress >= 0.5 && !this.spotRecorded) {
        this.spotRecorded = true;
        const near = this.pos.x < MAP.nearSpotMaxX || !inRect(this.pos, MAP.smokingArea);
        GameState.setFlag((near ? 'spot_near_' : 'spot_far_') + this.brk.id);
      }
      if (this.smokeProgress >= 1) this.finishSmoking();
    }
    this.smokeBubble.setVisible(here);
    this.smokeBubble.setRatio(this.smokeProgress);
  }

  finishSmoking() {
    this.smokeDone = true;
    this.isSmoking = false;
    this.myEmitter.stop();
    this.smokeBubble.setVisible(false);
    this.zoneMarker.setVisible(false);
    this.goalStar.setVisible(true);
    showToast(this, this.brk.doneToast, { y: 220 });
  }

  // 대화 상대가 계단에 나타났다가, 대화가 끝나면 계단을 올라가요
  showActor() {
    if (!this.actor) return;
    this.actor.setVisible(true);
  }

  hideActor() {
    if (!this.actor || !this.actor.visible) return;
    this.tweens.add({
      targets: this.actor, y: MAP.stairs.y, duration: 6000,
      onUpdate: () => this.actor.setDepth(this.actor.y),
      onComplete: () => this.actor.setVisible(false)
    });
  }

  updateSmokeEffect(time, dt) {
    const s = this.cfg.smoke;
    const touching = this.touchingSmoke();
    if (touching) {
      if (!this.smellToastShown) {
        this.smellToastShown = true;
        GameState.setFlag('smelly');
        GameState.setFlag('smelly_' + this.brk.id);
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
    this.bubble.setVisible(touching || this.breath < 0.98);
    this.bubble.setRatio(this.breath);
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
    this.bubble.setPosition(this.pos.x, this.pos.y - 140);
    this.smokeBubble.setPosition(this.pos.x, this.pos.y - 140);
  }

  // ───────── 대화·도착 ─────────

  openDialogue(id) {
    this.path = [];
    this.marker.setVisible(false);
    this.scene.launch('Dialogue', { id, resume: 'Walk' });
    this.scene.pause();
  }

  // 대화에서 생긴 효과 처리. "minwooMoves", "foxMoves"처럼 "<흡연자>Moves" = 그 흡연자가 구석으로 이동
  // goFar = (민우 루트) 내가 흡연구역 안쪽 구석으로 걸어감, goOutside = 구역 밖 계단 옆으로 걸어감
  onResume() {
    this.hideActor();
    const effects = GameState.pendingEffects.splice(0);
    let moved = false;
    for (const e of effects) {
      if (e === 'goFar') this.moveTo(MAP.smokers.minwoo.far.x, MAP.smokers.minwoo.far.y);
      else if (e === 'goOutside') this.moveTo(MAP.outsideSpot.x, MAP.outsideSpot.y);
      const m = /^(\w+)Moves$/.exec(e);
      if (m && this.moveSmokerAway(m[1])) moved = true;
    }
    if (moved) showToast(this, this.text.smokeMovedToast, { y: 220 });
  }

  moveSmokerAway(id) {
    const s = this.smokers.find((x) => x.id === id);
    if (!s || s.far) return false;
    s.far = true;
    const to = MAP.smokers[id].far;
    this.tweens.add({
      targets: s.pos,
      x: to.x, y: to.y, duration: 1600, ease: 'Sine.inOut',
      onUpdate: () => {
        s.sprite.setPosition(s.pos.x, s.pos.y).setDepth(s.pos.y);
        s.shadow.setPosition(s.pos.x, s.pos.y + 4);
      }
    });
    // 구석에서는 연기가 계단까지 닿기 전에 흩어져요
    s.life = MAP.farLife;
    s.emitter.frequency = 160;
    return true;
  }

  arrive() {
    this.arrived = true;
    this.smokers.forEach((s) => s.emitter.stop());
    if (this.myEmitter) this.myEmitter.stop();
    // 도착 대화가 끝나면 다음 쉬는 시간으로, 마지막이면 엔딩으로
    const last = GameState.breakIndex >= this.routeData.breaks.length - 1;
    const arriveId = this.brk.arrive;
    if (!last) GameState.breakIndex++;
    this.cameras.main.fadeOut(500);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start('Dialogue', { id: arriveId, then: last ? 'Ending' : 'Walk' });
    });
  }

  drawDebug() {
    const g = this.add.graphics().setDepth(9000);
    g.lineStyle(2, 0xff0000, 0.6);
    for (const r of MAP.walkable) g.strokeRect(r.x, r.y, r.w, r.h);
    const ey = this.brk.from === 'top' ? MAP.encounterFromTop : MAP.encounterFromBottom;
    g.lineStyle(3, 0x0000ff, 0.8).lineBetween(0, ey, MAP.width, ey);
    const goal = this.to.goal;
    g.lineStyle(3, 0x00aa00, 0.8).strokeRect(goal.x, goal.y, goal.w, goal.h);
  }
}

function inRect(p, r) {
  return p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;
}
