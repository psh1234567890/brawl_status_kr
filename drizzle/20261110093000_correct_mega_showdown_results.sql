-- Repair draws recorded before Mega Showdown trophy changes were recognized.
WITH corrected AS (
  UPDATE public.battle_logs
  SET result = CASE WHEN trophy_change > 0 THEN 'victory' ELSE 'defeat' END
  WHERE result = 'draw'
    AND mode IN ('megaShowdown', 'megaDuoShowdown')
    AND trophy_change <> 0
  RETURNING mode, result
)
SELECT mode, result, count(*)::int AS corrected_rows
FROM corrected
GROUP BY mode, result
ORDER BY mode, result;
