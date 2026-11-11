#!/usr/bin/env bash
# Usage: ./push-to-github.sh my-repo-name   (needs git; uses GitHub CLI `gh` if installed)
set -e
REPO=${1:-northline}
git init -b main && git add -A && git commit -m "Step 1: engine, yard map, Glock viewmodel, b-hop movement"
if command -v gh >/dev/null; then gh repo create "$REPO" --public --source=. --push
else echo "No gh CLI. Create an empty repo on github.com then run:"; echo "git remote add origin https://github.com/<you>/$REPO.git && git push -u origin main"; fi
