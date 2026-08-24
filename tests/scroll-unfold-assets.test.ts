import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { expect, test } from 'vitest'

const globalStyles = readFileSync(resolve(process.cwd(), 'app/globals.css'), 'utf8')

test('uses separate handscroll artwork for light and dark themes', () => {
  expect(globalStyles).toContain('opening-scroll-day.png')
  expect(globalStyles).toContain("[data-theme='dark']")
  expect(globalStyles).toContain('opening-scroll-night.png')
})
