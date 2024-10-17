export function timeLeft (expiryTime: number): { expired: boolean, years: number, months: number, days: number, hours: number, minutes: number } {
  const now = new Date()
  const expiry = new Date(expiryTime)

  if (expiry < now) {
    return { expired: true, years: 0, months: 0, days: 0, hours: 0, minutes: 0 }
  }

  let years = expiry.getFullYear() - now.getFullYear()
  let months = expiry.getMonth() - now.getMonth()
  let days = expiry.getDate() - now.getDate()
  let hours = expiry.getHours() - now.getHours()
  let minutes = expiry.getMinutes() - now.getMinutes()

  // Adjust for negative values
  if (minutes < 0) {
    minutes += 60
    hours--
  }
  if (hours < 0) {
    hours += 24
    days--
  }
  if (days < 0) {
    const lastMonth = new Date(expiry.getFullYear(), expiry.getMonth(), 0)
    days += lastMonth.getDate()
    months--
  }
  if (months < 0) {
    months += 12
    years--
  }

  return { expired: false, years, months, days, hours, minutes }
}
