/* eslint-disable no-use-before-define */

export type NewProposalType =
  | 'ADD_MEMBER'
  | 'CHANGE_MINCOME'
  | 'CHANGE_VOTING_RULE'
  | 'REMOVE_MEMBER'
  | 'GENERIC';

export type Notification = {
  // Indicates which user avatar icon to display alongside the notification.
  +avatarUsername: string;
  +body: string;
  // If present, indicates in which group's notification list to display the notification.
  +groupID?: string;
  +icon: string;
  +level: NotificationLevel;
  +linkTo: string;
  read: boolean;
  // When the corresponding event happened.
  +timestamp: number;
  +type: string;
  // Other properties might be defined according to the notification's type.
  ...
}

export type NotificationData = {
  [key: string]: boolean | number | string;
  createdDate?: string;
}

export type NotificationLevel = 'danger' | 'info';

export type NotificationScope = 'group' | 'user' | 'app';

export type NotificationTemplate = {
  +avatarUsername?: string;
  +body: string;
  +icon: string;
  +level: NotificationLevel;
  +linkTo?: string;
  +sbpInvocation?: Array<string | Object>;
  +scope: NotificationScope;
  +creator?: string;
  +subtype?: string;
}
