#!/bin/bash

cd ./packages/frontend
yarn build:watch &

cd ../electron
yarn build:watch &

while true; do
  sleep 30
done

trap 'exit' INT TERM
trap 'kill 0' EXIT
