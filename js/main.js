// 게임 시작점: Phaser 설정과 씬 등록
// 씬 순서 = 그려지는 순서. Dialogue가 Walk 뒤에 있어야 걷기 화면 위에 대화창이 겹쳐 떠요.
window.addEventListener('load', () => {
  document.getElementById('loading').remove();

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
