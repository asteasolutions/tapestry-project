import { useState } from 'react'

export function useSingleChoice<const Choice extends string>(): [
  choice: Choice | '',
  select: (choice: Choice | '', toggle?: boolean) => void,
  clear: () => void,
] {
  const [selected, setSelected] = useState<Choice | ''>('')

  function select(choice: Choice | '', toggle = false) {
    setSelected(toggle && choice === selected ? '' : choice)
  }

  function clear() {
    setSelected('')
  }

  return [selected, select, clear]
}
