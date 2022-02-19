<p align="center">
    <a href="https://groupincome.org"><img width="400px" src="frontend/assets/images/logo-transparent.png" alt="Group Income (Simple Edition)"></a>
    <br />
    <br />
    <a title="Gitter" href="https://gitter.im/okTurtles/group-income"><img src="https://badges.gitter.im/okTurtles/group-income.svg"></a>
    <a title="Build Status" href="https://travis-ci.org/okTurtles/group-income"><img src="https://img.shields.io/travis/okTurtles/group-income/master.svg"></a>
    <a title="Deps" href="https://david-dm.org/okTurtles/group-income/#info=dependencies"><img src="https://david-dm.org/okTurtles/group-income.svg"></a>
    <a title="Dev Deps" href="https://david-dm.org/okTurtles/group-income/#info=devDependencies"><img src="https://david-dm.org/okTurtles/group-income/dev-status.svg"></a>
    <a title="Visual Source" href="https://www.visualsource.net/repo/github.com/okTurtles/group-income"><img src="https://img.shields.io/badge/visual-source-orange"></a>
    <a title="Donate" href="https://okturtles.org/donate/"><img src="https://img.shields.io/badge/donate%20-%3D%E2%9D%A4-blue.svg"></a>
</p>

## About

[Group Income](https://groupincome.org/) is a fair income sharing mechanism that allows groups to provide their members a minimum income.

## Getting Started

1. Install [Node.js](https://nodejs.org)
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
- [:book: Getting Started — Modern frontend concepts & project overview](docs/Getting-Started-frontend.md)
- [:book: Style Guide — Our development guidelines](docs/Style-Guide.md)
- [:book: Information Flow - walkthrough of the logical layer](docs/Information-Flow.md)

#### Bounties

Some issues have [bounties](https://github.com/okTurtles/group-income/issues?q=is%3Aissue+is%3Aopen+label%3ANote%3ABounty) assigned to them.

- Anyone can post a bounty by donating to this project and letting us know which issue you'd like the bounty to be applied to.
- Non-contractors can receive bounties by submitting PRs for them. If we approve and merge the PR, you get the bounty!
- If there's an issue you'd like okTurtles to prioritize by posting a bounty to it, feel free to let us know via [Gitter](https://gitter.im/okTurtles/group-income) or [Slack](https://join.slack.com/t/okturtles/shared_invite/zt-jc5x4uck-0YqMX5vVGZ9koR2b6LCwiw)!

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

Build the app for distribution

```bash
grunt dist
```

Clean up files in `dist/`

```bash
grunt clean
```

Run tests.

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
```

#### Using Docker for extra security

You can run commands in a Docker container by using `npm run docker -- <cmd>` instead.

For example:

```bash
npm run docker -- npm install
npm run docker -- grunt dev
npm run docker -- grunt test --skipbuild
```

For details, see: **[`Docker.md`](docs/Docker.md)**

## Troubleshooting

If you run into any errors [during the setup](docs/Getting-Started-frontend.md#how-do-i-get-set-up--just-run-the-site), try the suggestions in [`Troubleshooting.md`](docs/Troubleshooting.md).

## Donating

[Donations to the okTurtles Foundation](https://okturtles.org/donate/) support the development of Group Income and related projects.

## License

AGPL-3.0. See [`LICENSE`](LICENSE) for license details and [`CONTRIBUTING.md`](CONTRIBUTING.md) for the contribution policy.
