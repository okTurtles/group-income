# Group Income (Simple Edition)

[![Gitter](https://badges.gitter.im/okTurtles/group-income.svg)](https://gitter.im/okTurtles/group-income) [![Build Status](https://img.shields.io/travis/okTurtles/group-income-simple/master.svg)](https://travis-ci.org/okTurtles/group-income-simple) [![Deps](https://david-dm.org/okTurtles/group-income-simple.svg)](https://david-dm.org/okTurtles/group-income-simple/#info=dependencies) [![Dev Deps](https://david-dm.org/okTurtles/group-income-simple/dev-status.svg)](https://david-dm.org/okTurtles/group-income-simple/#info=devDependencies) [![Donate](https://img.shields.io/badge/donate%20-%3D%E2%9D%A4-blue.svg)](https://okturtles.org/donate/)

[Group Income](https://groupincome.org/) is a fair income sharing mechanism that allows groups to provide their members a minimum income.

This semi-centralized "Simple Edition" of Group Income is our way to rapidly prototype, develop, and research the concept with real groups.

## Installation

1. Install [Node.js](https://nodejs.org) (version 8 or greater).
2. Install [Grunt](https://github.com/gruntjs/grunt): `npm install -g grunt-cli`
3. Clone this repo (or a fork of it if you plan on [contributing](#contributing)) and `cd` into it.
4. Install dependencies: `npm install`

Now try out the [dev workflow](#basic-workflow).

---

We use [standard](https://github.com/feross/standard) for the code style and [Github project boards](https://help.github.com/articles/about-project-boards/) for efficient project management.

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Contributing

#### Read first!

- **[:book: CONTRIBUTING.md](CONTRIBUTING.md) (required reading to send a PR!)**
- [:book: Getting Started — Modern frontend concepts & project overview](docs/Getting-Started-frontend.md)

#### Basic workflow

Run all servers + watch files for changes:

```
grunt dev
```

- After running `grunt dev`, visit the website: [http://localhost:8000](http://localhost:8000)

Build the app for distribution:

```
grunt dist
```

Clean up files in `dist/` and the `sqlite.db` file (which will be better handled in the future):

```
grunt clean
```

Run the tests:

```
grunt test # all tests
grunt test:be # only backend (unit-tests)
grunt test:fe # only frontend (end-to-end tests)
```

**We used [Cypress] to create end-to-end tests. All new functionality must have corresponding tests!**

#### Using Docker for extra security

You can run commands in a Docker container by using `npm run docker -- <cmd>` instead.

For example:

```
$ npm run docker -- npm install
$ npm run docker -- grunt dev
```

For details, see: **[`Docker.md`](docs/Docker.md)**

## Troubleshooting

If you run into any errors [during the setup](docs/Getting-Started-frontend.md#how-do-i-get-set-up--just-run-the-site), try the suggestions in [`Troubleshooting.md`](docs/Troubleshooting.md).

## Donating

[Donations to the okTurtles Foundation](https://okturtles.org/donate/) support the development of Group Income and related projects.

## License

AGPLv3. See [`LICENSE`](docs/LICENSE) for license details and [`CONTRIBUTING.md`](CONTRIBUTING.md) for contributing policy.
