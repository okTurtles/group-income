import sbp from '@sbp/sbp'
import blockies from '@utils/blockies.js'
import Colors from '@model/colors.js'
import { randomFromArray } from '~/frontend/utils/giLodash.js'
import { imageDataURItoBlob } from '@utils/image.js'

const colorOptions = ['primary', 'warning', 'danger', 'success']
const theme = Colors.light

sbp('sbp/selectors/register', {
  'gi.utils/avatar/create': function () {
    // creates a random avatar image and upload it
    let avatarBase64, avatarBlob

    try {
      const palette = randomFromArray(colorOptions)

      avatarBase64 = blockies.create({
        bgcolor: theme[`${palette}_0`], // darkest
        color: theme[`${palette}_1`], // medium
        spotcolor: theme[`${palette}_2`], // lightest
        size: 6,
        scale: 12
      }).toDataURL('image/png')

      avatarBlob = imageDataURItoBlob(avatarBase64)
    } catch (e) {
      // This may fail in old browsers (e.g. IE, Opera Mini, etc...)
      console.warn("utils/avatar.js Avatar generation process didn't go well.", e)
      return null
    }

    return avatarBlob
  }
})
