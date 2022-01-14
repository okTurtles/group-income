/* eslint-disable no-use-before-define */

export type NewProposalType =
  | 'ADD_MEMBER'
  | 'CHANGE_MINCOME'
  | 'CHANGE_VOTING_RULE'
  | 'REMOVE_MEMBER';

export type Notification = {
  +body: string;
  // If present, indicates in which group's notification list to display the notification.
  +groupID?: string;
  +icon: string;
  +level: NotificationLevel;
  +linkTo: string;
  read: boolean;
  // When the notification object was created.
  +timestamp: number;
  +type: string;
  // Other properties might be defined according to the notification's type.
  ...
}

export type NotificationData = {
  [key: string]: boolean | number | string;
}

export type NotificationLevel = 'danger' | 'info';

export type NotificationScope = 'group' | 'user';

export type NotificationTemplate = {
  +body: string;
  +icon: string;
  +level: NotificationLevel;
  +linkTo: string;
  +scope: NotificationScope;
  +creator?: string;
  +subtype?: string;
}
