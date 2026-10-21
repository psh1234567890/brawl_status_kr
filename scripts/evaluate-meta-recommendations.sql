-- Read-only retrospective comparison. No player IDs or battle payloads leave DB.
-- Freeze settings.end_at to reproduce a report. Each UTC day is tested only
-- against the preceding 30 days; the last three days are a held-out check.
-- Ingestion timestamps are unavailable: this is NOT an as-of production replay.
WITH settings AS (
  SELECT date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS end_at
), observations AS MATERIALIZED (
  SELECT mode, map, brawler_name, battle_timestamp, result
  FROM public.battle_team_participants, settings
  WHERE battle_timestamp >= end_at - interval '37 days' AND battle_timestamp < end_at
    AND result IN ('victory', 'defeat', 'draw') AND brawler_name <> 'Unknown'
  UNION ALL
  SELECT mode, map, brawler_name, battle_timestamp, result
  FROM public.battle_logs, settings
  WHERE meta_perspective_only = true
    AND battle_timestamp >= end_at - interval '37 days' AND battle_timestamp < end_at
    AND result IN ('victory', 'defeat', 'draw') AND brawler_name <> 'Unknown'
), daily AS MATERIALIZED (
  SELECT date_trunc('day', battle_timestamp AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS day,
    mode, map, brawler_name, count(*)::double precision AS plays,
    count(*) FILTER (WHERE result = 'victory')::double precision AS wins,
    sum(power(2.0, -extract(epoch FROM (end_at - battle_timestamp))::double precision / 604800.0)) AS weight,
    sum(CASE WHEN result = 'victory' THEN power(2.0, -extract(epoch FROM (end_at - battle_timestamp))::double precision / 604800.0) ELSE 0 END) AS weighted_wins
  FROM observations CROSS JOIN settings
  GROUP BY 1, 2, 3, 4
), cutoffs AS (
  SELECT end_at - n * interval '1 day' AS cutoff,
    CASE WHEN n >= 4 THEN 'development' ELSE 'holdout' END AS phase,
    power(2.0, n::double precision / 7.0) AS weight_scale
  FROM settings CROSS JOIN generate_series(1, 7) n
), training AS MATERIALIZED (
  SELECT cutoff, phase, mode, map, brawler_name, sum(plays) AS plays, sum(wins) AS wins,
    sum(weight) * weight_scale AS weight, sum(weighted_wins) * weight_scale AS weighted_wins
  FROM cutoffs JOIN daily ON day >= cutoff - interval '30 days' AND day < cutoff
  GROUP BY cutoff, phase, weight_scale, mode, map, brawler_name
), totals AS (
  SELECT *, sum(plays) OVER w AS map_plays, sum(wins) OVER w AS map_wins,
    sum(weight) OVER w AS map_weight, sum(weighted_wins) OVER w AS map_weighted_wins
  FROM training WINDOW w AS (PARTITION BY cutoff, mode, map)
), predictions AS (
  SELECT *, 'legacy' AS method, wins / plays AS prediction,
    floor(floor(100 * wins / plays) * plays / (plays + 5)) AS score
  FROM totals WHERE plays >= 5
  UNION ALL
  SELECT *, 'recent7', weighted_wins / weight,
    floor(100 * weighted_wins / (weight + 5))
  FROM totals WHERE plays >= 5
  UNION ALL
  SELECT *, 'shrink20', (wins + 20 * coalesce((map_wins - wins) / nullif(map_plays - plays, 0), 0.5)) / (plays + 20),
    floor(100 * (wins + 20 * coalesce((map_wins - wins) / nullif(map_plays - plays, 0), 0.5)) / (plays + 20) * plays / (plays + 5))
  FROM totals WHERE plays >= 5
  UNION ALL
  SELECT *, 'recent7_shrink20', (weighted_wins + 20 * coalesce((map_weighted_wins - weighted_wins) / nullif(map_weight - weight, 0), 0.5)) / (weight + 20),
    floor(100 * (weighted_wins + 20 * coalesce((map_weighted_wins - weighted_wins) / nullif(map_weight - weight, 0), 0.5)) / (weight + 20) * weight / (weight + 5))
  FROM totals WHERE plays >= 5
), ranked AS MATERIALIZED (
  SELECT *, row_number() OVER (PARTITION BY cutoff, method, mode, map ORDER BY score DESC, plays DESC, brawler_name) AS rank
  FROM predictions
), future AS MATERIALIZED (
  SELECT cutoff, mode, map, brawler_name, sum(plays) AS future_plays, sum(wins) AS future_wins
  FROM cutoffs JOIN daily ON day >= cutoff AND day < cutoff + interval '1 day'
  GROUP BY cutoff, mode, map, brawler_name
), evaluated AS (
  SELECT r.*, f.future_plays, f.future_wins
  FROM ranked r LEFT JOIN future f USING (cutoff, mode, map, brawler_name)
), pairs AS (
  SELECT a.phase, a.method, count(*) AS pairs,
    sum(least(a.future_plays,b.future_plays) * CASE WHEN a.score = b.score THEN 0.5
      WHEN sign(a.score-b.score) = sign(a.future_wins/a.future_plays-b.future_wins/b.future_plays) THEN 1 ELSE 0 END)
      / nullif(sum(least(a.future_plays,b.future_plays)),0) AS pairwise_agreement
  FROM evaluated a JOIN evaluated b
    ON a.cutoff=b.cutoff AND a.method=b.method AND a.mode=b.mode AND a.map=b.map AND a.brawler_name<b.brawler_name
  WHERE a.future_plays>=5 AND b.future_plays>=5
    AND a.future_wins/a.future_plays<>b.future_wins/b.future_plays
  GROUP BY a.phase,a.method
), summary AS (
SELECT phase, method, count(DISTINCT cutoff) AS folds,
  min(cutoff) AS first_cutoff, max(cutoff) AS last_cutoff,
  count(*) FILTER (WHERE future_plays > 0) AS evaluated_cells,
  sum(future_plays)::bigint AS evaluated_observations,
  round((sum(future_wins * power(1-prediction, 2) + (future_plays-future_wins) * power(prediction, 2)) / nullif(sum(future_plays), 0))::numeric, 6) AS brier,
  round((sum(future_wins * power(1-score/100.0, 2) + (future_plays-future_wins) * power(score/100.0, 2)) / nullif(sum(future_plays), 0))::numeric, 6) AS score_brier,
  round((100 * sum(future_wins) FILTER (WHERE rank <= 3) / nullif(sum(future_plays) FILTER (WHERE rank <= 3), 0))::numeric, 3) AS top3_observed_win_rate,
  (sum(future_plays) FILTER (WHERE rank <= 3))::bigint AS top3_observations,
  count(*) FILTER (WHERE rank <= 3 AND future_plays > 0) AS top3_observed_cells,
  count(*) FILTER (WHERE rank <= 3) AS top3_selected_cells
FROM evaluated GROUP BY phase, method
)
SELECT summary.*, pairs.pairs, round(pairwise_agreement::numeric,6) AS pairwise_agreement
FROM summary LEFT JOIN pairs USING (phase,method) ORDER BY phase,method;
