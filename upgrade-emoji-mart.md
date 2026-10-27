# #2334 Emoji picker: upgrade emoji-mart-vue-fast, self-host the sprite sheet, restyle

Issue: https://github.com/okTurtles/group-income/issues/2334

## Context

Issue #2334 (Priority:High, Note:Security) lists four picker problems:
1. **External resources.** While someone is using the app, the picker loads its sprite sheets from `unpkg.com/emoji-datasource-*@5.0.1`, set at `frontend/assets/style/components/_emoji-mart.scss:93-106`. The app should never request anything from a host other than GI's own.
2. **No fallback.** The picker shows sprite images, but reactions are stored and shown as native Unicode (`emoticon.native` at `MessageBase.vue:315` and `SendArea.vue:1294`). A reaction can show up as a blank box (tofu) on a device whose font lacks that glyph.
3. **Missing emojis.** We're on `emoji-mart-vue-fast@7.0.7`, which uses emoji-datasource 5.0.1 with 1,735 emojis.
4. **Looks bad in dark mode.** `_emoji-mart.scss` has no `.is-dark-theme` rules.

The PM suggested GitLab's picker, wants as few dependencies as possible and no third-party hosts. corrideat suggested upgrading the package (its emoji images are 5.0.1, current is 15.0.1) and pointed out that native glyphs differ across platforms (for example the pistol emoji, U+1F52B).

**Decision:** upgrade `emoji-mart-vue-fast` to `15.0.5`, keep the sprite-image rendering, host the matching `15.0.1` sprite sheet ourselves under our assets, point the CSS at that local path, and restyle the picker, including dark mode.

## Research findings

**Why not GitLab's picker.** It isn't on npm and isn't part of `@gitlab/ui`. It lives inside the gitlab-org/gitlab monorepo (`app/assets/javascripts/emoji/`) and is built from `@gitlab/ui` components, GitLab's server-side `emojis.json` and its `<gl-emoji>` element. Using it would mean writing our own picker modelled on it. That's a possible follow-up if the restyle can't get close enough to the GitLab look, and it could reuse the upgraded package's emoji data.

**`emoji-mart-vue-fast@15.0.5`, the latest release:**
- Peer dependency `vue >2.0.0`, so it works with our Vue 2.6.
- Fewer dependencies: `v7` needs `@babel/polyfill`, `@babel/runtime` and `vue-virtual-scroller`; `v15` only needs `@babel/runtime` and `core-js`.
- Emoji data 15.0.1: `data/apple.json` has 1,867 emojis in 9 categories.
- Its default CSS still loads the sheets from unpkg (`emoji-datasource-*@15.0.1/img/*/sheets-256/64.png`), so the upgrade alone doesn't fix issue 1.
- The DOM changed: v8 made `StaticPicker` the default and v12 removed `VirtualScrollPicker`. The Cypress selector in `group-chat-message.spec.js:163` (`.vue-recycle-scroller__item-*`) will break.

**Sprite sheets (emoji-datasource 15.0.1):**

| Set | 32px sheet | 64px sheet | Image licence |
|---|---|---|---|
| Apple | 1.7MB | 4.4MB | © Apple, not openly licensed |
| Twitter (Twemoji) | 1.3MB | 2.9MB | CC-BY 4.0, needs attribution |
| Google (Noto) | 1.4MB | 3.3MB | Apache 2.0 |

- npm lists the `emoji-datasource-*` packages as MIT, but that covers the packaging, not the artwork. Confirm the image licences in the iamcal/emoji-data README before choosing a set.
- The sheet's version **must match** the emoji data (`15.0.1`). The picker finds each emoji by its `sheet_x`/`sheet_y` position, which comes from the data. A mismatched sheet shows shifted or blank emojis.
- Because the sheet is a CSS background image, the browser only downloads it the first time the picker opens, and after that it's cached.

**Current code that touches emojis:**
- `frontend/views/containers/chatroom/Emoticons.vue`: the global picker popup, opened through the `OPEN_EMOTICON`, `SELECT_EMOTICON` and `CLOSE_EMOTICON` events in `@utils/events.js`.
- `EmoticonsMixins.js`: the open/close helpers that callers mix in.
- `emoji-utils.js`: `emojiIndex` and `searchEmoji()`, which power the `:shortcode:` autocomplete in `SendArea.vue:632-670`.
- `EmojiShortcutItemDisplay.vue`: renders `data.native`.
- `MessageReactions.vue`: renders the reaction as plain text (`{{emoticon}}`).
- `SendArea.vue:1615`: a stray `.emoji-mart` style rule.
- `frontend/declarations.js:45-46`: Flow module declarations.
- `frontend/main.js:418`: puts the `.is-dark-theme` class on the root element.
- `Gruntfile.js:282`: the `copy` task that copies `frontend/assets` into `dist/`.

---

## Implementation plan (one commit per step)

Each step is one commit that leaves the app working, so it can be reviewed and tested on its own. The issue items each step resolves are noted in brackets.

| Step | Commit | Resolves |
|---|---|---|
| 1 | Upgrade `emoji-mart-vue-fast` to `15.0.5` | Issue 3 (missing emojis) |
| 2 | Self-host the sprite sheet | Issue 1 (external resources) |
| 3 | Restyle the picker, fix its layout and scrolling | PM's GitLab-look request, the "doesn't scroll down" note |
| 4 | Dark mode | Issue 4 |
| 5 | Translated picker labels | i18n rule in AGENTS.md (not in the issue) |
| 6 | *(optional)* Hide emojis the device can't draw | Partly issue 2 |

Settle **before step 2**: which emoji set (Twitter or Google, given the image licences) and the sheet size (32px or 64px), plus whether to commit the PNG or gitignore it and download it at build time.

---

### Step 1: Upgrade `emoji-mart-vue-fast` to `15.0.5` [issue 3]

**Goal:** the picker and `:shortcode:` autocomplete run on emoji data 15.0.1 (1,867 emojis). The look stays as close to today's as possible; the restyle is step 3.

1. In `package.json`, change `emoji-mart-vue-fast` from `7.0.7` to `15.0.5` (exact pin). Run `npm install`.
2. In `_emoji-mart.scss`, change the unpkg URLs from `@5.0.1` to `@15.0.1` and update `background-size` to the value in v15's `css/emoji-mart.css`. This is **temporary**: it keeps the images lined up with the new data until step 2 replaces the URLs. A 5.0.1 sheet with 15.0.1 data would show shifted emojis.
3. Make the minimum SCSS fixes so the picker isn't broken under v15's markup. Class names changed between v7 and v15, for example the scroller, `.emoji-mart-category` and the anchors. Drop the dead `.scroller` / virtual-scroller rules.
4. Check the API the app depends on:
   - `EmojiIndex` and `search()`, plus the `emoji.colons` / `.native` / `.id` fields used by `emoji-utils.js` and `SendArea.vue:638-642`
   - the `select` event payload consumed by `MessageBase.vue:315` and `SendArea.vue:1294`
   - `focusSearch()` in `Emoticons.vue:112-118` still finds `.emoji-mart-search input`
5. Update `frontend/declarations.js:45-46` if the import paths change.
6. Fix `sendEmoticon()` in `test/cypress/integration/group-chat-message.spec.js:163`. It uses `.vue-recycle-scroller__item-*`, which no longer exists. Prefer a `data-test` hook on our wrapper over library class names.

**Files:** `package.json`, `package-lock.json`, `frontend/assets/style/components/_emoji-mart.scss`, `frontend/views/containers/chatroom/Emoticons.vue` (only if needed), `frontend/declarations.js`, `test/cypress/integration/group-chat-message.spec.js`

**Done when:**
- `npm run lint`, `npm run flow`, `npm run stylelint` pass
- in `grunt dev`, the picker opens from the send area and from "Add reaction", search works, and selecting an emoji inserts it or adds the reaction
- newer emojis appear and their images are right, for example 🫠 and 🪿 from Unicode 14/15
- `:smi` autocomplete still works
- the Cypress spec passes (ask before running)

---

### Step 2: Self-host the sprite sheet [issue 1]

**Goal:** the app never requests anything from a host other than ours. The CDN is only contacted at build time, or never, if the PNG is committed.

1. **Pick the set and size.**
   - Set the `set` prop on `picker` in `Emoticons.vue` (it defaults to `apple`).
   - Import the matching data file in `emoji-utils.js` (`data/twitter.json` or `data/google.json`). Each set's data lists only the emojis that set has images for.
2. **Add a Grunt task that downloads the sheet.**
   - Fetch `https://unpkg.com/emoji-datasource-<set>@15.0.1/img/<set>/sheets-256/<size>.png` into the assets folder (for example `frontend/assets/images/emoji/<set>-15.0.1-<size>.png`).
   - Check the file's SHA-256 against a hash stored in the Gruntfile, so a changed or tampered file fails the build.
   - Skip the download when the file exists and matches the hash, so repeat and offline builds work.
   - Wire it into `build`/`dev` before `copy` (`Gruntfile.js:282`), or skip the task and commit the PNG, depending on what was decided above.
   - Next to the pinned version, add a comment saying it must match the emoji data version in `emoji-mart-vue-fast`.
3. **Point the CSS at the local sheet.** In `_emoji-mart.scss`, replace the four unpkg `background-image` rules with a single rule for the chosen set that uses the local path.
4. **Attribution.** If Twemoji is chosen, add the CC-BY 4.0 credit where the app lists third-party licences.

**Files:** `Gruntfile.js`, `frontend/assets/images/emoji/` (the sheet), possibly `.gitignore`, `frontend/assets/style/components/_emoji-mart.scss`, `frontend/views/containers/chatroom/Emoticons.vue`, `frontend/views/containers/chatroom/emoji-utils.js`, `frontend/declarations.js`

**Done when:**
- running the Grunt task twice downloads once and then skips; corrupting the file fails the build
- `grep -r unpkg dist/` returns nothing after a build
- in `grunt dev`, the Network tab shows the sheet loading from our host and no request to an outside host
- emojis line up with the right images (no shifted or blank cells)
- `:smi` autocomplete still works with the new data file

---

### Step 3: Restyle the picker, fix its layout and scrolling [PM's GitLab-look request, "doesn't scroll down"]

**Goal:** the picker looks close to GitLab's and behaves well at every size. We can only change styles, not the library's HTML, so aim for close rather than identical.

1. Restyle in `_emoji-mart.scss`:
   - category tabs at the top
   - a rounded search field
   - a 9-column grid with a highlighted cell on hover
   - sticky category headers
   - no preview bar (`:show-preview='false'` is already set)

   Use the `$general_*` / `$text_*` variables from `@assets/style/_variables.scss`.
2. Fix `setPosition()` in `Emoticons.vue`: `emotiWidth`/`emotiHeight` are hard-coded at 353×440, and v15's width is worked out from `perLine` × `emojiSize`. Derive them, or set `perLine`/`emojiSize` explicitly and match them.
3. Check the phone layout (`width: 100%`) and that the picker scrolls to the bottom (the issue notes it "doesn't scroll down"). The linked #2601 is a different problem: a new reaction hidden under the send area in the chat. It belongs to the chat view, not the picker, so it stays out of this plan.
4. Remove the stray `.emoji-mart` rule at `SendArea.vue:1615` if nothing needs it.

**Files:** `frontend/assets/style/components/_emoji-mart.scss`, `frontend/views/containers/chatroom/Emoticons.vue`, `frontend/views/containers/chatroom/SendArea.vue` (style only)

**Done when:**
- side-by-side with the PM's GitLab screenshot, the picker looks close
- the popup stays on screen near the top, bottom and right edges of a desktop window
- at phone width it's full width and every category can be scrolled to
- `npm run stylelint` passes

---

### Step 4: Dark mode [issue 4]

**Goal:** the picker matches the app's dark theme.

1. Add `.is-dark-theme .emoji-mart { ... }` rules (the class is set on the root at `frontend/main.js:418`) for the background, borders, search input, category labels and sticky headers, hover/selected cell, the anchor bar and the scrollbar.
2. Reuse the dark-theme variables that other components use; see `frontend/views/components/menu/MenuContent.vue:95` and `Tooltip.vue:399` for the pattern.

**Files:** `frontend/assets/style/components/_emoji-mart.scss`

**Done when:**
- switching the theme in settings while the picker is open restyles it immediately
- text and icons meet WCAG AA contrast in both themes

---

### Step 5: Translated picker labels [i18n]

**Goal:** no hard-coded English inside the picker.

1. Pass the picker's `:i18n` prop from `Emoticons.vue` with `L()` strings for the search placeholder, "not found" text, category names, "Recent" and skin-tone labels.
2. Add the new strings to the i18n strings file the way the project normally does.

**Files:** `frontend/views/containers/chatroom/Emoticons.vue`, the strings file

**Done when:** switching the app language changes the picker labels.

---

### Step 6 (optional): Hide emojis the device can't draw [partly issue 2]

**Goal:** stop users picking an emoji that will show as a blank box (tofu) in the reaction. The picker uses sheet images but reactions use the device's font, so this can't be fully fixed without rendering reactions as images too, which is out of scope.

1. Filter `emojiIndex` once at startup, either:
   - with a canvas or `document.fonts` test per emoji, cached in memory, or
   - more cheaply, by dropping emojis whose `added_in` Unicode version is newer than the device likely supports
2. Apply the same filter to `searchEmoji()` so the autocomplete matches.

**Files:** `frontend/views/containers/chatroom/emoji-utils.js`, possibly `Emoticons.vue`

**Done when:**
- on an older OS or browser, emojis it can't draw don't appear in the picker or the autocomplete
- opening the picker isn't noticeably slower

---

## Risks
- **Issue 2 stays a known limitation** unless step 6 is done, and even then only partly.
- **Licence:** the image licence decides which set we can ship. Settle it before step 2.
- **Payload:** 1.3–4.4MB depending on set and size, downloaded once when the picker first opens. Check how the service worker caches it.
- **Version drift:** a future `emoji-mart-vue-fast` upgrade must also bump the sheet version and its hash.
- **Breaking markup changes:** upgrading across 8 major versions means some class names will break. Steps 1 and 3 carry most of the SCSS work.
