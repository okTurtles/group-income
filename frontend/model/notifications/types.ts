/* eslint-disable no-use-before-define */

export type NewProposalType =
  | 'ADD_MEMBER'
  | 'CHANGE_MINCOME'
  | 'CHANGE_DISTRIBUTION_DATE'
  | 'CHANGE_VOTING_RULE'
  | 'REMOVE_MEMBER'
  | 'GENERIC';

export type Notification = {
  readonly hash: string;
  // Native notification title
  readonly title: string;
  // Indicates which user avatar icon to display alongside the notification.
  readonly avatarUserID: string;
  readonly body: string;
  // Body without markup to use in native notifications
  readonly plaintextBody: string;
  // If present, indicates in which group's notification list to display the notification.
  readonly groupID?: string;
  readonly icon: string;
  readonly level: NotificationLevel;
  readonly linkTo?: string;
  read: boolean;
  // When the corresponding event happened.
  readonly timestamp: number;
  readonly type: string;
  // Other properties might be defined according to the notification's type.
}

export type NotificationData = {
  [key: string]: boolean | number | string;
  createdDate?: string;
}

export type NotificationLevel = 'danger' | 'info';

export type NotificationScope = 'group' | 'user' | 'app';

export type NotificationTemplate = {
  readonly avatarUserID?: string;
  readonly body: string;
  readonly icon: string;
  readonly level: NotificationLevel;
  readonly linkTo?: string;
  readonly sbpInvocation?: Array<string | any>;
  readonly scope: NotificationScope;
  readonly creator?: string;
  readonly subtype?: string;
}
