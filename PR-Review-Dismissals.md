item 1:
- `no-new` only fires when the statement's expression is the NewExpression. Line 226 is `new Vue({ … }).$mount('#app')` That statement is a CallExpression on a member of the new, so the rule never applies. `master` already had `.$mount('#app')` on line 228, so the directive was already dead before this PR — it wasn't suppressing anything.

item 2:
-  `plugin:vue/essential` is still Vue 2 in v9's eslintrc config map; the rename only applies to flat configs(In v9's eslintrc config map, essential  still aliases `vue2-essential`. Confirmed from `lib/index.js:13` file of the plugin via `Opus 5`). this repo is eslintrc, not flat: config lives in `package.json eslintConfig`, no `eslint.config.*` exists, `ESLint` is 8.57.

item 4:
- According to Greg's confirmation re re-pinning the contracts.

item 10:
- There is an ongoing PR that is related to the 'roles and permissions'. The fix should be made there instead of here.

