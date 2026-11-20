// 도트 그림 (걷기 화면 전용). 작은 칸 단위로 찍어 캔버스 텍스처로 만들어요.
// 도트 1칸 = 게임 좌표 S픽셀(기본 3). 글자·카드 같은 UI는 여기서 그리지 않아요.
// 포스터처럼 몽글몽글하게: 머리·나무·수풀은 둥근 덩어리(rbox), 네모는 건물·보도블록 정도만.

const PX_OUT = '#3E3A33';      // 도트 외곽선
const PX_EYE = '#2B2622';
const PX_CHEEK = '#F4A3A3';

// 행인으로 걸어 다니는 동물들 (CHARACTER_ART 키)
const PIXEL_PEDESTRIANS = ['bear', 'panda', 'neighbor', 'friendJ', 'friendM', 'fox'];

// w×h칸 캔버스 텍스처를 만들고 draw(r, rbox)로 칠해요. 이미 있으면 그대로 둬요(재시작해도 재사용).
//  r(x, y, w, h, color): 칸 단위 사각형
//  rbox(x, y, w, h, color, rad, out): 모서리를 rad칸만큼 둥글게 깎은 덩어리 + 1칸 외곽선(out=null이면 없음)
//    rad를 짧은 변의 절반으로 주면 동그라미/알약 모양
function pixelCanvas(scene, key, w, h, draw, S = 3) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w * S, h * S);
  const ctx = tex.getContext();
  const r = (x, y, ww, hh, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(Math.round(x) * S, Math.round(y) * S, Math.round(ww) * S, Math.round(hh) * S);
  };
  const span = (x, y, ww, hh, c, rad) => {
    for (let i = 0; i < hh; i++) {
      const d = Math.min(i, hh - 1 - i);
      const k = d < rad ? rad - Math.round(Math.sqrt(rad * rad - (rad - d - 0.5) ** 2)) : 0;
      r(x + k, y + i, ww - 2 * k, 1, c);
    }
  };
  const rbox = (x, y, ww, hh, c, rad = 1, out = PX_OUT) => {
    if (out) span(x - 1, y - 1, ww + 2, hh + 2, out, rad + 1);
    span(x, y, ww, hh, c, rad);
  };
  draw(r, rbox);
  tex.refresh();
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

// 걷기 그림 키. 도트가 없으면(config 이미지로 바꾼 캐릭터) 원래 키 그대로.
function walkKey(scene, charKey, dir, frame) {
  const k = `px_${charKey}_${dir}${frame}`;
  return scene.textures.exists(k) ? k : charKey;
}

// 캐릭터 하나의 걷기 그림 6장: down/up/side × 걸음 0/1 (22×32칸, 발밑 그림자 포함, 왼쪽은 side를 뒤집어 써요)
function makeWalkSprites(scene, charKey) {
  const a = CHARACTER_ART[charKey];
  if (!a) return;
  const bag = a.bag;
  for (const dir of ['down', 'up', 'side']) {
    for (const f of [0, 1]) {
      pixelCanvas(scene, `px_${charKey}_${dir}${f}`, 22, 32, (r, rbox) => drawWalker(r, rbox, a, dir, f, bag));
    }
  }
}

// 고양이·여우 뾰족 귀: 바깥쪽이 곧은 세모 (outer = 바깥 모서리 칸, dir = 1이면 오른쪽으로 넓어짐)
function pointyEar(r, outer, dir, a) {
  for (let i = 0; i < 6; i++) r(dir > 0 ? outer - 1 : outer - i - 1, 2 + i, i + 3, 1, PX_OUT);
  for (let i = 0; i < 5; i++) r(dir > 0 ? outer : outer - i, 3 + i, i + 1, 1, a.earColor);
  for (let i = 2; i < 5; i++) r(dir > 0 ? outer + 1 : outer - i + 1, 3 + i, i - 1, 1, a.inner || a.earColor);
}

function drawWalker(r, rbox, a, dir, f, bag) {
  const side = dir === 'side';
  const front = dir === 'down';

  // 발밑 그림자 (그림에 붙어 있어서 캐릭터가 땅에 딱 붙어 보여요)
  rbox(4, 27, 14, 4, 'rgba(62,58,51,0.22)', 2, null);

  // 귀 (머리 뒤) — 처진 귀는 머리 위에 덮으니 나중에
  if (a.ear === 'pointy') {
    if (side) pointyEar(r, 7, 1, a);
    else { pointyEar(r, 5, 1, a); pointyEar(r, 16, -1, a); }
  }
  for (const ex of side ? [6] : [3, 13]) {
    if (a.ear === 'round') { rbox(ex, 4, 6, 6, a.earColor, 3); rbox(ex + 1, 5, 4, 4, a.inner || a.earColor, 2, null); }
    if (a.ear === 'long') { rbox(ex + 3, 0, 4, 9, a.earColor, 2); rbox(ex + 4, 1, 2, 7, a.inner || a.earColor, 1, null); }
  }

  // 꼬리 (옆·뒷모습에서 보여요), 지은 가방 (옆모습에선 등 뒤로)
  if (a.tail && side) rbox(3, 17, 3, 7, a.earColor, 1);
  if (a.tail && dir === 'up') rbox(15, 16, 3, 7, a.earColor, 1);
  if (bag && side) rbox(2, 18, 5, 7, bag, 2);

  // 다리 (걸음마다 한쪽씩 짧게)
  if (side) {
    if (f === 0) { rbox(8, 25, 3, 3, a.arms || a.face, 1); rbox(13, 25, 3, 3, a.arms || a.face, 1); }
    else { rbox(10, 25, 3, 3, a.arms || a.face, 1); rbox(11, 25, 3, 2, a.arms || a.face, 1); }
  } else {
    rbox(7, 25, 3, f === 0 ? 3 : 2, a.arms || a.face, 1);
    rbox(12, 25, 3, f === 0 ? 2 : 3, a.arms || a.face, 1);
  }

  // 몸·팔 (옷 없이 털색, 앞모습은 배가 밝게)
  const limb = a.arms || a.face;
  if (side) { rbox(7, 18, 9, 7, a.face, 3); rbox(11, 19, 2, 4, limb, 1); }
  else {
    rbox(4, 19, 2, 4, limb, 1); rbox(16, 19, 2, 4, limb, 1);
    rbox(6, 18, 10, 7, a.face, 3);
    if (front && a.belly) rbox(8, 20, 6, 4, a.belly, 2, null);
  }
  if (bag && front) r(7, 19, 1, 4, bag);
  if (bag && dir === 'up') rbox(6, 17, 10, 8, bag, 3);

  // 머리: 큰 동그라미
  if (side) rbox(4, 6, 15, 13, a.face, 6);
  else rbox(3, 6, 16, 13, a.face, 6);
  if (a.stripes) for (const x of side ? [9, 11] : [8, 10, 11, 13]) r(x, 7, 1, 2, a.stripes);

  if (dir !== 'up') {
    // 얼굴 무늬
    if (a.mask) r(side ? 11 : 5, 11, side ? 8 : 12, 3, a.mask);
    if (a.patches) {
      if (side) rbox(13, 11, 3, 4, a.patches, 1, null);
      else { rbox(6, 11, 3, 4, a.patches, 1, null); rbox(13, 11, 3, 4, a.patches, 1, null); }
    }
    // 눈 (무늬 위엔 흰 반짝임), 주둥이, 코, 볼
    for (const x of side ? [14] : [7, 14]) { r(x, 12, 1, 2, PX_EYE); if (a.patches || a.mask) r(x, 11, 1, 1, '#FFFFFF'); }
    if (side) {
      rbox(17, 13, 4, 4, a.snout, 2); r(20, 14, 1, 1, PX_EYE); // 옆모습은 주둥이가 튀어나와요
      r(13, 15, 2, 1, PX_CHEEK);
    } else {
      if (a.snout !== a.face) rbox(9, 14, 4, 3, a.snout, 1, null);
      r(10, 14, 2, 1, PX_EYE);
      r(5, 15, 2, 1, PX_CHEEK); r(15, 15, 2, 1, PX_CHEEK);
    }
  }

  // 처진 귀 (강아지): 머리 옆에 늘어진 둥근 귀
  if (a.ear === 'floppy') {
    if (side) rbox(6, 9, 5, 9, a.earColor, 2);
    else { rbox(1, 9, 4, 9, a.earColor, 2); rbox(17, 9, 4, 9, a.earColor, 2); }
  }
}

// 도트 연기 덩어리 (16×16칸, S=6 → 96px: 예전 연기 텍스처와 같은 크기)
function makePixelSmoke(scene) {
  pixelCanvas(scene, 'px_smoke', 16, 16, (r, rbox) => {
    rbox(1, 2, 14, 12, 'rgba(206,200,218,0.8)', 6, null);
    rbox(3, 4, 9, 7, 'rgba(236,233,242,0.95)', 3, null);
  }, 6);
}

// ───────── 도트 맵 ─────────
// MAP 좌표(720×2400)를 3으로 나눈 240×800칸에 그려요. 한 번 만들면 'mapArt'로 계속 재사용.
function makePixelMap(scene) {
  const u = (v) => Math.round(v / 3);
  pixelCanvas(scene, 'mapArt', u(MAP.width), u(MAP.height), (r, rbox) => {
    const rnd = new Phaser.Math.RandomDataGenerator(['hangeoreum']);
    const W = u(MAP.width), H = u(MAP.height);

    // 잔디: 몽글한 밝은 얼룩 + 풀잎 + 작은 꽃
    r(0, 0, W, H, '#A9D68B');
    for (let i = 0; i < 170; i++) { const w = rnd.between(8, 18); rbox(rnd.between(-4, W), rnd.between(0, H), w, Math.round(w * 0.6), '#B3DC96', 4, null); }
    for (let i = 0; i < 900; i++) { const x = rnd.between(0, W), y = rnd.between(0, H); r(x, y, 1, 2, '#8BC26E'); r(x + 2, y + 1, 1, 1, '#8BC26E'); }
    for (let i = 0; i < 120; i++) r(rnd.between(0, W), rnd.between(0, H), 1, 1, rnd.pick(['#F7B2C4', '#FFE08A', '#FFFFFF']));

    // 보도블록 길 (모서리 둥글게)
    const paths = MAP.walkable.filter((p) => p.kind !== 'stairs').map((p) => ({ x: u(p.x), y: u(p.y), w: u(p.w), h: u(p.h) }));
    for (const p of paths) rbox(p.x - 2, p.y - 2, p.w + 4, p.h + 4, '#D8C3AA', 5, null);
    for (const p of paths) rbox(p.x, p.y, p.w, p.h, '#F0E3D3', 4, null);
    for (const p of paths) {
      for (let y = p.y + 5; y < p.y + p.h - 2; y += 6) {
        r(p.x + 2, y, p.w - 4, 1, '#E8D8C6');
        for (let x = p.x + ((y / 6) % 2 ? 4 : 1); x < p.x + p.w - 2; x += 8) r(x, y - 5, 1, 5, '#E8D8C6');
      }
    }

    // 계단: 옆벽 + 단 (윗면 밝게, 앞면 어둡게)
    const s = { x: u(MAP.stairs.x), y: u(MAP.stairs.y), w: u(MAP.stairs.w), h: u(MAP.stairs.h) };
    rbox(s.x - 4, s.y, 4, s.h, '#B9AE9F', 1); rbox(s.x + s.w, s.y, 4, s.h, '#B9AE9F', 1);
    for (let y = s.y; y < s.y + s.h; y += 9) {
      r(s.x, y, s.w, 9, '#F3EEE6');
      r(s.x, y, s.w, 1, '#FFFFFF');
      r(s.x, y + 7, s.w, 2, '#D9D0C3');
    }

    // 계단 옆 수풀: 동그란 덤불을 줄줄이
    for (const [x0, y0, len] of [[269, 470, 1100], [451, 470, 600]]) {
      const x = u(x0) - 6, y = u(y0), h = u(len);
      for (let yy = y; yy < y + h - 8; yy += 7) {
        rbox(x, yy, 12, 10, '#6FAE5A', 5, '#4E8A45');
        rbox(x + 2, yy + 2, 4, 3, '#8FCB72', 1, null);
      }
    }

    // 흡연구역: 바닥 타일, 울타리, 줄무늬 차양, 벤치, 재떨이
    const z = { x: u(MAP.smokingArea.x), y: u(MAP.smokingArea.y), w: u(MAP.smokingArea.w), h: u(MAP.smokingArea.h) };
    rbox(z.x + 2, z.y + 3, z.w, z.h, 'rgba(0,0,0,0.08)', 6, null);
    rbox(z.x, z.y, z.w, z.h, '#E6E0D5', 6, '#A89A88');
    for (let x = z.x + 15; x < z.x + z.w - 3; x += 15) r(x, z.y + 2, 1, z.h - 4, '#D5CCBF');
    for (let y = z.y + 15; y < z.y + z.h - 3; y += 15) r(z.x + 2, y, z.w - 4, 1, '#D5CCBF');
    for (let y = z.y + 32; y < z.y + z.h - 6; y += 11) rbox(z.x + 1, y, 2, 7, '#A8875F', 1);   // 계단 쪽 울타리
    rbox(z.x - 2, z.y + 22, z.w + 4, 5, 'rgba(0,0,0,0.08)', 2, null);                          // 차양 그림자
    rbox(z.x - 3, z.y - 3, z.w + 6, 22, '#5E9C76', 3, '#3F6E55');
    for (let x = z.x - 2, i = 0; x < z.x + z.w + 2; x += 8, i++) {
      const c = i % 2 ? '#FBF5E9' : '#5E9C76';
      const w = Math.min(8, z.x + z.w + 2 - x);
      r(x, z.y - 2, w, 18, c);
      rbox(x, z.y + 15, w, 6, c, 3, null);   // 아래 물결
    }
    rbox(z.x + 53, z.y + 67, 17, 50, '#C98B52', 3);                                            // 벤치
    for (let y = z.y + 73; y < z.y + 113; y += 7) r(z.x + 55, y, 13, 1, '#9A6638');
    rbox(z.x + 20, z.y + z.h - 26, 8, 8, '#9C9AA4', 4); rbox(z.x + 22, z.y + z.h - 24, 4, 4, '#6F6D77', 2, null); // 재떨이

    // 강의동(위): 밝은 회색 벽, 창문 두 줄, 둥근 유리문
    const b2h = u(MAP.buildings.goal.h);
    r(0, 0, W, b2h, '#E9E5DD');
    r(0, 0, W, 4, '#C9C2B6');
    for (const wy of [18, 50]) {
      for (let x = 14; x < W - 10; x += 36) {
        rbox(x, wy, 22, 20, '#A9C9DC', 2, '#8C9AA3');
        r(x + 10, wy, 2, 20, '#FFFFFF'); r(x, wy + 9, 22, 2, '#FFFFFF'); r(x + 3, wy + 2, 3, 3, '#D3E6F0');
      }
    }
    r(0, b2h - 6, W, 6, '#CFC7BA');
    r(0, b2h, W, 4, 'rgba(0,0,0,0.08)');
    rbox(W / 2 - 14, b2h - 30, 28, 26, '#7E97A8', 8); r(W / 2, b2h - 27, 1, 23, PX_OUT); r(W / 2 - 10, b2h - 24, 3, 7, '#A9C9DC');

    // 학생회관(아래): 따뜻한 벽, 물결 지붕선, 창문, 문과 줄무늬 차양
    const b1 = u(MAP.buildings.start.y);
    r(0, b1 - 4, W, 4, 'rgba(0,0,0,0.08)');
    r(0, b1, W, H - b1, '#F6E2CB');
    r(0, b1, W, 3, '#D98C6E');
    for (let x = 0; x < W; x += 8) rbox(x, b1 + 1, 8, 6, '#E9A184', 3, null);
    for (let x = 14; x < W - 10; x += 36) {
      rbox(x, b1 + 38, 22, 22, '#FFF8EE', 2, '#C9A27E');
      r(x + 10, b1 + 38, 2, 22, '#D9B38F'); r(x, b1 + 48, 22, 2, '#D9B38F');
    }
    rbox(W / 2 - 14, b1 + 13, 28, 24, '#9A6638', 8);
    for (let i = 0; i < 5; i++) rbox(W / 2 - 18 + i * 7, b1 + 6, 7, 6, i % 2 ? '#FBF5E9' : '#5E9C76', 3, null);
    r(W / 2 + 8, b1 + 26, 2, 2, '#FFE08A');

    // 장식 (예전 이모지 자리에 도트 그림)
    for (const d of MAP.decor) drawPixelDecor(r, rbox, u(d.x), u(d.y), d.e);
  });
}

function drawPixelDecor(r, rbox, x, y, e) {
  if (e === '🌳') {
    // 포스터 나무: 몽글몽글한 큰 덩어리 셋 + 하이라이트
    rbox(x - 8, y + 1, 16, 5, 'rgba(0,0,0,0.12)', 2, null);
    rbox(x - 1, y - 5, 3, 8, '#8A5A3B', 1);
    rbox(x - 11, y - 13, 10, 9, '#5E9F4E', 4, '#3F7A3A');
    rbox(x + 1, y - 13, 10, 9, '#5E9F4E', 4, '#3F7A3A');
    rbox(x - 8, y - 21, 16, 14, '#5E9F4E', 7, '#3F7A3A');
    rbox(x - 5, y - 18, 6, 4, '#86C46E', 2, null);
    rbox(x - 9, y - 10, 3, 2, '#86C46E', 1, null);
    rbox(x + 4, y - 8, 4, 2, '#4F8C42', 1, null);
  } else if (e === '🚲') {
    rbox(x - 7, y, 5, 5, '#FBF5E9', 2); rbox(x + 3, y, 5, 5, '#FBF5E9', 2);
    r(x - 4, y - 2, 9, 1, '#E8833A'); r(x, y - 4, 1, 3, '#E8833A');
  } else if (e === '🗑️') {
    rbox(x - 3, y - 4, 7, 8, '#8FA39A', 2); rbox(x - 4, y - 6, 9, 2, '#5F6B66', 1, null);
  } else {
    // 꽃·풀: 동그란 덤불 + 꽃잎
    const petal = { '🌷': '#F49AB4', '🌼': '#FFD966' }[e];
    rbox(x - 5, y - 3, 10, 6, '#6FAE5A', 3, '#4E8A45');
    if (petal) for (const dx of [-3, 0, 3]) { rbox(x + dx - 1, y - 5, 3, 3, petal, 1, null); r(x + dx, y - 4, 1, 1, '#FFF6D6'); }
    else for (const dx of [-3, 0, 3]) r(x + dx, y - 6, 1, 3, '#86C46E');
  }
}
