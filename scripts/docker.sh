#!/bin/sh

# make container have same timezone as host

TZ=$(echo Etc/GMT`date +%z | sed 's/0//g'`)

# build the docker image if it doesn't exist
if ! docker images -a | egrep -q "\bgroupincome\b"; then
  docker build -t groupincome --build-arg TIMEZONE="$TZ" .
fi

# TODO: sync/configure the ports below if they're changed
# https://github.com/okTurtles/group-income-simple/issues/71

docker run \
  -it --rm \
  -e TZ="$TZ" \
  -v "`pwd`:/opt" \
  -p 127.0.0.1:8000:8000 \
  -p 127.0.0.1:3000:3000 \
  -p 127.0.0.1:35729:35729 \
  groupincome $@

status=$?

# 130 = handle ^C
[ $status -eq 0 -o $status -eq 130 ] || exit $status
