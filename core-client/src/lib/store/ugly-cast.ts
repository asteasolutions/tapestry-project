/* eslint-disable @typescript-eslint/no-explicit-any */
import { Objectish } from 'immer'
import { Store, StoreMutationCommand, ValidStoreAlias } from '.'
import { ValuesOf } from 'tapestry-core/src/type-utils'

type ExtractStoreModel<S extends Store<any, any>> = S extends Store<infer T, any> ? T : never
type ExtractStoreAlias<S extends Store<any, any>> = S extends Store<any, infer A> ? A : never

type CommandFactory<T extends Objectish, Args extends any[] = any[]> = (
  ...args: Args
) => StoreMutationCommand<T>

type CommandFactoryArgs<C extends CommandFactory<any>> =
  C extends CommandFactory<any, infer Args> ? Args : never

/**
 * Helps cast commands for Store<A> to commands for Store<B> if A is registered as an "alias" in Store<B>.
 *
 * For example, say we have a base view model such as TapestryVM along with some command for it, e.g.
 * `setInteractiveElement`. In a separate application, we may want to extend this view model and create, say,
 * `EditableTapestryVM extends TapestryVM`. Then we may have an EditableTapestryVM Store where TapestryVM is
 * registered as an alias:
 *
 * ```ts
 *   type EditableTapestryStore = Store<EditableTapestryVM, { base: TapestryVM }>
 *   const store: EditableTapestryStore = ...
 * ```
 *
 * Then we would *not* be able to use the command `setInteractiveElement` in the new store:
 *
 * ```ts
 *   store.dispatch(setInteractiveElement(null))   // Type error
 * ```
 *
 * However, using this method, we can cast the command to the correct type and then it becomes useable:
 *
 * ```ts
 *   const mySetInteractiveElement = cast<EditableTapestryStore>()(setInteractiveElement)
 *   ...
 *   store.dispatch(mySetInteractiveElement(null))  // OK
 * ```
 *
 * **NB!** This cast basically swipes type checks under the rug. Use it only if you are certain that the
 * corresponding command can be used directly on the extended store without problems!
 */
export function cast<S extends Store<any, any>>() {
  type T = ExtractStoreModel<S>
  type A = ExtractStoreAlias<S>

  return <F extends CommandFactory<ValuesOf<ValidStoreAlias<T, A>>>>(commandFactory: F) =>
    commandFactory as unknown as CommandFactory<T, CommandFactoryArgs<F>>
}
