import { Dialog } from '@capacitor/dialog'
import sbp from '@sbp/sbp'

export default sbp('sbp/selectors/register', {
  'gi.capacitor/dialog/alert': async (params: { title: string, message: string }) => {
    await Dialog.alert({
      title: params.title,
      message: params.message
    })
  }
})
