The files in this directory define selectors under the `gi.actions` domain.

The `gi.actions` domain is used for operations that
_execute in the same context as Chelonia_, which may be a _browsing context_
(e.g., a tab window), but it could also be something like a service worker.
**Operations that affect the overall application state, regardless of the UI state in a specific tab or window genrally belong under `gi.actions`**.

The operations under this domain, `gi.actions`, will usually be called from
contracts, other selectors under `gi.actions` and other selectors under `gi.app`.

For an explanation about `gi.app` and a worked example of where a selector
belongs, see the [`README.md` file there](../app/README.md).
