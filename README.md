<p align="center"><img width="400px" src="frontend/assets/images/logo-transparent.png" alt="Group Income (Simple Edition)"></p>

&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
[![Gitter](https://badges.gitter.im/okTurtles/group-income.svg)](https://gitter.im/okTurtles/group-income) [![Build Status](https://img.shields.io/travis/okTurtles/group-income-simple/master.svg)](https://travis-ci.org/okTurtles/group-income-simple) [![Deps](https://david-dm.org/okTurtles/group-income-simple.svg)](https://david-dm.org/okTurtles/group-income-simple/#info=dependencies) [![Dev Deps](https://david-dm.org/okTurtles/group-income-simple/dev-status.svg)](https://david-dm.org/okTurtles/group-income-simple/#info=devDependencies) [![Donate](https://img.shields.io/badge/donate%20-%3D%E2%9D%A4-blue.svg)](https://okturtles.org/donate/)

## About

[Group Income](https://groupincome.org/) is a fair income sharing mechanism that allows groups to provide their members a minimum income.

This semi-centralized "Simple Edition" of Group Income is our way to rapidly prototype, develop, and research the concept with real groups.

## Getting Started

1. Install [Node.js](https://nodejs.org) (version 8 or greater).
2. Install [Grunt](https://github.com/gruntjs/grunt): `npm install -g grunt-cli`
3. Clone this repo (or a fork of it if you plan on [contributing](#contributing)) and `cd` into it.
4. Install dependencies: `npm install`
5. Now try out the [dev workflow](#basic-workflow).
- 👩‍🎨 Check out how Group Income will feel like by taking a look at the [design files on Figma](https://www.figma.com/file/mxGadAHfkWH6qApebQvcdN/Group-Income-2.0?node-id=1204%3A0)

## Contributing

We use [standard](https://github.com/feross/standard) for the code style and [Github project boards](https://help.github.com/articles/about-project-boards/) for efficient project management.

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

We are continually improving the user experience for everyone, and applying the relevant accessibility standards. We will be conformant with [WCAG 2.0](https://www.w3.org/WAI/standards-guidelines/wcag/) Level AA and trying or best to reach Level AAA in some areas of the application.

<a href="https://www.w3.org/WAI/WCAG2AA-Conformance"
  title="Explanation of WCAG 2.0 Level Double-A Conformance">
  <img height="32" width="88"
    src="https://www.w3.org/WAI/wcag2AA"
    alt="Level Double-A conformance, W3C WAI Web Content Accessibility Guidelines 2.0">
</a>


#### Read first

- __[:book: CONTRIBUTING.md](CONTRIBUTING.md) (required reading to send a PR!)__
- [:book: Getting Started — Modern frontend concepts & project overview](docs/Getting-Started-frontend.md)
- [:book: Information Flow - walkthrough of the logical layer](docs/Information-Flow.md)
- [:book: Style Guide — Our development guidelines](docs/Style-Guide.md)


#### Basic workflow

Group Income is an application based on [Vue.js](https://vuejs.org/). Here's how you can get started the development:

Run all servers + watch files for changes

```bash
grunt dev
```

- If all went well you should be able to visit [http://localhost:8000](http://localhost:8000)

Build the app for distribution

```bash
grunt dist
```

Clean up files in `dist/`

```bash
grunt clean
```

Running tests

```bash
# all tests
grunt test

# all tests while skipping build step
grunt test --skipbuild

# unit tests only
grunt test:unit

# unit tests while skipping build step
grunt test:unit --skipbuild

# show e2e tests (Cypress) live in a browser
grunt test --browser

# run e2e tests (Cypress) in "open" mode
grunt test --browser=debug

# Developing at the same time as writing E2E tests
grunt dev
# and in other terminal run cypress in "open" mode
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

AGPLv3. See [`LICENSE`](docs/LICENSE) for license details and [`CONTRIBUTING.md`](CONTRIBUTING.md) for contributing policy.
