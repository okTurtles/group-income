import { L } from '@common/common.ts'
import { GROUP_ROLES, GROUP_PERMISSIONS } from '@model/contracts/shared/constants.ts'

export const GROUP_ROLES_DISPLAY_NAME: { [key: string]: string } = {
  [GROUP_ROLES.ADMIN]: L('Admin'),
  [GROUP_ROLES.MODERATOR]: L('Moderator'),
  [GROUP_ROLES.MODERATOR_DELEGATOR]: L('Moderator (Delegator)'),
  [GROUP_ROLES.CUSTOM]: L('Custom')
}

export const GROUP_PERIMSSIONS_DISPLAY_NAME: { [key: string]: string } = {
  [GROUP_PERMISSIONS.VIEW_PERMISSIONS]: L('View permissions'),
  [GROUP_PERMISSIONS.ASSIGN_DELEGATOR]: L('Assign delegator'),
  [GROUP_PERMISSIONS.DELEGATE_PERMISSIONS]: L('Delegate permissions'),
  [GROUP_PERMISSIONS.REMOVE_MEMBER]: L('Remove member'),
  [GROUP_PERMISSIONS.REVOKE_INVITE]: L('Revoke invites'),
  [GROUP_PERMISSIONS.DELETE_CHANNEL]: L('Delete channels')
}

export function getPermissionDisplayName (permissionId: string): string {
  return GROUP_PERIMSSIONS_DISPLAY_NAME[permissionId]
}

export function getRoleDisplayName (roleId: string): string {
  return GROUP_ROLES_DISPLAY_NAME[roleId]
}
