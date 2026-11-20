// 코드로 그린 동물 캐릭터 (포스터 그림체). 나중에 assets/의 png로 바꾸면 이 그림 대신 png를 써요.
// 큰 동그란 머리 + 작은 몸, 옷 없이 털색 그대로, 굵은 갈색 외곽선, 점 눈·작은 코·볼터치.
// 걷기 화면 도트 그림(pixelArt.js)도 같은 색을 써요.
// face: 털색 / ear: floppy(강아지)·pointy(고양이·여우)·long(토끼)·round(곰·판다·햄스터·너구리)
// snout: 주둥이(털색과 같으면 안 그림) / belly: 배 / bag: 가방 색 / tail: 꼬리 / arms: 팔다리 색(판다)
const CHARACTER_ART = {
  jieun:    { face: '#FFF6EA', ear: 'floppy', earColor: '#C98A55', snout: '#FFF6EA', belly: '#FFFFFF', bag: '#C49A6C' },
  minwoo:   { face: '#80848C', ear: 'pointy', earColor: '#80848C', inner: '#A6AAB1', snout: '#80848C', belly: '#979BA2', tail: true },
  neighbor: { face: '#FBF8FD', ear: 'long', earColor: '#FBF8FD', inner: '#F4C0D1', snout: '#FFFFFF', belly: '#FFFFFF' },
  fox:      { face: '#F0A06A', ear: 'pointy', earColor: '#E08A52', inner: '#5B4636', snout: '#FFF6EE', belly: '#FFF6EE', bigSnout: true, tail: true },
  bear:     { face: '#C4A484', ear: 'round', earColor: '#B08D6A', inner: '#E9D3BB', snout: '#EAD7C0', belly: '#E2CDB2' },
  panda:    { face: '#FFFFFF', ear: 'round', earColor: '#4A4A4A', inner: '#4A4A4A', snout: '#FFFFFF', belly: '#FFFFFF', patches: '#4A4A4A', arms: '#4A4A4A' },
  friendJ:  { face: '#F7D08A', ear: 'round', earColor: '#E8B04A', inner: '#F9C9B5', snout: '#FFF1DC', belly: '#FFF1DC', cheeks: true },
  friendM:  { face: '#B9BEC6', ear: 'round', earColor: '#8C939C', inner: '#5F6670', snout: '#EEF0F2', belly: '#DDE0E4', mask: '#5F6670', tail: true }
};

const ART_LINE = '#4A3B30';
const ANIMAL_DRAWN = new Set(); // 코드로 그린 캐릭터 (config 이미지로 바꾼 캐릭터는 표정 없이 그 이미지 그대로)

// 캐릭터 얼굴 텍스처를 만들고 키를 돌려줘요: 기본은 '<키>', 표정은 '<키>__<표정>'. 이미 있으면 그대로.
// 도트 느낌: 64칸에 그리고, 반투명 가장자리는 또렷하게 자른 뒤 매끄럽게 하지 않고 4배(256)로 키워요.
function makeAnimalTexture(scene, key, expr = 'normal') {
  const texKey = expr === 'normal' ? key : `${key}__${expr}`;
  if (scene.textures.exists(texKey)) return texKey;
  if (!CHARACTER_ART[key] || (expr !== 'normal' && !ANIMAL_DRAWN.has(key))) return key;
  const n = 64, size = 256, small = document.createElement('canvas');
  small.width = small.height = n;
  const sctx = small.getContext('2d');
  drawAnimal(sctx, n, CHARACTER_ART[key], expr);
  const img = sctx.getImageData(0, 0, n, n);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = img.data[i] > 100 ? 255 : 0;
  sctx.putImageData(img, 0, 0);
  const tex = scene.textures.createCanvas(texKey, size, size);
  const ctx = tex.getContext();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(small, 0, 0, size, size);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
  ANIMAL_DRAWN.add(key);
  return texKey;
}

// ctx에 size×size 크기로 캐릭터 그리기 (배경 투명). expr: 표정 (아래 '표정' 참고)
function drawAnimal(ctx, size, a, expr = 'normal') {
  const s = size / 256; // 256 기준 좌표로 그리고 비율만 맞춰요
  ctx.save();
  ctx.scale(s, s);
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = ART_LINE;

  const shape = (fill, draw) => { ctx.beginPath(); draw(); ctx.fillStyle = fill; ctx.fill(); ctx.stroke(); };
  const blob = (fill, draw) => { ctx.beginPath(); draw(); ctx.fillStyle = fill; ctx.fill(); };
  const ellipse = (x, y, rx, ry, rot = 0) => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  const limb = a.arms || a.face;

  // 꼬리 (몸 뒤, 오른쪽으로 말려 올라감): 굵은 외곽선 위에 털색
  if (a.tail) {
    const tail = () => { ctx.beginPath(); ctx.moveTo(160, 220); ctx.quadraticCurveTo(222, 222, 214, 160); ctx.stroke(); };
    ctx.save();
    ctx.lineWidth = 30; tail();
    ctx.strokeStyle = a.earColor; ctx.lineWidth = 17; tail();
    ctx.restore();
  }

  // 가방 (등 뒤, 왼쪽으로 삐죽). roundRect는 옛 iOS에 없어서 타원 두 개로
  if (a.bag) shape(a.bag, () => { ellipse(84, 192, 30, 36); });

  // 발 → 몸 → 배 → 팔
  shape(limb, () => ellipse(106, 236, 20, 13));
  shape(limb, () => ellipse(150, 236, 20, 13));
  shape(a.face, () => ellipse(128, 192, 50, 44));
  blob(a.belly || a.face, () => ellipse(128, 202, 30, 26));
  shape(limb, () => ellipse(84, 196, 13, 19, 0.35));
  shape(limb, () => ellipse(172, 196, 13, 19, -0.35));
  // 가방 끈
  if (a.bag) {
    ctx.save(); ctx.strokeStyle = a.bag; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(100, 158); ctx.lineTo(112, 214); ctx.stroke();
    ctx.restore();
  }

  // 귀 (머리 뒤쪽 먼저)
  const hx = 128, hy = 100;
  if (a.ear === 'pointy') {
    for (const dir of [-1, 1]) {
      shape(a.earColor, () => { ctx.moveTo(hx + dir * 22, hy - 58); ctx.lineTo(hx + dir * 68, hy - 98); ctx.lineTo(hx + dir * 70, hy - 26); ctx.closePath(); });
      blob(a.inner || a.earColor, () => { ctx.moveTo(hx + dir * 40, hy - 56); ctx.lineTo(hx + dir * 62, hy - 80); ctx.lineTo(hx + dir * 62, hy - 42); ctx.closePath(); });
    }
  } else if (a.ear === 'long') {
    for (const dir of [-1, 1]) {
      shape(a.earColor, () => ellipse(hx + dir * 30, hy - 96, 20, 54, dir * 0.15));
      blob(a.inner, () => ellipse(hx + dir * 30, hy - 92, 9, 36, dir * 0.15));
    }
  } else if (a.ear === 'round') {
    for (const dir of [-1, 1]) {
      shape(a.earColor, () => ellipse(hx + dir * 58, hy - 54, 26, 26));
      blob(a.inner, () => ellipse(hx + dir * 58, hy - 54, 13, 13));
    }
  }

  // 머리 (살짝 넓적한 동그라미)
  shape(a.face, () => ellipse(hx, hy, 76, 64));

  // 무늬
  if (a.mask) blob(a.mask, () => ellipse(hx, hy + 4, 66, 20));
  if (a.patches) for (const dir of [-1, 1]) blob(a.patches, () => ellipse(hx + dir * 30, hy + 6, 18, 22, dir * -0.5));

  // 처진 귀 (머리 옆에 늘어짐, 머리 위에 덮이게)
  if (a.ear === 'floppy') {
    for (const dir of [-1, 1]) shape(a.earColor, () => ellipse(hx + dir * 70, hy + 2, 24, 44, dir * -0.3));
  }

  // 주둥이 (털색과 다를 때만)
  if (a.cheeks) for (const dir of [-1, 1]) blob(a.snout, () => ellipse(hx + dir * 38, hy + 32, 26, 20));
  if (a.snout !== a.face) blob(a.snout, () => ellipse(hx, hy + 32, a.bigSnout ? 38 : 28, a.bigSnout ? 24 : 19));

  // 표정: normal 기본 / happy 웃음 / annoyed 찡그림 / surprised 당황 / sad 시무룩 / cough 콜록
  const dark = '#2B2622';
  const line = (x1, y1, x2, y2, w = 7) => { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
  ctx.save();
  ctx.strokeStyle = dark;

  // 볼터치 (웃음·콜록이면 더 진하게)
  const blush = expr === 'cough' ? 'rgba(236, 96, 96, 0.75)' : expr === 'happy' ? 'rgba(244, 120, 120, 0.65)' : 'rgba(244, 140, 140, 0.5)';
  for (const dir of [-1, 1]) blob(blush, () => ellipse(hx + dir * 46, hy + 24, 14, 9));

  // 눈 (어두운 무늬 위엔 흰 테두리)
  for (const dir of [-1, 1]) {
    const ex = hx + dir * 28, ey = hy + 6;
    if (a.patches || a.mask) blob('#ffffff', () => ellipse(ex, ey, 11, 12));
    if (expr === 'happy') {
      // ^ ^ 눈웃음
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(ex - 10, ey + 4); ctx.lineTo(ex, ey - 6); ctx.lineTo(ex + 10, ey + 4); ctx.stroke();
    } else if (expr === 'cough') {
      // > < 질끈
      ctx.lineWidth = 7; ctx.beginPath();
      ctx.moveTo(ex - dir * 9, ey - 8); ctx.lineTo(ex + dir * 7, ey); ctx.lineTo(ex - dir * 9, ey + 8); ctx.stroke();
    } else {
      const big = expr === 'surprised';
      blob(dark, () => ellipse(ex, ey, big ? 9 : 7, big ? 11 : 8));
      blob('#ffffff', () => ellipse(ex + 2, ey - 3, big ? 3.5 : 2.5, big ? 3.5 : 2.5));
    }
    // 눈썹: 찡그림은 안쪽이 내려가고, 시무룩은 안쪽이 올라가요
    // (dir = -1 왼쪽 눈이면 안쪽은 +x, 즉 -dir 방향)
    if (expr === 'annoyed') line(ex - dir * 12, ey - 13, ex + dir * 10, ey - 22);
    if (expr === 'sad') line(ex - dir * 12, ey - 22, ex + dir * 10, ey - 13);
  }

  // 코
  blob(dark, () => ellipse(hx, hy + 24, 7, 5));

  // 입
  ctx.lineWidth = 5;
  if (expr === 'happy') {
    blob(dark, () => { ctx.moveTo(hx - 12, hy + 33); ctx.quadraticCurveTo(hx, hy + 54, hx + 12, hy + 33); ctx.closePath(); });
    blob('#F28C98', () => ellipse(hx, hy + 41, 6, 4));
  } else if (expr === 'surprised' || expr === 'cough') {
    blob(dark, () => ellipse(hx, hy + 40, 6, expr === 'cough' ? 7 : 6));
  } else if (expr === 'annoyed') {
    ctx.beginPath(); ctx.moveTo(hx - 11, hy + 38); ctx.quadraticCurveTo(hx - 5, hy + 33, hx, hy + 37); ctx.quadraticCurveTo(hx + 5, hy + 41, hx + 11, hy + 36); ctx.stroke();
  } else if (expr === 'sad') {
    ctx.beginPath(); ctx.moveTo(hx - 10, hy + 41); ctx.quadraticCurveTo(hx, hy + 32, hx + 10, hy + 41); ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.moveTo(hx - 10, hy + 34); ctx.quadraticCurveTo(hx - 5, hy + 40, hx, hy + 33);
    ctx.quadraticCurveTo(hx + 5, hy + 40, hx + 10, hy + 34);
    ctx.stroke();
  }

  // 덤: 당황 땀방울, 찡그림 빠직, 콜록 기침 자국
  if (expr === 'surprised') {
    ctx.strokeStyle = ART_LINE; ctx.lineWidth = 5;
    shape('#9FD3F2', () => { ctx.moveTo(hx + 70, hy - 52); ctx.quadraticCurveTo(hx + 84, hy - 28, hx + 70, hy - 22); ctx.quadraticCurveTo(hx + 56, hy - 28, hx + 70, hy - 52); });
  }
  if (expr === 'annoyed') {
    ctx.strokeStyle = '#E0603E';
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) line(hx + 58 + dx * 4, hy - 46 + dy * 4, hx + 58 + dx * 13, hy - 46 + dy * 13, 6);
  }
  if (expr === 'cough') {
    ctx.strokeStyle = '#8C8C96';
    line(hx + 20, hy + 46, hx + 34, hy + 54, 5);
    line(hx + 24, hy + 38, hx + 40, hy + 40, 5);
  }
  ctx.restore();

  ctx.restore();
}
