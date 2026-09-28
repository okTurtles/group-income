# Code Review

**Base**: `origin/master` (6b7627ca5)
**Head**: `sebin/task/pk#6-migrate-to-typescript` (03baff8f6)
**Date**: 2026-09-28
**Model**: Claude Fable 5.1

---

No 🔴 or 🟡 issues were found. All five slices verified that every import resolves, no Flow syntax is left in migrated files, `tsc --noEmit` and ESLint pass, and no runtime behaviour was changed except the deliberate `RemoveMember.vue` log fix. The items below are all minor. Items 12 and 13 are carried over unchanged from the previous review.

## 1. ⚪ `getLocale` comment gives the wrong reason for its cast

- [ ] Addressed
- [ ] Dismissed

`frontend/model/contracts/shared/time.ts:178-180`:

```ts
// `navigator.languages` is `readonly string[]`, which is not compatible with the
// `string[]` expected by `.toLocaleDateString()`. Casting through `any` as a workaround.
: (navigator.languages as any) ?? navigator.language ?? fallback
```

`toLocaleDateString` takes `Intl.LocalesArgument` (`lib.es2020.date.d.ts:32`), which already accepts a `readonly` array. The cast is needed only because `getLocale (): string` (line 173) declares `string` while returning an array. Either fix the comment, or make the return type honest and drop the cast (type-only; both callers at lines 191 and 203 pass the result straight to `toLocale*String`):

```ts
export function getLocale (): Intl.LocalesArgument {
  const fallback = 'en-US-POSIX'
  return typeof navigator === 'undefined'
    ? fallback // Fallback for Mocha tests.
    : navigator.languages ?? navigator.language ?? fallback
}
```

Note: `time.ts` is in the contract bundle graph and esbuild keeps comments, so this edit changes the contract hash. Fine if you are re-pinning anyway; otherwise defer.

## 2. ⚪ `Object.entries` cast describes one tuple, not an array of tuples

- [ ] Addressed
- [ ] Dismissed

`frontend/model/notifications/periodicNotifications.ts:94`:

```ts
((Object.entries(sbp('okTurtles.eventQueue/queuedInvocations')) as any) as [string, (Fn | string[])[]])
  .map(([queue, invocations]) => {
```

`Object.entries` returns `[key, value][]`, so the asserted type is missing the outer `[]`. It typechecks only by coincidence (`.map` over a tuple yields `string | (Fn | string[])[]`, and `string`, `Fn` and `string[]` all have `.length`). The type was wrong under Flow too, but this line is rewritten by the PR. The `as any` step is also unnecessary since `sbp(...)` is already `any`:

```ts
(Object.entries(sbp('okTurtles.eventQueue/queuedInvocations')) as [string, (Fn | string[])[]][])
  .map(([queue, invocations]) => {
```

## 3. ⚪ `Notification` type is now closed but its comment still promises extra properties

- [ ] Addressed
- [ ] Dismissed

`frontend/model/notifications/types.ts:34-35`. Flow's inexact marker `...` was dropped but the comment above it was kept:

```ts
  readonly type: string;
  // Other properties might be defined according to the notification's type.
}
```

A closed TS object type rejects unknown properties in object literals. `tsc` passes today, so nothing is broken, but either drop the comment or say what it means:

```ts
  readonly type: string;
  // Other properties might be defined according to the notification's type.
  [key: string]: any;
}
```

## 4. ⚪ `logServer` returns `any` although it returns nothing

- [ ] Addressed
- [ ] Dismissed

`frontend/model/logServer.ts:5`: `export default (console: Console): any => {`. The body only ever `return`s bare (line 8) or falls off the end, and both callers (`captureLogs.ts:76`, `swCaptureLogs.ts:74`) discard the result. `any` is neither the PR's `Function → Fn` mapping nor accurate.

```ts
export default (console: Console): void => {
```

## 5. ⚪ Changelog-style "used to carry" comments

- [ ] Addressed
- [ ] Dismissed

Three files gained the same migration-history note:

- `frontend/common/errors.ts:5-6`
- `frontend/model/contracts/chatroom.ts:39-40`
- `frontend/model/contracts/group.ts:369-370`

```ts
// These two used to carry a `typeof Error` annotation. TypeScript infers the
// constructor type from `ChelErrorGenerator`, so it is no longer needed.
```

Once Flow is gone this text is meaningless, and the inferred type is self-evident. Suggest deleting all three (same contract-hash caveat as item 1 for the two contract files).

## 6. ⚪ `giTyper.ts` lost its provenance note; `@ts-nocheck` headers give the wrong reason

- [ ] Addressed
- [ ] Dismissed

`frontend/model/contracts/misc/giTyper.ts:1-4` replaced the original header ("to make rollup happy, I copied flowTyper-js library into this file…"). Nothing in the file now says it is a vendored copy of the `flowTyper-js` npm package, and the NOTE at `:112-113` is hard to parse without that context.

Both this header and `frontend/controller/service-worker.ts:2-4` also say the file is checked "since other `.ts` files import it". Both are `.ts` files matched by tsconfig's `frontend/**/*.ts` include, so they would be checked regardless of imports. "has never been meant" should also be "was never meant".

```ts
// @ts-nocheck
// Vendored copy of the `flowTyper-js` library (originally inlined to satisfy rollup),
// with GI-specific edits noted below. It was never meant to be typechecked; the
// pragma above keeps tsc from checking it.
```

## 7. ⚪ Cypress rationale in `actions/group.ts` still calls a gone constraint "necessary"

- [ ] Addressed
- [ ] Dismissed

`frontend/controller/actions/group.ts:186-189` was put in past tense but keeps "for a kind of dumb but necessary reason". The reason no longer applies. State it as history:

```ts
// 3 days after group creation by default. (Historically computed here rather than
// imported from time.ts because Cypress couldn't load Flow-annotated helpers.)
```

## 8. ⚪ `sw-primary.ts` has the same wording that was fixed in `push.ts`

- [ ] Addressed
- [ ] Dismissed

`frontend/controller/serviceworkers/sw-primary.ts:42-43` still reads "But lib.dom of Typescript assumes it to be a `Window`" with no punctuation before "So". Apply the `push.ts:12-13` fix:

```ts
// `ServiceWorkerGlobalScope`. But TypeScript's lib.dom assumes it is a `Window`,
// so declaring it as `any` here is to satisfy the type checker.
```

Also `frontend/declarations.d.ts:19`: "(Its built-in `Function`" → "(its built-in `Function`" (mid-sentence parenthetical).

## 9. ⚪ Inline function type duplicates the `Fn` alias

- [ ] Addressed
- [ ] Dismissed

`frontend/controller/actions/utils.ts:13`:

```ts
let finished: (...args: any[]) => any = Boolean
```

`declarations.d.ts:22` defines `Fn` for exactly this shape, and the same file already uses it (`humanError: string | Fn`).

```ts
let finished: Fn = Boolean
```

## 10. ⚪ Redundant double cast in `gi.db/filesCache/load`

- [ ] Addressed
- [ ] Dismissed

`frontend/model/database.ts:260`: `return ((file as any) as Blob)`. `file` comes from `getItem`, typed `Promise<any>` (`localforage.ts:162`), so the `as any` step is a no-op carried over from Flow's `((file: any): Blob)`.

```ts
return file as Blob
```

## 11. ⚪ Stale `.js` names in a Cypress spec and the Style Guide

- [ ] Addressed
- [ ] Dismissed

- `test/cypress/integration/group-chat-markdown.spec.js:549`: "validateURL() in frontend/views/utils/misc.js" → `misc.ts`.
- `docs/src/Style-Guide.md:284`: "JS files are `camelCase.js` (or `camelCase.ts` for TS files)" reads as if `.js` is the norm. `AGENTS.md` already says "Source files | camelCase.ts":

```md
- Source files are `camelCase.ts` (a few legacy files remain `camelCase.js`)
```

## 12. ⚪ `lintCode`'s default `filename = ''` now makes ESLint reject the call

- [ ] Addressed
- [ ] Dismissed

Carried over. `scripts/esbuild-plugins/utils.js:110-111`: ESLint 8's `lintText` throws `'options.filePath' must be a non-empty string or undefined` for `''`. The only caller (`Gruntfile.js:780`) always passes a path, so this is latent.

```js
async lintCode (code, filename) {
  const results = await eslint.lintText(code, { filePath: filename || undefined })
```

## 13. ⚪ Hard-coded line number in `AGENTS.md`

- [ ] Addressed
- [ ] Dismissed

Carried over. `AGENTS.md:338` cites `(Gruntfile.js:458)`; any edit above it silently invalidates the reference.

```md
(the `lintTasks` array in the `build` task in `Gruntfile.js`) — so ESLint and `tsc` are enforced there.
```

## 14. ⚪ Misspelled identifier on a line touched by the diff

- [ ] Addressed
- [ ] Dismissed

`frontend/views/containers/group-settings/roles-and-permissions/permissions-utils.ts:11` (re-typed by this PR) keeps `GROUP_PERIMSSIONS_DISPLAY_NAME`. Only other use is line 21 in the same file; nothing imports it. Pre-existing and optional:

```ts
export const GROUP_PERMISSIONS_DISPLAY_NAME: { [key: string]: string } = {
```
