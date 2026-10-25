"use client"

import { useEffect, useRef, useState } from "react"

// The poster shows straight away; the 1.1 MB clip loads only when the footer is about to
// scroll into view. Reduced motion keeps the poster as a still.
export function FooterVideo() {
  const ref = useRef<HTMLVideoElement>(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const video = ref.current
    if (!video || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
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

  // autoPlay alone doesn't always start a src set after mount; a refusal (e.g. iOS Low
  // Power Mode) just leaves the poster up.
  useEffect(() => {
    if (near) ref.current?.play().catch(() => {})
  }, [near])

  return (
    <video
      ref={ref}
      src={near ? "/videos/footer-bg.mp4" : undefined}
      poster="/videos/footer-bg.jpg"
      autoPlay
      loop
      muted
      playsInline
      preload="none"
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-20 size-full object-cover"
    />
  )
}
