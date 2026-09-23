import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'; import { homedir } from 'os'; import { join } from 'path'
const d = join(homedir(), '.claude-private', 'supabase')
const sb = createClient(readFileSync(join(d,'project-url'),'utf8').trim(), readFileSync(join(d,'anon-jwt'),'utf8').trim())
const all: any[] = []
for (let f=0;;f+=1000){ const {data}=await sb.from('bottles').select('barcode,iwine,wine,vintage,producer,country,region,size,cost,estimated_value,begin_consume,end_consume,recommended_bin,wine_type').order('barcode').range(f,f+999); all.push(...(data??[])); if(!data||data.length<1000) break }
const z = all.filter(b => (b.cost ?? 0) === 0 && !b.estimated_value)
console.log(`${z.length} flaskor utan värde:\n`)
for (const b of z) console.log(`  iwine=${b.iwine} bc=${b.barcode} | ${b.vintage} ${b.wine} [${b.size}] | ${b.producer} / ${b.region}, ${b.country} | drick ${b.begin_consume ?? '?'}–${b.end_consume ?? '?'} | ${b.recommended_bin}`)
