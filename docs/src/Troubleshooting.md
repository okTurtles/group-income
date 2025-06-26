# Troubleshooting

## Miscellaneous

Make sure:

- You have at least Node version 16 installed
- You have [followed the setup instructions](README.md#getting-started)

Try:

- `npm cache clean` - This fixed a real problem someone was having
- `npm install npm@latest -g`

## Can not sign-up user when databases get out of sync

*NOTE: this should no longer be an issue, but we're leaving this here just in case.*

This can happen when you re-run `grunt dev` and then can no longer sign up a user because the database on the backend has been wiped, but the database in the browser still contains contracts that the frontend will try to re-subscribe to (although they no longer exist on the backend).

Until [Issue #495](https://github.com/okTurtles/group-income/issues/495) is closed, the workaround is to do one of the following:

- Create a new private window/tab (it will contain a fresh `IndexedDB` instance)
- Bring up the browser's dev tools, go into "Storage", and manually clear/delete all the Group Income related entries in the "Indexed DB" / "Indexed Database" section
