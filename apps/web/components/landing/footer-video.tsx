"use client"

import { useEffect, useRef, useState } from "react"

// Holds back the 3.5 MB download until the footer is about to scroll into view.
export function FooterVideo() {
  const ref = useRef<HTMLVideoElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        setNear(true)
        observer.disconnect()
      },
      { rootMargin: "400px 0px" },
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [])

  return (
    <video
      ref={ref}
      src={near ? "/videos/footer-bg.mp4" : undefined}
      autoPlay
      loop
      muted
      playsInline
      preload="none"
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-20 size-full object-cover motion-reduce:hidden"
    />
  )
}
