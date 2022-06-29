import sbp from '@sbp/sbp'
import { MESSAGE_RECEIVE } from '@utils/events.js'

export function checkNotification (): void {
  return !!window.Notification
}

export function requestNotificationPermission () {
  if (!checkNotification() || Notification.permission !== 'default') {
    return
  }
  Notification.requestPermission().then(function (permission) {
    console.log(permission)
  })
}

export function makeNotification ({ title, body, icon }: {
  title: string, body: string, icon: string
}): void {
  if (!checkNotification() || Notification.permission !== 'granted') {
    return
  }
  const notification = new Notification(title, { body, icon })
  notification.close()

  sbp('okTurtles.events/emit', `${MESSAGE_RECEIVE}`, {})
}
