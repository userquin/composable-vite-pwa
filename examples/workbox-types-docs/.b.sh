#!/usr/bin/env bash
cd /home/anon/Repos/composable-vite-pwa
rm -f packages/workbox/types/.v.sh packages/workbox/types/.v.txt
SUM=examples/workbox-types-docs/.b.txt
pnpm --filter workbox-types-docs run build > /tmp/eb.log 2>&1
{
  echo "build exit=$?"
  tail -n 4 /tmp/eb.log | grep -vE '^\s+at '
  echo ""
  S=examples/workbox-types-docs/api/symbols
  echo "total symbol pages: $(ls $S/*.md 2>/dev/null | wc -l)   build pages: $(ls $S/build-*.md 2>/dev/null | wc -l)"
  echo "checkbuildsw page still present?: $([ -f $S/build-checkbuildsw.md ] && echo yes || echo NO-removed)"
  echo "local search present in config: $(grep -c "provider: 'local'" examples/workbox-types-docs/.vitepress/config.ts)"
} > "$SUM" 2>&1
echo done
