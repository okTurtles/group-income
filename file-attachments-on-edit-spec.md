# Spec: File attachments in message edit mode (#3115)

Issue: https://github.com/okTurtles/group-income/issues/3115 — *Allow file attachments on message edits*

> **Problem (from the issue):** The UI let users attach files while editing a message, but those files were never
> added to the edited message, and the user got no error or warning.
>
> **Requested solution:** Attach the files to the message even when they are added during an edit. If they can't be
> attached for any reason, tell the user clearly.

The work is split into two steps that can ship as separate commits (or PRs):

1. **Step 1 (UI only):** When a message with attachments enters edit mode, show its attachments in the send-area
   gallery (`SendAreaAttachmentsGallery.vue`) inside the edit box, not as the `ChatAttachmentPreview` download cards
   under it.
2. **Step 2 (UI + contract):** Let the user add and remove attachments in edit mode, the same way the default
   `SendArea.vue` allows, and save those changes to the message.

---

## 1. Current state (what the code does today)

### 1.1 Rendering in `MessageBase.vue`

```pug
send-area.c-edit-send-area(
  v-if='isEditing && text'            // ← only when the message has text
  :defaultText='swapMentionIDForDisplayname(text)'
  :isEditing='true'
  :isSavingEdit='isSavingEdit'
  @send='onMessageEdited'
  @cancelEdit='cancelEdit'
)
...
.c-attachments-wrapper(v-else-if='showAttachments')   // ← still rendered while editing
  chat-attachment-preview(
    :attachmentList='attachments'
    :isForDownload='true'
    ...
  )
```

- The download-style `ChatAttachmentPreview` (`isForDownload: true`) stays mounted under the edit box while editing.
  This is a bug: the attachments end up shown twice once they also appear in the edit-box gallery. Step 1 hides the
  download cards in edit mode (see 2.2, `MessageBase.vue`).
- `SendArea` gets only `defaultText`. It never sees the message's attachments.
- **Related bug:** `MessageActions.isEditable` is `isMsgSender && isText`, so **Edit** is offered for
  attachment-only messages (where `text` is `''`). But `v-if='isEditing && text'` is false for them, so clicking
  Edit renders no edit box at all. The message just loses its reactions/actions bar until the user clicks elsewhere.
- `onMessageEdited(newMessage)` compares only text. If the text is unchanged it just closes edit mode.

### 1.2 How `SendArea.vue` handles attachments

- State: `ephemeral.attachments` = `[{ url, name, mimeType, size, downloadData: null, isVoiceRecording, dimension?, needsImageCompression? }]`.
  `url` is always a local `URL.createObjectURL(...)`.
- They're rendered with `chat-attachment-preview(:attachmentList='ephemeral.attachments' @remove='removeAttachment')`.
  This uses the **non-download** branch of `ChatAttachmentPreview`, which renders
  `send-area-attachments-gallery` > (`.c-attachment-preview` for non-media | `media-preview-in-text-area` for media).
  So "show as `SendAreaAttachmentsGallery`" means "render through `ChatAttachmentPreview` without `isForDownload`".
- That branch keys entries by `entry.url` and emits `remove` with `entry.url`. `MediaPreviewInTextArea` reads
  `attachment.url` for the image `src`, the video thumbnail, and the `AudioPlayerCard` `src`.
- In edit mode, the edit toolbar (`.addons-editing`) has only reaction and markdown buttons. There is **no attach
  button**, no voice recorder, and `handlePaste` skips files when `isEditing` (added in #3172: *"Edited messages
  can't gain attachments, so files pasted into the edit box are ignored."*). So the path the issue reports was
  partly closed by hiding the entry points. This spec opens it back up properly: step 2 adds the **Attach file**
  button back to the edit toolbar and removes the `!this.isEditing` guard from `handlePaste` (see 3.2). Voice
  recording stays out of edit mode.
- Drafts: `saveOrDeleteMessageDraft()` returns early when `isEditing`, so edit-mode attachments never reach drafts.
  Drafts belong to the main composer only, and edit mode must neither write nor read them. **Loading** isn't guarded,
  though: `initializeTextArea()` loads the draft whenever `defaultText` is empty, without checking `isEditing`. Today
  that never happens, because the edit box only opens for messages with text. Step 1 changes this (see 2.2).
  Keep it that way.
- Drag & drop: `ChatMain.dragEndHandler` always sends dropped files to `this.$refs.sendArea` (the main composer),
  even while a message is being edited.

### 1.3 Save path for edits

- `SendArea.sendMessage()` emits `send(text, attachments | null, replyingMessage)`. `MessageBase` uses only the text.
- `ChatMain.editMessage(message, newMessage)` calls `gi.actions/chatroom/editMessage` with
  `{ hash, createdHeight, text }`. On success it patches `text` in local message lists and closes the edit. On
  failure it shows the toast *"Couldn't save your changes. Please try again."*
- Contract `gi.contracts/chatroom/editMessage` validates with a **strict** `objectOf({ hash, createdHeight, text })`
  (`flowTyper.objectOf` throws on unknown keys). Any attachment data sent today would be **rejected**.
- Existing single-attachment removal: `gi.contracts/chatroom/deleteAttachment` `{ hash, manifestCid, messageSender }`.
  `process` filters `message.attachments` in `state.messages` and `state.pinnedMessages`. `sideEffect` calls
  `deleteEncryptedFiles(manifestCid, { shouldDeleteFile, shouldDeleteToken })`.
- Upload: `gi.actions/identity/uploadFiles({ attachments, billableContractID })` turns `{ url | compressedBlob, ... }`
  into `{ name, mimeType, size, dimension?, downloadData }` and stores delete tokens in the identity contract.
  `ChatMain.checkAndCompressImages` runs before it when `needsImageCompression` is set.

---

## 2. Step 1: Show existing attachments in the edit box

### 2.1 Goal

While a message is in edit mode:

- Its attachments are **not** shown as download cards below the edit box.
- They **are** shown inside the edit box, in the same horizontal gallery the composer uses (`SendAreaAttachmentsGallery`
  via `ChatAttachmentPreview` without `isForDownload`), between the textarea and the edit toolbar.
- When editing ends (Cancel, Save, or Escape), the message shows its normal download cards again.
- Attachment-only messages can be edited too. Edit opens an edit box with an empty textarea and the attachment gallery.

Step 1 is **display only**. Nothing about the message's attachments can change yet: no remove buttons and no attach
button (see 2.3).

### 2.2 Changes

**`MessageBase.vue`**
- Render the edit send-area when `isEditing && (text || hasAttachments)`.
  - `defaultText` must handle `text` being `''` or undefined (`swapMentionIDForDisplayname(text || '')`).
- Pass the attachments in: `:defaultAttachments='attachments'` (new `SendArea` prop).
- Hide the download preview while editing: `.c-attachments-wrapper(v-else-if='showAttachments && !isEditing')`.
  - Side effect to accept: this unmounts `ChatAttachmentPreview`, and its `beforeDestroy` revokes its media object
    URLs. When editing ends it mounts again and reloads images from `gi.db/filesCache/temporary`. That is cheap
    because the first render already cached them.
  - `determineToEnableTruncationToggle` already returns early while `isEditing`. On exit, the remount fires
    `image-attachments-render-complete`, which runs the check again. Verify this still happens.

**`SendArea.vue`**
- New prop: `defaultAttachments: { type: Array, default: null }`. It is used only when `isEditing`.
- `initializeTextArea()`: decide whether to load a draft by checking `isEditing`, not `defaultText`. In edit mode,
  always use `defaultText` (empty for attachment-only messages) and `defaultAttachments`, and never call
  `loadMessageDraft()`. Otherwise, editing an attachment-only message would pull the main composer's unsent draft
  (text and files) into the edit box.
- New state: `ephemeral.existingAttachments` (or a single list with an `isExisting` flag, see 2.4). In
  `initializeTextArea()` (edit mode only), build entries from `defaultAttachments`:
  ```js
  { id: downloadData.manifestCid, name, mimeType, size, dimension, downloadData, isExisting: true, url: '' }
  ```
  `url` is filled in for images, and for videos and audio that are already cached (see "Media previews for existing
  attachments" below). Every other entry keeps `url: ''`.
- When edit mode opens, resolve `url` asynchronously for existing media:
  - **Images:** load from `gi.db/filesCache/temporary`, falling back to `chelonia/fileDownload` (and saving the
    result to the cache), the same way the message view does. The message view has already shown these images, so in
    practice this is a cache hit with no network request.
  - **Videos and audio:** load from `gi.db/filesCache/temporary` **only**, never from the network. If the user has
    already played or downloaded the file, it's in the cache (`ChatAttachmentPreview.loadMediaObjectURL` saves it
    there). If not, `url` stays `''`. Note that the temporary cache is cleared on every app startup
    (`frontend/main.js`), so "cached" means "played or downloaded during this app session".
  - Don't copy `ChatAttachmentPreview.getAttachmentObjectURL`. Move it into a shared helper (for example
    `file-attachment/attachment-utils.js`: `loadAttachmentObjectURL(attachment, { allowNetwork })`) and import it from
    both places. Images pass `allowNetwork: true`, videos and audio pass `false`.
  - Don't rely on `ChatAttachmentPreview.initMediaObjectURLLists()` to do this. It runs only on mount, so it misses
    entries added later. And in the non-download branch its URLs are never revoked.
  - These URLs are created by SendArea, so SendArea revokes them: in `beforeDestroy` (with the existing object-URL
    cleanup) and when an existing attachment is removed (step 2).
  - If loading fails or there's no cache entry, keep `url: ''` and show the file card (see below).
- Render: the existing `chat-attachment-preview` block in SendArea shows `ephemeral.attachments` (new uploads). In edit
  mode it must show existing + new. Use a computed `previewAttachments` that concatenates them and pass it as
  `:attachmentList`.

**Media previews for existing attachments (decision)**

| Existing attachment type | Shown in the edit gallery as |
|---|---|
| Image | Thumbnail (`media-preview-in-text-area`), same as in the composer |
| Video, already cached | `media-preview-in-text-area`: thumbnail generated from the cached file, same as in the composer |
| Video, not cached | File card (icon + name + extension), no thumbnail |
| Audio, already cached | `media-preview-in-text-area`: minimal audio player, same as in the composer |
| Audio, not cached | File card, no player |
| Other files | File card (unchanged) |

Why uncached videos and audio get no preview: the files are stored encrypted, no thumbnail is saved at upload time,
and `chelonia/fileDownload` only returns the whole file. A video thumbnail would mean downloading the full video (up
to 30 MB, `CHAT_ATTACHMENT_SIZE_LIMIT`) just to open edit mode, and that download can't be cancelled. Cached files
don't have this problem: the data is already on the device, so the preview costs nothing.

Files **newly added** during the edit keep the composer's normal previews for every type (`media-preview-in-text-area`).
They are local object URLs, so previewing them costs nothing.

**`ChatAttachmentPreview.vue` (non-download branch)**
- Show the file card when the type is `NON_MEDIA`, **or** the entry is existing and has no `url` once loading has
  finished (an uncached video/audio, or an image that failed to load). Otherwise use `media-preview-in-text-area` as
  today.
  - This needs a per-entry "still loading" flag (for example `isLoadingPreview`), so that a card doesn't show the file
    card for a moment and then switch to the media preview. While loading, render `media-preview-in-text-area` in
    its loading state. A cache lookup is quick, so this lasts only a moment.
- Key entries by `entry.id || entry.url`, because existing entries may have `url: ''`.
- New per-entry remove control: hide the remove button for existing entries in step 1. Step 2 shows it.
  Either a `canRemove` prop or a check on `entry.isExisting` works. Per entry is better because step 2 needs it.
- Optional: on the file card, use an icon that matches the media type (video/audio) instead of the generic
  `icon-file`, so users can still tell what each file is. Check which icons exist in the icon font.
- Clicking an existing image thumbnail opens `ImageViewerModal`, and clicking a cached video's card opens
  `VideoViewerModal`, the same as for new files. `onMediaPreviewCardClick` / `openMediaViewer` already use `entry.url`.
  File cards (uncached videos and audio) are not clickable.

**`MediaPreviewInTextArea.vue`**
- An existing attachment's `url` arrives shortly after the card mounts. Until then, show a loading state instead of
  an `img` with an empty `src`, an attempt to generate a video thumbnail, or an audio player with no `src`.
- Video: `generateVideoThumbnail()` currently runs once, in `created()`. Run it again when `attachment.url` changes from `''`
  to a value.
- Audio: pass the resolved `url` as the `AudioPlayerCard` `src`, as today. With a `src` set, `AudioPlayerCard` never
  reaches its own `loadAudio()` fallback, so it doesn't trigger a download.

### 2.3 Out of scope for step 1

- Removing or adding attachments (step 2). The edit toolbar keeps its current buttons.
- Any contract change.
- The paste guard in `handlePaste` stays as it is.

### 2.4 Data-shape note (shared with step 2)

Every attachment entry in SendArea gets a stable `id`:
- Existing: `id = downloadData.manifestCid`, `isExisting: true`, `downloadData` set.
- New: `id = url` (the object URL), `isExisting: false`, `downloadData: null`.

`remove` events should carry `id`, not `url`. `removeAttachment(id)` revokes the entry's `url` whenever it has one.
That covers new entries and existing media with a resolved preview, because SendArea created all of those URLs.

### 2.5 Acceptance criteria (step 1)

- [ ] Editing a message with attachments shows them **only** in the gallery inside the edit box. The download cards
      below the message are hidden while editing.
- [ ] Existing images show as thumbnails.
- [ ] A video that was played or downloaded earlier in the session shows a thumbnail. An audio file that was played
      earlier in the session shows the minimal player.
- [ ] Videos and audio that weren't cached show as file cards (icon, name, extension). So do other files.
- [ ] Opening edit mode downloads no videos or audio (check the network tab). Images come from the cache when the
      message view has already shown them.
- [ ] Clicking an existing image thumbnail opens the image viewer. Clicking a cached video's card opens the video
      viewer.
- [ ] No card switches from a file card to a media preview while it loads.
- [ ] If an existing image can't be loaded, its card falls back to the file card. Nothing breaks.
- [ ] No leaked object URLs: open and cancel edit repeatedly, and the number of `blob:` URLs doesn't grow.
- [ ] No remove ("×") buttons on existing attachments in step 1.
- [ ] Gallery scroll buttons work when many attachments overflow.
- [ ] Cancel / Escape / Save restore the normal download cards, with image thumbnails back. Truncation ("Show more") is
      recalculated correctly.
- [ ] Attachment-only message: **Edit** opens an edit box (empty textarea + gallery). Cancel works.
- [ ] With an unsent draft (text + a file) in the main composer, editing an attachment-only message shows **none**
      of the draft in the edit box, and the draft is still intact in the main composer afterwards.
- [ ] Pinned-messages popup and other places that render `MessageBase` aren't affected (edit happens only in the main list).
- [ ] Mobile layout: the gallery fits within the edit box width.

---

## 3. Step 2: Add and remove attachments while editing

### 3.1 Goal

In edit mode, the user can:
- **Remove** existing attachments (× on each gallery item). Removal is **staged**: nothing is deleted until
  **Save changes**, and **Cancel** discards it.
- **Add** new attachments with the attach button and by pasting files, with the same size-limit checks and toast,
  image compression, and sort order as the composer.
- **Save**: the message's text and attachment list update in one contract action. If anything fails, a clear error
  is shown, the edit box stays open, and nothing the user selected is lost (meets the issue's "clearly indicate the
  failure/error" requirement).

### 3.2 UI changes

**`SendArea.vue`**
- Edit toolbar (`.addons.addons-editing`): add the **Attach file** button and hidden `input[type=file]`, the same
  markup as the composer. Use a separate `ref` or keep a single `fileAttachmentInputEl`. Only one of the two
  toolbars renders at a time, so one ref works if both branches use the same name.
- `handlePaste`: remove the `!this.isEditing` guard so pasted files go through `fileAttachmentHandler`.
- `fileAttachmentHandler`: works unchanged for new files. Its `saveOrDeleteMessageDraft()` call already does nothing in
  edit mode. The priority sort should apply to the combined existing + new list shown in the gallery.
- Existing attachments now have a remove button (`canRemove` true). `removeAttachment(id)`:
  - Existing: move it to `ephemeral.removedAttachmentIds` (manifestCids). Don't revoke anything else.
  - New: same as today (revoke URL, splice).
- `isActive` (enables Save): text **or** any remaining attachment (existing − removed + new). Removing every
  attachment from an attachment-only message with no text disables Save. The user would use **Delete message**
  for that.
- `sendMessage()` in edit mode emits a richer payload so `MessageBase` and `ChatMain` can tell what changed:
  ```js
  this.$emit('send', msgToSend, {
    keptAttachments: [...],                     // existing entries still in the gallery (have downloadData)
    newAttachments: cloneDeep(newAttachments),  // not yet uploaded (url, no downloadData), [] if none
    attachmentsChanged: Boolean                 // true if anything was added or removed
  })
  ```
  This is UI-side bookkeeping only. The contract receives a single final `attachments` list (see 3.3). The composer
  (non-edit) emit signature stays the same.
- Voice recording in edit mode: **out of scope** (keep the mic button hidden). See open questions.

**`MessageBase.vue`**
- `onMessageEdited(newText, attachmentChanges)`: emit `message-edited` if the text changed **or**
  `attachmentChanges.attachmentsChanged` is true. Otherwise just close edit mode.
- Forward the second argument through `Message.vue` (`editMessage (newMessage, attachmentChanges)`) → `ChatMain`.
- While saving with uploads, show progress inside the edit box. `isSavingEdit` already disables the fieldset and puts
  the **Save changes** button into loading state. That is enough for v1. Optionally add `upload-animation-feedback`.

**`ChatMain.vue`: `editMessage(message, newText, { keptAttachments = [], newAttachments = [], attachmentsChanged = false } = {})`**
1. Same `savingEdits` guard and `hasChatroomSwitchedSince` capture as today.
2. If `newAttachments.length`: run `checkAndCompressImages` if needed, then
   `gi.actions/identity/uploadFiles({ attachments: newAttachments, billableContractID: contractID })`.
   - On failure: show the toast *"Couldn't upload your attachments. Please try again."* (exact wording TBD, `L()`),
     keep edit mode open and keep the SendArea state (don't revoke the object URLs), and stop.
3. Build the final list just before sending, against the **latest** message state rather than the snapshot taken
   when edit mode opened. This keeps the stale-list window described in 3.5 as small as possible:
   ```js
   const latest = messages[findMessageIdx(message.hash, this.messageState.contract.messages)]
   const stillOnMessage = new Set((latest?.attachments || []).map(a => a.downloadData.manifestCid))
   const attachments = [
     ...keptAttachments.filter(a => stillOnMessage.has(a.downloadData.manifestCid)).map(stripPreviewFields),
     ...uploaded
   ]
   ```
   `stripPreviewFields` drops the UI-only keys (`id`, `url`, `isExisting`) so each entry matches the stored
   attachment shape exactly.
4. Call `gi.actions/chatroom/editMessage` with `{ hash, createdHeight, text }`, plus `attachments` **only when
   `attachmentsChanged`**. A text-only edit then sends exactly the same payload as today.
   - On failure after a successful upload: run `gi.actions/identity/removeFiles` on the just-uploaded manifestCids
     (best effort, log errors) so they aren't left orphaned. Show the existing *"Couldn't save your changes…"* toast and keep edit open.
5. On success: in `updateContractMessage(...)`, patch `attachments` as well as `text` (in `forEachMessageList` copies
   too), close the edit, and revoke the SendArea object URLs of the uploaded attachments (`revokeAttachmentURLs`).
6. Drag & drop while editing: see open questions. Recommended for v1: if `ephemeral.editingHash` is set, send dropped
   files to the editing `SendArea`, not the main composer.

### 3.3 Contract changes (`frontend/model/contracts/chatroom.js`)

Extend `gi.contracts/chatroom/editMessage` with one optional key, `attachments`: the message's **complete final
attachment list**. This keeps it to one action (text and attachments change atomically: one message on the chain,
one notification, no half-applied edit) and mirrors how `addMessage` already takes `attachments`.

**How removed files get deleted.** `sideEffect` runs after `process`, so by then the old list is gone and neither
`data` nor the state says what was removed. Instead, `process` works out the removed manifestCids **before**
overwriting the list and hands them to a side effect with `pushSideEffect`. Chelonia runs pushed calls after the
action's own `sideEffect` (`@chelonia/lib/dist/esm/chelonia.mjs`, `pushSideEffect` and the sideEffect stack).
`gi.contracts/chatroom/delete` already uses this pattern to pass `activeMemberIds` out of `process`.

```js
'gi.contracts/chatroom/editMessage': {
  validate: actionRequireInnerSignature((data, { state }) => {
    objectOf({
      hash: stringMax(MAX_HASH_LEN, 'hash'),
      createdHeight: number,
      text: stringMax(CHATROOM_MAX_MESSAGE_LEN, 'text'),
      attachments: optional(arrayOf(attachmentType)) // shared validator extracted from shared/types.js
    })(data)
    // Validation rules: see 3.4
  }),
  process ({ data, meta, contractID, innerSigningContractID }, { state }) {
    if (!state.messages) return
    const { hash, text, attachments } = data
    let removedCids = null

    const fnEditMessage = (message) => {
      message['text'] = text
      message['updatedDate'] = meta.createdDate
      if (attachments) {
        if (removedCids === null) { // compute once, from whichever copy is found first
          const keep = new Set(attachments.map(a => a.downloadData.manifestCid))
          removedCids = (message.attachments || [])
            .map(a => a.downloadData.manifestCid)
            .filter(cid => !keep.has(cid))
        }
        if (attachments.length) message['attachments'] = attachments
        else delete message['attachments']
      }
      // ...existing 'pending' cleanup
    }

    [state.messages, state.pinnedMessages].forEach(/* same as today */)

    if (removedCids?.length && !state.renderingContext) {
      sbp('gi.contracts/chatroom/pushSideEffect', contractID,
        ['gi.contracts/chatroom/deleteEditedAttachments', removedCids, innerSigningContractID])
    }
  },
  sideEffect (...) { /* existing notification logic, unchanged */ }
}

// in `methods`:
'gi.contracts/chatroom/deleteEditedAttachments': (manifestCids, innerSigningContractID) => {
  const me = sbp('state/vuex/state').loggedIn.identityContractID
  // Mirrors deleteAttachment. Only the sender can edit, so sender === signer.
  const option = { shouldDeleteFile: me === innerSigningContractID, shouldDeleteToken: me === innerSigningContractID }
  deleteEncryptedFiles(manifestCids, option).catch(e => {
    console.error('[gi.contracts/chatroom/deleteEditedAttachments]', e)
  })
}
```

Notes:
- **Version pinning of the pushed call:** `pushSideEffect` rewrites selectors that start with `chatroom/` to the
  pinned manifest's copy, so the call always runs the same contract version as the action.
- **Runs on every client:** a pushed call runs wherever the action is processed, like `sideEffect`. The
  `me === innerSigningContractID` check makes sure only the editor's own client deletes files.
- **`state.renderingContext` guard:** ChatMain runs `process` on a local copy of the state (`renderingContext`) to
  render messages. Don't push a deletion from that path. (Chelonia clears the stack before each `process`, so this is
  belt-and-braces, but it keeps the intent explicit.)
- **`process` stays free of side effects:** it only computes the removed IDs and queues the call. The deletion
  itself happens in the pushed side effect.
- `deleteEncryptedFiles` already accepts an array of CIDs.
- `shared/types.js`: pull the `attachments` item validator out of `messageType` into an exported `attachmentType` so
  `messageType` and `editMessage` share it. Shared functions are bundled into the pinned contract, so this is safe
  (see `docs/src/Calls-From-Contracts.md`).
- The existing `MESSAGE_RECEIVE_RAW` emit passes `data`. Check that its consumers (notifications / mention detection)
  ignore `attachments` and that an attachment-only edit doesn't produce an empty notification.

### 3.4 Validation rules

- The message's final state must not be empty: `text.trim()` is empty **and** the final attachments are empty →
  reject. When `attachments` is omitted, use the message's current attachments for this check.
- No duplicate manifestCids in `attachments`.
- Optional: cap the total attachment count if the composer has a cap (it doesn't today, so match that).

### 3.5 Known limitation: a stale list can restore a deleted attachment

The UI lets the group creator delete attachments on other people's messages (`canDelete = isMsgSender || isGroupCreator`).
Because `attachments` is a full list, this sequence brings back a deleted entry:

1. The sender opens edit mode on a message with `[A, X]`.
2. The group creator deletes X (`deleteAttachment`). X's file is removed from the server.
3. The sender saves. Their list still contains X, so X is written back, pointing at a file that no longer exists.

The same can happen if the sender edits the same message from two sessions.

**Mitigation:** ChatMain builds the final list against the latest message state at save time (3.2, step 3), so the
window shrinks from "the whole time edit mode is open" to "between clicking Save and the action being processed".

**Why it isn't fully fixed in the contract:** `process` can't tell an entry that came back (X) from a newly
uploaded one, because neither is currently on the message. A full fix would mean tracking deleted CIDs per message,
which isn't worth the extra state for this edge case.

**Impact if it happens:** the message shows one broken attachment. Downloading it fails, and the sender or group
creator can delete it normally. No data is lost.

### 3.6 Contract versioning

- Bump `package.json` `version` (currently `2.9.2`), then `NODE_ENV=production grunt pin --all` (or `pin:chatroom` if
  only the chatroom contract changes) to create `contracts/chatroom/<new-version>/`.
- No migration or feature gate is needed. Chelonia stamps each event with the sender's current manifest
  (`config.contracts.manifests[contractName]`), and every client processes an event with **that event's** manifest
  (`${message.manifest()}/${action}/process`), loading it on demand if needed (`@chelonia/lib` `internals.mjs`).
  So an older app build that receives an edit with `attachments` loads the new chatroom contract version and
  processes it normally. Edits sent before the upgrade keep running on the old version, which is correct because
  they don't carry `attachments`.
- The new contract code also runs inside older app builds, so it may only call app-level selectors those builds
  already have (`docs/src/Calls-From-Contracts.md`). This plan uses only `deleteEncryptedFiles` →
  `gi.actions/identity/removeFiles` and `state/vuex/state`, which have both been around for a long time. Keep it
  that way.

### 3.7 Acceptance criteria (step 2)

- [ ] Attach button appears in the edit toolbar. Selecting files adds them to the edit gallery, with the composer's
      size-limit toast and media-first sort.
- [ ] Pasting a file into the edit textarea adds it to the gallery.
- [ ] × on an existing attachment removes it from the gallery only. **Cancel** brings it back and nothing is deleted.
- [ ] **Save** with added and/or removed attachments: the message shows the new set for the sender and for other
      members (second user/session), including in the pinned-messages list if pinned.
- [ ] Removed files are deleted from the server (same behavior as single-attachment delete), by the editor's client only.
- [ ] The final list is built against the latest message state: if another member deleted an attachment while the
      edit was open, saving doesn't bring it back (3.5).
- [ ] Text-only edits send the same payload as before (no new keys).
- [ ] Changing only attachments (text unchanged) still saves. It is no longer treated as "no change".
- [ ] Upload failure (e.g. go offline before Save): an error toast is shown, the edit box stays open with the
      user's text and attachments intact, and Save can be retried.
- [ ] Contract-action failure after upload: error toast, uploaded files cleaned up, edit box stays open.
- [ ] Save is disabled when the result would have no text and no attachments.
- [ ] Large images (> `IMAGE_ATTACHMENT_MAX_SIZE`) added during edit are compressed like in the composer. GIFs are not.
- [ ] Switching chatrooms mid-save doesn't throw, close another message's edit, or show a toast in the wrong room
      (existing `hasChatroomSwitchedSince` guards).
- [ ] No object-URL leaks after save, cancel, or failure.
- [ ] Drafts are neither written nor read in edit mode. Adding or removing files while editing doesn't change the
      main composer's draft.

### 3.8 Tests

**Mocha (unit)**
- Contract `editMessage` validate: accepts the old shape (no `attachments`); accepts a full `attachments` list;
  rejects unknown keys, duplicate manifestCids, and a resulting empty message.
- `process`: add, remove, add+remove, list order kept as sent, `pinnedMessages` mirrored, `attachments` key deleted
  when empty.
- `process` pushes `deleteEditedAttachments` with exactly the removed CIDs, pushes nothing when `attachments` is
  omitted or nothing was removed, and pushes nothing under `state.renderingContext`.

**Cypress** (`test/cypress/integration/group-chat-message.spec.js` or a new `group-chat-edit-attachments.spec.js`)
- Step 1: send a message with an image + a file → Edit → gallery visible in the edit box, download cards gone →
  Cancel → download cards back.
- Step 1: attachment-only message → Edit opens the edit box.
- Step 2: Edit → add a file (`cy.get('[data-test=attachments]').selectFile(...)`) → Save → the second user sees it.
- Step 2: Edit → remove an attachment → Cancel → still present. Edit → remove → Save → gone for both users.
- Add `data-test` hooks as needed (e.g. `data-test='editAttachmentsGallery'`, per-item remove buttons).

---

## 4. Files touched (summary)

| File | Step | Change |
|---|---|---|
| `frontend/views/containers/chatroom/MessageBase.vue` | 1, 2 | edit-box condition, hide download preview while editing, pass `defaultAttachments`, forward attachment changes |
| `frontend/views/containers/chatroom/Message.vue` | 2 | forward 2nd arg of `edit-message` |
| `frontend/views/containers/chatroom/SendArea.vue` | 1, 2 | `defaultAttachments` prop, existing/new/removed state, combined preview list, attach button + paste in edit mode, edit emit payload, URL cleanup |
| `frontend/views/containers/chatroom/file-attachment/ChatAttachmentPreview.vue` | 1, 2 | file card for existing non-image entries, use shared URL loader, key by `id`, per-entry remove control, emit `id` on remove |
| `frontend/views/containers/chatroom/file-attachment/MediaPreviewInTextArea.vue` | 1 | loading state until an existing attachment's `url` arrives; regenerate the video thumbnail when `url` changes |
| `frontend/views/containers/chatroom/file-attachment/attachment-utils.js` (new) | 1 | shared `loadAttachmentObjectURL(attachment, { allowNetwork })` (cache, then download if allowed) |
| `frontend/views/containers/chatroom/ChatMain.vue` | 2 | upload-then-edit flow, error handling and cleanup, patch local attachments, drag-drop routing while editing |
| `frontend/model/contracts/chatroom.js` | 2 | optional `attachments` on `editMessage`; `process` pushes the new `deleteEditedAttachments` method |
| `frontend/model/contracts/shared/types.js` | 2 | export a shared `attachmentType` validator |
| `package.json`, `chelonia.json`, `contracts/chatroom/<ver>/` | 2 | version bump + pin |
| `test/...` | 1, 2 | unit + Cypress as above |

---

## 5. Open questions

1. **Drag & drop while editing:** Send dropped files to the message being edited (recommended), or keep them going
   to the main composer? to the main compser.
2. **Voice messages in edit mode:** Leave out for v1 (recommended)? Removing an existing voice recording should
   still work like any other attachment.
  Let's leave it out for this task.
3. ~~**Uncached video/audio in the edit gallery**~~ **Resolved:** existing images show as thumbnails. Existing
   videos and audio show a media preview if they're already in the session cache, and a file card otherwise. Nothing
   large is downloaded (see 2.2, "Media previews for existing attachments").
4. **Removing the last attachment of an attachment-only message:** Disable Save (as specced), or offer "delete
   message instead", the way `ChatMain.deleteAttachment` does for single-attachment messages today? As specced for now.
5. **Edit history / "(edited)" label:** Should an attachment-only change also set `updatedDate` and show "(edited)"? yes.
   (As specced, yes, because `process` always sets `updatedDate`.)
