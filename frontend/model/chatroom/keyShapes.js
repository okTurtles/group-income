'use strict'

import { SPMessage } from '@chelonia/lib/SPMessage'

// The permissions and actions that keys of private group chatrooms are given
// when they're added (see 'gi.actions/chatroom/create', 'gi.actions/chatroom/join'
// and 'gi.actions/chatroom/upgradeGroupCskPermissions'). The checks of these
// keys (see `classifyChatRoomKeys`) accept these, and the fewer ones of older
// versions, so giving a key more powers here can't make it look like a key
// that no legitimate operation adds.

// The group's CSK, as added to its chatrooms (`group-csk`)
export const GROUP_CSK_PERMISSIONS: string[] = [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_DEL, SPMessage.OP_ACTION_ENCRYPTED, SPMessage.OP_KEY_REQUEST]
export const GROUP_CSK_ALLOWED_ACTIONS: string[] = ['gi.contracts/chatroom/leave']
// The group's CEK, as added to its chatrooms (`group-cek`)
export const GROUP_CEK_PERMISSIONS: string[] = [SPMessage.OP_ATOMIC, SPMessage.OP_KEY_ADD, SPMessage.OP_KEY_DEL, SPMessage.OP_ACTION_ENCRYPTED]
export const GROUP_CEK_ALLOWED_ACTIONS: string[] = ['gi.contracts/chatroom/join', 'gi.contracts/chatroom/leave']
// The key that members add when joining: their identity CSK, for inner
// signatures only (older versions gave it no permissions at all)
export const MEMBER_KEY_PERMISSIONS: string[] = [SPMessage.OP_ACTION_ENCRYPTED + '#inner']
