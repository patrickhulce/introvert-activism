#!/bin/bash

set -euxo pipefail

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Repo has changes to the files! Commit or stash the changes to continue."
  exit 1
fi

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "master" ]]; then
  echo "Can only publish master branch."
  exit 1
fi

git fetch origin master
if [[ "$(git rev-parse master)" != "$(git rev-parse origin/master)" ]]; then
  echo "Can only publish when changes are synced with origin."
  exit 1
fi

CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")
NEXT_VERSION_TYPE=${NEXT_VERSION_TYPE:-patch}
NEXT_VERSION=$(node -e "console.log(require('semver').inc('$CURRENT_VERSION', '$NEXT_VERSION_TYPE', 'beta'))")

echo "Will publish as $NEXT_VERSION, continue?"
echo "Press SPACE to continue...Ctrl+C to exit"
read -n 1 -r unused_variable

sed -i '' "s/\"$CURRENT_VERSION\"/\"$NEXT_VERSION\"/" package.json

# Make the version commit
git add package.json
git commit -m "chore: bump to v$NEXT_VERSION"
git tag -a "v$NEXT_VERSION" -m "v$NEXT_VERSION"
git push --follow-tags
