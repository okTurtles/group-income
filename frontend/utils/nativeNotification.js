function checkNotification (): boolean {
  return !!window.Notification
}

export async function requestNotificationPermission (force: boolean = false): Promise<null | string> {
  if (!checkNotification() ||
    (!force && Notification.permission !== 'default') ||
    (force && Notification.permission !== 'granted')) {
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
  // eslint-disable-next-line
  new Notification(title, { body, icon })
}
