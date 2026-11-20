// 데이터(JSON) 로드 + 그림 준비.
// config.images에 경로가 있으면 그 이미지를, 없으면 이모지·도형으로 임시 그림을 만들어요.
class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    this.failed = false;
    this.load.on('loaderror', (file) => {
      if (file.type === 'json') this.failed = true;
    });
    // ?v=BUILD: 배포 후에도 폰이 예전 대사 파일을 캐시에서 쓰지 않게
    const v = '?v=' + (window.BUILD || 0);
    this.load.json('script', 'data/script.json' + v);
    this.load.json('config', 'data/config.json' + v);
  }

  create() {
    const script = this.cache.json.get('script');
    const config = this.cache.json.get('config');
    if (this.failed || !script || !config) {
      txt(this, THEME.W / 2, THEME.H / 2,
        '데이터를 불러오지 못했어요.\n\nindex.html을 더블클릭하지 말고\n로컬 서버로 열어주세요.\n(예: python -m http.server)',
        { size: 30, wrap: 600 });
      return;
    }
    this.registry.set('script', script);
    this.registry.set('config', config);

    // 그림 파일이 아직 없어도(404) 게임은 계속 — 그 키만 임시 그림을 써요
    this.load.on('loaderror', (file) => {
      if (file.type === 'image') console.info('그림이 없어서 임시 그림을 써요:', file.src);
    });
    let count = 0;
    for (const [key, path] of Object.entries(config.images || {})) {
      if (path) {
        this.load.image(key, path);
        count++;
      }
    }
    // 이미지와 글꼴이 둘 다 준비되면 타이틀로
    let waiting = 2;
    const done = () => {
      if (--waiting > 0) return;
      this.makePlaceholders(script);
      this.makeBlurredBackgrounds(config);
      this.scene.start('Title');
    };
    if (count > 0) {
      this.load.once('complete', done);
      this.load.start();
    } else {
      done();
    }
    this.loadFonts(script).then(done);
  }

  // 구글 웹폰트는 한글을 조각내서 "쓰인 글자"만 받아요. 캔버스 글자는 미리 받아둬야 해서,
  // 대사 파일에 나오는 모든 글자로 미리 받아요. 느린 망이면 4초만 기다리고 시작.
  loadFonts(script) {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const chars = [...new Set(JSON.stringify(script) + '0123456789:+·…%')].join('');
    const fonts = Promise.all([
      document.fonts.load('32px "Jua"', chars),
      document.fonts.load('32px "Gowun Dodum"', chars)
    ]).catch(() => {});
    const loading = txt(this, THEME.W / 2, THEME.H / 2, '불러오는 중…', { size: 30, color: THEME.color.sub });
    return Promise.race([fonts, new Promise((r) => setTimeout(r, 4000))]).then(() => loading.destroy());
  }

  makePlaceholders(script) {
    for (const [id, ch] of Object.entries(script.characters || {})) {
      if (ch.emoji && !this.textures.exists(id)) this.makeCharTexture(id, ch.emoji, ch.color);
    }
    if (!this.textures.exists('smoke')) this.makeSmokeTexture();
  }

  // 코드로 그린 동물(characterArt.js), 없으면 동그란 배경 + 이모지 (나중에 같은 키 이름의 png로 교체)
  makeCharTexture(key, emoji, color) {
    const size = 256;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
    if (CHARACTER_ART[key]) {
      drawAnimal(ctx, size, CHARACTER_ART[key]);
      tex.refresh();
      return;
    }
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 10, 0, Math.PI * 2);
    ctx.fillStyle = color || '#dddddd';
    ctx.fill();
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.font = `150px ${THEME.emojiFont}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2 + 10);
    tex.refresh();
  }

  // 대화 배경 사진(bg_<위치>)을 화면 크기에 맞게 잘라(cover) 흐리게 만든 텍스처 bgblur_<위치>.
  // 줄였다가 다시 키우는 방식이라 아이폰 Safari에서도 똑같이 흐려져요 (ctx.filter는 기기마다 달라서 안 써요).
  makeBlurredBackgrounds(config) {
    const opt = config.backgrounds || {};
    const blur = Phaser.Math.Clamp(opt.blur ?? 16, 1, 40);
    const tint = Phaser.Math.Clamp(opt.tint ?? 0.25, 0, 1);
    const W = THEME.W, H = THEME.H;
    const canvas = (w, h) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      return [c, ctx];
    };
    for (const key of Object.keys(config.images || {})) {
      if (!key.startsWith('bg_') || !this.textures.exists(key)) continue;
      const src = this.textures.get(key).getSourceImage();
      // 가운데를 기준으로 화면 비율만큼 잘라서 W×H로
      const s = Math.max(W / src.width, H / src.height);
      const cw = W / s, ch = H / s;
      let [c, ctx] = canvas(W, H);
      ctx.drawImage(src, (src.width - cw) / 2, (src.height - ch) / 2, cw, ch, 0, 0, W, H);
      // 반씩 줄이기 → 반씩 키우기 (한 번에 줄이면 자글자글해져요)
      let w = W, h = H;
      const minW = Math.max(8, Math.round(W / blur));
      const sizes = [];
      while (w / 2 >= minW) {
        w = Math.round(w / 2);
        h = Math.round(h / 2);
        const [n, nctx] = canvas(w, h);
        nctx.drawImage(c, 0, 0, w, h);
        c = n;
        sizes.push([w, h]);
      }
      sizes.pop();
      while (sizes.length) {
        const [uw, uh] = sizes.pop();
        const [n, nctx] = canvas(uw, uh);
        nctx.drawImage(c, 0, 0, uw, uh);
        c = n;
      }
      const tex = this.textures.createCanvas('bgblur_' + key.slice(3), W, H);
      const out = tex.getContext();
      out.imageSmoothingEnabled = true;
      out.imageSmoothingQuality = 'high';
      out.drawImage(c, 0, 0, W, H);
      // 크림색을 살짝 덮어서 파스텔 톤 + 대화창·캐릭터가 또렷하게
      out.fillStyle = THEME.color.bg;
      out.globalAlpha = tint;
      out.fillRect(0, 0, W, H);
      out.globalAlpha = 1;
      tex.refresh();
    }
  }

  makeSmokeTexture() {
    const size = 96;
    const tex = this.textures.createCanvas('smoke', size, size);
    const ctx = tex.getContext();
    const grd = ctx.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
    // 살짝 보랏빛 도는 회색 연기 (파스텔 화면에서도 연기로 읽히게)
    grd.addColorStop(0, 'rgba(232,228,240,1)');
    grd.addColorStop(0.55, 'rgba(204,198,218,0.75)');
    grd.addColorStop(1, 'rgba(196,190,210,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
