import { expect, test } from 'vitest'

import {
  shouldPlayFullUnfold,
  shouldRunAmbientMotion,
  UNFOLD_VERSION_KEY,
} from '@/lib/motion-policy'

test('does not run ambient motion while the page is hidden', () => {
  expect(shouldRunAmbientMotion({ visible: false, reduced: false, saveData: false })).toBe(false)
})

test('does not run ambient motion when reduced motion is requested', () => {
  expect(shouldRunAmbientMotion({ visible: true, reduced: true, saveData: false })).toBe(false)
})

test('runs ambient motion only when visible and no preference prevents it', () => {
  expect(shouldRunAmbientMotion({ visible: true, reduced: false, saveData: false })).toBe(true)
})

test('plays the full unfold for a visitor without a stored version', () => {
  expect(shouldPlayFullUnfold({ reduced: false, storedVersion: null })).toBe(true)
})

test('replays the full unfold when a previous visit stored a version', () => {
  expect(shouldPlayFullUnfold({ reduced: false, storedVersion: UNFOLD_VERSION_KEY })).toBe(true)
})
