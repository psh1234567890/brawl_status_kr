"use client";

import { useState, useEffect } from "react";

const mapDict: any = {
  "Hard Rock Mine": "암석 광산",
};

const rankDict: any = {
  // 나중에 채워 넣기!
};

const modeDict: any = {
  brawlBall: "브롤 볼",
  gemGrab: "젬 그랩",
  soloShowdown: "솔로 쇼다운",
  duoShowdown: "듀오 쇼다운",
  heist: "하이스트",
  bounty: "바운티",
  hotZone: "핫 존",
  knockout: "녹아웃",
  wipeout: "와이프아웃",
  duels: "듀얼",
  trioShowdown: "트리오 쇼다운",
};

const brawlerDict: any = {
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
  "STARR NOVA": "스타 노바",
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

export default function Home() {
  const [tag, setTag] = useState("");
  const [playerData, setPlayerData] = useState<any>(null);
  const [battleLog, setBattleLog] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const [selectedBrawler, setSelectedBrawler] = useState<any>(null);
  const [selectedBattle, setSelectedBattle] = useState<any>(null);

  useEffect(() => {
    const saved = localStorage.getItem("recentTags");
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  const handleSearch = async (searchTag?: string) => {
    const targetTag = searchTag ? searchTag : tag;

    if (!targetTag) {
      alert("플레이어 태그를 입력해주세요!");
      return;
    }

    setLoading(true);
    setError("");
    setPlayerData(null);
    setBattleLog(null);
    setTag(targetTag);

    try {
      const safeTag = encodeURIComponent(targetTag);
      const response = await fetch(`/api/player?tag=${safeTag}`);
      const data = await response.json();

      let isError = false;
      if (!response.ok) {
        isError = true;
      }
      if (data.error) {
        isError = true;
      }

      if (isError) {
        if (data.error) {
          setError(data.error);
        } else {
          setError("데이터를 불러오는데 실패했습니다.");
        }
        setLoading(false);
        return;
      } else {
        setPlayerData(data);

        const newRecent = [targetTag];
        recentSearches.forEach((t) => {
          if (t !== targetTag) {
            if (newRecent.length < 5) {
              newRecent.push(t);
            }
          }
        });
        setRecentSearches(newRecent);
        localStorage.setItem("recentTags", JSON.stringify(newRecent));
      }

      const battleResponse = await fetch(`/api/player/matches?tag=${safeTag}`);
      const battleData = await battleResponse.json();

      if (battleResponse.ok) {
        if (battleData) {
          setBattleLog(battleData);
        }
      }
    } catch (err) {
      setError("서버와 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  };

  let playTotalHours = 0;
  let playMinutes = 0;
  let nameColorStr = "#1f2937";

  if (playerData !== null) {
    const totalVictories =
      playerData["3vs3Victories"] +
      playerData.soloVictories +
      playerData.duoVictories;
    const matchesByWinRate = Math.floor(totalVictories / 0.42);
    const matchesByExp = playerData.expLevel * 35;
    const finalEstimatedMatches = Math.floor(
      (matchesByWinRate + matchesByExp) / 2,
    );

    const totalMins = finalEstimatedMatches * 3.8;

    playTotalHours = Math.floor(totalMins / 60);
    playMinutes = Math.floor(totalMins % 60);

    if (playerData.nameColor) {
      nameColorStr = playerData.nameColor.replace("0x", "#");
    }
  }

  // ✨ 정확한 경쟁전 판단 로직으로 수정!
  const checkIsRanked = (match: any) => {
    let isRanked = false;
    if (match.battle.type) {
      // API에서 경쟁전은 soloRanked 또는 teamRanked로 줌
      if (match.battle.type === "soloRanked") {
        isRanked = true;
      } else if (match.battle.type === "teamRanked") {
        isRanked = true;
      }
    }
    return isRanked;
  };

  const getBattleResultInfo = (match: any) => {
    let isWin = false;
    let isDraw = false;
    let isLoss = false;

    let resultText = "무승부";
    let resultColor = "text-gray-500";
    let bgColor = "bg-white border-gray-400";

    if (match.battle.result) {
      if (match.battle.result === "victory") {
        isWin = true;
      } else if (match.battle.result === "defeat") {
        isLoss = true;
      } else {
        isDraw = true;
      }
    }

    if (match.event.mode === "soloShowdown") {
      if (match.battle.rank) {
        if (match.battle.rank <= 4) {
          isWin = true;
          isLoss = false;
          isDraw = false;
        } else {
          isLoss = true;
          isWin = false;
          isDraw = false;
        }
      }
    }

    if (match.event.mode === "duoShowdown") {
      if (match.battle.rank) {
        if (match.battle.rank <= 2) {
          isWin = true;
          isLoss = false;
          isDraw = false;
        } else {
          isLoss = true;
          isWin = false;
          isDraw = false;
        }
      }
    }

    if (match.event.mode === "trioShowdown") {
      if (match.battle.rank) {
        if (match.battle.rank <= 2) {
          isWin = true;
          isLoss = false;
          isDraw = false;
        } else {
          isLoss = true;
          isWin = false;
          isDraw = false;
        }
      }
    }

    if (isWin) {
      resultText = "승리";
      resultColor = "text-blue-500";
      bgColor = "bg-white border-blue-500";
    } else if (isLoss) {
      resultText = "패배";
      resultColor = "text-red-500";
      bgColor = "bg-white border-red-500";
    }

    return { resultText, resultColor, bgColor, isWin, isLoss, isDraw };
  };

  let recentWins = 0;
  let recentDefeats = 0;
  let recentDraws = 0;
  let bestMode = "데이터 부족";
  let maxModeWins = 0;
  let streakCount = 0;

  if (battleLog !== null) {
    if (battleLog.items) {
      const modeStats: any = {};
      const uniqueDates: string[] = [];

      battleLog.items.forEach((match: any) => {
        if (match.battleTime) {
          const yyyy = match.battleTime.substring(0, 4);
          const mm = match.battleTime.substring(4, 6);
          const dd = match.battleTime.substring(6, 8);
          // 🟢 변경: 아이폰 사파리 호환성을 위해 슬래시로 변경!
          const dateStr = yyyy + "/" + mm + "/" + dd;

          let isDuplicate = false;
          uniqueDates.forEach((d) => {
            if (d === dateStr) {
              isDuplicate = true;
            }
          });

          if (!isDuplicate) {
            uniqueDates.push(dateStr);
          }
        }

        if (match.battle) {
          const info = getBattleResultInfo(match);

          if (info.isWin) {
            recentWins = recentWins + 1;

            const mode = match.event.mode;
            if (!modeStats[mode]) {
              modeStats[mode] = 0;
            }
            modeStats[mode] = modeStats[mode] + 1;

            if (modeStats[mode] > maxModeWins) {
              maxModeWins = modeStats[mode];
              bestMode = mode;
            }
          } else if (info.isLoss) {
            recentDefeats = recentDefeats + 1;
          } else {
            recentDraws = recentDraws + 1;
          }
        }
      });

      if (uniqueDates.length > 0) {
        streakCount = 1;
        let lastDateObj = new Date(uniqueDates[0]);

        for (let i = 1; i < uniqueDates.length; i = i + 1) {
          const currDateObj = new Date(uniqueDates[i]);
          const diffTime = lastDateObj.getTime() - currDateObj.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            streakCount = streakCount + 1;
            lastDateObj = currDateObj;
          } else {
            break;
          }
        }
      }
    }
  }

  let recentWinRate = 0;
  const totalRecent = recentWins + recentDefeats + recentDraws;
  if (totalRecent > 0) {
    recentWinRate = Math.floor((recentWins / totalRecent) * 100);
  }

  const getBrawlerStats = (brawlerName: string) => {
    let plays = 0;
    let wins = 0;
    const modes: any = {};
    let topMode = "없음";
    let maxMode = 0;

    if (battleLog !== null) {
      if (battleLog.items) {
        battleLog.items.forEach((match: any) => {
          let isMyBrawler = false;

          if (match.battle.players) {
            match.battle.players.forEach((p: any) => {
              const cleanP = p.tag.replace("#", "");
              const cleanMe = playerData.tag.replace("#", "");
              if (cleanP === cleanMe) {
                if (p.brawler.name === brawlerName) {
                  isMyBrawler = true;
                }
              }
            });
          }

          if (match.battle.teams) {
            match.battle.teams.forEach((team: any) => {
              team.forEach((p: any) => {
                const cleanP = p.tag.replace("#", "");
                const cleanMe = playerData.tag.replace("#", "");
                if (cleanP === cleanMe) {
                  if (p.brawler.name === brawlerName) {
                    isMyBrawler = true;
                  }
                }
              });
            });
          }

          if (isMyBrawler) {
            plays = plays + 1;
            const info = getBattleResultInfo(match);

            if (info.isWin) {
              wins = wins + 1;
            }

            const m = match.event.mode;
            if (!modes[m]) {
              modes[m] = 0;
            }
            modes[m] = modes[m] + 1;

            if (modes[m] > maxMode) {
              maxMode = modes[m];
              topMode = m;
            }
          }
        });
      }
    }

    let winRate = 0;
    if (plays > 0) {
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
      </div>

      <div className="flex flex-col items-center gap-4 mb-10 w-full max-w-md">
        <div className="flex w-full shadow-xl rounded-2xl overflow-hidden border-2 border-white">
          <input
            type="text"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
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
            {recentSearches.map((savedTag, idx) => {
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
        <div className="flex flex-col items-center w-full max-w-5xl animate-fade-in-up">
          <div className="bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-2xl w-full text-black border border-white mb-10 transition-transform hover:-translate-y-1">
            <div className="flex flex-col items-center border-b-2 border-gray-100 pb-8 mb-8">
              <div className="flex items-center gap-4 mb-2">
                {playerData.icon ? (
                  <img
                    src={`https://cdn.brawlify.com/profile/${playerData.icon.id}.png`}
                    alt="profile icon"
                    className="w-16 h-16 rounded-full shadow-md border-2 border-indigo-200"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : null}
                <h2
                  className="text-5xl font-black drop-shadow-sm"
                  style={{ color: nameColorStr }}
                >
                  {playerData.name}
                </h2>
              </div>

              {streakCount > 0 ? (
                <div className="mt-4 flex items-center bg-orange-100 border border-orange-300 px-6 py-2 rounded-full shadow-sm animate-pulse">
                  <span className="text-orange-600 font-black text-lg">
                    🔥 최근 {streakCount}일 연속 플레이 중!
                  </span>
                </div>
              ) : null}

              {playerData.club ? (
                <div className="mt-4 flex items-center bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2 rounded-full shadow-md">
                  <span className="text-white font-bold text-lg">
                    🛡️ 소속 클럽: {playerData.club.name}
                  </span>
                </div>
              ) : (
                <div className="mt-4 flex items-center bg-gray-200 px-6 py-2 rounded-full shadow-inner">
                  <span className="text-gray-600 font-bold text-lg">
                    소속 클럽 없음
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-lg font-medium">
              <div className="flex justify-between bg-yellow-50 border-l-4 border-yellow-400 p-5 rounded-r-xl shadow-sm">
                <span>🏆 현재 트로피:</span>
                <span className="font-black text-yellow-600 text-xl">
                  {playerData.trophies}
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 border-l-4 border-gray-400 p-5 rounded-r-xl shadow-sm">
                <span>⭐ 최고 트로피:</span>
                <span className="font-black text-gray-700 text-xl">
                  {playerData.highestTrophies}
                </span>
              </div>
              <div className="flex justify-between bg-purple-50 border-l-4 border-purple-500 p-5 rounded-r-xl shadow-sm col-span-1 md:col-span-2">
                <span>⏱️ 예상 플레이 타임:</span>
                <span className="font-black text-purple-700 text-xl">
                  약 {playTotalHours}시간 {playMinutes}분
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 p-5 rounded-xl shadow-sm">
                <span>📈 경험치 레벨:</span>
                <span className="font-bold text-xl">{playerData.expLevel}</span>
              </div>
              <div className="flex justify-between bg-gray-50 p-5 rounded-xl shadow-sm">
                <span>⚔️ 3v3 승리:</span>
                <span className="font-bold text-xl">
                  {playerData["3vs3Victories"]}
                </span>
              </div>
              <div className="flex justify-between bg-blue-50 border-l-4 border-blue-400 p-5 rounded-r-xl shadow-sm">
                <span>😈 솔로 쇼다운 승리:</span>
                <span className="font-black text-blue-700 text-xl">
                  {playerData.soloVictories}
                </span>
              </div>
              <div className="flex justify-between bg-green-50 border-l-4 border-green-400 p-5 rounded-r-xl shadow-sm">
                <span>🤝 듀오 쇼다운 승리:</span>
                <span className="font-black text-green-700 text-xl">
                  {playerData.duoVictories}
                </span>
              </div>
              <div className="flex justify-between bg-pink-50 border-l-4 border-pink-500 p-5 rounded-r-xl shadow-sm">
                <span>🎖️ 역대 최고 경쟁전 랭크:</span>
                <span className="font-black text-pink-700 text-xl">
                  {playerData.highestAllTimeRankedRankName
                    ? (rankDict[playerData.highestAllTimeRankedRankName]
                        ? rankDict[playerData.highestAllTimeRankedRankName]
                        : playerData.highestAllTimeRankedRankName) +
                      " (" +
                      playerData.highestAllTimeRankedElo +
                      "점)"
                    : "기록 없음"}
                </span>
              </div>
              <div className="flex justify-between bg-pink-50 border-l-4 border-pink-500 p-5 rounded-r-xl shadow-sm">
                <span>🔥 현재 경쟁전 랭크:</span>
                <span className="font-black text-pink-700 text-xl">
                  {playerData.rankedRankName
                    ? (rankDict[playerData.rankedRankName]
                        ? rankDict[playerData.rankedRankName]
                        : playerData.rankedRankName) +
                      " (" +
                      playerData.rankedElo +
                      "점)"
                    : "기록 없음"}
                </span>
              </div>
              <div className="flex justify-between bg-indigo-50 border-l-4 border-indigo-400 p-5 rounded-r-xl shadow-sm">
                <span>🤖 로보 럼블 최고 기록:</span>
                <span className="font-black text-indigo-700 text-xl">
                  {playerData.bestRoboRumbleTime}
                </span>
              </div>
              <div className="flex justify-between bg-teal-50 border-l-4 border-teal-400 p-5 rounded-r-xl shadow-sm">
                <span>🦖 빅 브롤러 최고 기록:</span>
                <span className="font-black text-teal-700 text-xl">
                  {playerData.bestTimeAsBigBrawler}
                </span>
              </div>
              <div className="flex justify-between bg-orange-50 border-l-4 border-orange-400 p-5 rounded-r-xl shadow-sm md:col-span-2">
                <span>🏆 챔피언십 챌린지 예선:</span>
                <span className="font-black text-orange-700 text-xl">
                  {playerData.isQualifiedFromChampionshipChallenge
                    ? "통과 🎉"
                    : "미통과"}
                </span>
              </div>
            </div>
          </div>

          {battleLog !== null ? (
            <div className="w-full mb-12">
              <h3 className="text-2xl font-black mb-6 text-indigo-900 border-l-8 border-indigo-500 pl-4">
                📊 전체 기록 분석 ({battleLog.items.length}전)
              </h3>
              <div className="bg-white p-8 rounded-3xl shadow-xl w-full border border-gray-100 mb-10 flex flex-col md:flex-row justify-around items-center gap-6 transition-transform hover:-translate-y-1">
                <div className="text-center">
                  <span className="block text-gray-500 font-bold mb-2 text-lg">
                    최근 승률
                  </span>
                  <span className="text-5xl font-black text-indigo-600 drop-shadow-sm">
                    {recentWinRate}%
                  </span>
                  <span className="block text-md text-gray-400 mt-3 font-bold bg-gray-100 px-3 py-1 rounded-full">
                    {totalRecent}전 {recentWins}승 {recentDefeats}패
                  </span>
                </div>
                <div className="text-center border-t-2 md:border-t-0 md:border-l-2 border-gray-200 pt-6 md:pt-0 md:pl-10">
                  <span className="block text-gray-500 font-bold mb-2 text-lg">
                    가장 잘 나가는 모드
                  </span>
                  <span className="text-4xl font-black text-gray-800">
                    {modeDict[bestMode] ? modeDict[bestMode] : bestMode}
                  </span>
                  <span className="block text-md text-indigo-500 mt-3 font-bold">
                    이 모드에서만 {maxModeWins}승 달성! 🔥
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end mb-6 border-l-8 border-indigo-500 pl-4">
                <h3 className="text-2xl font-black text-indigo-900">
                  ⚔️ 모든 전투 기록 (최대 25게임)
                </h3>
                <span className="text-sm text-gray-500 font-bold bg-gray-200 px-3 py-1 rounded-full">
                  👆 클릭해서 상세표 보기
                </span>
              </div>

              <div className="flex flex-col gap-4 mb-10 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                {battleLog.items.map((match: any, index: number) => {
                  const info = getBattleResultInfo(match);
                  const isRanked = checkIsRanked(match);

                  return (
                    <div
                      key={index}
                      onClick={() => setSelectedBattle(match)}
                      className={`p-6 rounded-2xl shadow-md border-l-8 flex justify-between items-center transition-transform hover:-translate-x-1 cursor-pointer ${info.bgColor}`}
                    >
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                          {isRanked ? (
                            <span className="text-[10px] font-black text-white bg-red-500 px-2 py-0.5 rounded-full">
                              🔴 경쟁전
                            </span>
                          ) : (
                            <span className="text-[10px] font-black text-white bg-green-500 px-2 py-0.5 rounded-full">
                              🟢 일반 모드
                            </span>
                          )}
                        </div>
                        <span className="font-black text-gray-800 text-xl mb-1">
                          {modeDict[match.event.mode]
                            ? modeDict[match.event.mode]
                            : match.event.mode}{" "}
                          -{" "}
                          {mapDict[match.event.map]
                            ? mapDict[match.event.map]
                            : match.event.map}
                        </span>
                      </div>
                      <div className="flex items-center gap-4">
                        {match.battle.trophyChange ? (
                          isRanked ? null : (
                            <span
                              className={`text-xl font-black ${match.battle.trophyChange > 0 ? "text-yellow-500" : "text-red-500"}`}
                            >
                              {match.battle.trophyChange > 0 ? "+" : ""}
                              {match.battle.trophyChange}🏆
                            </span>
                          )
                        ) : null}
                        <div
                          className={`text-3xl font-black ${info.resultColor} drop-shadow-sm`}
                        >
                          {info.resultText}
                          {match.battle.rank ? (
                            <span className="text-lg ml-1">
                              ({match.battle.rank}등)
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="w-full">
            <div className="flex justify-between items-end mb-6 border-l-8 border-indigo-500 pl-4">
              <h3 className="text-2xl font-black text-indigo-900">
                보유 브롤러 상세 정보 ({playerData.brawlers.length}개)
              </h3>
              <span className="text-sm text-gray-500 font-bold bg-gray-200 px-3 py-1 rounded-full">
                👆 클릭해서 아이템 확인
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {[...playerData.brawlers]
                .sort((a: any, b: any) => {
                  return b.trophies - a.trophies;
                })
                .map((brawler: any) => {
                  return (
                    <div
                      key={brawler.id}
                      onClick={() => setSelectedBrawler(brawler)}
                      className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center transition-transform hover:-translate-y-2 hover:shadow-xl cursor-pointer ring-2 ring-transparent hover:ring-indigo-300"
                    >
                      <img
                        src={`https://cdn.brawlify.com/brawlers/borders/${brawler.id}.png`}
                        alt={brawler.name}
                        className="w-20 h-20 mb-3 rounded-xl shadow-sm"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <span className="font-black text-gray-800 text-lg mb-1">
                        {brawlerDict[brawler.name]
                          ? brawlerDict[brawler.name]
                          : brawler.name}
                      </span>
                      <span className="text-xs text-white bg-indigo-500 px-2 py-1 rounded-md font-bold mb-3">
                        파워 {brawler.power}
                      </span>
                      <div className="flex gap-2 text-xs text-gray-500 mb-3 font-bold bg-gray-50 w-full justify-center py-2 rounded-lg">
                        <span>
                          🟢 {brawler.gadgets ? brawler.gadgets.length : 0}
                        </span>
                        <span>
                          ⭐{" "}
                          {brawler.starPowers ? brawler.starPowers.length : 0}
                        </span>
                      </div>
                      <span className="text-yellow-600 font-black text-xl">
                        🏆 {brawler.trophies}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      ) : null}

      {/* ✨ 브롤러 상세 아이템 모달 */}
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
                      {selectedBrawler.gadgets.map((g: any) => {
                        return (
                          <div
                            key={g.id}
                            className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm"
                          >
                            <img
                              src={`https://cdn.brawlify.com/gadgets/regular/${g.id}.png`}
                              alt={g.name}
                              className="w-8 h-8 rounded-md bg-green-50"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
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
                      {selectedBrawler.starPowers.map((sp: any) => {
                        return (
                          <div
                            key={sp.id}
                            className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm"
                          >
                            <img
                              src={`https://cdn.brawlify.com/star-powers/regular/${sp.id}.png`}
                              alt={sp.name}
                              className="w-8 h-8 rounded-md bg-yellow-50"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
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
                      {selectedBrawler.gears.map((gr: any) => {
                        return (
                          <div
                            key={gr.id}
                            className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-100 shadow-sm"
                          >
                            <img
                              src={`https://cdn.brawlify.com/gears/regular/${gr.id}.png`}
                              alt={gr.name}
                              className="w-8 h-8 rounded-md bg-gray-100"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display =
                                  "none";
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

            <div className="bg-blue-50 p-5 rounded-2xl mb-2">
              <div className="flex justify-between items-center mb-3 border-b border-blue-200 pb-2">
                <h4 className="font-black text-blue-900">
                  📊 최근 25전 내 분석
                </h4>
              </div>

              {(() => {
                const stats = getBrawlerStats(selectedBrawler.name);

                if (stats.plays > 0) {
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
                } else {
                  return (
                    <div className="text-center py-4 text-blue-400 font-bold">
                      최근 25경기 내 플레이 기록이 없습니다.
                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </div>
      ) : null}

      {/* ✨ 전투 기록 상세 대진표 모달 */}
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
                {(() => {
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
                    {selectedBattle.battle.teams[0].map(
                      (p: any, idx: number) => {
                        // ✨ 프론트엔드 방어막: 브롤러 데이터가 없을 경우 배열에서 첫 번째 브롤러 가져오기
                        let safeBrawler = {
                          id: 0,
                          name: "Unknown",
                          trophies: 0,
                        };
                        if (p.brawler) {
                          safeBrawler = p.brawler;
                        } else if (p.brawlers) {
                          if (p.brawlers.length > 0) {
                            safeBrawler = p.brawlers[0];
                          }
                        }

                        return (
                          <div
                            key={idx}
                            onClick={() => {
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
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                            <span className="text-white font-bold text-sm mt-2 truncate w-full text-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] group-hover:text-yellow-300 group-hover:underline">
                              {p.name}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>

                  <div className="text-6xl font-black text-white italic drop-shadow-[4px_4px_0_rgba(0,0,0,0.8)] px-4">
                    VS
                  </div>

                  <div className="flex gap-2">
                    {selectedBattle.battle.teams[1].map(
                      (p: any, idx: number) => {
                        let safeBrawler = {
                          id: 0,
                          name: "Unknown",
                          trophies: 0,
                        };
                        if (p.brawler) {
                          safeBrawler = p.brawler;
                        } else if (p.brawlers) {
                          if (p.brawlers.length > 0) {
                            safeBrawler = p.brawlers[0];
                          }
                        }

                        return (
                          <div
                            key={idx}
                            onClick={() => {
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
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </div>
                            <span className="text-white font-bold text-sm mt-2 truncate w-full text-center drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] group-hover:text-yellow-300 group-hover:underline">
                              {p.name}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              ) : selectedBattle.battle.players ? (
                <div className="flex flex-wrap justify-center gap-4">
                  {selectedBattle.battle.players.map((p: any, idx: number) => {
                    let safeBrawler = { id: 0, name: "Unknown", trophies: 0 };
                    if (p.brawler) {
                      safeBrawler = p.brawler;
                    } else if (p.brawlers) {
                      if (p.brawlers.length > 0) {
                        safeBrawler = p.brawlers[0];
                      }
                    }

                    return (
                      <div
                        key={idx}
                        onClick={() => {
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
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display =
                                "none";
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
      {/* 화면 맨 아래에 추가할 푸터(Footer) 영역 */}
      <footer className="w-full max-w-5xl mt-20 pb-10 border-t border-indigo-100 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-gray-500 font-bold text-sm">
        <div>
          <p>© 2026 Brawl Stars Analytics. All rights reserved.</p>
          <p className="text-xs text-gray-400 font-medium mt-1">
            Brawl Stars Korean Language profile analysis Site
          </p>
        </div>

        <div className="flex items-center gap-6">
          <a
            href="https://github.com/psh1234567890/brawl_status_kr" // 기장님 깃허브 주소!
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors group"
          >
            {/* 깃허브 오리지널 SVG 아이콘 */}
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
    </main>
  );
}
