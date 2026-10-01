const digits = '〇一二三四五六七八九'
function chineseNumber(value: number): string {
  if (value < 10) return digits[value]
  if (value < 20) return `十${value % 10 ? digits[value % 10] : ''}`
  return `${digits[Math.floor(value / 10)]}十${value % 10 ? digits[value % 10] : ''}`
}

export function formatGuestbookDate(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return { year: '', day: '日期未详', full: '日期未详' }
  const parts = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(date)
  const part = (type: string) => Number(parts.find(p => p.type === type)?.value)
  const year = String(part('year')).split('').map(n => digits[Number(n)]).join('') + '年'
  const dayNumber = part('day')
  const day = chineseNumber(part('month')) + '月' + (dayNumber > 20 && dayNumber < 30 ? '廿' + digits[dayNumber % 10] : chineseNumber(dayNumber))
  return { year, day, full: year + day + '日' }
}

export const guestbookAccentNames = ['cinnabar', 'pine', 'ochre', 'indigo', 'tea', 'plum'] as const
export type GuestbookAccent = typeof guestbookAccentNames[number]
export function nextGuestbookAccent(previous: GuestbookAccent | null): GuestbookAccent {
  const choices = guestbookAccentNames.filter(tone => tone !== previous)
  return choices[Math.floor(Math.random() * choices.length)]
}
