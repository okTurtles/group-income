#!/bin/sh

# NOTE: when switching back and forth between macOS and Docker, you may
#       need to run: npm run docker -- npm rebuild node-sass

# make container have same timezone as host
TZ=$(echo Etc/GMT`date +%z | sed 's/0//g'`)

# build the docker image if it doesn't exist
if ! docker images -a | egrep -q "\bgroupincome\b"; then
  docker build -t groupincome --build-arg TIMEZONE="$TZ" .
fi

# TODO: take advantage of XQuartz X11 on macOS as described here:
#       https://www.cypress.io/blog/2019/05/02/run-cypress-with-a-single-docker-command/
docker run \
  -it --rm \
  -e TZ="$TZ" \
  -e PORT_SHIFT="$PORT_SHIFT" \
  -v "`pwd`:/opt" \
  --ipc=host \
  groupincome $@

status=$?

# 130 = handle ^C
[ $status -eq 0 -o $status -eq 130 ] || exit $status
