// 대사·설정 파일 검사: 장면 이름 오타, 없는 인물·표정, 없는 그림 파일을 찾아요.
// 오타가 있으면 게임에선 경고만 남고 대화가 조용히 끝나서, 대사를 고친 뒤 한 번 돌려 주세요.
// 실행: node tools/check-script.js   (문제가 없으면 "문제 없음")
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const script = JSON.parse(fs.readFileSync(path.join(root, 'data/script.json'), 'utf8'));
const config = JSON.parse(fs.readFileSync(path.join(root, 'data/config.json'), 'utf8'));

const problems = [];
const chars = new Set(Object.keys(script.characters));
const faces = new Set(['normal', 'happy', 'annoyed', 'surprised', 'sad', 'cough']);
const targets = (n) => (Array.isArray(n) ? n.map((x) => x.to) : n == null ? [] : [n]);

function checkDialogues(dialogues, where) {
  for (const [id, d] of Object.entries(dialogues || {})) {
    const nodes = d.nodes || {};
    const cast = d.cast || [];
    const at = `${where} > ${id}`;
    for (const t of targets(d.start)) if (t && !nodes[t]) problems.push(`${at}: start "${t}" 장면이 없어요`);
    for (const c of cast) if (!chars.has(c)) problems.push(`${at}: cast "${c}"가 characters에 없어요`);
    for (const [nid, n] of Object.entries(nodes)) {
      for (const t of targets(n.next)) if (t && !nodes[t]) problems.push(`${at} > ${nid}: next "${t}" 장면이 없어요`);
      for (const c of n.choices || []) {
        for (const t of targets(c.next)) if (t && !nodes[t]) problems.push(`${at} > ${nid}: 선택지 next "${t}" 장면이 없어요`);
      }
      for (const l of n.lines || []) {
        if (!chars.has(l.who)) problems.push(`${at} > ${nid}: who "${l.who}"가 characters에 없어요`);
        if (l.face && !faces.has(l.face)) problems.push(`${at} > ${nid}: 표정 "${l.face}"가 없어요`);
        if (l.face && !cast.includes(l.who)) problems.push(`${at} > ${nid}: face를 쓴 "${l.who}"가 cast에 없어요`);
        for (const [k, v] of Object.entries(l.faces || {})) {
          if (!faces.has(v)) problems.push(`${at} > ${nid}: 표정 "${v}"가 없어요`);
          if (!cast.includes(k)) problems.push(`${at} > ${nid}: faces의 "${k}"가 cast에 없어요`);
        }
      }
    }
  }
}

checkDialogues(script.dialogues, '공통');
for (const [r, route] of Object.entries(script.routes)) {
  checkDialogues(route.dialogues, r);
  const all = { ...script.dialogues, ...route.dialogues };
  for (const b of route.breaks) {
    for (const k of ['intro', 'encounter', 'arrive']) {
      if (b[k] && !all[b[k]]) problems.push(`${r} > 쉬는 시간 ${b.id}: ${k} "${b[k]}" 대화가 없어요`);
    }
    for (const e of b.events || []) {
      if (e.dialogue && !all[e.dialogue]) problems.push(`${r} > 쉬는 시간 ${b.id}: 이벤트 대화 "${e.dialogue}"가 없어요`);
    }
    if (!config.breaks?.[r]?.[b.id]) problems.push(`config.json breaks.${r}.${b.id}가 없어요 (시간·바람)`);
  }
  if (route.short?.arrive && !all[route.short.arrive]) problems.push(`${r} > short.arrive "${route.short.arrive}" 대화가 없어요`);
}

for (const [key, file] of Object.entries(config.images || {})) {
  if (file && !fs.existsSync(path.join(root, file))) problems.push(`config.json images.${key}: 파일 "${file}"이 없어요`);
}

if (problems.length) {
  console.log(problems.map((p) => '✗ ' + p).join('\n'));
  process.exit(1);
}
console.log('문제 없음');
