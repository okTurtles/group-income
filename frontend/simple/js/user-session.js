import localforage from 'localforage'
import {makeUserSession} from '../../../shared/functions'
import {UserSession} from '../../../shared/types'
let _userSessions = localforage.createInstance({
  name: 'Group Income',
  storeName: 'User Sessions'
})
export default {
  async createSession (userHashKey): UserSession {
    let session = makeUserSession()
    await _userSessions.setItem(userHashKey, session)
    return session
  },
  async getSession (userHashKey: string): UserSession {
    let session = await _userSessions.getItem(userHashKey)
    return session
  },
  async addAvailableGroup (userHashKey: string, group: string): [string] {
    let session = await this.getSession(userHashKey)
    if (!session.availableGroups.find((grp) => grp === group)) {
      session.availableGroups.push(group)
    }
    await this.saveSession(userHashKey, session)
  },
  async removeAvailableGroup (userHashKey: string, group: string) {
    let session = await this.getSession(userHashKey)
    let index = session.availableGroups.findIndex((grp) => grp === group)
    if (index >= 0) {
      session.availableGroups.splice(index, 1)
    }
    await this.saveSession(userHashKey, session)
  },
  async saveSession (userHashKey: string, session: UserSession) {
    await _userSessions.setItem(userHashKey, session)
  },
  async getCurrentGroup (userHashKey) : string {
    let session = await this.getSession(userHashKey)
    return session.currentGroup
  },
  async setCurrentGroup (userHashKey: string, group: string) {
    let session = await this.getSession(userHashKey)
    if (session.availableGroups.find((grp) => grp === group)) {
      session.currentGroup = group
    } else {
      throw new Error('User does not have access to this group')
    }
    await this.saveSession(userHashKey, session)
  }
}
