# Group Income (Simple Edition)

[![Gitter](https://img.shields.io/gitter/room/okTurtles/group-income.svg)](https://gitter.im/okTurtles/group-income) [![Build Status](https://img.shields.io/travis/okTurtles/group-income-simple/master.svg)](https://travis-ci.org/okTurtles/group-income-simple)

[Group Income](http://groupincome.org/) is a fair income sharing mechanism that allows groups to provide their members a minimum income.

Its accounting system can be implemented using a simple Excel spreadsheet, or on blockchains like Ethereum (which is [where we're headed](https://github.com/okTurtles/group-income)). This centralized "Simple Edition" of Group Income is our way to rapidly prototype, develop, and research the concept with real groups.

## Installation

```
npm install -g grunt-cli
npm install
```

Although it pains us to give up 4-spaced tabs, we're trying out [`standard`](https://github.com/feross/standard) for the code style to see how it goes. See also: [linting in editors on "save"](https://github.com/feross/standard#text-editor-plugins).

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Designers: Read this!

We've put in _a lot_ of energy into taming the craziness of modern web development (where HTML files are shunned and everything involves running crazy command-line tools before you can see the results of your work).

As such, for you we've created a simple-to-follow guide on how to get started designing for this project:

__[:book: Getting Started](docs/Getting-Started-frontend.md)__

## Development

See [Getting Started](docs/Getting-Started-frontend.md) to get setup. The basic grunt workflow commands are listed below:

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

## Contributing

Make sure to work in a named branch. See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details.

## License

See `LICENSE` file.
