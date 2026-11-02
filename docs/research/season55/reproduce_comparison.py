"""Reproduce map-score versus composition-model rankings without retraining.

Set FOLLOWUP_BASE_URL to a pinned raw GitHub commit before running in Colab.
Only the Python standard library is required for this calculation.
"""
import csv
import io
import json
import math
from collections import defaultdict
from itertools import combinations, product
from pathlib import Path
from urllib.request import urlopen

FOLLOWUP_BASE_URL = globals().get('FOLLOWUP_BASE_URL',
    'https://raw.githubusercontent.com/psh1234567890/brawl_status_kr/codex/season55-draft-recommendation-20261102')

def followup_download(relative):
    with urlopen(FOLLOWUP_BASE_URL + '/' + relative, timeout=45) as response:
        return response.read().decode('utf-8-sig')

followup_model = json.loads(followup_download('src/data/season55-recommendation.json'))
followup_contexts = list(csv.DictReader(io.StringIO(followup_download('docs/research/season55/context_sample.csv'))))
followup_weights = followup_model['weights']
followup_map_stats = {(r['map'],r['mode'],r['brawler']):r for r in followup_model['mapStats']}

def followup_features(map_name, mode, allies, opponents):
    keys = [f'map|{map_name}', f'mode|{mode}']
    for side, team in [('ally',sorted(allies)),('enemy',sorted(opponents))]:
        for b in team:
            keys.extend([f'{side}_brawler|{b}', f'{side}_map|{map_name}|{b}', f'{side}_mode|{mode}|{b}'])
        keys.extend(f'{side}_pair|{a}|{b}' for a,b in combinations(team,2))
    keys.extend(f'matchup|{a}|{b}' for a,b in product(sorted(allies),sorted(opponents)))
    return keys

def followup_probability(map_name, mode, allies, opponents):
    def raw(a,e):
        z=followup_model['intercept']+sum(followup_weights.get(k,0) for k in followup_features(map_name,mode,a,e))
        return 1/(1+math.exp(-z))
    return min(1-1e-6,max(1e-6,(raw(allies,opponents)+1-raw(opponents,allies))/2))

followup_rankings, followup_context_results = {}, []
for case in followup_contexts:
    allies=[case['ally_0'],case['ally_1']]
    opponents=[case['enemy_0'],case['enemy_1'],case['enemy_2']]
    pool=sorted(set(followup_model['brawlers'])-set(allies+opponents))
    rows=[]
    for b in pool:
        stat=followup_map_stats.get((case['map'],case['mode'],b),{'plays':0,'wins':0})
        plays,wins=stat['plays'],stat['wins']
        win_rate=math.floor(100*wins/plays) if plays else 0
        score=math.floor(win_rate*plays/(plays+5))
        p=followup_probability(case['map'],case['mode'],allies+[b],opponents)
        rows.append({'brawler':b,'probability':p,'plays':plays,'win_rate':win_rate,'score':score})
    model_order=sorted(rows,key=lambda r:(-r['probability'],-r['plays'],r['brawler']))
    baseline_order=sorted([r for r in rows if r['plays']>=5],key=lambda r:(-r['score'],-r['plays'],-r['win_rate'],r['brawler']))
    followup_rankings[case['context_id']]={r['brawler']:r for r in rows}
    if case['sample_for_summary'].lower()=='true':
        followup_context_results.append({'context_id':case['context_id'],'map':case['map'],'mode':case['mode'],
            'candidate_count':len(pool),'top1_model':model_order[0]['brawler'],'top1_baseline':baseline_order[0]['brawler'],
            'top1_same':model_order[0]['brawler']==baseline_order[0]['brawler'],
            'top3_overlap':len({r['brawler'] for r in model_order[:3]}&{r['brawler'] for r in baseline_order[:3]}),
            'top5_overlap':len({r['brawler'] for r in model_order[:5]}&{r['brawler'] for r in baseline_order[:5]})})

followup_groups=defaultdict(list)
for case in followup_contexts:
    if case['sample_for_summary'].lower()=='true':followup_groups[(case['map'],case['mode'])].append(case['context_id'])
followup_pair_results=[]
for ids in followup_groups.values():
    for first,second in zip(ids,ids[1:]):
        common=set(followup_rankings[first])&set(followup_rankings[second])
        order_a=sorted(common,key=lambda b:(-followup_rankings[first][b]['probability'],b))
        order_b=sorted(common,key=lambda b:(-followup_rankings[second][b]['probability'],b))
        followup_pair_results.append({'first':first,'second':second,'common_candidates':len(common),
            'model_top1_changed':order_a[0]!=order_b[0]})

followup_summary={'contexts':len(followup_context_results),'map_mode_groups':len(followup_groups),
    'candidate_predictions':sum(r['candidate_count'] for r in followup_context_results),
    'top1_same':sum(r['top1_same'] for r in followup_context_results),
    'mean_top3_overlap':sum(r['top3_overlap'] for r in followup_context_results)/len(followup_context_results),
    'mean_top5_overlap':sum(r['top5_overlap'] for r in followup_context_results)/len(followup_context_results),
    'composition_pairs':len(followup_pair_results),
    'composition_top1_changed':sum(r['model_top1_changed'] for r in followup_pair_results)}
assert followup_summary['contexts']==130 and followup_summary['candidate_predictions']==13260
assert followup_summary['top1_same']==43 and followup_summary['composition_top1_changed']==91
print(json.dumps(followup_summary,ensure_ascii=False,indent=2))
FOLLOWUP_OUT=Path(globals().get('FOLLOWUP_OUTPUT_DIR','/content/game_recommendation/followup' if Path('/content').exists() else 'followup-results'))
FOLLOWUP_OUT.mkdir(parents=True,exist_ok=True)
(FOLLOWUP_OUT/'comparison_summary.json').write_text(json.dumps(followup_summary,ensure_ascii=False,indent=2),encoding='utf-8')
with (FOLLOWUP_OUT/'context_comparison.csv').open('w',encoding='utf-8-sig',newline='') as stream:
    writer=csv.DictWriter(stream,fieldnames=list(followup_context_results[0]));writer.writeheader();writer.writerows(followup_context_results)
