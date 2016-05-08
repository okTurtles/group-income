# Troubleshooting

## Node version 6 related

Many recent problems I've seen have to do with Node.js 6 incompatibility.

#### sequelize throws: 'Error: Please install sqlite3 package manually'

Per [this comment](https://github.com/mapbox/node-sqlite3/issues/634#issuecomment-215453346), do:

```
npm install nan@^2.3.2
rm -rf node_modules/sqlite3/node_modules/nan/
npm rebuild sqlite3 --build-from-source
```

#### 'Module version mismatch. Expected 48, got 47'

Per [this comment](http://stackoverflow.com/a/26371450), run:

```
npm rebuild bcrypt
```

## Other problems

Make sure:

- You have at least Node version 5 installed
- You've [followed the setup instructions](https://github.com/okTurtles/group-income-simple/blob/master/docs/Getting-Started-frontend.md#how-do-i-get-set-up--just-run-the-site)

Try:

- `npm cache clean` - This fixed a real problem someone was having
- `npm install npm@latest -g`
