# Docker

## Developing in Docker

- Install [Docker CE](https://store.docker.com/editions/community/docker-ce-desktop-mac)
Learn more about Docker by reading their [Get Started docs](https://docs.docker.com/get-started/)

If running for the first time, do:

```sh
npm run docker:first-time
```

The above command is the same as:
1. Delete local `node_modules` folder if it exists
2. Run `docker-compose build`
3. Run `docker-compose run groupincome npm install`


From then on you can run:

```sh
npm run docker

# or
docker-compose up
```

By default, this will run the command `grunt dev` within the container and map all the appropriate ports as you can see in the file [docker-compose.ymld](../docker-compose.yml).

Note that the entire project directory is mounted as a volume within the container. This makes it possible to edit files on the host machine, save them, and still features like browser livereload, etc.

### Updating dependencies

**!! Do not update dependencies outside of Docker !!**

Instead, update them from within the container, like so:

```sh
docker-compose run groupincome npm i vue@latest -S
```

## Testing in Docker

Section TBD.

(Feel free to fill out with a pull request.)
