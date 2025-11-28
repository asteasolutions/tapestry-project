export class ContextHookInvocationError extends Error {
  constructor(provider: string) {
    const invoker =
      new Error().stack?.split('\n')[2].replace(/^\s+at\s+(.+?)\s.+/g, '$1') ?? '<hook>'

    super(`\`${invoker}\` must be called from a component wrapped in \`${provider}\``)
  }
}
