"""Export in-stock CT bottles from the local CT cache to /tmp/ct_bottles.json.

Run after refresh_all, before `npx tsx scripts/sync.mts`:
    python3 -I scripts/export-ct.py

Each bottle carries its row's extra fields plus the wine's market value
(Valuation, SEK per 750 ml) from the cached List table. No CT requests.
"""
import json
import os
import sqlite3

CACHE = os.path.expanduser('~/.claude-private/cellartracker/cache.db')
OUT = '/tmp/ct_bottles.json'

db = sqlite3.connect(CACHE)
db.row_factory = sqlite3.Row
valuation = {}
for row in db.execute('select iwine, extra_json from wines'):
    valuation[row['iwine']] = json.loads(row['extra_json']).get('Valuation')

rows = []
for r in db.execute("select * from bottles where bottle_state = '1' and coalesce(store, '') != 'E2E Test'"):
    d = dict(r)
    d['extra'] = json.loads(d.pop('extra_json'))
    d['extra']['Valuation'] = valuation.get(d['iwine'])
    rows.append(d)

with open(OUT, 'w') as f:
    json.dump(rows, f)
print(f'ct {len(rows)}, with valuation {sum(1 for r in rows if r["extra"]["Valuation"] not in (None, "", "0"))}')
