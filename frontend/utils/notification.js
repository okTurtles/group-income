export function checkNotification (): void {
  return !!window.Notification
}

export async function requestNotificationPermission (): Promise<null | string> {
  if (!checkNotification() || Notification.permission !== 'default') {
    return null
  }

  try {
    return await Notification.requestPermission()
  } catch (e) {
    return null
  }
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
}
