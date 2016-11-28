# Group Income (Simple Edition)

[![Gitter](https://img.shields.io/gitter/room/okTurtles/group-income.svg)](https://gitter.im/okTurtles/group-income) [![Build Status](https://img.shields.io/travis/okTurtles/group-income-simple/master.svg)](https://travis-ci.org/okTurtles/group-income-simple) [![Deps](https://david-dm.org/okTurtles/group-income-simple.svg)](https://david-dm.org/okTurtles/group-income-simple/#info=dependencies) [![Dev Deps](https://david-dm.org/okTurtles/group-income-simple/dev-status.svg)](https://david-dm.org/okTurtles/group-income-simple/#info=devDependencies)

[Group Income](http://groupincome.org/) is a fair income sharing mechanism that allows groups to provide their members a minimum income.

Its accounting system can be implemented using a simple Excel spreadsheet, or on blockchains like Ethereum (which is [where we're headed](https://github.com/okTurtles/group-income)). This centralized "Simple Edition" of Group Income is our way to rapidly prototype, develop, and research the concept with real groups.

## Installation

This project works best with nodejs version 6 or later.

#### With [Yarn](https://yarnpkg.com/en/docs/install) *(recommended!)*

```
yarn global add grunt-cli
yarn install
```

Also, [for now](https://github.com/yarnpkg/yarn/issues/1088#issuecomment-263170516), please manually run once:

```
yarn config set save-prefix ''
```

See also: **[Migrating from NPM](https://yarnpkg.com/en/docs/migrating-from-npm)**

#### With NPM

```
npm install -g grunt-cli
npm install
```

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
