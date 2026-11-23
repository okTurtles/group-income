// Module shims for the file types esbuild loads through a plugin. Without them
// TypeScript reports TS2307 on every `.vue`, `.svg` and `.scss` specifier,
// because it has no loader for those extensions and no way to learn one.
//
// Kept deliberately loose. An SFC's script block is not typechecked, so a
// `.vue` module carries no type information to expose — `any` is the honest
// description, not a shortcut.
//
// Kept separate from `declarations.d.ts`, which holds ambient globals; this
// file only declares modules for non-JS imports.

// Only `.vue` imports made from `.ts` files reach this declaration (e.g.
// `controller/router.ts`, `utils/lazyLoadedView.ts`). `.vue`-to-`.vue` imports
// are never looked at by `tsc`.

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
// block, and `tsc` never looks inside `.vue` files, so no `.ts` file reaches
// this declaration yet — declared anyway, like `*.svg`, so the first one that
// does needs no edit.
declare module '*.scss' {
  const styles: unknown
  export default styles
}
