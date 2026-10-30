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
    this.load.json('script', 'data/script.json');
    this.load.json('config', 'data/config.json');
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
    const done = () => {
      this.makePlaceholders(script);
      this.scene.start('Title');
    };
    if (count > 0) {
      this.load.once('complete', done);
      this.load.start();
    } else {
      done();
    }
  }

  makePlaceholders(script) {
    for (const [id, ch] of Object.entries(script.characters || {})) {
      if (ch.emoji && !this.textures.exists(id)) this.makeCharTexture(id, ch.emoji, ch.color);
    }
    if (!this.textures.exists('smoke')) this.makeSmokeTexture();
  }

  // 동그란 배경 + 이모지 얼굴 (나중에 같은 키 이름의 png로 교체)
  makeCharTexture(key, emoji, color) {
    const size = 256;
    const tex = this.textures.createCanvas(key, size, size);
    const ctx = tex.getContext();
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
    grd.addColorStop(0, 'rgba(235,235,235,1)');
    grd.addColorStop(0.55, 'rgba(210,210,210,0.75)');
    grd.addColorStop(1, 'rgba(200,200,200,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    tex.refresh();
  }
}
