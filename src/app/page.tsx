"use client";

import { useMemo, useSyncExternalStore, useState } from "react";

import { mapDict, modeDict, brawlerDict } from "../constants/brawl";
import { checkIsRanked, getBattleResultInfo } from "../utils/brawlHelpers";
import PlayerProfile from "../components/PlayerProfile";
import BattleLogList from "../components/BattleLogList";
import BrawlerList from "../components/BrawlerList";

const RECENT_TAGS_KEY = "recentTags";
const EMPTY_RECENT_TAGS = "[]";
const RECENT_TAGS_CHANGED_EVENT = "recentTagsChanged";

function getRecentTagsSnapshot() {
    if (typeof window === "undefined")
    {
        return EMPTY_RECENT_TAGS;
    }

    return window.localStorage.getItem(RECENT_TAGS_KEY) ?? EMPTY_RECENT_TAGS;
}

function subscribeRecentTags(onStoreChange: () => void) {
    window.addEventListener("storage", onStoreChange);
    window.addEventListener(RECENT_TAGS_CHANGED_EVENT, onStoreChange);

    return () =>
    {
        window.removeEventListener("storage", onStoreChange);
        window.removeEventListener(RECENT_TAGS_CHANGED_EVENT, onStoreChange);
    };
}

function parseRecentTags(snapshot: string) {
    try
    {
        const parsed = JSON.parse(snapshot);
        return Array.isArray(parsed) ? parsed.filter((tag) => typeof tag === "string") : [];
    }
    catch
    {
        return [];
    }
}

export default function Home() 
{
    const [tag, setTag] = useState("");
    const [playerData, setPlayerData] = useState<any>(null);
    const [battleLog, setBattleLog] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const recentSearchesSnapshot = useSyncExternalStore(
        subscribeRecentTags,
        getRecentTagsSnapshot,
        () => EMPTY_RECENT_TAGS,
    );
    const recentSearches = useMemo(
        () => parseRecentTags(recentSearchesSnapshot),
        [recentSearchesSnapshot],
    );
    
    const [dbStats, setDbStats] = useState<any>(null);
    const [selectedBrawler, setSelectedBrawler] = useState<any>(null);
    const [selectedBattle, setSelectedBattle] = useState<any>(null);

    const handleSearch = async (searchTag?: string) => 
    {
        let targetTag = tag;
        if (searchTag)
        {
            targetTag = searchTag;
        }

        if (!targetTag) 
        {
            alert("플레이어 태그를 입력해주세요!");
            return;
        }

        setLoading(true);
        setError("");
        setPlayerData(null);
        setBattleLog(null);
        setTag(targetTag);
        setDbStats(null); 

        const safeTag = encodeURIComponent(targetTag);

        try 
        {
            const dbRes = await fetch("/api/player/db-stats?tag=" + safeTag);
            const dbJson = await dbRes.json();
            
            if (!dbJson.error)
            {
                setDbStats(dbJson);
            }
        } 
        catch (dbError) 
        {
            console.error("DB 통계 호출 실패:", dbError);
        }

        try 
        {
            const response = await fetch(`/api/player?tag=${safeTag}`);
            const data = await response.json();

            let isError = false;
            if (!response.ok) 
            {
                isError = true;
            }
            
            if (data.error) 
            {
                isError = true;
            }

            if (isError) 
            {
                if (data.error) 
                {
                    setError(data.error);
                } 
                else 
                {
                    setError("데이터를 불러오는데 실패했습니다.");
                }
                setLoading(false);
                return;
            } 
            else 
            {
                setPlayerData(data);

                const newRecent = [targetTag];
                for (let i = 0; i < recentSearches.length; i = i + 1)
                {
                    const t = recentSearches[i];
                    if (t !== targetTag)
                    {
                        if (newRecent.length < 5)
                        {
                            newRecent.push(t);
                        }
                    }
                }
                
                localStorage.setItem(RECENT_TAGS_KEY, JSON.stringify(newRecent));
                window.dispatchEvent(new Event(RECENT_TAGS_CHANGED_EVENT));
            }

            const battleResponse = await fetch(`/api/player/matches?tag=${safeTag}`);
            const battleData = await battleResponse.json();

            if (battleResponse.ok) 
            {
                if (battleData) 
                {
                    setBattleLog(battleData);
                }
            }
        } 
        catch
        {
            setError("서버와 연결할 수 없습니다.");
        } 
        finally 
        {
            setLoading(false);
        }
    };

    let playTotalHours = 0;
    let playMinutes = 0;
    let nameColorStr = "#1f2937";

    if (playerData !== null) 
    {
        const totalVictories = playerData["3vs3Victories"] + playerData.soloVictories + playerData.duoVictories;
        const matchesByWinRate = Math.floor(totalVictories / 0.42);
        const matchesByExp = playerData.expLevel * 35;
        const finalEstimatedMatches = Math.floor((matchesByWinRate + matchesByExp) / 2);

        const totalMins = finalEstimatedMatches * 3.8;

        playTotalHours = Math.floor(totalMins / 60);
        playMinutes = Math.floor(totalMins % 60);

        if (playerData.nameColor) 
        {
            nameColorStr = playerData.nameColor.replace("0x", "#");
        }
    }

    

    

    let recentWins = 0;
    let recentDefeats = 0;
    let recentDraws = 0;
    let bestMode = "데이터 부족";
    let maxModeWins = 0;
    let streakCount = 0;

    if (battleLog !== null) 
    {
        if (battleLog.items) 
        {
            const modeStats: any = {};
            const uniqueDates: string[] = [];

            battleLog.items.forEach((match: any) => 
            {
                if (match.battleTime) 
                {
                    const yyyy = match.battleTime.substring(0, 4);
                    const mm = match.battleTime.substring(4, 6);
                    const dd = match.battleTime.substring(6, 8);
                    const dateStr = yyyy + "/" + mm + "/" + dd;

                    let isDuplicate = false;
                    uniqueDates.forEach((d) => 
                    {
                        if (d === dateStr) 
                        {
                            isDuplicate = true;
                        }
                    });

                    if (!isDuplicate) 
                    {
                        uniqueDates.push(dateStr);
                    }
                }

                if (match.battle) 
                {
                    const info = getBattleResultInfo(match);

                    if (info.isWin) 
                    {
                        recentWins = recentWins + 1;

                        const mode = match.event.mode;
                        if (!modeStats[mode]) 
                        {
                            modeStats[mode] = 0;
                        }
                        modeStats[mode] = modeStats[mode] + 1;

                        if (modeStats[mode] > maxModeWins) 
                        {
                            maxModeWins = modeStats[mode];
                            bestMode = mode;
                        }
                    } 
                    else 
                    {
                        if (info.isLoss)
                        {
                            recentDefeats = recentDefeats + 1;
                        }
                        else
                        {
                            recentDraws = recentDraws + 1;
                        }
                    }
                }
            });

            if (uniqueDates.length > 0) 
            {
                streakCount = 1;
                let lastDateObj = new Date(uniqueDates[0]);

                for (let i = 1; i < uniqueDates.length; i = i + 1) 
                {
                    const currDateObj = new Date(uniqueDates[i]);
                    const diffTime = lastDateObj.getTime() - currDateObj.getTime();
                    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) 
                    {
                        streakCount = streakCount + 1;
                        lastDateObj = currDateObj;
                    } 
                    else 
                    {
                        break;
                    }
                }
            }
        }
    }

    let recentWinRate = 0;
    const totalRecent = recentWins + recentDefeats + recentDraws;
    if (totalRecent > 0) 
    {
        recentWinRate = Math.floor((recentWins / totalRecent) * 100);
    }

    const getBrawlerStats = (brawlerName: string) => 
    {
        let plays = 0;
        let wins = 0;
        const modes: any = {};
        let topMode = "없음";
        let maxMode = 0;

        if (battleLog !== null) 
        {
            if (battleLog.items) 
            {
                battleLog.items.forEach((match: any) => 
                {
                    let isMyBrawler = false;

                    if (match.battle.players) 
                    {
                        match.battle.players.forEach((p: any) => 
                        {
                            const cleanP = p.tag ? p.tag.replace("#", "") : "";
                            const cleanMe = playerData.tag ? playerData.tag.replace("#", "") : "";
                            if (cleanP === cleanMe) 
                            {
                                const playerBrawlerName = p.brawler?.name ?? p.brawlers?.[0]?.name;
                                if (playerBrawlerName === brawlerName) 
                                {
                                    isMyBrawler = true;
                                }
                            }
                        });
                    }

                    if (match.battle.teams) 
                    {
                        match.battle.teams.forEach((team: any) => 
                        {
                            team.forEach((p: any) => 
                            {
                                const cleanP = p.tag ? p.tag.replace("#", "") : "";
                                const cleanMe = playerData.tag ? playerData.tag.replace("#", "") : "";
                                if (cleanP === cleanMe) 
                                {
                                    const playerBrawlerName = p.brawler?.name ?? p.brawlers?.[0]?.name;
                                    if (playerBrawlerName === brawlerName) 
                                    {
                                        isMyBrawler = true;
                                    }
                                }
                            });
                        });
                    }

                    if (isMyBrawler) 
                    {
                        plays = plays + 1;
                        const info = getBattleResultInfo(match);

                        if (info.isWin) 
                        {
                            wins = wins + 1;
                        }

                        const m = match.event.mode;
                        if (!modes[m]) 
                        {
                            modes[m] = 0;
                        }
                        modes[m] = modes[m] + 1;

                        if (modes[m] > maxMode) 
                        {
                            maxMode = modes[m];
                            topMode = m;
                        }
                    }
                });
            }
        }

        let winRate = 0;
        if (plays > 0) 
        {
            winRate = Math.floor((wins / plays) * 100);
        }

        return { plays, wins, winRate, topMode };
    };

    return (
        <main className="flex flex-col items-center min-h-screen p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center mb-8 mt-10">
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 mb-4 drop-shadow-sm">
                    ⭐ 브롤스타즈 전적 검색 ⭐
                </h1>
                <p className="text-md text-gray-500 font-bold bg-white px-4 py-1 rounded-full shadow-sm inline-block">
                    ※ 영어 대소문자 상관 없음
                </p>
                <div className="mt-4">
                    <a 
                        href="/meta"
                        className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-xl px-8 py-4 rounded-full shadow-lg hover:scale-105 transition-transform border-4 border-white"
                    >
                        📊 빅데이터 맵별 1티어 추천 보기
                    </a>
                </div>
            </div>

            <div className="flex flex-col items-center gap-4 mb-10 w-full max-w-md">
                <div className="flex w-full shadow-xl rounded-2xl overflow-hidden border-2 border-white">
                    <input
                        type="text"
                        value={tag}
                        onChange={(e) => setTag(e.target.value)}
                        onKeyDown={(e) => 
                        {
                            if (e.key === "Enter") 
                            {
                                handleSearch();
                            }
                        }}
                        placeholder="플레이어 태그 (예: 2Q89RU)"
                        className="p-4 flex-grow text-gray-800 font-bold focus:outline-none text-lg"
                    />
                    <button
                        onClick={() => handleSearch()}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-8 py-4 transition-colors disabled:bg-gray-400 text-lg"
                    >
                        {loading ? "검색중..." : "검색"}
                    </button>
                </div>

                {recentSearches.length > 0 ? (
                    <div className="flex gap-2 flex-wrap justify-center mt-2">
                        {recentSearches.map((savedTag, idx) => 
                        {
                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSearch(savedTag)}
                                    className="text-xs bg-white text-indigo-600 border border-indigo-200 font-bold px-3 py-1 rounded-full hover:bg-indigo-50 transition-colors shadow-sm"
                                >
                                    {savedTag}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            {error !== "" ? (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg font-bold mb-8 shadow-md">
                    {error}
                </div>
            ) : null}

            {playerData !== null ? (
                <div className="flex flex-col items-center w-full max-w-5xl animate-fade-in-up mt-8">
                    <PlayerProfile 
                        playerData={playerData}
                        nameColorStr={nameColorStr}
                        streakCount={streakCount}
                        playTotalHours={playTotalHours}
                        playMinutes={playMinutes}
                    />

                    {battleLog !== null ? (
                        <BattleLogList 
                            battleLog={battleLog}
                            recentWinRate={recentWinRate}
                            totalRecent={totalRecent}
                            recentWins={recentWins}
                            recentDefeats={recentDefeats}
                            bestMode={bestMode}
                            maxModeWins={maxModeWins}
                            setSelectedBattle={setSelectedBattle}
                        />
                    ) : null}

                    <BrawlerList 
                        playerData={playerData} 
                        setSelectedBrawler={setSelectedBrawler} 
                    />

                </div>
            ) : null}

            {selectedBrawler !== null ? (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
                    <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setSelectedBrawler(null)}
                            className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-800 w-10 h-10 rounded-full font-black text-xl flex items-center justify-center transition-colors"
                        >
                            ✕
                        </button>

                        <div className="flex flex-col items-center mb-6">
                            <img
                                src={`https://cdn.brawlify.com/brawlers/borders/${selectedBrawler.id}.png`}
                                alt={selectedBrawler.name}
                                className="w-28 h-28 mb-4 rounded-2xl shadow-md border-4 border-indigo-100"
                            />
                            <h2 className="text-3xl font-black text-gray-800">
                                {brawlerDict[selectedBrawler.name]
                                    ? brawlerDict[selectedBrawler.name]
                                    : selectedBrawler.name}
                            </h2>
                            <div className="mt-2 text-indigo-600 font-bold bg-indigo-50 px-4 py-1 rounded-full">
                                현재 트로피: {selectedBrawler.trophies}
                            </div>
                        </div>

                        <div className="bg-gray-50 p-5 rounded-2xl mb-6 flex flex-col gap-4">
                            <h4 className="font-black text-gray-700 border-b pb-2">
                                📦 실제 보유 장비 목록
                            </h4>

                            <div className="flex flex-col gap-2">
                                <span className="font-bold text-gray-600 text-sm">🟢 가젯</span>
                                {selectedBrawler.gadgets ? (
                                    selectedBrawler.gadgets.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {selectedBrawler.gadgets.map((g: any) => 
                                            {
                                                return (
                                                    <div
                                                        key={g.id}
                                                        className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm"
                                                    >
                                                        <img
                                                            src={`https://cdn.brawlify.com/gadgets/regular/${g.id}.png`}
                                                            alt={g.name}
                                                               className="w-8 h-8 rounded-md bg-green-50"
                                                            onError={(e) => 
                                                            {
                                                                (e.target as HTMLImageElement).style.display = "none";
                                                            }}
                                                        />
                                                        <span className="text-sm font-bold text-green-800">
                                                            {g.name}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">
                                            보유한 가젯이 없습니다.
                                        </span>
                                    )
                                ) : (
                                    <span className="text-xs text-gray-400">
                                        보유한 가젯이 없습니다.
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="font-bold text-gray-600 text-sm">
                                    ⭐ 스타파워
                                </span>
                                {selectedBrawler.starPowers ? (
                                    selectedBrawler.starPowers.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {selectedBrawler.starPowers.map((sp: any) => 
                                            {
                                                return (
                                                    <div
                                                        key={sp.id}
                                                        className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm"
                                                    >
                                                        <img
                                                            src={`https://cdn.brawlify.com/star-powers/regular/${sp.id}.png`}
                                                            alt={sp.name}
                                                            className="w-8 h-8 rounded-md bg-yellow-50"
                                                            onError={(e) => 
                                                            {
                                                                (e.target as HTMLImageElement).style.display = "none";
                                                            }}
                                                        />
                                                        <span className="text-sm font-bold text-yellow-800">
                                                            {sp.name}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">
                                            보유한 스타파워가 없습니다.
                                        </span>
                                    )
                                ) : (
                                    <span className="text-xs text-gray-400">
                                        보유한 스타파워가 없습니다.
                                    </span>
                                )}
                            </div>

                            <div className="flex flex-col gap-2">
                                <span className="font-bold text-gray-600 text-sm">⚙️ 기어</span>
                                {selectedBrawler.gears ? (
                                    selectedBrawler.gears.length > 0 ? (
                                        <div className="flex flex-col gap-2">
                                            {selectedBrawler.gears.map((gr: any) => 
                                            {
                                                return (
                                                    <div
                                                        key={gr.id}
                                                        className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm"
                                                    >
                                                        <img
                                                            src={`https://cdn.brawlify.com/gears/regular/${gr.id}.png`}
                                                            alt={gr.name}
                                                            className="w-8 h-8 rounded-md bg-gray-100"
                                                            onError={(e) => 
                                                            {
                                                                (e.target as HTMLImageElement).style.display = "none";
                                                            }}
                                                        />
                                                        <span className="text-sm font-bold text-gray-800">
                                                            {gr.name}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400">
                                            보유한 기어가 없습니다.
                                        </span>
                                    )
                                ) : (
                                    <span className="text-xs text-gray-400">
                                        보유한 기어가 없습니다.
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ✨ 최근 25전 분석 창 */}
                        <div className="bg-blue-50 p-5 rounded-2xl mb-4">
                            <div className="flex justify-between items-center mb-3 border-b border-blue-200 pb-2">
                                <h4 className="font-black text-blue-900">
                                    📊 최근 25전 내 분석
                                </h4>
                            </div>

                            {(() => 
                            {
                                const stats = getBrawlerStats(selectedBrawler.name);

                                if (stats.plays > 0) 
                                {
                                    return (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-blue-800">
                                                    최근 승률
                                                </span>
                                                <span className="font-black text-blue-600 text-2xl">
                                                    {stats.winRate}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm font-bold text-blue-700">
                                                <span>플레이 횟수</span>
                                                <span>
                                                    {stats.plays}전 {stats.wins}승
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm font-bold text-blue-700 bg-blue-100 p-2 rounded-lg mt-1">
                                                <span>주력 모드</span>
                                                <span>
                                                    {modeDict[stats.topMode]
                                                        ? modeDict[stats.topMode]
                                                        : stats.topMode}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                } 
                                else 
                                {
                                    return (
                                        <div className="text-center py-4 text-blue-400 font-bold">
                                            최근 25경기 내 플레이 기록이 없습니다.
                                        </div>
                                    );
                                }
                            })()}
                        </div>

                        {/* ✨ [추가됨] O(1) DB 누적 승률 분석 창 */}
                        <div className="bg-indigo-50 p-5 rounded-2xl mb-2 border border-indigo-100">
                            <div className="flex justify-between items-center mb-3 border-b border-indigo-200 pb-2">
                                <h4 className="font-black text-indigo-900">
                                    🔥 DB 누적 승률
                                </h4>
                                <span className="text-[10px] font-bold text-indigo-400 bg-white px-2 py-1 rounded-full shadow-sm">
                                    전체 유저 데이터 기준
                                </span>
                            </div>

                            {(() => 
                            {
                                let dbBrawlerStat = null;
                                if (dbStats !== null) 
                                {
                                    if (dbStats.brawlers) 
                                    {
                                        for (let i = 0; i < dbStats.brawlers.length; i = i + 1) 
                                        {
                                            if (dbStats.brawlers[i].name === selectedBrawler.name) 
                                            {
                                                dbBrawlerStat = dbStats.brawlers[i];
                                                break;
                                            }
                                        }
                                    }
                                }

                                if (dbBrawlerStat !== null) 
                                {
                                    return (
                                        <div className="flex flex-col gap-3">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-indigo-800">누적 승률</span>
                                                <span className="font-black text-indigo-600 text-2xl">
                                                    {dbBrawlerStat.winRate}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm font-bold text-indigo-700">
                                                <span>누적 플레이</span>
                                                <span>
                                                    {dbBrawlerStat.plays}전 {dbBrawlerStat.wins}승
                                                </span>
                                            </div>
                                        </div>
                                    );
                                } 
                                else 
                                {
                                    return (
                                        <div className="text-center py-4 text-indigo-400 font-bold text-sm">
                                            아직 DB에 기록된<br />이 브롤러의 데이터가 없습니다.
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>
                </div>
            ) : null}

            {selectedBattle !== null ? (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fade-in-up overflow-y-auto">
                    <div className="bg-[#a5add6] rounded-xl w-full max-w-4xl shadow-2xl relative overflow-hidden border-4 border-black my-8">
                        <button
                            onClick={() => setSelectedBattle(null)}
                            className="absolute top-2 right-4 text-white text-3xl font-black drop-shadow-md hover:text-gray-300 z-10"
                        >
                            ✕
                        </button>

                        <div className="flex justify-between items-center bg-[#8f98c6] p-4 border-b-4 border-black">
                            <div className="flex flex-col">
                                <span className="text-2xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                    {modeDict[selectedBattle.event.mode]
                                        ? modeDict[selectedBattle.event.mode]
                                        : selectedBattle.event.mode}
                                </span>
                                <span className="text-md font-bold text-gray-200">
                                    {mapDict[selectedBattle.event.map]
                                        ? mapDict[selectedBattle.event.map]
                                        : selectedBattle.event.map}
                                </span>
                            </div>

                            <div className="flex flex-col items-center">
                                {(() => 
                                {
                                    const info = getBattleResultInfo(selectedBattle);
                                    return (
                                        <span
                                            className={`text-4xl font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] ${
                                                info.isWin
                                                    ? "text-green-400"
                                                    : info.isLoss
                                                        ? "text-red-500"
                                                        : "text-gray-300"
                                            }`}
                                        >
                                            {info.resultText}
                                        </span>
                                    );
                                })()}
                            </div>

                            <div className="flex flex-col items-end">
                                {selectedBattle.battle.duration ? (
                                    <span className="text-xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                        {Math.floor(selectedBattle.battle.duration / 60)}분{" "}
                                        {selectedBattle.battle.duration % 60}초
                                    </span>
                                ) : (
                                    <span className="text-xl font-black text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                                        시간 불명
                                    </span>
                                )}
                                {selectedBattle.battle.trophyChange ? (
                                    checkIsRanked(selectedBattle) ? null : (
                                        <span className="text-2xl font-black text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-1">
                                            {selectedBattle.battle.trophyChange > 0 ? "+" : ""}
                                            {selectedBattle.battle.trophyChange} 🏆
                                        </span>
                                    )
                                ) : checkIsRanked(selectedBattle) ? (
                                    <span className="text-sm font-black text-red-300 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] mt-1">
                                        (경쟁전 점수 증감 미제공)
                                    </span>
                                ) : null}
                            </div>
                        </div>

                        <div className="p-6">
                            {selectedBattle.battle.teams ? (
                                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex gap-2">
                                        {selectedBattle.battle.teams[0].map((p: any, idx: number) => 
                                        {
                                            let safeBrawler = {
                                                id: 0,
                                                name: "Unknown",
                                                trophies: 0,
                                            };
                                            if (p.brawler) 
                                            {
                                                safeBrawler = p.brawler;
                                            } 
                                            else 
                                            {
                                                if (p.brawlers)
                                                {
                                                    if (p.brawlers.length > 0) 
                                                    {
                                                        safeBrawler = p.brawlers[0];
                                                    }
                                                }
                                            }

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => 
                                                    {
                                                        setSelectedBattle(null);
                                                        handleSearch(p.tag);
                                                    }}
                                                    className="flex flex-col items-center relative w-24 cursor-pointer transition-transform hover:-translate-y-2 hover:brightness-110 group"
                                                >
                                                    {selectedBattle.battle.starPlayer ? (
                                                        selectedBattle.battle.starPlayer.tag === p.tag ? (
                                                            <div className="absolute -top-3 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-sm z-10 border-2 border-black whitespace-nowrap">
                                                                스타 플레이어
                                                            </div>
                                                        ) : null
                                                    ) : null}

                                                    <div className="relative border-4 border-black bg-gray-800 rounded-md overflow-hidden w-20 h-20 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] group-hover:border-yellow-300 transition-colors">
                                                        <span className="absolute top-0 left-0 bg-black/60 text-yellow-400 text-xs font-black px-1 rounded-br-md z-10">
                                                            {checkIsRanked(selectedBattle)
                                                                ? "🏅 픽"
                                                                : `🏆 ${safeBrawler.trophies}`}
                                                        </span>
                                                        <img
                                                            src={`https://cdn.brawlify.com/brawlers/borders/${safeBrawler.id}.png`}
                                                            alt={safeBrawler.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => 
                                                            {
                                                                (e.target as HTMLImageElement).style.display = "none";
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-white font-bold text-sm mt-2 truncate w-full text-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] group-hover:text-yellow-300 group-hover:underline">
                                                        {p.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="text-6xl font-black text-white italic drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)] px-4">
                                        VS
                                    </div>

                                    <div className="flex gap-2">
                                        {selectedBattle.battle.teams[1].map((p: any, idx: number) => 
                                        {
                                            let safeBrawler = {
                                                id: 0,
                                                name: "Unknown",
                                                trophies: 0,
                                            };
                                            if (p.brawler) 
                                            {
                                                safeBrawler = p.brawler;
                                            } 
                                            else 
                                            {
                                                if (p.brawlers)
                                                {
                                                    if (p.brawlers.length > 0) 
                                                    {
                                                        safeBrawler = p.brawlers[0];
                                                    }
                                                }
                                            }

                                            return (
                                                <div
                                                    key={idx}
                                                    onClick={() => 
                                                    {
                                                        setSelectedBattle(null);
                                                        handleSearch(p.tag);
                                                    }}
                                                    className="flex flex-col items-center relative w-24 cursor-pointer transition-transform hover:-translate-y-2 hover:brightness-110 group"
                                                >
                                                    {selectedBattle.battle.starPlayer ? (
                                                        selectedBattle.battle.starPlayer.tag === p.tag ? (
                                                            <div className="absolute -top-3 bg-yellow-400 text-black text-[10px] font-black px-2 py-0.5 rounded-sm z-10 border-2 border-black whitespace-nowrap">
                                                                스타 플레이어
                                                            </div>
                                                        ) : null
                                                    ) : null}

                                                    <div className="relative border-4 border-black bg-gray-800 rounded-md overflow-hidden w-20 h-20 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] group-hover:border-yellow-300 transition-colors">
                                                        <span className="absolute top-0 left-0 bg-black/60 text-yellow-400 text-xs font-black px-1 rounded-br-md z-10">
                                                            {checkIsRanked(selectedBattle)
                                                                ? "🏅 픽"
                                                                : `🏆 ${safeBrawler.trophies}`}
                                                        </span>
                                                        <img
                                                            src={`https://cdn.brawlify.com/brawlers/borders/${safeBrawler.id}.png`}
                                                            alt={safeBrawler.name}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => 
                                                            {
                                                                (e.target as HTMLImageElement).style.display = "none";
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-white font-bold text-sm mt-2 truncate w-full text-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] group-hover:text-yellow-300 group-hover:underline">
                                                        {p.name}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : selectedBattle.battle.players ? (
                                <div className="flex flex-wrap justify-center gap-4">
                                    {selectedBattle.battle.players.map((p: any, idx: number) => 
                                    {
                                        let safeBrawler = { id: 0, name: "Unknown", trophies: 0 };
                                        if (p.brawler) 
                                        {
                                            safeBrawler = p.brawler;
                                        } 
                                        else 
                                        {
                                            if (p.brawlers)
                                            {
                                                if (p.brawlers.length > 0) 
                                                {
                                                    safeBrawler = p.brawlers[0];
                                                }
                                            }
                                        }

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => 
                                                {
                                                    setSelectedBattle(null);
                                                    handleSearch(p.tag);
                                                }}
                                                className="flex flex-col items-center relative w-24 cursor-pointer transition-transform hover:-translate-y-2 hover:brightness-110 group"
                                            >
                                                <div className="relative border-4 border-black bg-gray-800 rounded-md overflow-hidden w-20 h-20 shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] group-hover:border-yellow-300 transition-colors">
                                                    <span className="absolute top-0 left-0 bg-black/60 text-yellow-400 text-xs font-black px-1 rounded-br-md z-10">
                                                        🏆 {safeBrawler.trophies}
                                                    </span>
                                                    <img
                                                        src={`https://cdn.brawlify.com/brawlers/borders/${safeBrawler.id}.png`}
                                                        alt={safeBrawler.name}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => 
                                                        {
                                                            (e.target as HTMLImageElement).style.display = "none";
                                                        }}
                                                    />
                                                </div>
                                                <span className="text-white font-bold text-sm mt-2 truncate w-full text-center group-hover:text-yellow-300 group-hover:underline">
                                                    {p.name}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center text-white font-bold py-10">
                                    표시할 수 없는 기록입니다.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ) : null}

            <footer className="w-full max-w-5xl mt-20 pb-10 border-t border-indigo-100 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-gray-500 font-bold text-sm">
                <div>
                    <p>© 2026 Brawl Stars Analytics. All rights reserved.</p>
                    <p className="text-xs text-gray-400 font-medium mt-1">
                        Brawl Stars Korean Language profile analysis Site
                    </p>
                </div>

                <div className="flex items-center gap-6">
                    <a
                        href="https://github.com/psh1234567890/brawl_status_kr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors group"
                    >
                        <svg
                            className="w-6 h-6 fill-current"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                                clipRule="evenodd"
                            />
                        </svg>
                        <span className="group-hover:underline">GitHub Repository</span>
                    </a>
                </div>
            </footer>
            {/* ✨ 여기에 공지사항(Footer) 추가! */}
            <footer className="mt-16 pb-8 text-center text-gray-400 font-bold w-full">
                <p>Brawl Analytics는 지속적으로 업데이트될 예정입니다.</p>
                <p className="text-sm mt-2 text-gray-300">
                    버그 제보 및 기능 건의 환영 🙌
                    seunghunbag76@gmail.com
                </p>
            </footer>
        </main>
    );
}
