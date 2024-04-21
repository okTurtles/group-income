import { randomHexString } from '@model/contracts/shared/giLodash.js'
import {
  HOURS_MILLIS,
  DAYS_MILLIS,
  addTimeToDate
} from '@model/contracts/shared/time.js'

const randomPastDates = (range = 30) => {
  const timeToAdd = DAYS_MILLIS + Math.random() * DAYS_MILLIS * (range - 1)
  return addTimeToDate(new Date(), timeToAdd * -1)
}
const randomPastHours = (range = 3) => {
  const timeToAdd = HOURS_MILLIS + Math.random() * HOURS_MILLIS * (range - 1)
  return addTimeToDate(new Date(), timeToAdd)
}

const dmDummyData: any[] = [
  {
    id: randomHexString(15),
    name: 'Attila the Hun',
    message: 'Thanks! I will give you a heads up tomorrow.',
    isYou: false,
    sentAt: randomPastHours(5)
  },
  {
    id: randomHexString(15),
    name: 'A turtle',
    message: 'Okay.',
    isYou: true,
    sentAt: randomPastHours(15)
  },
  {
    id: randomHexString(15),
    name: 'Carl Sagan',
    message: 'Attachment: 123456.jpeg',
    isYou: false,
    sentAt: randomPastDates(5)
  },
  {
    id: randomHexString(15),
    name: 'Felix Cubin',
    message: '@Flex Thanks for your help with the poll!',
    isYou: true,
    sentAt: randomPastDates(12)
  },
  {
    id: randomHexString(15),
    name: 'Ines De Castro',
    message: 'I need your reply on this comment',
    isYou: false,
    sentAt: randomPastDates(20)
  }
]

dmDummyData.sort((a, b) => b.sentAt - a.sentAt)
export default dmDummyData
