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
  // HACK: need to use variable (ERROR: assigned and never used)
  console.log('Unread message', notification)

  sbp('okTurtles.events/emit', `${MESSAGE_RECEIVE}`, {})
}
