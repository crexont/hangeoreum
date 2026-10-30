// 공용 색상·폰트·화면 크기. 색을 바꾸고 싶으면 여기만 고치면 돼요.
const THEME = {
  W: 720,
  H: 1280,
  font: '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", system-ui, sans-serif',
  emojiFont: '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif',
  color: {
    bg: '#fdf6ec',
    ink: '#3b3027',
    sub: '#8a7a6a',
    accent: '#f2994a',
    accentDark: '#d9792a',
    panel: '#ffffff',
    line: '#e6d8c3',
    locked: '#c9c2b8',
    late: '#e05a47',
    pov: '#b99ad6'
  }
};

// '#rrggbb' → 0xrrggbb (Phaser 그래픽용)
function hex(color) {
  return Phaser.Display.Color.HexStringToColor(color).color;
}

// 한국어 텍스트 생성 도우미
function txt(scene, x, y, text, opts = {}) {
  const style = {
    fontFamily: THEME.font,
    fontSize: (opts.size || 32) + 'px',
    color: opts.color || THEME.color.ink,
    fontStyle: opts.bold ? 'bold' : 'normal',
    align: opts.align || 'center',
    lineSpacing: opts.lineSpacing ?? 8
  };
  if (opts.wrap) style.wordWrap = { width: opts.wrap, useAdvancedWrap: true };
  return scene.add.text(x, y, text, style).setOrigin(opts.ox ?? 0.5, opts.oy ?? 0.5);
}
