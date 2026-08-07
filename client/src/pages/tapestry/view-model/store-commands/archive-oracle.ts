import { StoreMutationCommand } from 'tapestry-core-client/src/lib/store/index'
import {
  ArchiveOracleGhostNode,
  ArchiveOracleSearchDoc,
  ArchiveOracleState,
  EditableTapestryViewModel,
} from '..'

export type ArchiveOracleUpdate = Partial<
  Pick<ArchiveOracleState, 'enabled' | 'sourceItemId' | 'query' | 'loading' | 'error'>
> & {
  ghosts?: ArchiveOracleGhostNode[]
}

export function updateArchiveOracle(
  update: ArchiveOracleUpdate | ((state: ArchiveOracleState) => ArchiveOracleUpdate),
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    const next = typeof update === 'function' ? update(model.archiveOracle) : update
    model.archiveOracle = {
      ...model.archiveOracle,
      ...next,
      ghosts: next.ghosts ?? model.archiveOracle.ghosts,
    }
  }
}

export function clearArchiveOracleGhosts(): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    model.archiveOracle = { ...model.archiveOracle, loading: false, error: undefined, ghosts: [] }
  }
}

export function setArchiveOracleGhosts(
  sourceItemId: string,
  query: string,
  docs: ArchiveOracleSearchDoc[],
  positions: { x: number; y: number }[],
): StoreMutationCommand<EditableTapestryViewModel> {
  return (model) => {
    const ghosts = docs.map<ArchiveOracleGhostNode>((doc, idx) => ({
      key: `${sourceItemId}:${doc.identifier}:${idx}`,
      sourceItemId,
      position: positions[idx] ?? { x: 0, y: 0 },
      doc,
    }))
    model.archiveOracle = {
      ...model.archiveOracle,
      sourceItemId,
      query,
      loading: false,
      error: undefined,
      ghosts,
    }
  }
}
