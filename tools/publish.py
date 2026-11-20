"""Builds the folder that goes online: D:\\Companies\\portfolio\\site

It holds index.html and only the files under assets/ that the page refers to.
The demos, the bake tool, the source photo and old backups stay out.

    python tools/publish.py
"""
import os, re, shutil

SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))      # the build folder this script lives in
OUT = os.path.join(os.path.dirname(SRC), 'site')

html = open(os.path.join(SRC, 'index.html'), encoding='utf-8').read()
used = sorted(set(re.findall(r'assets/[\w\-]+(?:[.][\w\-]+)+', html)))      # a file name with an extension, not a sentence's full stop

if os.path.isdir(OUT):
    shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, 'assets'))
shutil.copy2(os.path.join(SRC, 'index.html'), os.path.join(OUT, 'index.html'))
total = os.path.getsize(os.path.join(OUT, 'index.html'))
print('index.html  %d KB' % (total // 1024))
for rel in used:
    src = os.path.join(SRC, rel)
    if not os.path.isfile(src):
        raise SystemExit('the page refers to %s but that file does not exist' % rel)
    shutil.copy2(src, os.path.join(OUT, rel))
    size = os.path.getsize(src)
    total += size
    print('%s  %d KB' % (rel, size // 1024))
print('site/ is ready: %d files, %d KB' % (len(used) + 1, total // 1024))
if 'og:url' not in html:
    print('note: the link preview still needs the site address (og:url and an absolute og:image). Set them once the address is known.')
