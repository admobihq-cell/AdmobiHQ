import { useCallback, useEffect, useState } from "react"
import { toggleSelection } from "@workspace/ops-contracts"

/**
 * Long-press selection for a list. Changing `resetKey` (the filter or search) clears it, as on the web:
 * a selection must never quietly include rows the person can no longer see.
 */
export function useSelection(resetKey: unknown) {
  const [ids, setIds] = useState<Set<number>>(() => new Set())
  useEffect(() => setIds(new Set()), [resetKey])
  const toggle = useCallback((id: number) => setIds((prev) => toggleSelection(prev, id)), [])
  const clear = useCallback(() => setIds(new Set()), [])
  return { ids, active: ids.size > 0, toggle, clear }
}
