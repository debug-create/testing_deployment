"""Execute the audit notebooks in fresh kernels and preserve failures and outputs."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import time
import warnings

import nbformat
from nbclient import NotebookClient

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'phase_a_audit'
NAMES = ['00_data_recon.ipynb', '01_digital_twin.ipynb',
         '02_normalize_resolve.ipynb', '03_observed_layer_ledger.ipynb',
         '04_twin_export_inference.ipynb', '05_twin_review.ipynb']

def snapshot():
    backup = OUT/'before_audit'
    if backup.exists():
        return
    backup.mkdir(parents=True)
    for name in ('notebooks', 'twin_out'):
        shutil.copytree(ROOT/name, backup/name)
    shutil.copy2(ROOT/'backend/app/twin/twin.py', backup/'twin.py')
    initial = {}
    with warnings.catch_warnings(record=True) as caught:
        for p in (ROOT/'notebooks').glob('*.ipynb'):
            n = nbformat.read(p, as_version=4)
            cells = [c for c in n.cells if c.cell_type=='code']
            initial[p.name] = dict(code_cells=len(cells), executed=sum(c.execution_count is not None for c in cells), output_cells=sum(bool(c.outputs) for c in cells), errors=[o for c in cells for o in c.outputs if o.output_type=='error'])
    initial['inspection_warnings'] = [str(w.message) for w in caught]
    (OUT/'initial_state.json').write_text(json.dumps(initial,indent=2),encoding='utf-8')
    data = ROOT/'data_model/dataset/attack_path_dataset'
    # Hash bytes without interpreting answer keys. Evaluation parsing stays in notebook cells.
    hashes = {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in data.rglob('*') if p.is_file() and (p.suffix in ('.json','.jsonl','.py'))}
    (OUT/'dataset_hashes_before.json').write_text(json.dumps(hashes,indent=2),encoding='utf-8')

def execute(name, baseline=False):
    path = ROOT/'notebooks'/name
    if not path.exists():
        return dict(notebook=name,status='BLOCKED',executed=False,error='Notebook missing')
    with warnings.catch_warnings(record=True) as caught:
        n = nbformat.read(path,as_version=4)
        t = time.time()
        error = None
        try:
            NotebookClient(n,timeout=300,startup_timeout=120,resources={'metadata':{'path':str(ROOT)}}).execute()
        except Exception as exc:
            error = str(exc)
        saved = OUT/('baseline_'+name) if baseline else path
        nbformat.write(n,saved)
    record = dict(notebook=name,status='FAIL' if error else 'PASS',executed=True,seconds=round(time.time()-t,2),error=error,driver_warnings=[str(w.message) for w in caught],cells=[])
    transcript=[]
    for i,c in enumerate(n.cells):
        if c.cell_type!='code':
            continue
        outputs=[dict(o) for o in c.outputs]
        record['cells'].append(dict(index=i,execution_count=c.execution_count,outputs=outputs,skipped=c.execution_count is None))
        transcript.append('\nCELL '+str(i)+'\n'+''.join(o.get('text','') or '\n'.join(o.get('traceback',[])) for o in outputs))
    (OUT/(('baseline_' if baseline else '')+path.stem+'.log')).write_text(''.join(transcript),encoding='utf-8')
    print(name,record['status'], 'seconds=',record['seconds'], flush=True)
    if error:
        print(error[-2500:],flush=True)
    return record

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--baseline',action='store_true')
    parser.add_argument('--start',type=int,default=0)
    parser.add_argument('--end',type=int,default=5)
    args=parser.parse_args()
    snapshot()
    names=['00_data_recon.ipynb','01_build_graphs.ipynb'] if args.baseline else NAMES[args.start:args.end+1]
    result_path=OUT/('baseline_execution.json' if args.baseline else 'execution.json')
    records=[] if args.baseline or not result_path.exists() else json.loads(result_path.read_text())
    for name in names:
        record=execute(name,args.baseline)
        records=[r for r in records if r['notebook']!=name]+[record]
        result_path.write_text(json.dumps(records,indent=2),encoding='utf-8')
        if record['status']!='PASS' and not args.baseline:
            break
