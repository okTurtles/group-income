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

FRONTEND_PORT=${API_PORT:-8000}
 # currently no way to change these, PRs welcome!
BACKEND_PORT=3000
REFRESH_PORT=35729

# TODO: take advantage of XQuartz X11 on macOS as described here:
#       https://www.cypress.io/blog/2019/05/02/run-cypress-with-a-single-docker-command/
docker run \
  -it --rm \
  -e TZ="$TZ" \
  -p 127.0.0.1:${FRONTEND_PORT}:${FRONTEND_PORT} \
  -p 127.0.0.1:${BACKEND_PORT}:${BACKEND_PORT} \
  -p 127.0.0.1:${REFRESH_PORT}:${REFRESH_PORT} \
  -v "`pwd`:/opt" \
  "$PROJECT_NAME" $@

status=$?

# 130 = handle ^C
[ $status -eq 0 -o $status -eq 130 ] || exit $status
