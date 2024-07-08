The files in this directory define selectors under the `gi.app` domain.

The `gi.app` domain is used for operations that _execute in a browsing context_
(e.g., a browser tab / window), as opposed to possibly executing in the context
of a service worker, and interact with contracts in some way that relates to the
state in that tab or window. Normally, **operations that result from user
interaction are good candidates for the `gi.app` domain**.

The operations under this domain, `gi.app`, will usually call one or more
operation in the `gi.actions` domain.

Contracts will **never** call into the `gi.app` domain.

The difference between `gi.app` and `gi.actions` is that operations under
_`gi.actions`_:

- are concerned with the state of Chelonia (this can be though of as a common
  state that all tabs share) and not _just_ the state of an individual tab, and
- are executed in the _same context as Chelonia_, which may be different from
  the _browsing context_ if Chelonia is running in a service worker, and
- can be called from contracts

Example: Switching from group A to group B.

- If this operation only affects the current tab (in other words, if there are
  multiple tabs open and switching to group B in tab X should not affect the
  group shown in tab Y): this goes in `gi.app`.
- If the operation _should_ affect other tabs besides the current one, this goes
  in `gi.actions`, which should emit an event that each tab can handle and switch
  groups as appropriate.
- If the operation has parts that affect the only current tab and parts that
  affect other tabs, it goes under both `gi.app` and `gi.actions`. The `gi.app`
  part deals with local changes to the state and calls the corresponding
  selector under `gi.actions`.
