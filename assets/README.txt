그림 파일을 넣는 폴더예요.

1. 이 폴더에 png를 넣어요. (예: assets/jieun.png)
2. data/config.json의 "images"에 경로를 적어요. (예: "jieun": "assets/jieun.png")
3. 비워 두면 임시 이모지 그림이 나와요.

키 이름: jieun, minwoo, fox, bear, panda, neighbor (캐릭터, 정사각형 권장)
        smoke (연기 한 덩어리, 투명 배경)
        map (걷기 맵 전체, 720x2400)

대화 배경 (실제 학교 사진) — assets/bg 폴더에 아래 이름 그대로 넣으면 바로 나와요.
  게임이 자동으로 화면에 맞게 잘라서 흐리게(블러) 처리해요. 세로 사진이면 가장 좋아요.
  흐림 정도·크림색 덮기는 data/config.json의 "backgrounds"에서 조절.

  assets/bg/classroom.jpg      강의실 (도착 대화)
  assets/bg/cafeteria.jpg      학생식당 (지은 점심 도착)
  assets/bg/cafeteria_m.jpg    학생식당 다른 각도 (민우 점심 도착)
  assets/bg/stairs.webp        계단·흡연구역 (흡연구역 앞 대화, 걷다가 친구 만날 때, 진엔딩)
  assets/bg/building.jpg       강의동 앞 (강의동에서 출발할 때)
  assets/bg/studentcenter.jpg  학생회관 앞 (학생회관에서 출발할 때)

  png나 jpeg 파일이면 config.json images의 bg_... 경로 확장자만 바꿔 주세요.
  파일이 없는 위치는 예전처럼 걷기 화면을 어둡게 하거나 그린 배경을 써요.
