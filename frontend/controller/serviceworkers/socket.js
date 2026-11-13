'use strict'

// Whether a WebSocket (or the pubsub client's socket) is open. Sockets
// without the `OPEN` constant are compared against its standard value.
export const isSocketOpen = (socket: ?Object): boolean =>
  !!socket && socket.readyState === (socket.OPEN ?? 1)
