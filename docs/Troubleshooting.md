# Troubleshooting

Make sure:

- You have at least Node version 6 installed
- You've [followed the setup instructions](Getting-Started-frontend.md#how-do-i-get-set-up--just-run-the-site)

Try:

- `npm cache clean` - This fixed a real problem someone was having
- `npm install npm@latest -g`

## Node version 6 related

Many recent problems here are fixed. You shouldn't run into these, but if you do...

#### 'Module version mismatch. Expected 48, got 47'

Per [this comment](http://stackoverflow.com/a/26371450), run:

```
npm rebuild bcrypt
```
