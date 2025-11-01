# README

The files in this folder are shared between the contracts and the rest of the frontend code.

Unlike the code in `frontend/common/`, this code does get included in the slim versions of the contracts, so its behavior — even with modifications — will remain consistent across contract versions. However, special care must be paid attention to any modifications to these files, as it could result in unpredictable behavior (with the frontend UI thinking one thing, and the contracts thinking another).

For the most part, it should be safe to modify this code, but please read [**Calls-From-Contracts.md**](../../../../docs/src/Calls-From-Contracts.md) in the docs before doing so.

Additionally, care should also be taken to avoid adding too much code to this folder, because it will result in duplicated code between the frontend UI (e.g. in main.js bundle), and the bundled contracts themselves.
