import { Easing, Group, Tween } from '@tweenjs/tween.js'
import { pick } from 'lodash-es'
import { Observable } from '../lib/events/observable'

export interface AnimationsState {
  allStopped: boolean
}

export class Animations extends Observable<AnimationsState> {
  readonly group = new Group()

  constructor() {
    super({ allStopped: true })
  }

  updateState() {
    this.update((state) => {
      state.allStopped = this.group.allStopped()
    })
  }
}

export const VIEW_MODEL_ANIMATIONS = new Animations()

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
  const tweenInstance = new Tween(from, VIEW_MODEL_ANIMATIONS.group)
    .to(to, duration * 1000)
    .easing(easing)
  const animatedKeys = Object.keys(to).filter((key) => Number.isFinite(to[key]))
  tweenInstance.onUpdate((value) => update({ ...from, ...pick(value, animatedKeys) }))
  tweenInstance.onComplete(() => {
    tweenInstance.remove()
    VIEW_MODEL_ANIMATIONS.updateState()
  })
  tweenInstance.onStop(() => {
    tweenInstance.remove()
    VIEW_MODEL_ANIMATIONS.updateState()
  })
  tweenInstance.start()
  VIEW_MODEL_ANIMATIONS.updateState()

  return tweenInstance
}
