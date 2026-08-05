declare module 'lunar-javascript' {
  export class Solar {
    static fromDate(date: Date): Solar
    getLunar(): Lunar
  }

  export class Lunar {
    getYearInChinese(): string
    getYearInGanZhi(): string
    getMonthInChinese(): string
    getDayInChinese(): string
    getJieQi(): string
  }
}
