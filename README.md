# Group Income (Simple Edition)

[![Gitter](https://img.shields.io/gitter/room/okTurtles/group-income.svg)](https://gitter.im/okTurtles/group-income) [![Build Status](https://img.shields.io/travis/okTurtles/group-income-simple/master.svg)](https://travis-ci.org/okTurtles/group-income-simple) [![Deps](https://david-dm.org/okTurtles/group-income-simple.svg)](https://david-dm.org/okTurtles/group-income-simple/#info=dependencies) [![Dev Deps](https://david-dm.org/okTurtles/group-income-simple/dev-status.svg)](https://david-dm.org/okTurtles/group-income-simple/#info=devDependencies)

[Group Income](http://groupincome.org/) is a fair income sharing mechanism that allows groups to provide their members a minimum income.

Its accounting system can be implemented using a simple Excel spreadsheet, or on blockchains like Ethereum (which is [where we're headed](https://github.com/okTurtles/group-income)). This centralized "Simple Edition" of Group Income is our way to rapidly prototype, develop, and research the concept with real groups.

## Installation

```
npm install -g grunt-cli
npm install
```

This project is works best with Node version 6+.

We use [js-standard](https://github.com/feross/standard) for the code style and [mileposts](https://github.com/taoeffect/mileposts) for efficient project management.

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard) &nbsp; [![mileposts](https://cdn.rawgit.com/taoeffect/mileposts/master/badge/badge.svg)](https://github.com/taoeffect/mileposts)

## Designers: Read this!

We've put in _a lot_ of energy into taming the craziness of modern web development (where HTML files are shunned and everything involves running crazy command-line tools before you can see the results of your work).

As such, for you we've created a simple-to-follow guide on how to get started designing for this project:

__[:book: Getting Started](docs/Getting-Started-frontend.md)__

## Development

See **[Contributing](CONTRIBUTING.md)** and **[Getting Started](docs/Getting-Started-frontend.md)** to get setup. The basic grunt workflow commands are listed below:

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

See [`LICENSE`](docs/LICENSE).
