// Module shims for the file types esbuild loads through a plugin.
//
// Counterpart of two `.flowconfig` [options] lines:
//
//   module.name_mapper.extension='svg' -> '…/frontend/views/utils/vueComponentStub.js.flow'
//   module.name_mapper.extension='vue' -> '…/frontend/views/utils/vueComponentStub.js.flow'
//
// plus the one-off `declare module '@assets/style/main.scss'` in
// `frontend/declarations.js`. Flow pointed all three at a single stub whose
// entire body is `const x: Object = {}; export default x`; these wildcards say
// the same thing per extension.
//
// Kept deliberately loose. An SFC's script block is not typechecked by this
// migration (Steps 4-8 convert `.js` files only), so a `.vue` module carries no
// type information to expose — `any` is the honest description, not a shortcut.
//
// `vueComponentStub.js.flow` stays until Step 9: Flow still needs it.
//
// Separate file from `declarations.d.ts` because the two have different
// lifetimes. That one shrinks toward empty as Flow's libdef hacks are retired;
// this one is permanent for as long as the build has non-JS imports.

// 538 imports across the app, 9 of them from files that Steps 4-8 convert.
// `utils/lazyLoadedView.ts` is the first of those, converted in Step 4; still
// `.js` are `controller/router.js`, `views/components/**/index.js`,
// `views/components/modal/ModalMixins.js`, and
// `views/containers/chatroom/chat-mentions/RenderMessageWithMarkdown.js`.

declare module '*.vue' {
  const component: any
  export default component
}

// Turned into an inline Vue component by
// `scripts/esbuild-plugins/vue-inline-svg-plugin.js`, hence the same `any`
// shape as `.vue`. Currently imported only from `.vue` files, so no `.ts` file
// reaches it yet — carried over for parity with the `.flowconfig` mapper above.
declare module '*.svg' {
  const component: any
  export default component
}

// Only `AppStyles.vue` imports SCSS from a script block rather than a style
// block, which is why `declarations.js` had to name `@assets/style/main.scss`
// explicitly. A wildcard costs nothing and does not need revisiting if a second
// one appears.
declare module '*.scss' {
  const styles: any
  export default styles
}
