"use client"

import {
  useEffect,
  useRef,
  type ComponentProps,
  type ElementType,
  type ReactNode,
} from "react"

type InViewProps<T extends ElementType> = {
  as?: T
  children: ReactNode
  threshold?: number
  rootMargin?: string
} & Omit<ComponentProps<T>, "as" | "children" | "ref">

export function InView<T extends ElementType = "div">({
  as,
  children,
  threshold = 0.2,
  rootMargin = "0px",
  ...rest
}: InViewProps<T>) {
  const Tag = (as ?? "div") as ElementType
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (typeof IntersectionObserver === "undefined") {
      node.setAttribute("data-visible", "true")
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.setAttribute("data-visible", "true")
            observer.disconnect()
            return
          }
        }
      },
      { threshold, rootMargin },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [threshold, rootMargin])

  return (
    <Tag ref={ref} data-visible="false" {...rest}>
      {children}
    </Tag>
  )
}
