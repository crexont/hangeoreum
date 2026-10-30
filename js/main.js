// 게임 시작점: Phaser 설정과 씬 등록
// 씬 순서 = 그려지는 순서. Dialogue가 Walk 뒤에 있어야 걷기 화면 위에 대화창이 겹쳐 떠요.
window.addEventListener('load', () => {
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
