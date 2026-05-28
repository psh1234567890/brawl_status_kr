const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'constants', 'brawl.ts');
let content = fs.readFileSync(file, 'utf8');

const newMaps = `
    "Lilypond Grove": "연꽃 연못",
    "Kroket": "크로켓",
    "Molten to the Core": "용암의 중심",
    "Streets with No Name": "이름 없는 거리",
    "Crab Claws": "집게발",
    "Chivalry": "기사도",
    "Grass Knot": "풀묶기",
    "Paralysis Pen": "마비의 우리",
    "Pocket Pass": "포켓 패스",
    "The Smackdome": "스맥돔",
    "Match 1123581321": "매치 1123581321",
`;

const newModes = `
    "Lilypond Grove": "쇼다운",
    "Kroket": "쇼다운",
    "Molten to the Core": "쇼다운",
    "Streets with No Name": "녹아웃",
    "Crab Claws": "녹아웃",
    "Chivalry": "녹아웃",
    "Grass Knot": "브롤 볼",
    "Paralysis Pen": "기타",
    "Pocket Pass": "브롤 볼",
    "The Smackdome": "기타",
    "Match 1123581321": "기타",
`;

content = content.replace('export const mapDict: any = \n{', 'export const mapDict: any = \n{' + newMaps);
content = content.replace('export const mapToModeDict: any = \n{', 'export const mapToModeDict: any = \n{' + newModes);

fs.writeFileSync(file, content);
console.log('Added missing maps to dictionary!');
