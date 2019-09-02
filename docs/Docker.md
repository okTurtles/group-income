# Docker

We recommend using Docker if you're concerned (as you probably should be) about `npm` harming your computer while you're developing.

## Developing in Docker

### First time setup

If running for the first time, do:

1. Install [Docker (CE)](https://www.docker.com/community-edition)
2. Delete the `node_modules` folder (i.e. `rm -rf node_modules`) if you previously created it with `npm install`. This folder will be re-created using the container (see next section)

### From then on

From then on simply prefix all commands with `npm run docker -- `.

For example, the first command you should run is `npm install`. Let's run that using the Docker container:

```
npm run docker -- npm install
```

From then on, you can run `grunt dev` like so:

```
npm run docker -- grunt dev
```

Or simply:

```
npm run docker
```

Which defaults to the same thing (`grunt dev`).

Note that the entire project directory is mounted as a volume within the container. This makes it possible to edit files on the host machine, save them, and still features like browser livereload, etc.

### Updating dependencies

**!! Do not update dependencies outside of Docker !!**

Instead, update them from within the container, like so:

```
npm run docker -- npm i vue@latest -S
```
