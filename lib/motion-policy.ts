export const UNFOLD_VERSION_KEY = 'scroll-unfold:v2'

export type MotionPolicyInput = {
  visible: boolean
  reduced: boolean
  saveData: boolean
}

export type UnfoldPolicyInput = {
  reduced: boolean
  storedVersion: string | null
}

export const shouldRunAmbientMotion = (v: MotionPolicyInput) =>
  v.visible && !v.reduced && !v.saveData

export const shouldPlayFullUnfold = (v: UnfoldPolicyInput) =>
  !v.reduced
