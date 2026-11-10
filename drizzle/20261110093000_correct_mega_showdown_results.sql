-- Repair results recorded before Mega Showdown placements were recognized.
WITH corrected AS (
  UPDATE public.battle_logs
  SET result = CASE WHEN rank = 1 THEN 'victory' ELSE 'defeat' END
  WHERE result = 'draw'
    AND (
      (mode = 'megaShowdown' AND rank BETWEEN 1 AND 20)
      OR (mode = 'megaDuoShowdown' AND rank BETWEEN 1 AND 10)
    )
  RETURNING mode, result
)
SELECT mode, result, count(*)::int AS corrected_rows
FROM corrected
GROUP BY mode, result
ORDER BY mode, result;
