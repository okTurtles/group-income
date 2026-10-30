# Emoji sprite sheet

`twitter-64.png` is the emoji picker's (`emoji-mart-vue-fast`) sprite sheet, served by the app itself instead of a CDN. It is `img/twitter/sheets-256/64.png` from [`emoji-datasource-twitter@15.0.1`](https://github.com/iamcal/emoji-data), the version matching the emoji data bundled with `emoji-mart-vue-fast`; the picker locates each emoji on the sheet by the position given in that data.

## Upgrading

When upgrading `emoji-mart-vue-fast`, replace this sheet:

1. Upgrade the package: `npm install emoji-mart-vue-fast@<version>`.
2. Get the matching sheet URL from the package's CSS (`node_modules/emoji-mart-vue-fast/css/emoji-mart.css`).
   The quickest way is to run:

   ```bash
   grep -o 'https://unpkg.com/emoji-datasource-twitter@[^)"'"'"']*64\.png' node_modules/emoji-mart-vue-fast/css/emoji-mart.css
   ```

   It prints a URL like this:

   ```
   https://unpkg.com/emoji-datasource-twitter@<version>/img/twitter/sheets-256/64.png
   ```

   NOTE: The version in this URL doesn't have to match the `emoji-mart-vue-fast` version. That's expected.
3. Download the sheet from that URL and save it over `twitter-64.png`. Keep the file name, because the picker's styles in `@assets/style/components/_emoji-mart.scss` refer to it.
4. Update the version at the top of this file, then run `grunt dev` and check that the emoji picker works.

## License

The emoji graphics are [Twemoji](https://github.com/jdecked/twemoji), Copyright 2019 Twitter, Inc and other
contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
