// 공용 색상·폰트·화면 크기. 색을 바꾸고 싶으면 여기만 고치면 돼요.
// 스타일: 파스텔 동화풍 — 크림 배경, 갈색 글자, 둥근 손글씨 제목(주아), 부드러운 본문(고운돋움)
const THEME = {
  W: 720,
  H: 1280,
  // 본문: 고운돋움 / 제목·버튼·이름표(bold): 주아. 웹폰트를 못 받으면 기기 기본 글꼴로
  font: '"Gowun Dodum", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  titleFont: '"Jua", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif',
  emojiFont: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
  color: {
    bg: '#FFF6E9',
    ink: '#5B4636',
    sub: '#9C8370',
    accent: '#F2A65A',
    accentDark: '#D9792A',
    panel: '#FFFFFF',
    line: '#F3D9B8',
    shadow: '#EBCFA9',   // 카드·버튼 아래 깔리는 납작한 그림자
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

// 한국어 텍스트 생성 도우미. bold면 제목 글꼴(주아)을 써요.
function txt(scene, x, y, text, opts = {}) {
  const style = {
    fontFamily: opts.bold ? THEME.titleFont : THEME.font,
    fontSize: (opts.size || 32) + 'px',
    color: opts.color || THEME.color.ink,
    align: opts.align || 'center',
    lineSpacing: opts.lineSpacing ?? 8
  };
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true };
  return scene.add.text(x, y, text, style).setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
}

// 파스텔 카드: 아래로 깔린 납작한 그림자 + 흰 바탕 + 두꺼운 테두리
// g에 그려요 (x, y = 왼쪽 위)
function drawCard(g, x, y, w, h, opts = {}) {
  const r = opts.radius ?? 28;
  const fill = opts.fill ? hex(opts.fill) : 0xffffff;
  const border = hex(opts.border || THEME.color.line);
  g.fillStyle(hex(opts.shadow || THEME.color.shadow), opts.shadowAlpha ?? 1);
  g.fillRoundedRect(x, y + (opts.depth ?? 8), w, h, r);
  g.fillStyle(fill, opts.alpha ?? 1);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(opts.lineWidth ?? 4, border, 1);
  g.strokeRoundedRect(x, y, w, h, r);
  return g;
}
