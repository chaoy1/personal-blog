import { Solar } from 'lunar-javascript'

export type TodayInfo = {
  dateText: string
  weekday: string
  lunarText: string
  jieqi: string
}

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

export function todayInfo(now: Date = new Date()): TodayInfo {
  const solar = Solar.fromDate(now)
  const lunar = solar.getLunar()
  return {
    dateText: `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`,
    weekday: WEEKDAYS[now.getDay()],
    lunarText: `${lunar.getYearInChinese()}年${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`,
    jieqi: lunar.getJieQi() || '',
  }
}
