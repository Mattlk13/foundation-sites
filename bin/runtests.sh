#!/bin/bash
# Run all Yeti test suites.
# Usage: bin/runtests.sh

cd "$(dirname "$0")/.."

failed=0

echo "=== Validate (manifests, examples, docs, CSS lints) ==="
if npm run --silent validate 2>&1; then
  echo ""
else
  failed=1
fi

echo "=== Tooling tests (node:test) ==="
if npm run --silent test:tools 2>&1; then
  echo ""
else
  failed=1
fi

echo "=== Browser tests (Playwright: chromium, firefox, webkit; screenshots in chromium) ==="
if npm run --silent test:browser 2>&1; then
  echo ""
else
  failed=1
fi

if [ $failed -eq 0 ]; then
  echo "=== All test suites passed ==="
else
  echo "=== Some test suites failed ==="
  echo "A screenshot failure after a deliberate visual change is re-blessed with: npm run screenshots:update"
  exit 1
fi
