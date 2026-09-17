"use client"

import { useEffect } from "react"

/** The flow overlay is `fixed inset-0` over a shell that still scrolls, so
 * without this you get two scrollbars and the page behind drifts under the
 * overlay. Padding compensates for the scrollbar the lock removes, so nothing
 * shifts sideways when the flow opens. */
export function FlowScrollLock() {
  useEffect(() => {
    const { body } = document
    const previousOverflow = body.style.overflow
    const previousPaddingRight = body.style.paddingRight
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

    body.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`
    }

    return () => {
      body.style.overflow = previousOverflow
      body.style.paddingRight = previousPaddingRight
    }
  }, [])

  return null
}
