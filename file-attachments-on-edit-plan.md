# Plan: File attachments in message edit mode (#3115)

> Source of truth for behavior: `file-attachments-on-edit-spec.md` (project root).

## Context

Issue #3115: the edit UI used to let users attach files, but they were silently dropped. #3172 hid the attach
button and ignored pasted files in edit mode instead of fixing it. The contract's `editMessage` rejects any
attachment data (its `objectOf` validator is strict). Also, while editing, the message's attachments stay visible as
download cards under the edit box, and attachment-only messages offer **Edit** but render no edit box.

Outcome: in edit mode, a message's attachments appear in the composer-style gallery inside the edit box (step 1).
The user can add files (button + paste) and remove existing ones, and saving updates text and attachments in one
contract action, with clear errors on failure (step 2).

Decisions already made (spec §5): drag & drop keeps going to the main composer; no voice recording in edit mode;
Save is disabled if the result would be empty; attachment-only changes show "(edited)". Note that spec §3.2 step 6
still recommends routing drops to the edit box. This plan follows the decision instead and leaves drag & drop
unchanged.

## Phase 1: Step 1, display existing attachments in the edit box (one commit)

1. **Shared helper:** new `frontend/views/containers/chatroom/file-attachment/attachment-utils.js`
   - `loadAttachmentObjectURL(attachment, { allowNetwork })`: `gi.db/filesCache/temporary/load`. If that misses and
     `allowNetwork` is set, call `chelonia/fileDownload` (wrapped in `Secret`) and save the result to the cache.
     Returns an object URL, or `''` on a miss or error.
   - Move the logic out of `ChatAttachmentPreview.getAttachmentObjectURL` (`ChatAttachmentPreview.vue:263`) and
     have that method call the helper (`allowNetwork: true`) so behavior there is unchanged.
2. **`MessageBase.vue`**
   - Edit box condition: `isEditing && (text || hasAttachments)`. Use `swapMentionIDForDisplayname(text || '')`.
   - Pass `:defaultAttachments='attachments'` to `send-area`.
   - Download cards: `.c-attachments-wrapper(v-else-if='showAttachments && !isEditing')`.
3. **`SendArea.vue`**
   - Prop `defaultAttachments: { type: Array, default: null }`.
   - `initializeTextArea()` (line ~1093): branch on `isEditing`, not `defaultText`. In edit mode, never call
     `loadMessageDraft()`. Build `ephemeral.existingAttachments` from `defaultAttachments`:
     `{ id: manifestCid, name, mimeType, size, dimension, downloadData, isExisting: true, url: '', isLoadingPreview }`.
   - Resolve preview URLs asynchronously. Images use `allowNetwork: true`. Video and audio use `allowNetwork: false`
     (cache only). Other files don't need one. Ignore results that arrive after destroy (revoke them right away).
   - Computed `previewAttachments = [...existingAttachments, ...ephemeral.attachments]` passed to
     `chat-attachment-preview`. Give new entries `id = url`.
   - Revoke resolved existing-preview URLs in `beforeDestroy`, with the existing object-URL cleanup.
4. **`ChatAttachmentPreview.vue`** (non-download branch, lines 57–87)
   - `:key='entry.id || entry.url'`.
   - File card when `NON_MEDIA`, or `entry.isExisting && !entry.isLoadingPreview && !entry.url`. Otherwise
     `media-preview-in-text-area`.
   - Hide the remove button for `entry.isExisting` (step 1 only). Pass a `canRemove` prop to `MediaPreviewInTextArea`.
   - Clicking a card already opens the viewers through `entry.url` (`onMediaPreviewCardClick`), so no change is needed.
5. **`MediaPreviewInTextArea.vue`**
   - `canRemove` prop (default `true`) that hides `.c-attachment-remove-btn`.
   - Loading state while `!attachment.url`. Don't render `img` with an empty `src` or an `audio-player-card` with no
     `src`.
   - `watch: 'attachment.url'`: when it changes to a value for a video, call `generateVideoThumbnail()` (today it
     runs only in `created()`).

## Phase 2: Step 2, contract support (one commit, together with Phase 3 or just before it)

6. **`frontend/model/contracts/shared/types.js`:** extract the attachment item validator from `messageType` (lines
   67–80) into an exported `attachmentType`, and use it in `messageType`.
7. **New pure module `frontend/model/contracts/shared/attachments.js`** (bundled into the pinned contract, unit-testable):
   - `getRemovedAttachmentCids(oldAttachments, newAttachments)`
   - `hasDuplicateAttachmentCids(attachments)`
8. **`frontend/model/contracts/chatroom.js`, `gi.contracts/chatroom/editMessage`** (line 412):
   - `validate`: switch to the function form (as `deleteMessage` does), with `attachments: optional(arrayOf(attachmentType))`.
     Reject duplicate CIDs. Reject a result that would be empty: `text.trim()` is empty and the final attachments
     (`data.attachments` ?? the current message's attachments) are empty.
   - `process`: when `data.attachments` is present, compute the removed CIDs once (from the first copy found),
     set or delete `message.attachments` in both `state.messages` and `state.pinnedMessages`. If any were removed
     and `!state.renderingContext`, call
     `sbp('gi.contracts/chatroom/pushSideEffect', contractID, ['gi.contracts/chatroom/deleteEditedAttachments', removedCids, innerSigningContractID])`.
     This is the same pattern as `gi.contracts/chatroom/delete` (line 325).
   - `sideEffect`: unchanged.
   - New entry in `methods` (line 743): `'gi.contracts/chatroom/deleteEditedAttachments'` calls the existing
     `deleteEncryptedFiles` (line 55) with `{ shouldDeleteFile: me === signer, shouldDeleteToken: me === signer }`
     and logs errors.

## Phase 3: Step 2, UI for adding and removing (same commit as Phase 2)

9. **`SendArea.vue`**
   - Edit toolbar (`.addons-editing`): add the **Attach file** tooltip, button and hidden `input` with
     `ref='fileAttachmentInputEl'`, copied from the composer toolbar (lines 252–268). Only one toolbar renders at a
     time, so the ref name can be shared.
   - `handlePaste` (line 843): drop the `!this.isEditing` guard.
   - `removeAttachment(id)`: an existing entry is removed from `existingAttachments` (keep it in
     `removedAttachmentIds`) and its preview URL is revoked. A new entry is handled as today.
   - `isActive`: text, or any remaining existing or new attachment.
   - Show the remove button on existing entries (drop the step-1 restriction).
   - `sendMessage()` in edit mode emits
     `('send', text, { keptAttachments, newAttachments, attachmentsChanged })`. The composer emit is unchanged.
   - Edit mode stays draft-free: `saveOrDeleteMessageDraft` already returns early.
10. **`MessageBase.vue`:** `onMessageEdited(newText, changes)` emits `message-edited` when the text changed or
    `changes?.attachmentsChanged`. **`Message.vue`:** forward the second argument.
11. **`ChatMain.vue`, `editMessage(message, newText, changes = {})`** (line 1287). Reuse `checkAndCompressImages`
    (line 1065), `gi.actions/identity/uploadFiles`, `gi.actions/identity/removeFiles`, `revokeAttachmentURLs`
    (line 192), `updateContractMessage` (line 867) and `findMessageIdx`.
    - Upload new files first. On failure: toast (`L('Couldn\'t upload your attachments. Please try again.')`), keep
      edit open, don't revoke anything.
    - Build `attachments` from the latest message state at save time (kept entries still on the message, with the
      UI-only keys `id`, `url`, `isExisting` and `isLoadingPreview` removed, then the uploaded ones). Send
      `attachments` only if `attachmentsChanged`.
    - If the edit action fails after a successful upload: best-effort `removeFiles` on the uploaded CIDs, then the
      existing toast, and edit stays open.
    - On success: patch `attachments` as well as `text` in `updateContractMessage` / `forEachMessageList`, revoke the
      uploaded files' object URLs, and close the edit.

## Phase 4: Tests and versioning

12. **Unit:** `frontend/model/contracts/shared/attachments.test.js` (picked up by the existing `*.test.js` glob in
    `Gruntfile.js:389`). Covers `getRemovedAttachmentCids` (add, remove, add+remove, no change) and duplicate
    detection. There's no harness for contract unit tests today, so the contract logic is kept in these pure
    functions.
13. **Cypress (`test/cypress/integration/group-chat-message.spec.js`):**
    - **Rewrite** `'user1 pastes a file while editing a message, and it is ignored'` (line 676). It asserts the old
      behavior. The pasted file should now appear in the edit gallery, and Cancel should discard it.
    - Add: an image + file message → Edit → gallery shown, download cards gone → Cancel → cards back.
    - Add: attachment-only message → Edit opens the edit box, and a draft in the main composer doesn't leak into it.
    - Add: Edit → `attachFile` (existing `cypress-file-upload` usage, line 413) → Save → visible to user2.
      Edit → remove → Cancel keeps it. Edit → remove → Save removes it for both users.
    - Add `data-test` hooks as needed (edit-gallery remove buttons, edit attach input).
14. **Version and pin:** bump `package.json` (2.9.2 → next), then `NODE_ENV=production grunt pin:chatroom`, which
    updates `chelonia.json` and creates `contracts/chatroom/<ver>/`. Confirm the version number with the user first.

## Verification

Cheap checks after each phase: `npm run lint`, `npm run flow`, and the new unit test on its own:
`node node_modules/mocha/bin/mocha --require ./scripts/mocha-helper.js --exit frontend/model/contracts/shared/attachments.test.js`.

Manual check (`grunt dev`, two users, ask first):
- Run through the spec's §2.5 and §3.7 criteria: gallery vs download cards, cached video/audio previews vs file
  cards, no video/audio requests in the network tab, attach and paste, staged removal plus Cancel, Save visible to
  the other user and in pinned messages.
- Go offline before Save to trigger the upload-failure toast. Check that the draft is untouched.

Longer runs (`grunt test:unit`, Cypress for `group-chat-message.spec.js`, the production pin) are asked for first,
per the "keep verification runs short" preference. `grunt` may leave `chel` running on ports 8000/8888, so check
before re-running.

Nothing is committed without the user asking.
