# AGENTS.md

Guide for AI agents working in the Group Income codebase.

## Project Overview

Group Income is a voluntary, decentralized, end-to-end encrypted basic income application.

**Architecture**: Single-page application (SPA) with:
- **Frontend**: Vue.js 2.6 + Vuex + vue-router
- **Backend**: `chel serve` from `@chelonia/cli` (REST API, WebSocket pub/sub, contract storage)
- **Contract System**: Chelonia framework for event-sourced contract chains
- **Build**: Grunt + esbuild

**Key Paradigm**: SBP (Selector-based programming) - avoid OOP classes for the most part, prefer SBP namespaces for modularity. OOP can be used for encapsulating types (e.g. see `SPMessage` class).

## Backend

The backend is provided by `chel serve` from the `@chelonia/cli` package. It serves the REST API, WebSocket pub/sub, and contract storage. It is launched by the `backend:launch` Grunt task and configured via `chelonia.json`.

In development, `grunt dev` runs `chel serve --dev --manifests-dir dist/contracts`.
In production, `grunt serve` runs `chel serve --app-manifest chelonia.json --manifests-dir contracts dist`.

## Essential Commands

### Development

```bash
npm install     # Install dependencies
grunt dev       # Starts dev server on port 8000 with hot reload on port 3000
```

### Testing
```bash
grunt test                     # All tests (build + unit + Cypress)
grunt test:unit                # Mocha unit tests only
grunt test --browser           # Runs Cypress tests live in browser
grunt test --browser=debug     # Runs Cypress tests in "open" mode
npm run cy:open                # Used with `grunt dev`. Opens Cypress in interactive mode

# Run specific Cypress spec against running dev server:
npx cypress run -c 'baseUrl=http://localhost:8000' --spec "test/cypress/integration/group-chat.spec.js"
```

### Linting & Type Checking
```bash
npm run lint                   # Run ESLint
npm run eslintfix              # Auto-fix ESLint issues
npm run stylelint              # Lint CSS/SCSS
npm run flow                   # Run Flow type checker
```

### Build & Deploy
```bash
grunt build                    # Development build
NODE_ENV=production grunt build  # Production build
NODE_ENV=production grunt deploy # Full production deployment
grunt serve                    # Serve production build
grunt clean                    # Clean dist/ folder
```

### Contract Versioning
```bash
NODE_ENV=production grunt pin:0.1.0  # Pin contracts to versioned folder
```

## Directory Structure

```
./
├── frontend/
│   ├── assets/           # Static assets (images, svgs, style)
│   ├── common/           # Shared utilities and constants
│   ├── controller/       # Action handlers, navigation, app lifecycle
│   │   └── actions/      # SBP action implementations
│   ├── model/            # Vuex state, contracts, SBP domains
│   │   ├── contracts/    # Contract definitions (group.js, chatroom.js, identity.js)
│   │   └── state.js      # Vuex store setup
│   ├── utils/            # Utility functions
│   └── views/            # Vue components, pages, containers
├── contracts/            # Version-pinned contract snapshots (generated)
├── dist/                 # Build output (generated)
├── test/
│   └── cypress/          # E2E tests
└── docs/src/             # Documentation (Style-Guide.md, Information-Flow.md, etc.)
```

## Path Aliases

Configured in Gruntfile.js for imports:

| Alias | Path |
|-------|------|
| `@assets` | `./frontend/assets` |
| `@common` | `./frontend/common` |
| `@components` | `./frontend/views/components` |
| `@containers` | `./frontend/views/containers` |
| `@controller` | `./frontend/controller` |
| `@model` | `./frontend/model` |
| `@pages` | `./frontend/views/pages` |
| `@svgs` | `./frontend/assets/svgs` |
| `@utils` | `./frontend/utils` |
| `@view-utils` | `./frontend/views/utils` |
| `@views` | `./frontend/views` |

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Folders | kebab-case | `group-chat/`, `user-settings/` |
| Vue files | PascalCase.vue | `GroupChat.vue`, `UserProfile.vue` |
| JS files | camelCase.js | `group.js`, `chatroom.js` |
| CSS component classes | Prefix with `c-` | `.c-chat-message`, `.c-button` |
| CSS global classes | Minimal, in `frontend/assets/style` | - |
| SBP selectors | Namespace format | `'group/getCurrentMonthInfo'` |

## Vue Component Rules

### Data Structure (Mandatory)

Components must organize `data()` into **exactly three keys**:

```javascript
data () {
  return {
    form: {        // Form data for vuelidate validation
      inputField: ''
    },
    config: {      // Component configuration (static-ish)
      maxItems: 10
    },
    ephemeral: {   // Temporary UI state
      isDropdownOpen: false
    }
  }
}
```

**Never** add other top-level keys to `data()`.

### Style Guide

- Use Pug templates with `template(lang='pug')`
- Use SCSS with `<style lang="scss" scoped>` for component styles
- One component per file
- Use vuelidate for form validation

## Contract Architecture (Chelonia)

Contracts are event-sourced state machines defined in `frontend/model/contracts/`. They act as an append-only log and are used for both key-management and application logic.

### Contract Structure

```javascript
export default {
  meta: {
    name: 'contractName',
    // ...
  },
  state: {
    // Initial state
  },
  actions: {
    'actionName': {
      validate: (data, { state }) => {
        // Return true/false or throw error
      },
      process: (state, { data }) => {
        // Update state ONLY - no side effects
      },
      sideEffect: (state, { data }) => {
        // Side effects ONLY - no state updates
      }
    }
  }
}
```

### Critical Rules

1. **`process` functions**: Update state only, NEVER side effects
2. **`sideEffect` functions**: Perform side effects only, NEVER state updates
3. **Reference counting**: Use `retain`/`release` for contract subscriptions
4. **Version pinning**: Use `grunt pin:<version>` to create frozen snapshots in `contracts/` folder for backwards compatibility

### Action Handlers

Located in `frontend/controller/actions/` - implement SBP selectors that dispatch contract actions by creating SPMessages and sending them to the server (which rebroadcasts them to all clients interested in that contract).

## SBP Paradigm

SBP (Selector-based programming) is used throughout - avoid OOP classes except for defining encapsulated types (like `SPMessage`).

```javascript
// Register a selector
sbp('okTurtles.data/register', {
  'namespace/functionName': (args) => { /* ... */ }
})

// Call a selector
const result = await sbp('namespace/functionName', arg1, arg2)
```

SBP domains in this codebase:
- `chelonia/` - Contract system
- `group/` - Group-related actions
- `gi.app/` - Mostly user-generated actions on the frontend
- `gi.actions/` - These live in the service worker and are triggered either by `gi.app/` or from within contracts. They are usually for creating `SPMessage`s
- `controller/router/` - Navigation

## Testing

### Cypress E2E Tests

Located in `test/cypress/integration/`.

Custom commands:
- `cy.giSwitchUser(username)` - Switch to different user
- `cy.getByDT('name')` - Get element by data-test attribute
- `cy.giLogin(username, password)` - Login helper

Data-test attributes:
```html
button(data-test='submit-btn') Submit
```

### Mocha Unit Tests

Located in `/test/` or `**/*.test.js`.

Requires `./scripts/mocha-helper.js` - uses `should` library.

```javascript
require('./scripts/mocha-helper.js')
const { expect } = require('chai')

describe('Module', () => {
  it('should work', () => {
    expect(true).to.be.true
  })
})
```

## Internationalization (i18n)

**All user-facing strings must use `L()` or `i18n`**:

```javascript
// In JavaScript
L('Hello {name}', { name: username })

// In Pug templates
i18n Hello {name}(name=username)
```

**Never concatenate strings** - use placeholders:
- ✓ `L('Hello {name}', { name })`
- ✗ `'Hello ' + name`

## Accessibility

Project conforms to **WCAG 2.0 Level AA**.

Key requirements:
- Use semantic HTML
- Provide alt text for images
- Ensure keyboard navigation
- Maintain sufficient color contrast
- Use ARIA attributes where appropriate

## Common Gotchas

### Contract Actions
Must be processed in two parts:
1. `validate` - Check data validity
2. `process` - Update state (synchronously)
3. `sideEffect` - (optional) Async operations, no state changes

### Service Worker

Chelonia runs in a service worker to prevent multiple instances and to handle push notifications in the background.

As contract events come in, it broadcasts state changes to any open tabs or windows.

Similarly, to send `SPMessage` objects, tabs and windows send some actions through the service worker via an SBP RPC interface defined in `frontend/controller/service-worker.js`. The following is an example of some of the SBP domains that are captured and routed through the service worker via RPC when they're called by the frontend (note: it may be outdated):

```
sbp('sbp/selectors/register', {
  'gi.actions/*': swRpc,
  'chelonia/*': swRpc,
  'sw-namespace/*': (...args) => {
    // Remove the `sw-` prefix from the selector
    return swRpc(args[0].slice(3), ...args.slice(1))
  },
  'gi.notifications/*': swRpc,
  'sw/*': swRpc,
  'swLogs/*': swRpc,
  'push/*': swRpc
})
```

### Contract Versioning

When changing contracts:

1. Update contract definition
2. Run `NODE_ENV=production grunt pin:x.x.x`
3. This creates a frozen snapshot in `contracts/x.x.x/`
4. Old versions remain for backwards compatibility

### Environment Variables

- `NODE_ENV=production` - Required for production builds and contract pinning
- `grunt dev` defaults to development mode

## Key Files to Read

- `docs/src/Style-Guide.md` - Comprehensive coding standards
- `docs/src/Information-Flow.md` - Contract/Chelonia deep dive
- `docs/src/LOGIN_FLOW.md` - Explains how the service worker interacts with browser tabs through a unique event-driven system to manage shared and local application states for logging in and logging out
- `docs/src/Calls-From-Contracts.md` - explains the risks of modifying code that is called by Chelonia contracts—such as app actions, events, and shared functions—since contracts are frozen in time through pinning, meaning any externally referenced code (like selectors and event handlers) must maintain backward-compatible behavior forever, while shared functions are safer to modify because they are bundled into the pinned contract at creation time
- `CONTRIBUTING.md` - PR requirements and contribution policy

## CI/CD

- **GitHub Actions**: `.github/workflows/ci.yml` (Node 22)

CI runs:
1. `npm install`
2. `npm run flow`
3. `grunt test:unit`
4. `grunt test:cypress`
