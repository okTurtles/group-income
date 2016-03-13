# Group Income Simple

Lorem ipsum dolor sit amet, consectetur adipisicing elit. Iure provident ut veritatis tempora alias eaque ad blanditiis quae consectetur, id, repellendus nisi optio laboriosam soluta distinctio unde. Tempore, maxime, eos!

## Installation

```
npm install -g grunt-cli
npm install
```

Although it pains us to give up 4-spaced tabs, we're trying out [`standard`](https://github.com/feross/standard) for the code style to see how it goes. See also: [linting in editors on "save"](https://github.com/feross/standard#text-editor-plugins).

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

## Development

Build the app:

```
grunt dist
```

Run all servers + watch files for changes:

```
grunt dev
```

Clean up files in `dist/` and the `sqlite.db` file (which will be better handled in the future):

```
grunt clean
```

Run the tests:

```
# In on terminal window
grunt dev
# In another terminal window
grunt test
```

In the future you'll be able to just run `grunt test` by itself.
