'use strict'

import protobuf from 'protobufjs/light'
const {Type, Field, Root} = protobuf
const root = new Root().define('groupincome')

// TODO: makeGroup and move this stuff to shared/functions or shared/events?

export class HashableEntry {
  static Message (dataFields) {
    var msg = new Type(this.name)
    var msgData = new Type(this.name + 'Data')
    dataFields.forEach(([field, type], idx) => {
      msgData.add(new Field(field, idx + 1, type))
    })
    msg.add(new Field('version', 1, 'string'))
    msg.add(new Field('type', 2, 'string'))
    msg.add(new Field('parentHash', 3, 'string'))
    msg.add(new Field('data', 4, msgData.name))
    root.add(msgData)
    root.add(msg)
    return msg
  }
  static serialize (entry) {
    return this.message.encode(entry).finish()
  }
  static deserialize (buffer) {
    return this.message.decode(buffer).toObject()
  }
}

export class HashableGroup extends HashableEntry {
  static message = HashableGroup.Message([
    ['groupName', 'string'],
    ['sharedValues', 'string'],
    ['changePercentage', 'uint32'],
    ['openMembership', 'bool'],
    ['memberApprovalPercentage', 'uint32'],
    ['memberRemovalPercentage', 'uint32'],
    ['contributionPrivacy', 'string'],
    ['founderHashKey', 'string']
  ])
}
