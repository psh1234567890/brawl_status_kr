const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'constants', 'brawl.ts');
let content = fs.readFileSync(filePath, 'utf-8');

const mapDictStr = `export const mapDict: any = 
{
    // 젬 그랩 (Gem Grab)
    "Hard Rock Mine": "암석 광산",
    "Minecart Madness": "광기의 광산 열차",
    "Double Swoosh": "이중 곡선",
    "Undermine": "언더마인",
    "Crystal Arcade": "크리스털 오락실",
    "Deep Diner": "심연의 식당",
    "Gem Fort": "보석 요새",
    "Rustic Arcade": "시골 오락실",
    "Deathcap Cave": "독버섯 동굴",
    "Stone Fort": "돌무더기 요새",
    "Bouncing Diner": "바운스 식당",
    "Last Stand": "최후의 저항",
    "Acute Angle": "예각",
    "Solid Center": "단단한 중심",
    "Sillhouette": "실루엣",
    
    // 브롤 볼 (Brawl Ball)
    "Backyard Bowl": "뒷마당 월드컵",
    "Center Stage": "센터 스테이지",
    "Super Beach": "슈퍼 해변",
    "Pinball Dreams": "핀볼 드림",
    "Sneaky Fields": "스니키 필드",
    "Triple Dribble": "트리플 드리블",
    "Penalty Kick": "페널티 킥",
    "Beach Ball": "비치 볼",
    "Pinhole Punt": "바늘귀 통과",
    "Sunny Soccer": "화창한 축구장",
    "Encirclement": "포위 공격",
    "Field Goal": "필드 골",
    "Slalom": "슬랄롬",
    "Iron Corridors": "강철 회랑",
    "Goalkeeper's Dream": "골키퍼의 꿈",
    "Retina": "망막",
    
    // 쇼다운 (Showdown)
    "Feast or Famine": "모 아니면 도",
    "Skull Creek": "해골천",
    "Double Trouble": "이중 위협",
    "Rockwall Brawl": "바위 장벽 전투",
    "Acid Lakes": "산성 호수",
    "Cavern Churn": "우당탕 진흙탕",
    "Dark Passage": "어두운 통로",
    "Scorched Stone": "불타는 돌무더기",
    "Clash Colosseum": "클래시 콜로세움",
    "Riverside": "강가",
    "Safety Center": "안전 센터",
    "Island Invasion": "섬 침략",
    "Flying Fantasies": "날으는 환상",
    "Point of View": "관점",
    "Dune Drift": "사구 드리프트",
    "Forsaken Falls": "버려진 폭포",
    
    // 하이스트 (Heist)
    "Safe Zone": "안전 지대",
    "Hot Potato": "뜨거운 감자",
    "Pit Stop": "피트 스톱",
    "Kaboom Canyon": "우당탕 협곡",
    "Bridge Too Far": "머나먼 다리",
    "G.G. Mortuary": "G.G. 공동묘지",
    "Tornado Ring": "토네이도 링",
    "Snaked Assault": "뱀의 공격",
    "Forks Out": "갈림길",
    "Traffic Jam": "교통 체증",
    "Cover Crowd": "커버 크라우드",
    "Splitter": "스플리터",
    "Milky Way": "은하수",
    
    // 바운티 (Bounty)
    "Shooting Star": "별내림 계곡",
    "Canal Grande": "운하 협곡",
    "Layer Cake": "레이어 케이크",
    "Excel": "엑셀",
    "Snake Prairie": "뱀의 초원",
    "Dry Season": "건조기",
    "Temple Ruins": "사원 폐허",
    "Hideout": "은신처",
    "Overgrown Oasis": "우거진 오아시스",
    "Purple Paradise": "퍼플 파라다이스",
    
    // 핫 존 (Hot Zone)
    "Ring of Fire": "불의 고리",
    "Dueling Beetles": "곤충 싸움",
    "Open Business": "오픈 비즈니스",
    "Parallel Plays": "평행선",
    "Split": "분할",
    "Quarter Pounder": "쿼터 파운더",
    "Triumvirate": "삼두정치",
    "Night Museum": "야간 박물관",
    "Massive Attack": "대규모 공격",
    
    // 녹아웃 (Knockout)
    "Goldarm Gulch": "골드암 골짜기",
    "Flaring Phoenix": "불타는 불사조",
    "Belle's Rock": "벨의 바위",
    "Out in the Open": "탁 트인 공간",
    "New Perspective": "새로운 시각",
    "Deep End": "깊은 곳",
    "X Marks the Spot": "X 표시",
    "Healthy Middle Ground": "건강한 타협점",
    "Belles Rock": "벨의 바위",
    "Four Levels": "네 개의 레벨",
    "Flowing Springs": "흐르는 샘",
    "Waters of Doom": "파멸의 물",
    
    // 와이프아웃 (Wipeout)
    "Infinite Doom": "무한한 파멸",
    "Quad Damage": "쿼드 데미지",
    "The Great Open": "탁 트인 공간",
    "Pain in the Grass": "초원의 고통"
};

export const mapToModeDict: any = 
{
    // 젬 그랩
    "Hard Rock Mine": "젬 그랩",
    "Minecart Madness": "젬 그랩",
    "Double Swoosh": "젬 그랩",
    "Undermine": "젬 그랩",
    "Crystal Arcade": "젬 그랩",
    "Deep Diner": "젬 그랩",
    "Gem Fort": "젬 그랩",
    "Rustic Arcade": "젬 그랩",
    "Deathcap Cave": "젬 그랩",
    "Stone Fort": "젬 그랩",
    "Bouncing Diner": "젬 그랩",
    "Last Stand": "젬 그랩",
    "Acute Angle": "젬 그랩",
    "Solid Center": "젬 그랩",
    "Sillhouette": "젬 그랩",
    
    // 브롤 볼
    "Backyard Bowl": "브롤 볼",
    "Center Stage": "브롤 볼",
    "Super Beach": "브롤 볼",
    "Pinball Dreams": "브롤 볼",
    "Sneaky Fields": "브롤 볼",
    "Triple Dribble": "브롤 볼",
    "Penalty Kick": "브롤 볼",
    "Beach Ball": "브롤 볼",
    "Pinhole Punt": "브롤 볼",
    "Sunny Soccer": "브롤 볼",
    "Encirclement": "브롤 볼",
    "Field Goal": "브롤 볼",
    "Slalom": "브롤 볼",
    "Iron Corridors": "브롤 볼",
    "Goalkeeper's Dream": "브롤 볼",
    "Retina": "브롤 볼",
    
    // 쇼다운
    "Feast or Famine": "쇼다운",
    "Skull Creek": "쇼다운",
    "Double Trouble": "쇼다운",
    "Rockwall Brawl": "쇼다운",
    "Acid Lakes": "쇼다운",
    "Cavern Churn": "쇼다운",
    "Dark Passage": "쇼다운",
    "Scorched Stone": "쇼다운",
    "Clash Colosseum": "쇼다운",
    "Riverside": "쇼다운",
    "Safety Center": "쇼다운",
    "Island Invasion": "쇼다운",
    "Flying Fantasies": "쇼다운",
    "Point of View": "쇼다운",
    "Dune Drift": "쇼다운",
    "Forsaken Falls": "쇼다운",
    
    // 하이스트
    "Safe Zone": "하이스트",
    "Hot Potato": "하이스트",
    "Pit Stop": "하이스트",
    "Kaboom Canyon": "하이스트",
    "Bridge Too Far": "하이스트",
    "G.G. Mortuary": "하이스트",
    "Tornado Ring": "하이스트",
    "Snaked Assault": "하이스트",
    "Forks Out": "하이스트",
    "Traffic Jam": "하이스트",
    "Cover Crowd": "하이스트",
    "Splitter": "하이스트",
    "Milky Way": "하이스트",
    
    // 바운티
    "Shooting Star": "바운티",
    "Canal Grande": "바운티",
    "Layer Cake": "바운티",
    "Excel": "바운티",
    "Snake Prairie": "바운티",
    "Dry Season": "바운티",
    "Temple Ruins": "바운티",
    "Hideout": "바운티",
    "Overgrown Oasis": "바운티",
    "Purple Paradise": "바운티",
    
    // 핫 존
    "Ring of Fire": "핫 존",
    "Dueling Beetles": "핫 존",
    "Open Business": "핫 존",
    "Parallel Plays": "핫 존",
    "Split": "핫 존",
    "Quarter Pounder": "핫 존",
    "Triumvirate": "핫 존",
    "Night Museum": "핫 존",
    "Massive Attack": "핫 존",
    
    // 녹아웃
    "Goldarm Gulch": "녹아웃",
    "Flaring Phoenix": "녹아웃",
    "Belle's Rock": "녹아웃",
    "Belles Rock": "녹아웃",
    "Out in the Open": "녹아웃",
    "New Perspective": "녹아웃",
    "Deep End": "녹아웃",
    "X Marks the Spot": "녹아웃",
    "Healthy Middle Ground": "녹아웃",
    "Four Levels": "녹아웃",
    "Flowing Springs": "녹아웃",
    "Waters of Doom": "녹아웃",
    
    // 와이프아웃
    "Infinite Doom": "와이프아웃",
    "Quad Damage": "와이프아웃",
    "The Great Open": "와이프아웃",
    "Pain in the Grass": "기타"
};
`;

// Extract existing file string starting from 'export const rankDict: any ='
const startIndex = content.indexOf('export const rankDict: any =');
if(startIndex !== -1) {
    const newContent = mapDictStr + "\n" + content.substring(startIndex);
    fs.writeFileSync(filePath, newContent, 'utf-8');
    console.log('Successfully updated brawl.ts');
} else {
    console.error('Could not find rankDict to replace.');
}

// Now let's update src/app/meta/page.tsx to remove its hardcoded maps and import from brawl.ts
const metaPath = path.join(__dirname, 'src', 'app', 'meta', 'page.tsx');
let metaContent = fs.readFileSync(metaPath, 'utf-8');

// The maps in meta/page.tsx start at line 5 and end before 'const brawlerDict: any ='
const metaBrawlerStartIndex = metaContent.indexOf('const brawlerDict: any =');
const importString = 'import { mapDict, mapToModeDict } from "../../constants/brawl";\n\n';

if (metaBrawlerStartIndex !== -1) {
    // find start of mapDict
    const startMapDictIdx = metaContent.indexOf('const mapDict: any =');
    
    if(startMapDictIdx !== -1) {
        let finalMetaContent = metaContent.substring(0, startMapDictIdx) + importString + metaContent.substring(metaBrawlerStartIndex);
        fs.writeFileSync(metaPath, finalMetaContent, 'utf-8');
        console.log('Successfully updated meta/page.tsx');
    } else {
        console.error('Could not find mapDict in meta/page.tsx');
    }
}
