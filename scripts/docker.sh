#!/bin/sh

# make container have same timezone as host

TZ=$(echo Etc/GMT`date +%z | sed 's/0//g'`)

# build the docker image if it doesn't exist
if ! docker images -a | egrep -q "\bgroupincome\b"; then
  docker build -t groupincome --build-arg TIMEZONE="$TZ" .
fi

# TODO: sync/configure the ports below if they're changed
# https://github.com/okTurtles/group-income-simple/issues/71

PORT_SHIFT=${PORT_SHIFT:-0}
FRONTEND_PORT=$(( 8000 + $PORT_SHIFT ))
BACKEND_PORT=$(( 3000 + $PORT_SHIFT ))
REFRESH_PORT=$(( 35729 + $PORT_SHIFT ))

docker run \
  -it --rm \
  -e TZ="$TZ" \
  -e PORT_SHIFT="$PORT_SHIFT" \
  -v "`pwd`:/opt" \
  -p 127.0.0.1:${FRONTEND_PORT}:${FRONTEND_PORT} \
  -p 127.0.0.1:${BACKEND_PORT}:${BACKEND_PORT} \
  -p 127.0.0.1:${REFRESH_PORT}:${REFRESH_PORT} \
  groupincome $@

status=$?

# 130 = handle ^C
[ $status -eq 0 -o $status -eq 130 ] || exit $status
