import sbp from '~/shared/sbp.js'
import blockies from '@utils/blockies.js'
import Colors from '@model/colors.js'
import { randomFromArray } from '~/frontend/utils/giLodash.js'
import { imageDataURItoBlob, imageUpload } from '@utils/image.js'

const colorOptions = ['primary', 'warning', 'danger', 'success']
const theme = Colors.light

sbp('sbp/selectors/register', {
  'gi.utils/avatar/create': function () {
    // creates a random avatar image as a blob

    const palette = randomFromArray(colorOptions)
    const avatarBase64 = blockies.create({
      bgcolor: theme[`${palette}_0`], // darkest
      color: theme[`${palette}_1`], // medium
      spotcolor: theme[`${palette}_2`], // lightest
      size: 6,
      scale: 12
    }).toDataURL('image/png')
    const avatarBlob = imageDataURItoBlob(avatarBase64)

    return imageUpload(avatarBlob)
  }
})
