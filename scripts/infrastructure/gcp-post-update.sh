#!/bin/bash

set -euxo pipefail

cd /home/activist/introvert-activism/
git fetch origin
git checkout -f origin/master
git reset --hard origin/master

yarn install --check-files
yarn build:api
pm2 start --name introvert-activism ./packages/api/bin/server.js || pm2 reload introvert-activism --kill-timeout 180000
