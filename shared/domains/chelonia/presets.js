// Right now, we only have a single preset, for the server. If this remains the
// case and only the server is special regarding configuration, consider
// introducing a `server: true` key to `chelonia/confgure` instead.

export const SERVER = {
  // We don't check the subscriptionSet in the server because we accpt new
  // contract registrations, and are also not subcribed to contracts the same
  // way clients are
  acceptAllMessages: true,
  // The server also doesn't process actions
  skipActionProcessing: true,
  // The previous setting implies this one, which we set to be on the safe side
  skipSideEffects: true,
  // Changes the behaviour of unwrapMaybeEncryptedData so that it never decrypts.
  // Mostly useful for the server, to avoid filling up the logs and for faster
  // execution.
  skipDecryptionAttempts: true,
  // If an error occurs during processing, the message is rejected rather than
  // ignored
  strictProcessing: true,
  // The server expects events to be received in order (no past or future events)
  strictOrdering: true
}
