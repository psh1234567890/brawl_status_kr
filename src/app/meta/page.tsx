"use client";

import { useState, useEffect } from "react";

// 1. 맵 이름 한국어 번역 사전
const mapDict: any = 
{
    "Hard Rock Mine": "암석 광산",
    "Minecart Madness": "광산 열차",
    "Sneaky Fields": "스니키 필드",
    "Triple Dribble": "트리플 드리블",
    "Pit Stop": "피트 스톱",
    "Bridge Too Far": "브릿지 투 파",
    "Shooting Star": "슈팅 스타",
    "Snake Prairie": "뱀의 초원",
    "Dueling Beetles": "불타는 비틀즈",
    "Ring of Fire": "불의 고리",
    "Goldarm Gulch": "골드암 갱도",
    "Flaring Phoenix": "불타는 피닉스",
    "Out in the Open": "아웃 인 더 오픈",
    "Belle's Rock": "벨의 바위",
    "Safe Zone": "안전 지대",
    "Kaboom Canyon": "카붐 캐년",
    "Double Swoosh": "이중 곡선",
    "Undermine": "언더마인",
    "Center Stage": "센터 스테이지",
    "Super Beach": "슈퍼 해변",
    "Canal Grande": "대운하",
    "Excel": "엑셀",
    "Parallel Plays": "평행선",
    "Split": "분할",
    "Feast or Famine": "모 아니면 도",
    "Skull Creek": "해골 천천"
};

// 2. ✨ [핵심 해결책] 외부 API를 믿지 않고, 확실한 맵-모드 분류 사전을 하드코딩으로 박아버림!
const mapToModeDict: any = 
{
    "Hard Rock Mine": "젬 그랩",
    "Minecart Madness": "젬 그랩",
    "Double Swoosh": "젬 그랩",
    "Undermine": "젬 그랩",
    
    "Sneaky Fields": "브롤 볼",
    "Triple Dribble": "브롤 볼",
    "Center Stage": "브롤 볼",
    "Super Beach": "브롤 볼",
    
    "Pit Stop": "하이스트",
    "Bridge Too Far": "하이스트",
    "Safe Zone": "하이스트",
    "Kaboom Canyon": "하이스트",
    
    "Shooting Star": "바운티",
    "Snake Prairie": "바운티",
    "Canal Grande": "바운티",
    "Excel": "바운티",
    
    "Dueling Beetles": "핫 존",
    "Ring of Fire": "핫 존",
    "Parallel Plays": "핫 존",
    "Split": "핫 존",
    
    "Goldarm Gulch": "녹아웃",
    "Flaring Phoenix": "녹아웃",
    "Out in the Open": "녹아웃",
    "Belle's Rock": "녹아웃",
    
    "Feast or Famine": "쇼다운",
    "Skull Creek": "쇼다운"
};

const brawlerDict: any = 
{
    SHELLY: "쉘리",
    NITA: "니타",
    COLT: "콜트",
    BULL: "불",
    BROCK: "브록",
    "EL PRIMO": "엘 프리모",
    BARLEY: "발리",
    POCO: "포코",
    ROSA: "로사",
    JESSIE: "제시",
    DYNAMIKE: "다이너마이크",
    TICK: "틱",
    "8-BIT": "8비트",
    RICO: "리코",
    DARRYL: "대릴",
    PENNY: "페니",
    CARL: "칼",
    JACKY: "재키",
    PIPER: "파이퍼",
    PAM: "팸",
    FRANK: "프랭크",
    BIBI: "비비",
    BEA: "비",
    NANI: "나니",
    EDGAR: "에드거",
    GRIFF: "그리프",
    GROM: "그롬",
    MORTIS: "모티스",
    TARA: "타라",
    GENE: "진",
    MAX: "맥스",
    "MR. P": "미스터 P",
    SPROUT: "스프라우트",
    BYRON: "바이런",
    SQUEAK: "스퀴크",
    SPIKE: "스파이크",
    CROW: "크로우",
    LEON: "레온",
    SANDY: "샌디",
    AMBER: "앰버",
    MEG: "메그",
    SURGE: "서지",
    COLETTE: "콜레트",
    LOU: "루",
    RUFFS: "러프스",
    BELLE: "벨",
    BUZZ: "버즈",
    ASH: "애쉬",
    LOLA: "롤라",
    FANG: "팽",
    EVE: "이브",
    JANET: "자넷",
    OTIS: "오티스",
    SAM: "샘",
    BUSTER: "버스터",
    MANDY: "맨디",
    "R-T": "R-T",
    WILLOW: "윌로우",
    MAISIE: "메이지",
    HANK: "행크",
    CORDELIUS: "코델리우스",
    DOUG: "더그",
    PEARL: "펄",
    CHUCK: "척",
    CHARLIE: "찰리",
    MICO: "미코",
    KIT: "키트",
    "LARRY & LAWRIE": "래리 & 로리",
    MELODIE: "멜로디",
    ANGELO: "안젤로",
    LILY: "릴리",
    DRACO: "드라코",
    BERRY: "베리",
    CLANCY: "클랜시",
    MOE: "모",
    KENJI: "켄지",
    JUJU: "주주",
    SHADE: "셰이드",
    GALE: "게일",
    CHESTER: "체스터",
    BO: "보",
    EMZ: "엠즈",
    STU: "스튜",
    DEMIAN: "데미안",
    DAMIAN: "데미안",
    LUMI: "루미",
    "STARR Nova": "스타 노바",
    BOLT: "볼트",
    PIERCE: "피어스",
    MINA: "미나",
    MEEPLE: "미플",
    ZIGGY: "지기",
    OLLIE: "올리",
    GLOWY: "글로이",
    GLOWBERT: "글로버트",
    TRUNK: "트렁크",
    ALLI: "알리",
    FINX: "핑스",
    "JAE-YONG": "재용",
    GIGI: "지지",
    KAZE: "카제",
    NAJIA: "나지아",
    SIRIUS: "시리우스",
    BONNIE: "보니",
    GRAY: "그레이",
    GUS: "거스",
};

export default function MetaDashboard() 
{
    const [realData, setRealData] = useState<any>(null);
    const [imageDict, setImageDict] = useState<any>({});
    
    const [selectedMode, setSelectedMode] = useState<string>("젬 그랩");
    const [selectedMap, setSelectedMap] = useState<string>("");
    const [loading, setLoading] = useState(true);

    const modeList = ["젬 그랩", "브롤 볼", "하이스트", "바운티", "핫 존", "녹아웃", "쇼다운", "기타"];

    useEffect(() => 
    {
        const fetchData = async () => 
        {
            try 
            {
                // 1. 브롤러 ID는 사진을 위해 계속 BrawlAPI에서 가져옴
                try 
                {
                    const brawlerRes = await fetch("https://api.brawlapi.com/v1/brawlers");
                    const brawlerJson = await brawlerRes.json();
                    
                    const idMap: any = {};
                    if (brawlerJson.list) 
                    {
                        for (let i = 0; i < brawlerJson.list.length; i = i + 1)
                        {
                            const b = brawlerJson.list[i];
                            idMap[b.name.toUpperCase()] = b.id;
                        }
                    }
                    setImageDict(idMap);
                } 
                catch (error) 
                {
                    console.error("브롤러 API 에러:", error);
                }

                // 2. 우리 DB 통계 가져오기
                const res = await fetch("/api/meta");
                const json = await res.json();
                
                setRealData(json);
                
                const keys = Object.keys(json);
                if (keys.length > 0) 
                {
                    let isFound = false;
                    for (let i = 0; i < keys.length; i = i + 1)
                    {
                        const mName = keys[i];
                        
                        // ✨ 정규화나 외부 API 없이 우리가 만든 확실한 사전에서 모드 찾기!
                        let mMode = "기타";
                        if (mapToModeDict[mName])
                        {
                            mMode = mapToModeDict[mName];
                        }
                        
                        if (mMode === "젬 그랩")
                        {
                            if (!isFound)
                            {
                                setSelectedMap(mName);
                                isFound = true;
                            }
                        }
                    }
                    
                    // 만약 젬 그랩 맵이 아예 없으면 첫번째 맵 강제 선택
                    if (!isFound)
                    {
                        setSelectedMap(keys[0]);
                        
                        let fallbackMode = "기타";
                        if (mapToModeDict[keys[0]])
                        {
                            fallbackMode = mapToModeDict[keys[0]];
                        }
                        setSelectedMode(fallbackMode);
                    }
                }
                
                setLoading(false);
            } 
            catch (error) 
            {
                console.error("에러 발생", error);
                setLoading(false);
            }
        };
        
        fetchData();
    }, []);

    // 탭 클릭했을 때 동작하는 로직
    const handleModeClick = (modeName: string) =>
    {
        setSelectedMode(modeName);
        
        let targetMap = "";
        if (realData !== null)
        {
            const keys = Object.keys(realData);
            let isFound = false;
            
            for (let i = 0; i < keys.length; i = i + 1)
            {
                const mName = keys[i];
                
                let mMode = "기타";
                if (mapToModeDict[mName])
                {
                    mMode = mapToModeDict[mName];
                }
                
                if (mMode === modeName)
                {
                    if (!isFound)
                    {
                        targetMap = mName;
                        isFound = true;
                    }
                }
            }
        }
        setSelectedMap(targetMap);
    };

    // 현재 선택된 모드에 해당하는 맵만 걸러내기
    const filteredMaps: string[] = [];
    if (realData !== null)
    {
        const allMaps = Object.keys(realData);
        for (let i = 0; i < allMaps.length; i = i + 1)
        {
            const mName = allMaps[i];
            
            let mMode = "기타";
            if (mapToModeDict[mName])
            {
                mMode = mapToModeDict[mName];
            }
            
            if (mMode === selectedMode)
            {
                filteredMaps.push(mName);
            }
        }
    }

    // 선택된 맵의 브롤러 통계 정제 (Unknown 제거)
    let currentData = [];
    if (realData !== null)
    {
        if (selectedMap !== "")
        {
            const rawData = realData[selectedMap];
            if (rawData)
            {
                currentData = [];
                for (let i = 0; i < rawData.length; i = i + 1)
                {
                    if (rawData[i].name !== "Unknown")
                    {
                        currentData.push(rawData[i]);
                    }
                }
            }
        }
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-10 flex flex-col items-center">
            <div className="text-center mb-10">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 drop-shadow-sm">
                    🗺️ 맵별 1티어 브롤러 추천기
                </h1>
                <p className="text-gray-500 font-bold">
                    누적 빅데이터 가중 승률 기반 알고리즘 적용
                </p>
                <div className="mt-6">
                    <a href="/" className="inline-block bg-white text-indigo-600 border border-indigo-200 font-bold px-6 py-2 rounded-full hover:bg-indigo-50 transition-colors shadow-sm">
                        ← 전적 검색으로 돌아가기
                    </a>
                </div>
            </div>
            
            {loading ? (
                <div className="text-2xl font-black text-indigo-500 animate-pulse mt-20 bg-white px-8 py-4 rounded-full shadow-md">
                    데이터베이스에서 글로벌 통계를 가져오는 중... 🚀
                </div>
            ) : (
                <div className="w-full flex flex-col items-center max-w-4xl">
                    
                    {/* 상단 모드 선택 탭 */}
                    <div className="flex gap-3 mb-6 bg-white/60 p-2 rounded-2xl shadow-sm overflow-x-auto w-full justify-start sm:justify-center no-scrollbar">
                        {modeList.map((modeName) => 
                        {
                            let isModeSelected = false;
                            if (modeName === selectedMode)
                            {
                                isModeSelected = true;
                            }

                            return (
                                <button
                                    key={modeName}
                                    onClick={() => handleModeClick(modeName)}
                                    className={`px-6 py-2.5 rounded-xl font-black text-sm whitespace-nowrap transition-all ${
                                        isModeSelected ? "bg-indigo-600 text-white shadow-md scale-105" : "bg-white text-gray-500 hover:bg-gray-100"
                                    }`}
                                >
                                    {modeName}
                                </button>
                            );
                        })}
                    </div>

                    {/* 선택된 모드의 맵 리스트 버튼들 */}
                    <div className="flex gap-3 mb-10 flex-wrap justify-center w-full">
                        {filteredMaps.length > 0 ? (
                            filteredMaps.map((mapName) => 
                            {
                                let isMapSelected = false;
                                if (mapName === selectedMap) 
                                {
                                    isMapSelected = true;
                                }

                                let displayMapName = mapName;
                                if (mapDict[mapName])
                                {
                                    displayMapName = mapDict[mapName];
                                }

                                return (
                                    <button
                                        key={mapName}
                                        onClick={() => setSelectedMap(mapName)}
                                        className={`px-6 py-2.5 rounded-full font-bold text-md border transition-all ${
                                            isMapSelected ? "bg-white border-2 border-indigo-500 text-indigo-600 shadow-sm font-black" : "bg-white/80 border-gray-200 text-gray-500 hover:bg-white"
                                        }`}
                                    >
                                        {displayMapName}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="text-gray-400 font-bold text-sm bg-white/40 px-6 py-2 rounded-full border border-dashed border-gray-300">
                                현재 이 모드에 저장된 맵 데이터가 없어!
                            </div>
                        )}
                    </div>

                    {/* 추천 브롤러 결과 리스트 */}
                    {currentData.length > 0 ? (
                        <div className="w-full max-w-3xl bg-white/80 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white">
                            <h2 className="text-2xl font-black mb-6 border-b-2 border-indigo-100 pb-4 flex justify-between items-end">
                                <span>
                                    🏆 {mapDict[selectedMap] ? mapDict[selectedMap] : selectedMap} 최고 승률 픽
                                </span>
                                <span className="text-sm font-bold text-gray-400">데이터 기준: 최소 5판 이상</span>
                            </h2>
                            
                            <div className="flex flex-col gap-4">
                                {currentData.map((brawler: any, index: number) => 
                                {
                                    let displayBrawlerName = brawler.name;
                                    if (brawlerDict[brawler.name])
                                    {
                                        displayBrawlerName = brawlerDict[brawler.name];
                                    }

                                    const brawlerId = imageDict[brawler.name];
                                    let imgSrc = "";
                                    
                                    if (brawlerId)
                                    {
                                        imgSrc = `https://cdn.brawlify.com/brawlers/borders/${brawlerId}.png`;
                                    }
                                    else
                                    {
                                        imgSrc = `https://cdn.brawlify.com/brawler/${brawler.name}.png`;
                                    }

                                    return (
                                        <div 
                                            key={brawler.name} 
                                            className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="text-3xl font-black text-indigo-200 w-10 text-center">
                                                    #{index + 1}
                                                </div>
                                                <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 shadow-sm">
                                                    <img 
                                                        src={imgSrc} 
                                                        alt={brawler.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => 
                                                        {
                                                            (e.target as HTMLImageElement).style.display = "none";
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-2xl font-black text-gray-800">
                                                    {displayBrawlerName}
                                                </span>
                                            </div>
                                            <div className="flex gap-8 text-right">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-500 font-bold mb-1">가중 추천 점수</span>
                                                    <span className="text-2xl font-black text-indigo-600">
                                                        {brawler.score}점
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-gray-500 font-bold mb-1">실제 승률 (판수)</span>
                                                    <span className="text-lg font-bold text-gray-700">
                                                        {brawler.winRate}% ({brawler.plays}전)
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="text-gray-500 font-bold text-xl mt-10 bg-white px-8 py-4 rounded-full shadow-md text-center w-full max-w-3xl">
                            선택된 맵은 아직 누적된 전투 기록이 없어! 😢
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}