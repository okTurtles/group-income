<p align="center">
    <a href="https://groupincome.org"><img width="400px" src="frontend/assets/images/logo-transparent.png" alt="Group Income (Simple Edition)"></a>
    <br />
    <br />
    <a title="Slack" href="https://join.slack.com/t/okturtles/shared_invite/zt-10jmpfgxj-tXQ1MKW7t8qqdyY6fB7uyQ"><img src="https://img.shields.io/badge/slack-%23groupincome-green"></a>
    <a title="Visual Source" href="https://www.visualsource.net/repo/github.com/okTurtles/group-income"><img src="https://img.shields.io/badge/visual-source-orange"></a>
    <a title="Ask DeepWiki" href="https://deepwiki.com/okTurtles/group-income"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
    <a title="Donate" href="https://okturtles.org/donate/"><img src="https://img.shields.io/badge/donate%20-%3D%E2%9D%A4-blue.svg"></a>
</p>

## About

[Group Income](https://groupincome.org/) is voluntary, decentralized, end-to-end encrypted [basic income](https://search.brave.com/search?q=basic+income) for you and your friends.

## Getting Started

1. Install [Node.js](https://nodejs.org) (v20 minimum required)
2. Install [Grunt](https://github.com/gruntjs/grunt): `npm install -g grunt-cli`
3. Clone this repo (or a fork of it if you plan on [contributing](#contributing)) and `cd` into it.
4. Install dependencies: `npm install`
5. Run `./node_modules/.bin/chel init`. This generates a `chel.toml` config file in the project root (required).
6. Now try out the [dev workflow](#basic-workflow).

- 👩‍🎨 Check out how Group Income will feel like by taking a look at the [design files on Figma](https://www.figma.com/file/mxGadAHfkWH6qApebQvcdN/Group-Income-2.0?node-id=1204%3A0)

## Contributing

We use [standard](https://github.com/feross/standard) for the code style and [Github project boards](https://help.github.com/articles/about-project-boards/) for efficient project management.

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

We are continually improving the user experience for everyone, and applying the relevant accessibility standards. We will be conformant with [WCAG 2.0](https://www.w3.org/WAI/standards-guidelines/wcag/) Level AA and trying our best to reach Level AAA in some areas of the application.

<a href="https://www.w3.org/WAI/WCAG2AA-Conformance"
  title="Explanation of WCAG 2.0 Level Double-A Conformance">
  <img height="32" width="88"
    src="https://www.w3.org/WAI/wcag2AA"
    alt="Level Double-A conformance, W3C WAI Web Content Accessibility Guidelines 2.0">
</a>


#### Read first

- __[:book: CONTRIBUTING.md](CONTRIBUTING.md) (required reading to send a PR!)__
- [:book: Getting Started — Modern frontend concepts & project overview](docs/src/Getting-Started-frontend.md)
- [:book: Style Guide — Our development guidelines](docs/src/Style-Guide.md)
- [:book: Information Flow - walkthrough of the logical layer](docs/src/Information-Flow.md)

#### Basic workflow

To get started with development, follow the steps in **[Getting Started](#getting-started)** first.

Run all servers + watch files for changes

```bash
grunt dev
```

- If all went well you should be able to visit [http://localhost:3000](http://localhost:3000)

Create a tunnel to share access over the Internet:

Try [ngrok](https://ngrok.com/) (recommended), [zrok](https://github.com/openziti/zrok), [tunnl.gg](https://tunnl.gg/), [localhost.run](https://localhost.run/) or [serveo](https://serveo.net/) instead, e.g.:

```
$ grunt dev
# then, in another terminal:
$ ngrok http http://localhost:8000
# or:
$ ssh -R 80:localhost:8000 nokey@localhost.run
```

Clean up files in `dist/`:

```bash
grunt clean
```

Run tests:

**NOTE: You may need to first install Cypress using `./node_modules/.bin/cypress install`**

```bash
# all tests
grunt test

# all tests while skipping build step
grunt test --skipbuild

# unit tests only (always skips build)
grunt test:unit

# show e2e tests (Cypress) live in a browser
grunt test --browser

# run e2e tests (Cypress) in "open" mode
grunt test --browser=debug

# Developing at the same time as writing E2E tests
grunt dev
# and in another terminal run Cypress in "open" mode
npm run cy:open

# Run a specific Cypress spec against the running 'grunt dev' server:
npx cypress run -c 'baseUrl=http://localhost:8000' --spec "test/cypress/integration/group-chat.spec.js"
```

This project is tested with BrowserStack. <!-- This string is necessary here for BrowserStack's free OSS testing. -->

#### Using Docker for extra security

You can run commands in a Docker container by using `npm run docker -- <cmd>` instead.

For example:

```bash
npm run docker -- npm install
npm run docker -- grunt dev
npm run docker -- grunt test --skipbuild
```

For details, see: **[`Docker.md`](docs/src/Docker.md)**

## Troubleshooting

If you run into any errors [during the setup](docs/src/Getting-Started-frontend.md#how-do-i-get-set-up--just-run-the-site), try the suggestions in [`Troubleshooting.md`](docs/src/Troubleshooting.md).

Try also: [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/okTurtles/group-income)

## Making a release

The app and its contracts share one version number. The `version` field in
`package.json` is the source of truth. `grunt pin` copies it to `appVersion`
in `chelonia.json` and pins the selected contracts to that version. A version
is never passed on the command line.

### 1. Bump the version

```bash
$ npm version --no-git-tag-version 2.9.0
```

This updates `package.json` and `package-lock.json` without committing, so the
version bump can be committed together with the pinned contracts in step 2.

### 2. Pin the contracts

Pinning freezes a built copy of each contract into
`contracts/<contract>/<version>/`. Old versions are kept forever so that
clients running older versions keep working.

First check which contracts changed since the last release:

```bash
$ git diff --name-only v2.8.0 master -- frontend/model/contracts
```

Files under `frontend/model/contracts/shared/` are bundled into every contract
that imports them. A change there means every importing contract changed, even
if the contract's own file did not.

```bash
# Print usage (also shows current vs. target appVersion):
$ grunt pin

# Copy the version to chelonia.json and pin every contract:
$ NODE_ENV=production grunt pin --all

# Copy the version only (app update with no contract changes):
$ NODE_ENV=production grunt pin --none

# Copy the version and pin only the named contract:
$ NODE_ENV=production grunt pin:chatroom
```

Add `--overwrite` to replace an already-pinned version on disk.

Commit the pinned snapshot together with the files from step 1:

```bash
$ git add package.json package-lock.json chelonia.json contracts/
$ git commit -m "v2.9.0"
```

### 3. Tag and build

```bash
$ git tag -u '<email>' v2.9.0  # create the tag before calling grunt deploy
$ ./scripts/dist.sh
```

`dist.sh` reads the version from `package.json`, builds the app twice (debug
and production), and writes `gi-v2.9.0.tgz` archives.

## Donating

[Donations to the okTurtles Foundation](https://okturtles.org/donate/) support the development of Group Income and related projects.

## License

AGPL-3.0. See [`LICENSE`](LICENSE) for license details and [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution policy.
