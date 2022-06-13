'use strict'

// This file allows us to deduplicate some code between the main app bundle and
// the slim'd down contract bundles.
// Any large shared dependencies between the contracts - that are unlikely to ever
// change - go into this file. For example, we are using Vue between the frontend
// and the contracts (for the Vue.set/Vue.delete functions), and those are unlikely
// to ever change in their behavior. Therefore it's a perfect candidate to go in
// this file, resulting a smaller overall bundle for the contract slim builds.
// All other in-project code that's shared between the contracts should be
// placed under 'frontend/model/contracts/shared/' and imported directly
// from both the app and the contracts. This will result in some duplicated code being
// loaded by the contracts (even the slim'd versions) and the main app, however,
// it will ensure the safe and consistent operation of contracts, minimizing the
// likelihood that there will ever be a conflict between their state and what the UI
// expects the behavior to be.

// EVERYTHING EXPORTED BY THIS FILE MUST ALWAYS AND ONLY BE IMPORTED
// VIA "/assets/js/common.js"!
// DO NOT CHANGE THE BEHAVIOR OF ANYTHING IMPORTED BY THIS FILE THAT AFFECTS THE
// BEHAVIOR OF CONTRACTS IN ANY MEANINGFUL WAY!
// Doing otherwise defeats the purpose of this file and could lead to bugs and conflicts!
// You may *add* behavior, but never modify or remove it.

export { default as Vue } from 'vue'
export { default as L } from './translations.js'
export * from './translations.js'
export * from './errors.js'
export * as Errors from './errors.js'
