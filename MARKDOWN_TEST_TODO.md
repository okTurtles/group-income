# Chat Markdown E2E Test TODO

Gaps in `group-chat-markdowns.spec.js` found by reviewing the markdown rendering
pipeline (`frontend/views/utils/markdown-utils.js`, `RenderMessageWithMarkdown.js`,
`RenderMessageText.vue`, `CodeFence.vue`, `chat-mentions-utils.js`).

Currently tested: headings (1-6, simple + with inline markdown), horizontal rule,
bold/italic/inline-code/strikethrough, mention-escaping inside inline code, inline
code inside a link (issue #3116 regression).

## Missing coverage

- [x] **Fenced code blocks** (```` ``` ````) — rendered via the custom `CodeFence.vue`
      component (line numbers + copy button), not plain `<pre><code>` — assert the
      component renders, not just that the code text is correct.
- [x] **Blockquotes** (`>`) — custom regex only treats `>` as a blockquote at
      line-start (otherwise escapes to literal `&gt;`) — cover both cases.
- [x] **Unordered & ordered lists**, including **nested** lists (custom bullet/number
      styling depends on nesting).
- [x] **Large Emoji rendering** — Check `has-only-emojis` class gets added for emoji only messages.
- [x] **Multiple consecutive line breaks** — custom `<br/>`
      reinsertion logic (workaround for a `marked` bug), with cleanup so it doesn't
      double up next to lists/blockquote/hr.
- [ ] **Raw HTML / XSS escaping** — literal `<`/`>` typed by a user should be escaped,
      not interpreted; final output goes through DOMPurify (`v-safe-html`). Worth a
      security-flavored regression test (e.g. sending `<script>` or a stray `<div>`).
