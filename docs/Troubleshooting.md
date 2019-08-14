# Troubleshooting

## Miscellaneous

Make sure:

- You have at least Node version 8 installed
- You're visiting: http://localhost:8000 and **NOT** http://localhost:3000
- You've [followed the setup instructions](Getting-Started-frontend.md#how-do-i-get-set-up--just-run-the-site)

Try:

- `npm cache clean` - This fixed a real problem someone was having
- `npm install npm@latest -g`

## Can not sign-up user when databases get out of sync

*NOTE: this should no longer be an issue, but we're leaving this here just in case.*

This can happen when you re-run grunt dev and then can no longer sign up a user because the database on the backend has been wiped, but the database in the browser's frontend still contains contracts that the frontend will try to re-subscribe to (that no longer exist on the backend).

Until [Issue #495](https://github.com/okTurtles/group-income-simple/issues/495) is closed, the workaround is to do one of the following:

- Create a new private window/tab (this will contain a fresh `IndexedDB`)
- Bringing up the browser's dev tools, go into "Storage", and manually clear/delete all the Group Income related entries in the "Indexed DB" / "Indexed Database"  
