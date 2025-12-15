<p align="center">
    <a href="https://groupincome.org"><img width="400px" src="frontend/assets/images/logo-transparent.png" alt="Group Income (Simple Edition)"></a>
    <br />
    <br />
    <a title="Slack" href="https://join.slack.com/t/okturtles/shared_invite/zt-10jmpfgxj-tXQ1MKW7t8qqdyY6fB7uyQ"><img src="https://img.shields.io/badge/slack-%23groupincome-green"></a>
    <a title="Build Status" href="https://app.travis-ci.com/github/okTurtles/group-income"><img src="https://app.travis-ci.com/okTurtles/group-income.svg?branch=master"></a>
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
5. Now try out the [dev workflow](#basic-workflow).
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

#### Bounties

Some issues have [bounties](https://github.com/okTurtles/group-income/issues?q=is%3Aissue+is%3Aopen+label%3ANote%3ABounty) assigned to them.

- Anyone can post a bounty by donating to this project and letting us know which issue you'd like the bounty to be applied to.
- Non-contractors can receive bounties by submitting PRs for them. If we approve and merge the PR, you get the bounty!
- If there's an issue you'd like okTurtles to prioritize by posting a bounty to it, feel free to let us know via [Slack](https://join.slack.com/t/okturtles/shared_invite/zt-10jmpfgxj-tXQ1MKW7t8qqdyY6fB7uyQ)!

Any open contractor positions are posted to: [Open Positions](https://groupincome.org/positions/)

#### Basic workflow

To get started with development, follow the steps in **[Getting Started](#getting-started)** first.

Run all servers + watch files for changes

```bash
grunt dev
```

- If all went well you should be able to visit [http://localhost:3000](http://localhost:3000)

Create a tunnel to share access over the Internet:

```
grunt dev --tunnel
```

> [!IMPORTANT]
> This service (localtunnel) doesn't seem to work anymore.
> Instead please try [ngrok](https://ngrok.com/) (recommended), [tunnl.gg](https://tunnl.gg/), [localhost.run](https://localhost.run/) or [serveo](https://serveo.net/) instead, e.g.:
> ```
> $ grunt dev
> # then, in another terminal:
> $ ngrok http http://localhost:8000
> # or:
> $ ssh -R 80:localhost:8000 nokey@localhost.run
> ```

Pin a new version of contracts:

```bash
$ NODE_ENV=production grunt pin:0.1.0
```

Build the app for distribution:

```bash
# Update the version in package.json
$ npm install # update package-lock.json
$ git tag -u <email> v1.1.0  # create the tag before calling grunt deploy
$ NODE_ENV=production grunt deploy
$ tar cfz gi-v1.1.0.tgz dist
# Debug build is the same except without NODE_ENV var
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

## Donating

[Donations to the okTurtles Foundation](https://okturtles.org/donate/) support the development of Group Income and related projects.

## License

AGPL-3.0. See [`LICENSE`](LICENSE) for license details and [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution policy.
