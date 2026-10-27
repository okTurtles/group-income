# #2334 Emoji picker: upgrade emoji-mart-vue-fast, self-host the sprite sheet, dark mode

Issue: https://github.com/okTurtles/group-income/issues/2334

## Context

Issue #2334 (Priority:High, Note:Security) lists four picker problems:
1. **External resources.** While someone is using the app, the picker loads its sprite sheets from `unpkg.com/emoji-datasource-*@5.0.1`, set at `frontend/assets/style/components/_emoji-mart.scss:93-106`. The app should never request anything from a host other than GI's own.
2. **No fallback.** The picker shows sprite images, but reactions are stored and shown as native Unicode (`emoticon.native` at `MessageBase.vue:315` and `SendArea.vue:1294`). A reaction can show up as a blank box (tofu) on a device whose font lacks that glyph.
3. **Missing emojis.** We're on `emoji-mart-vue-fast@7.0.7`, which uses emoji-datasource 5.0.1 with 1,735 emojis.
4. **Looks bad in dark mode.** When the app is switched to the dark theme, the picker keeps its light-theme colours (white background, dark text). The PM confirmed this is what the issue item means. The cause: `_emoji-mart.scss` hard-codes its colours as hex values (e.g. `background: #fff`, `color: #222427`, `#464646`, `#f4f4f4`) instead of using the app's theme variables.

The PM wants as few dependencies as possible and no third-party hosts. corrideat suggested upgrading the package (its emoji images are 5.0.1, current is 15.0.1) and pointed out that native glyphs differ across platforms (for example the pistol emoji, U+1F52B).

**Decision:** upgrade `emoji-mart-vue-fast` to `15.0.5`, keep the sprite-image rendering, host the matching `15.0.1` sprite sheet ourselves under our assets, point the CSS at that local path, and make the picker follow the app's theme colours.

## Research findings

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
- `frontend/model/settings/colors.js`: the light and dark colour palettes. `frontend/views/components/AppStyles.vue` writes the active palette into CSS custom properties on `:root` (`--background_0`, `--text_0`, `--general_0`, ...), and `frontend/assets/style/_colors.scss` exposes them as SCSS variables (`$background_0: var(--background_0)`, ...). Styles that use these variables switch theme automatically.
- `Gruntfile.js:282`: the `copy` task that copies `frontend/assets` into `dist/`.

---

## Implementation plan (one commit per step)

Each step is one commit that leaves the app working, so it can be reviewed and tested on its own. The issue items each step resolves are noted in brackets.

| Step | Commit | Resolves |
|---|---|---|
| 1 | Upgrade `emoji-mart-vue-fast` to `15.0.5` | Issue 3 (missing emojis) |
| 2 | Self-host the sprite sheet | Issue 1 (external resources) |
| 3 | Scroll the chat so a reaction on the last message is fully visible | #2601 (the issue's "doesn't scroll down" note) |
| 4 | Follow the app's theme colours (dark mode) | Issue 4 |
| 5 | *(optional)* Hide emojis the device can't draw | Partly issue 2 |

Settle **before step 2**: which emoji set (Twitter or Google, given the image licences) and the sheet size (32px or 64px), plus whether to commit the PNG or gitignore it and download it at build time.

---

### Step 1: Upgrade `emoji-mart-vue-fast` to `15.0.5` [issue 3]

**Goal:** the picker and `:shortcode:` autocomplete run on emoji data 15.0.1 (1,867 emojis). The look stays as close to today's as possible; theme colours are step 4.

1. In `package.json`, change `emoji-mart-vue-fast` from `7.0.7` to `15.0.5` (exact pin). Run `npm install`.
2. In `_emoji-mart.scss`, change the unpkg URLs from `@5.0.1` to `@15.0.1` and update `background-size` to the value in v15's `css/emoji-mart.css`. This is **temporary**: it keeps the images lined up with the new data until step 2 replaces the URLs. A 5.0.1 sheet with 15.0.1 data would show shifted emojis.
3. Make the minimum SCSS fixes so the picker isn't broken under v15's markup. Class names changed between v7 and v15, for example the scroller, `.emoji-mart-category` and the anchors. Drop the dead `.scroller` / virtual-scroller rules.
4. Check the API the app depends on:
   - `EmojiIndex` and `search()`, plus the `emoji.colons` / `.native` / `.id` fields used by `emoji-utils.js` and `SendArea.vue:638-642`
   - the `select` event payload consumed by `MessageBase.vue:315` and `SendArea.vue:1294`
   - `focusSearch()` in `Emoticons.vue:112-118` still finds `.emoji-mart-search input`
5. Update `frontend/declarations.js:45-46` if the import paths change.
6. Fix the picker's size and position, since v15 works out its width differently:
   - `setPosition()` in `Emoticons.vue` hard-codes `emotiWidth`/`emotiHeight` at 353×440, but v15's width comes from `perLine` × `emojiSize`. Derive them, or set `perLine`/`emojiSize` explicitly and match them.
   - Check the phone layout (`width: 100%`).
   - Remove the stray `.emoji-mart` rule at `SendArea.vue:1615` if nothing needs it.
7. Fix `sendEmoticon()` in `test/cypress/integration/group-chat-message.spec.js:163`. It uses `.vue-recycle-scroller__item-*`, which no longer exists. Prefer a `data-test` hook on our wrapper over library class names.

**Files:** `package.json`, `package-lock.json`, `frontend/assets/style/components/_emoji-mart.scss`, `frontend/views/containers/chatroom/Emoticons.vue`, `frontend/views/containers/chatroom/SendArea.vue` (style only), `frontend/declarations.js`, `test/cypress/integration/group-chat-message.spec.js`

**Done when:**
- `npm run lint`, `npm run flow`, `npm run stylelint` pass
- in `grunt dev`, the picker opens from the send area and from "Add reaction", search works, and selecting an emoji inserts it or adds the reaction
- newer emojis appear and their images are right, for example 🫠 and 🪿 from Unicode 14/15
- the popup stays on screen near the top, bottom and right edges of a desktop window, and at phone width it's full width
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

### Step 3: Scroll the chat so a reaction on the last message is fully visible [#2601]

**Problem (#2601):** when there are enough messages to fill the screen and the user reacts to the **last** message, the new reaction row appears partly hidden behind the send area. The chat doesn't scroll down to show it. With only a few messages it's fine, because they all fit on screen.

**Why it happens:**
- `addEmoticon()` (`ChatMain.vue:1446`) only sends `gi.actions/chatroom/makeEmotion`; nothing scrolls afterwards.
- The reaction row makes the last message taller. The `dynamic-scroller` re-measures it (`message.emoticons` is in its `size-dependencies`, `ChatMain.vue:55`), but it keeps the same `scrollTop`, so the extra height grows downwards, below the visible area.

**Goal:** after a reaction is added to the last message, the chat scrolls to the bottom so the whole reaction row is visible above the send area.

1. In `ChatMain.vue`, when the reacted message is the last one in `ephemeral.messages`, scroll to the bottom with the existing `jumpToLatest()` (`ChatMain.vue:1182`) or `updateScroll()` (`ChatMain.vue:1158`).
2. Scroll only **after** the reaction is rendered and the scroller has re-measured the message. Scrolling right after calling `makeEmotion` would happen before the message gets taller. Options, simplest first:
   - wait for `makeEmotion` to resolve, then `$nextTick` and scroll
   - set a "scroll to bottom when the last message's height changes" flag in `addEmoticon()` and act on it when the scroller reports the resize
3. Also handle the case where someone else reacts to the last message while the user is already at the bottom (`ephemeral.scrollableDistance` is about 0). The chat should stay pinned to the bottom. Check this doesn't scroll for users who have scrolled up to read older messages.
4. Leave reactions on older messages alone: no scrolling.

**Files:** `frontend/views/containers/chatroom/ChatMain.vue`

**Done when:**
- in a chatroom with more messages than fit on screen, reacting to the last message (from the hover menu or the "+" button on its reaction row) shows the full reaction row above the send area, as in the issue's expected screenshot
- adding a second, different reaction to the last message also stays fully visible
- reacting to an older message doesn't move the scroll position
- while scrolled up reading older messages, someone else reacting to the last message doesn't pull the view down
- works on desktop and at phone width

---

### Step 4: Follow the app's theme colours [issue 4]

**Goal:** when the app is in the dark theme, the picker uses dark-theme colours instead of staying light. The layout and look don't change otherwise.

1. In `_emoji-mart.scss`, replace the hard-coded hex colours with the theme variables from `@assets/style/_colors.scss` (`$background_0`, `$general_0`/`$general_1`/`$general_2`, `$text_0`/`$text_1`, ...). These are CSS custom properties set from `frontend/model/settings/colors.js`, so the picker then switches with the app's theme with no extra rules. This covers:
   - the picker background and border
   - the search input (background, border, text, placeholder)
   - category labels and the sticky header background (today `#fff` / `rgba(255, 255, 255, 0.95)`)
   - the hover/selected cell (`#f4f4f4`)
   - anchor icons and the selected-anchor bar (`#858585`, `#464646`)
   - the "no results" text and the scrollbar
2. Pick each variable by matching what the colour does in light mode today, so the light theme looks the same as before.
3. Only where no theme variable fits, add a `.is-dark-theme &` override (the class is set on the root at `frontend/main.js:418`), following the existing pattern in `frontend/views/components/menu/MenuContent.vue:95`. For example, the popup's `box-shadow` in `Emoticons.vue` needs a darker shadow like the one used there.
4. Check v15's own `css/emoji-mart.css` for hard-coded colours that our overrides don't cover yet, and override those too.

**Files:** `frontend/assets/style/components/_emoji-mart.scss`, `frontend/views/containers/chatroom/Emoticons.vue` (shadow only)

**Done when:**
- with the app in the dark theme, no part of the picker shows light-theme colours (background, search, headers, hover, anchors, scrollbar)
- the light theme looks the same as before this commit
- switching the theme in settings changes the picker's colours too, even if it's open
- text and icons meet WCAG AA contrast in both themes
- `npm run stylelint` passes

---

### Step 5 (optional): Hide emojis the device can't draw [partly issue 2]

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
- **Issue 2 stays a known limitation** unless step 5 is done, and even then only partly.
- **Licence:** the image licence decides which set we can ship. Settle it before step 2.
- **Payload:** 1.3–4.4MB depending on set and size, downloaded once when the picker first opens. Check how the service worker caches it.
- **Version drift:** a future `emoji-mart-vue-fast` upgrade must also bump the sheet version and its hash.
- **Breaking markup changes:** upgrading across 8 major versions means some class names will break. Step 1 carries most of the SCSS work.
