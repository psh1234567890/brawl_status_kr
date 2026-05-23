"use client";

import { useState, useEffect } from "react";

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

  // ✨ 모달을 위한 새로운 상태 변수들
  const [selectedBrawler, setSelectedBrawler] = useState<any>(null);

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

      const battleResponse = await fetch(
        `/api/player/battlelog?tag=${safeTag}`,
      );
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
  }

  let recentWins = 0;
  let recentDefeats = 0;
  let recentDraws = 0;
  let bestMode = "데이터 부족";
  let maxModeWins = 0;

  // ✨ 스트릭(연속 플레이) 계산 로직
  let streakCount = 0;

  if (battleLog !== null) {
    if (battleLog.items) {
      const modeStats: any = {};
      const uniqueDates: string[] = [];

      battleLog.items.forEach((match: any) => {
        // 스트릭 계산용 날짜 추출 (YYYY-MM-DD)
        if (match.battleTime) {
          const yyyy = match.battleTime.substring(0, 4);
          const mm = match.battleTime.substring(4, 6);
          const dd = match.battleTime.substring(6, 8);
          const dateStr = yyyy + "-" + mm + "-" + dd;

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
          if (match.battle.result === "victory") {
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
          } else if (match.battle.result === "defeat") {
            recentDefeats = recentDefeats + 1;
          } else {
            recentDraws = recentDraws + 1;
          }
        }
      });

      // 연속 일수 계산 (최근 날짜부터 역순 확인)
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

  // ✨ 모달창 내에서 선택된 브롤러의 최근 기록을 분석하는 함수
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

          // 쇼다운 같은 개인/듀오전
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

          // 3v3 팀전
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
            if (match.battle.result === "victory") {
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
              <h2 className="text-5xl font-black text-gray-800 mb-2">
                {playerData.name}
              </h2>

              {/* ✨ 스트릭 배지 추가 */}
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

            {/* 기존 통계 카드 영역 유지 */}
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
                <span>⏱️ 찐 예상 플레이 타임:</span>
                <span className="font-black text-purple-700 text-xl">
                  약 {playTotalHours}시간 {playMinutes}분
                </span>
              </div>
              <div className="flex justify-between bg-gray-50 p-5 rounded-xl shadow-sm">
                <span>📈 경험치 레벨 (API 기준):</span>
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
                <span>🎖️ 역대 최고 랭크:</span>
                <span className="font-black text-pink-700 text-xl">
                  {playerData.highestAllTimeRankedElo
                    ? playerData.highestAllTimeRankedRankName +
                      " (" +
                      playerData.highestAllTimeRankedElo +
                      "점)"
                    : "기록 없음"}
                </span>
              </div>
              <div className="flex justify-between bg-pink-50 border-l-4 border-pink-500 p-5 rounded-r-xl shadow-sm">
                <span>🔥 현재 랭크:</span>
                <span className="font-black text-pink-700 text-xl">
                  {playerData.rankedElo
                    ? playerData.rankedRankName +
                      " (" +
                      playerData.rankedElo +
                      "점)"
                    : "기록 없음"}
                </span>
              </div>
            </div>
          </div>

          <div className="w-full">
            <div className="flex justify-between items-end mb-6 border-l-8 border-indigo-500 pl-4">
              <h3 className="text-2xl font-black text-indigo-900">
                보유 브롤러 상세 정보 ({playerData.brawlers.length}개)
              </h3>
              <span className="text-sm text-gray-500 font-bold bg-gray-200 px-3 py-1 rounded-full">
                👆 클릭해서 상세 분석 보기
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
                        <span>
                          ⚙️ {brawler.gears ? brawler.gears.length : 0}
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

      {/* ✨ 브롤러 상세 분석 모달 창 */}
      {selectedBrawler !== null ? (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
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

            <div className="bg-gray-50 p-5 rounded-2xl mb-6">
              <h4 className="font-black text-gray-700 mb-3 border-b pb-2">
                📦 보유 장비 상태
              </h4>
              <ul className="text-sm font-bold text-gray-600 flex flex-col gap-2">
                <li className="flex justify-between">
                  <span>🟢 가젯 (Gadgets)</span>
                  <span>
                    {selectedBrawler.gadgets
                      ? selectedBrawler.gadgets.length
                      : 0}
                    개
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>⭐ 스타파워 (Star Powers)</span>
                  <span>
                    {selectedBrawler.starPowers
                      ? selectedBrawler.starPowers.length
                      : 0}
                    개
                  </span>
                </li>
                <li className="flex justify-between">
                  <span>⚙️ 기어 (Gears)</span>
                  <span>
                    {selectedBrawler.gears ? selectedBrawler.gears.length : 0}개
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-blue-50 p-5 rounded-2xl mb-6">
              <div className="flex justify-between items-center mb-3 border-b border-blue-200 pb-2">
                <h4 className="font-black text-blue-900">
                  📊 최근 25전 분석 데이터
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
    </main>
  );
}
