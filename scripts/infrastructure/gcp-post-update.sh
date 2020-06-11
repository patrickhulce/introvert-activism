#!/bin/bash

set -euxo pipefail

source /home/activist/.envrc

unset GIT_DIR
cd /home/activist/introvert-activism/

git status
git fetch origin
git checkout -f origin/master
git reset --hard origin/master

if echo "$(git log -n 1)" | grep FORCE_RESTART ; then
  rm -rf node_modules/
fi

yarn install --check-files
yarn build:api

pm2 start --name introvert-activism ./packages/api/bin/server.js ||
  pm2 reload introvert-activism --kill-timeout 180000 --update-env
