// 코드로 그린 동물 캐릭터 (임시 그림). 나중에 assets/의 png로 바꾸면 이 그림 대신 png를 써요.
// 동화책 느낌: 큰 머리 + 작은 몸, 갈색 굵은 외곽선, 볼터치.
// ear: floppy(강아지) / pointy(고양이·여우) / long(토끼) / round(곰·판다·햄스터·너구리)
const CHARACTER_ART = {
  jieun:    { face: '#F9D9A8', ear: 'floppy', earColor: '#C98B52', snout: '#FFF1DC', shirt: '#F2A65A' },
  minwoo:   { face: '#C9D6E3', ear: 'pointy', earColor: '#C9D6E3', inner: '#F4C0D1', snout: '#F1F5F9', shirt: '#7FA7D9', stripes: '#9FB2C6' },
  neighbor: { face: '#FBF8FD', ear: 'long', earColor: '#FBF8FD', inner: '#F4C0D1', snout: '#FFFFFF', shirt: '#B99AD6' },
  fox:      { face: '#F0A06A', ear: 'pointy', earColor: '#E08A52', inner: '#5B4636', snout: '#FFF6EE', shirt: '#9CC5A1', bigSnout: true },
  bear:     { face: '#C4A484', ear: 'round', earColor: '#B08D6A', inner: '#E9D3BB', snout: '#EAD7C0', shirt: '#A3B18A' },
  panda:    { face: '#FFFFFF', ear: 'round', earColor: '#4A4A4A', inner: '#4A4A4A', snout: '#FFFFFF', shirt: '#A8B5C0', patches: '#4A4A4A' },
  friendJ:  { face: '#F7D08A', ear: 'round', earColor: '#E8B04A', inner: '#F9C9B5', snout: '#FFF1DC', shirt: '#F7A8B8', cheeks: true },
  friendM:  { face: '#B9BEC6', ear: 'round', earColor: '#8C939C', inner: '#5F6670', snout: '#EEF0F2', shirt: '#8C9BAA', mask: '#5F6670' }
};

// ctx에 size×size 크기로 캐릭터 그리기 (배경 투명)
function drawAnimal(ctx, size, a) {
  const s = size / 256; // 256 기준 좌표로 그리고 비율만 맞춰요
  const line = '#5B4636';
  ctx.save();
  ctx.scale(s, s);
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = line;

  const shape = (fill, draw) => { ctx.beginPath(); draw(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  const ellipse = (x, y, rx, ry, rot = 0) => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);

  // 몸 (셔츠)
  shape(a.shirt, () => {
    ctx.moveTo(70, 252);
    ctx.quadraticCurveTo(70, 182, 128, 180);
    ctx.quadraticCurveTo(186, 182, 186, 252);
    ctx.closePath();
  });
  // 셔츠 깃
  ctx.beginPath(); ctx.moveTo(110, 186); ctx.lineTo(128, 204); ctx.lineTo(146, 186); ctx.stroke();

  // 귀 (머리 뒤쪽 먼저)
  const hx = 128, hy = 112, hr = 80;
  if (a.ear === 'pointy') {
    for (const dir of [-1, 1]) {
      shape(a.earColor, () => { ctx.moveTo(hx + dir * 30, hy - 66); ctx.lineTo(hx + dir * 74, hy - 96); ctx.lineTo(hx + dir * 74, hy - 30); ctx.closePath(); });
      ctx.beginPath(); ctx.moveTo(hx + dir * 46, hy - 62); ctx.lineTo(hx + dir * 66, hy - 78); ctx.lineTo(hx + dir * 66, hy - 46); ctx.closePath();
      ctx.fillStyle = a.inner; ctx.fill();
    }
  } else if (a.ear === 'long') {
    for (const dir of [-1, 1]) {
      shape(a.earColor, () => ellipse(hx + dir * 34, hy - 108, 22, 58, dir * 0.15));
      ctx.beginPath(); ellipse(hx + dir * 34, hy - 104, 10, 40, dir * 0.15); ctx.fillStyle = a.inner; ctx.fill();
    }
  } else if (a.ear === 'round') {
    for (const dir of [-1, 1]) {
      shape(a.earColor, () => ellipse(hx + dir * 62, hy - 62, 28, 28));
      ctx.beginPath(); ellipse(hx + dir * 62, hy - 62, 14, 14); ctx.fillStyle = a.inner; ctx.fill();
    }
  }

  // 머리
  shape(a.face, () => ellipse(hx, hy, hr, hr - 6));

  // 고양이 이마 줄무늬
  if (a.stripes) {
    ctx.save(); ctx.strokeStyle = a.stripes; ctx.lineWidth = 7; ctx.lineCap = 'round';
    for (const dx of [-16, 0, 16]) { ctx.beginPath(); ctx.moveTo(hx + dx, hy - 70); ctx.lineTo(hx + dx, hy - 50); ctx.stroke(); }
    ctx.restore();
  }
  // 너구리 눈가 띠
  if (a.mask) {
    ctx.beginPath(); ellipse(hx, hy + 2, 70, 22); ctx.fillStyle = a.mask; ctx.fill();
  }
  // 판다 눈 무늬
  if (a.patches) {
    for (const dir of [-1, 1]) { ctx.beginPath(); ellipse(hx + dir * 30, hy + 4, 20, 25, dir * -0.5); ctx.fillStyle = a.patches; ctx.fill(); }
  }

  // 축 처진 강아지 귀 (머리 위에 덮이게)
  if (a.ear === 'floppy') {
    for (const dir of [-1, 1]) shape(a.earColor, () => ellipse(hx + dir * 72, hy - 6, 26, 50, dir * -0.35));
  }

  // 주둥이·볼
  if (a.cheeks) {
    for (const dir of [-1, 1]) shape(a.snout, () => ellipse(hx + dir * 40, hy + 34, 30, 24));
  }
  shape(a.snout, () => ellipse(hx, hy + 36, a.bigSnout ? 44 : 32, a.bigSnout ? 30 : 23));

  // 볼터치
  ctx.fillStyle = 'rgba(244, 140, 140, 0.45)';
  for (const dir of [-1, 1]) { ctx.beginPath(); ellipse(hx + dir * 50, hy + 26, 14, 9); ctx.fill(); }

  // 눈 (어두운 무늬 위엔 흰 테두리)
  for (const dir of [-1, 1]) {
    const ex = hx + dir * 30, ey = hy + 4;
    if (a.patches || a.mask) { ctx.beginPath(); ellipse(ex, ey, 11, 12); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    ctx.beginPath(); ellipse(ex, ey, 8, 10); ctx.fillStyle = '#3B2F27'; ctx.fill();
    ctx.beginPath(); ellipse(ex + 3, ey - 4, 3, 3); ctx.fillStyle = '#ffffff'; ctx.fill();
  }

  // 코·입
  ctx.beginPath(); ellipse(hx, hy + 28, 9, 6); ctx.fillStyle = '#3B2F27'; ctx.fill();
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(hx - 12, hy + 42); ctx.quadraticCurveTo(hx - 6, hy + 50, hx, hy + 42);
  ctx.quadraticCurveTo(hx + 6, hy + 50, hx + 12, hy + 42);
  ctx.stroke();

  ctx.restore();
}
