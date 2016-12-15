# Group Income (Simple Edition)

[![Gitter](https://img.shields.io/gitter/room/okTurtles/group-income.svg)](https://gitter.im/okTurtles/group-income) [![Build Status](https://img.shields.io/travis/okTurtles/group-income-simple/master.svg)](https://travis-ci.org/okTurtles/group-income-simple) [![Deps](https://david-dm.org/okTurtles/group-income-simple.svg)](https://david-dm.org/okTurtles/group-income-simple/#info=dependencies) [![Dev Deps](https://david-dm.org/okTurtles/group-income-simple/dev-status.svg)](https://david-dm.org/okTurtles/group-income-simple/#info=devDependencies)

[Group Income](https://groupincome.org/) is a fair income sharing mechanism that allows groups to provide their members a minimum income.

This semi-centralized "Simple Edition" of Group Income is our way to rapidly prototype, develop, and research the concept with real groups.

## Installation

1. If you haven't already, install [Node.js](https://nodejs.org) (version 6 or greater).
2. Install [Yarn](https://yarnpkg.com/en/docs/install).
3. Install [`grunt-cli`](https://github.com/gruntjs/grunt-cli) globally (since it's a global tool, you can use either NPM or Yarn).
4. Clone this repo (or a fork of it if you plan on contributing) and `cd` into it.

Finally, run the commands below to [configure yarn](https://github.com/yarnpkg/yarn/issues/1088#issuecomment-263170516) to always install precise versions, and then install the project dependencies:

```
yarn config set save-prefix ''
yarn install
```

Now try out the [dev workflow](#basic-workflow).

---

We use [js-standard](https://github.com/feross/standard) for the code style and [mileposts](https://github.com/taoeffect/mileposts) for efficient project management.

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard) &nbsp; [![mileposts](https://cdn.rawgit.com/taoeffect/mileposts/master/badge/badge.svg)](https://github.com/taoeffect/mileposts)

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
grunt test
```

## Troubleshooting

If you run into any errors [during the setup](docs/Getting-Started-frontend.md#how-do-i-get-set-up--just-run-the-site), try the suggestions in [`Troubleshooting.md`](docs/Troubleshooting.md).

## License

GPLv3. See [`LICENSE`](docs/LICENSE) for license details and [`CONTRIBUTING.md`](CONTRIBUTING.md) for contributing policy.
