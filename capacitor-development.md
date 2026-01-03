# iOS Development flow
This is about launching 'live-reload' mode for iOS development. We need two separate cmd terminal open for this.
One for running `grunt dev` command, and the other for running `npm run dev:ios` command.
The `npx cap open ios` command executed as part of `npm run dev:ios` will launch Xcode. Select either iOS emulator or a physical iOS device if you have one connected and press the play button. Then the Xcode will install/launch the app on the device.

## 1. `npx cap sync` command
The `npx cap sync` command is the glue between the web code and the native iOS/Android projects. It performs:
- Moving the built web assets to the ios/Android folder
- Installing native plugins

There are times when this command needs to be run:
1. After Installing or Removing a Plugin
2. After Changing `capacitor.config.json` file

## 2. `"server"` entry in `capacitor.config.json` file
It is there to enable [live-reload](https://capacitorjs.com/docs/guides/live-reload) for development in mobile emulators / our physical devices. Once the development is done and the app needs to be built for PROD, this should be removed.
