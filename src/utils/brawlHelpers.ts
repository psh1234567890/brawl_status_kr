export const checkIsRanked = (match: any) => 
    {
        let isRanked = false;
        if (match.battle.type) 
        {
            if (match.battle.type === "soloRanked") 
            {
                isRanked = true;
            } 
            else 
            {
                if (match.battle.type === "teamRanked")
                {
                    isRanked = true;
                }
            }
        }
        return isRanked;
    };

export const getBattleResultInfo = (match: any) => 
    {
        let isWin = false;
        let isDraw = false;
        let isLoss = false;

        let resultText = "무승부";
        let resultColor = "text-gray-500";
        let bgColor = "bg-white border-gray-400";

        if (match.battle.result) 
        {
            if (match.battle.result === "victory") 
            {
                isWin = true;
            } 
            else 
            {
                if (match.battle.result === "defeat")
                {
                    isLoss = true;
                }
                else
                {
                    isDraw = true;
                }
            }
        }

        if (match.event.mode === "soloShowdown") 
        {
            if (match.battle.rank) 
            {
                if (match.battle.rank <= 4) 
                {
                    isWin = true;
                    isLoss = false;
                    isDraw = false;
                } 
                else 
                {
                    isLoss = true;
                    isWin = false;
                    isDraw = false;
                }
            }
        }

        if (match.event.mode === "duoShowdown") 
        {
            if (match.battle.rank) 
            {
                if (match.battle.rank <= 2) 
                {
                    isWin = true;
                    isLoss = false;
                    isDraw = false;
                } 
                else 
                {
                    isLoss = true;
                    isWin = false;
                    isDraw = false;
                }
            }
        }

        if (match.event.mode === "trioShowdown") 
        {
            if (match.battle.rank) 
            {
                if (match.battle.rank <= 2) 
                {
                    isWin = true;
                    isLoss = false;
                    isDraw = false;
                } 
                else 
                {
                    isLoss = true;
                    isWin = false;
                    isDraw = false;
                }
            }
        }

        if (isWin) 
        {
            resultText = "승리";
            resultColor = "text-blue-500";
            bgColor = "bg-white border-blue-500";
        } 
        else 
        {
            if (isLoss)
            {
                resultText = "패배";
                resultColor = "text-red-500";
                bgColor = "bg-white border-red-500";
            }
        }

        return { resultText, resultColor, bgColor, isWin, isLoss, isDraw };
    };
