// 공용 색상·폰트·화면 크기. 색을 바꾸고 싶으면 여기만 고치면 돼요.
// 스타일: 포스터 색 + 100% 도트 — 크림 배경, 진초록 글자·버튼, 주황 강조, 도트 글꼴, 계단 모서리 상자
const THEME = {
  W: 720,
  H: 1280,
  // 도트 글꼴: 갈무리11 Bold (style.css의 @font-face GalmuriPx)
  pixelFont: '"GalmuriPx", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  color: {
    bg: '#FBF5E9',
    ink: '#2F5544',
    sub: '#7A8A7E',
    accent: '#E8833A',
    accentDark: '#C9631F',
    button: '#3F7A5A',   // 기본 버튼 (포스터의 진초록 띠)
    panel: '#FFFFFF',
    line: '#D7E5CC',
    shadow: '#E4DAC4',   // 카드·버튼 아래 깔리는 납작한 그림자
    locked: '#C9C2B8',
    late: '#E0705A',
    pov: '#B99AD6'
  }
};

// '#rrggbb' → 0xrrggbb (Phaser 그래픽용)
function hex(color) {
  return Phaser.Display.Color.HexStringToColor(color).color;
}

// 색을 조금 어둡게 (버튼 아래 두께용)
function darken(color, amount = 0.18) {
  const c = Phaser.Display.Color.HexStringToColor(color);
  c.darken(amount * 100);
  return c.color;
}

// 한국어 텍스트 생성 도우미. 모든 글자는 도트 글꼴(갈무리11 Bold).
function txt(scene, x, y, text, opts = {}) {
  const style = {
    fontFamily: THEME.pixelFont,
    fontSize: (opts.size || 32) + 'px',
    color: opts.color || THEME.color.ink,
    align: opts.align || 'center',
    lineSpacing: opts.lineSpacing ?? 8
  };
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true };
  return scene.add.text(x, y, text, style).setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
}

// 카드: 아래로 깔린 납작한 그림자 + 흰 바탕 + 두꺼운 테두리 (도트 상자). g에 그려요 (x, y = 왼쪽 위)
function drawCard(g, x, y, w, h, opts = {}) {
  const lw = 6;
  g.fillStyle(hex(opts.shadow || THEME.color.shadow), opts.shadowAlpha ?? 1);
  g.fillRoundedRect(x, y + (opts.depth ?? 8), w, h, 12);
  g.fillStyle(hex(opts.border || THEME.color.ink), 1);
  g.fillRoundedRect(x, y, w, h, 12);
  g.fillStyle(opts.fill ? hex(opts.fill) : 0xffffff, opts.alpha ?? 1);
  g.fillRoundedRect(x + lw, y + lw, w - 2 * lw, h - 2 * lw, 6);
  return g;
}

// 100% 도트: Phaser 그래픽의 둥근 사각형·테두리·원을 계단 모서리 도트 도형으로 바꿔 그려요 (모든 화면 공통).
// fillRect만 쓰므로 반투명이어도 겹쳐서 진해지지 않아요.
(() => {
  const G = Phaser.GameObjects.Graphics.prototype;
  const fillStyle = G.fillStyle, lineStyle = G.lineStyle;
  G.fillStyle = function (c, a = 1) { this._pxFill = [c, a]; return fillStyle.call(this, c, a); };
  G.lineStyle = function (w, c, a = 1) { this._pxLine = [w, c, a]; return lineStyle.call(this, w, c, a); };

  // 반지름 r → 계단 칸 크기 P, 계단 수 k
  const steps = (r, w, h) => {
    const k = r >= 20 ? 2 : 1;
    const P = Math.max(3, Math.min(r >= 12 ? 6 : 3, Math.floor(Math.min(w, h) / (2 * k + 1))));
    return [P, k];
  };
  G.fillRoundedRect = function (x, y, w, h, r = 20) {
    const [P, k] = steps(typeof r === 'number' ? r : 20, w, h);
    for (let i = 0; i < k; i++) {
      const inset = (k - i) * P;
      this.fillRect(x + inset, y + i * P, w - 2 * inset, P);
      this.fillRect(x + inset, y + h - (i + 1) * P, w - 2 * inset, P);
    }
    return this.fillRect(x, y + k * P, w, h - 2 * k * P);
  };
  G.strokeRoundedRect = function (x, y, w, h) {
    const [lw, c, a] = this._pxLine || [2, 0x000000, 1];
    const prev = this._pxFill;
    const L = Math.max(2, Math.round(lw)), P = L * 2;
    fillStyle.call(this, c, a);
    this.fillRect(x + P, y, w - 2 * P, L).fillRect(x + P, y + h - L, w - 2 * P, L);
    this.fillRect(x, y + P, L, h - 2 * P).fillRect(x + w - L, y + P, L, h - 2 * P);
    for (const [cx, cy] of [[x + L, y + L], [x + w - P, y + L], [x + L, y + h - P], [x + w - P, y + h - P]]) this.fillRect(cx, cy, L, L);
    if (prev) fillStyle.call(this, prev[0], prev[1]);
    return this;
  };
  G.fillCircle = function (x, y, r) {
    const P = r > 30 ? 6 : 3;
    for (let yy = -r; yy < r; yy += P) {
      const mid = yy + P / 2;
      const half = Math.round(Math.sqrt(Math.max(0, r * r - mid * mid)) / P) * P;
      if (half) this.fillRect(x - half, y + yy, half * 2, P);
    }
    return this;
  };
})();
