#!/bin/bash

set -euxo pipefail

rm -rf dist/ dist-ts/ dist-dev/ packages/frontend/dist/

yarn build

mkdir -p dist-ts/
cp -R ./dist-dev/* dist-ts/
rm -rf dist-ts/frontend/*
mkdir -p dist-ts/frontend/dist/
cp -R packages/frontend/dist/* dist-ts/frontend/dist/

electron-builder --config=./build/electron-builder.json
