// 데이터(JSON) 로드 + 그림 준비.
// config.images에 경로가 있으면 그 이미지를, 없으면 코드로 그린 그림을 써요.
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
      this.makePlaceholders();
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
      document.fonts.load('32px "GalmuriPx"', chars)
    ]).catch(() => {});
    const loading = txt(this, THEME.W / 2, THEME.H / 2, '불러오는 중…', { size: 30, color: THEME.color.sub });
    return Promise.race([fonts, new Promise((r) => setTimeout(r, 4000))]).then(() => loading.destroy());
  }

  makePlaceholders() {
    // 걷기용 도트 그림 (대화 그림을 config 이미지로 바꾼 캐릭터도 걷기는 도트)
    for (const k of Object.keys(CHARACTER_ART)) makeWalkSprites(this, k);
    makePixelSmoke(this);
    // 대화 그림 파일이 없거나 못 받았으면 코드로 그린 동물(characterArt.js)
    for (const k of Object.keys(CHARACTER_ART)) if (!this.textures.exists(k)) makeAnimalTexture(this, k);
  }

  // 대화 배경 사진(bg_<위치>)을 화면 크기에 맞게 잘라(cover) 도트 그림처럼 만든 텍스처 bgblur_<위치>.
  // 반씩 줄였다가 매끄럽게 하지 않고 한 번에 키워요 (ctx.filter는 기기마다 달라서 안 써요).
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
      // 반씩 줄이기 (한 번에 줄이면 자글자글해져요)
      let w = W, h = H;
      const minW = Math.max(8, Math.round(W / blur));
      while (w / 2 >= minW) {
        w = Math.round(w / 2);
        h = Math.round(h / 2);
        const [n, nctx] = canvas(w, h);
        nctx.drawImage(c, 0, 0, w, h);
        c = n;
      }
      if (w !== minW) { // 마지막에 정확히 W/blur칸으로 (도트 크기 = blur px)
        const [n, nctx] = canvas(minW, Math.round(H * minW / W));
        nctx.drawImage(c, 0, 0, n.width, n.height);
        c = n;
      }
      // 다시 키울 때는 매끄럽게 하지 않아서 도트 그림처럼 (blur = 도트 한 칸 크기)
      const tex = this.textures.createCanvas('bgblur_' + key.slice(3), W, H);
      const out = tex.getContext();
      out.imageSmoothingEnabled = false;
      out.drawImage(c, 0, 0, W, H);
      // 크림색을 살짝 덮어서 파스텔 톤 + 대화창·캐릭터가 또렷하게
      out.fillStyle = THEME.color.bg;
      out.globalAlpha = tint;
      out.fillRect(0, 0, W, H);
      out.globalAlpha = 1;
      tex.refresh();
    }
  }
}
