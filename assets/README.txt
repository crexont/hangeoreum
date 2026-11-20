그림 파일을 넣는 폴더예요.

1. 이 폴더에 png를 넣어요. (예: assets/jieun.png)
2. data/config.json의 "images"에 경로를 적어요. (예: "jieun": "assets/jieun.png")
3. 비워 두면 코드로 그린 도트 동물 그림이 나와요.

키 이름: jieun, minwoo, fox, bear, panda, neighbor, friendJ, friendM (대화 캐릭터, 정사각형 투명 PNG·webp)
        표정은 jieun__happy처럼 <키>__<표정> (normal/happy/annoyed/surprised/sad/cough). 지금 그림은 assets/characters/
        map (걷기 맵 전체, 720x2400)

대화 배경 (실제 학교 사진) — assets/bg 폴더에 아래 이름 그대로 넣으면 바로 나와요.
  게임이 자동으로 화면에 맞게 잘라서 흐리게(블러) 처리해요. 세로 사진이면 가장 좋아요.
  흐림 정도·크림색 덮기는 data/config.json의 "backgrounds"에서 조절.
  모자이크라 큰 사진은 필요 없어요: 세로 320px 정도로 줄여 넣으면 폰에서 빨리 떠요.
  (backgrounds.blur를 4보다 작게 바꾸면 더 큰 사진이 필요해요)

  assets/bg/classroom.jpg      강의실 (도착 대화)
  assets/bg/cafeteria.jpg      학생식당 (지은 점심 도착)
  assets/bg/cafeteria_m.jpg    학생식당 다른 각도 (민우 점심 도착)
  assets/bg/stairs.webp        계단·흡연구역 (흡연구역 앞 대화, 걷다가 친구 만날 때, 진엔딩)
  assets/bg/building.jpg       강의동 앞 (강의동에서 출발할 때)
  assets/bg/studentcenter.jpg  학생회관 앞 (학생회관에서 출발할 때)

  png나 jpeg 파일이면 config.json images의 bg_... 경로 확장자만 바꿔 주세요.
  파일이 없는 위치는 예전처럼 걷기 화면을 어둡게 하거나 그린 배경을 써요.
