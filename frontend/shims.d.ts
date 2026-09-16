// Module shims for the file types esbuild loads through a plugin. Without them
// TypeScript reports TS2307 on every `.vue`, `.svg` and `.scss` specifier,
// because it has no loader for those extensions and no way to learn one.
//
// Kept deliberately loose. An SFC's script block is not typechecked, so a
// `.vue` module carries no type information to expose — `any` is the honest
// description, not a shortcut.
//
// Separate file from `declarations.d.ts` because the two have different
// lifetimes. That one holds ambient globals; this one is permanent for as long
// as the build has non-JS imports.

// Of the 478 static `.vue` imports in the app, this declaration is reached by
// the 5 that sit in `.ts` files — `controller/router.ts`,
// `utils/lazyLoadedView.ts`,
// `components/confetti-animation/confettiComponents/index.ts`,
// `components/modal/ModalMixins.ts` and
// `containers/chatroom/chat-mentions/RenderMessageWithMarkdown.ts`. The rest
// are `.vue`-to-`.vue`, which `tsc` never looks at.

declare module '*.vue' {
  const component: any
  export default component
}

// Turned into an inline Vue component by
// `scripts/esbuild-plugins/vue-inline-svg-plugin.js`, hence the same `any`
// shape as `.vue`. Currently imported only from `.vue` files, so no `.ts` file
// reaches it yet — declared anyway so the first one that does needs no edit.
declare module '*.svg' {
  const component: any
  export default component
}

// Only `AppStyles.vue` imports SCSS from a script block rather than a style
// block, and it is the sole reason this declaration exists. A wildcard costs
// nothing and does not need revisiting if a second one appears.
declare module '*.scss' {
  const styles: any
  export default styles
}
