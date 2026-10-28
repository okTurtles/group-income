# Emoji sprite sheet

`twitter-64.png` is the sprite sheet used by the emoji picker (`emoji-mart-vue-fast`). We serve it ourselves so
the app never requests it from a CDN (#2334).

## Source

`img/twitter/sheets-256/64.png` from [`emoji-datasource-twitter@15.0.1`](https://github.com/iamcal/emoji-data).
That version must match the emoji data bundled with `emoji-mart-vue-fast` (see the sheet URLs in its
`css/emoji-mart.css`), because the picker locates each emoji on the sheet by the position given in that data.

The downloaded sheet fills the 31 cells Twemoji has no artwork for (those with `has_img_twitter: false` in
`emoji-datasource-twitter`'s `emoji.json`) with Apple's images, which aren't openly licensed. Those cells have been
made transparent. The picker never shows them, since `data/twitter.json` leaves those emojis out.

When upgrading `emoji-mart-vue-fast` to a version with newer emoji data, replace this sheet with the matching
version and clear those cells again.

## License

The emoji graphics are [Twemoji](https://github.com/jdecked/twemoji), Copyright 2019 Twitter, Inc and other
contributors, licensed under [CC-BY 4.0](https://creativecommons.org/licenses/by/4.0/).
