export type NewProposalType =
  | 'ADD_MEMBER'
  | 'CHANGE_MINCOME'
  | 'CHANGE_VOTING_RULE'
  | 'REMOVE_MEMBER';

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

export type NotificationLevel = 'danger' | 'info';

export type NotificationTemplate = {
  +body: string;
  +icon: string;
  +level: NotificationLevel;
  +linkTo: string;
  +creator?: string;
  +subtype?: string;
}
