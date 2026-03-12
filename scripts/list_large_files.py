#!/usr/bin/env python3
import os
from pathlib import Path
import json

ROOT = Path('.')
EXCLUDE_DIRS = {'.git','node_modules','dist','build','.vite','coverage','out'}

results = []
for dirpath, dirnames, filenames in os.walk(ROOT):
    # skip excluded dirs
    parts = Path(dirpath).parts
    if any(p in EXCLUDE_DIRS for p in parts):
        continue
    # skip hidden top-level folders
    if any(p.startswith('.') for p in parts if p):
        continue
    for fn in filenames:
        fp = Path(dirpath) / fn
        # skip binary-ish by extension (quick heuristic)
        if fp.suffix.lower() in {'.png','.jpg','.jpeg','.gif','.svg','.ico','.exe','.dll','.so','.dylib','.class','.jar'}:
            continue
        try:
            with fp.open('r', encoding='utf-8', errors='ignore') as f:
                count = sum(1 for _ in f)
        except Exception:
            continue
        if count > 200:
            results.append({"path": str(fp.as_posix()), "lines": count})

# sort descending by lines
results.sort(key=lambda x: x['lines'], reverse=True)
print(json.dumps(results, indent=2, ensure_ascii=False))
