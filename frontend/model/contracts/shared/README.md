# README

The files in this folder are shared between the contracts and the rest of the frontend code.

Special care must therefore be paid attention to any modifications to these files, as it could result in unpredictable behavior (with the frontend UI thinking one thing, and the contracts thinking another).

**It is best to avoid _modifying_ the behavior of any of the code in this folder to prevent potential conflicts between old contract versions and new versions of the UI code.**

Instead, functionality should be added only, using different names for functions.

Additionally, care should also be taken to avoid adding too much code to this folder, because it will result in duplicated code between the frontend UI (e.g. in main.js bundle), and the bundled contracts themselves.
