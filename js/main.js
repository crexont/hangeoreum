// 게임 시작점: Phaser 설정과 씬 등록
// 씬 순서 = 그려지는 순서. Dialogue가 Walk 뒤에 있어야 걷기 화면 위에 대화창이 겹쳐 떠요.
window.addEventListener('load', async () => {
  // 웹폰트를 먼저 받아야 캔버스 글자에 적용돼요. 느린 망이면 2.5초만 기다리고 기본 글꼴로 시작.
  if (document.fonts && document.fonts.load) {
    const fonts = Promise.all([
      document.fonts.load('32px "Jua"', '가나다'),
      document.fonts.load('32px "Gowun Dodum"', '가나다')
    ]).catch(() => {});
    await Promise.race([fonts, new Promise((r) => setTimeout(r, 2500))]);
  }
  document.getElementById('loading').remove();

  // 폭은 720 고정, 높이는 폰 화면 비율에 맞춰 늘려요 (아이폰 Safari ≈ 1.6~2.2).
  // 이렇게 해야 위아래 빈 띠 없이 화면을 꽉 채우고, 글자도 최대한 크게 보여요.
  const ratio = window.innerHeight / window.innerWidth;
  THEME.H = Phaser.Math.Clamp(Math.round(THEME.W * ratio), 1180, 1560);

  // iOS Safari는 user-scalable=no를 무시해서, 두 손가락 확대를 직접 막아요
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  window.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: THEME.color.bg,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: THEME.W,
      height: THEME.H
    },
    render: { roundPixels: true },
    scene: [BootScene, TitleScene, WalkScene, DialogueScene, EndingScene]
  });
});
