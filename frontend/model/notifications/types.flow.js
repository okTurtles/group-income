export type Notification = {
  +body: string;
  +icon: string;
  +level: 'danger' | 'info';
  +linkTo: string;
  read: boolean;
  // When the notification object was created.
  +timestamp: number;
  +username: string;
  +type: string;
  // Other properties might be defined according to the notification's type.
  ...
}

export type NotificationData = {
  [key: string]: boolean | number | string;
  +username: string;
}

export type VuexModuleContext = {
  commit: Function;
  dispatch: Function;
  rootGetters: Object;
  rootState: Object;
  state: Object;
}
