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
