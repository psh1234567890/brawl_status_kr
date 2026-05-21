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

  // 화면이 켜질 때 브라우저 로컬 저장소에서 최근 검색어 불러오기
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
      const response = await fetch(`/api/player?tag=${targetTag}`);
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

        // 검색 성공 시 로컬 스토리지에 태그 저장 (최대 5개 유지)
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
        `/api/player/battlelog?tag=${targetTag}`,
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

  if (battleLog !== null) {
    if (battleLog.items) {
      const modeStats: any = {};

      battleLog.items.forEach((match: any) => {
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
    }
  }

  let recentWinRate = 0;
  const totalRecent = recentWins + recentDefeats + recentDraws;
  if (totalRecent > 0) {
    recentWinRate = Math.floor((recentWins / totalRecent) * 100);
  }

  return (
    // 배경을 그라데이션으로 변경해서 훨씬 트렌디하게!
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

        {/* 최근 검색어 기능 UI */}
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
          {/* 메인 프로필 카드 디자인 업그레이드 */}
          <div className="bg-white/80 backdrop-blur-md p-10 rounded-3xl shadow-2xl w-full text-black border border-white mb-10 transition-transform hover:-translate-y-1">
            <div className="flex flex-col items-center border-b-2 border-gray-100 pb-8 mb-8">
              <h2 className="text-5xl font-black text-gray-800 mb-2">
                {playerData.name}
              </h2>
              {playerData.club ? (
                <div className="mt-2 flex items-center bg-gradient-to-r from-blue-500 to-indigo-500 px-6 py-2 rounded-full shadow-md">
                  <span className="text-white font-bold text-lg">
                    🛡️ 소속 클럽: {playerData.club.name}
                  </span>
                </div>
              ) : (
                <div className="mt-2 flex items-center bg-gray-200 px-6 py-2 rounded-full shadow-inner">
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

          {battleLog !== null ? (
            <div className="w-full mb-12">
              <h3 className="text-2xl font-black mb-6 text-indigo-900 border-l-8 border-indigo-500 pl-4">
                📊 최근 25전 승률 분석
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

              <h3 className="text-2xl font-black mb-6 text-indigo-900 border-l-8 border-indigo-500 pl-4">
                ⚔️ 최근 전투 기록 (최대 5게임)
              </h3>
              <div className="flex flex-col gap-4">
                {battleLog.items
                  .slice(0, 5)
                  .map((match: any, index: number) => {
                    return (
                      <div
                        key={index}
                        className={`p-6 rounded-2xl shadow-md border-l-8 flex justify-between items-center transition-transform hover:-translate-x-1 ${
                          match.battle.result === "victory"
                            ? "bg-white border-blue-500"
                            : match.battle.result === "defeat"
                              ? "bg-white border-red-500"
                              : "bg-white border-gray-400"
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="font-black text-gray-800 text-xl mb-1">
                            {modeDict[match.event.mode]
                              ? modeDict[match.event.mode]
                              : match.event.mode}{" "}
                            - {match.event.map}
                          </span>
                          <span className="text-sm text-gray-500 font-bold bg-gray-100 px-2 py-1 rounded-md w-max">
                            {match.battle.type}
                          </span>
                        </div>
                        <div className="text-3xl font-black">
                          {match.battle.result === "victory" ? (
                            <span className="text-blue-500 drop-shadow-sm">
                              승리
                            </span>
                          ) : match.battle.result === "defeat" ? (
                            <span className="text-red-500 drop-shadow-sm">
                              패배
                            </span>
                          ) : (
                            <span className="text-gray-500 drop-shadow-sm">
                              무승부
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : null}

          <div className="w-full">
            <h3 className="text-2xl font-black mb-6 text-indigo-900 border-l-8 border-indigo-500 pl-4">
              보유 브롤러 상세 정보 ({playerData.brawlers.length}개)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {[...playerData.brawlers]
                .sort((a: any, b: any) => {
                  return b.trophies - a.trophies;
                })
                .map((brawler: any) => {
                  return (
                    <div
                      key={brawler.id}
                      className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center transition-transform hover:-translate-y-2 hover:shadow-xl"
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
                          🔥{" "}
                          {brawler.hyperCharges
                            ? brawler.hyperCharges.length
                            : 0}
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
    </main>
  );
}
