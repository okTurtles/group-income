#!/bin/sh

# NOTE: when switching back and forth between macOS and Docker, you may
#       need to run: npm run docker -- npm rebuild node-sass

# make container have same timezone as host
TZ=$(echo Etc/GMT`date +%z | sed 's/0//g'`)
PROJECT_NAME="$(basename `pwd` | sed 's/ /_/g')"

# build the docker image if it doesn't exist
# to rebuild it, run: docker rmi $PROJECT_NAME
if ! docker images -a | egrep -q "\b$PROJECT_NAME\b"; then
  docker build -t "$PROJECT_NAME" --build-arg TIMEZONE="$TZ" .
fi

# TODO: take advantage of XQuartz X11 on macOS as described here:
#       https://www.cypress.io/blog/2019/05/02/run-cypress-with-a-single-docker-command/
docker run \
  -it --rm \
  -e TZ="$TZ" \
  -e PORT_SHIFT="$PORT_SHIFT" \
  -v "`pwd`:/opt" \
  --ipc=host \
  "$PROJECT_NAME" $@

status=$?

# 130 = handle ^C
[ $status -eq 0 -o $status -eq 130 ] || exit $status
