import { Easing, Group, Tween } from '@tweenjs/tween.js'
import { pick } from 'lodash-es'

export const VIEW_MODEL_ANIMATIONS = new Group()

export type EasingFunction = (amount: number) => number

export interface AnimationOptions {
  duration?: number
  easing?: EasingFunction
}

export function tween<T extends Record<string, number>>(
  from: T,
  to: Partial<T>,
  update: (value: T) => void,
  { duration = 0.3, easing = Easing.Quadratic.InOut }: AnimationOptions = {},
) {
  const tweenInstance = new Tween(from, VIEW_MODEL_ANIMATIONS)
    .to(to, duration * 1000)
    .easing(easing)
  const animatedKeys = Object.keys(to).filter((key) => Number.isFinite(to[key]))
  tweenInstance.onUpdate((value) => update({ ...from, ...pick(value, animatedKeys) }))
  tweenInstance.onComplete(() => tweenInstance.remove())
  tweenInstance.onStop(() => tweenInstance.remove())
  tweenInstance.start()

  return tweenInstance
}
