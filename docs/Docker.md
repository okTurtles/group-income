# Docker

## Developing in Docker

If running for the first time, do:

1. Delete local `node_modules` folder if it exists
2. Run `docker-compose build`
3. Run `docker-compose run groupincome npm install`

From then on you can run:

```
docker-compose up
```

By default, this will run the command `grunt dev` within the container and map all the appropriate ports.

Note that the entire project directory is mounted as a volume within the container. This makes it possible to edit files on the host machine, save them, and still features like browser livereload, etc.

### Updating dependencies

**!! Do not update dependencies outside of Docker !!**

Instead, update them from within the container, like so:

```
[host-machine]$ docker-compose run groupincome sh
[container]$ npm i vue@latest -S
```

## Testing in Docker

Section TBD.

(Feel free to fill out with a pull request.)
