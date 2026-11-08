"use client"

// Adapted from dqnamo's receipt-printer experiment (https://www.dqnamo.com/experiments/receipt-printer):
// framer-motion instead of motion/react, lucide instead of phosphor, fixed neutrals instead of the
// grayscale-* scale (a printer is dark plastic and paper is white in either theme), no texture files.
import { CheckCircle2, LoaderCircle } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react"

import { cn } from "@workspace/ui/lib/utils"

export type ReceiptPrinterStage = "processing" | "printing" | "complete"
export type ReceiptFeedMotion = "smooth" | "stepped"

type RootProps = Omit<ComponentPropsWithoutRef<"section">, "children"> & {
  /** Disables all stage transitions when false. */
  animate?: boolean
  children: ReactNode
  /** Paper feeds continuously, or one line at a time. */
  feedMotion?: ReceiptFeedMotion
  stage: ReceiptPrinterStage
}

type StatusProps = Omit<ComponentPropsWithoutRef<"div">, "children"> & {
  /** Defaults to a label for the current stage. */
  children?: ReactNode
}

type Ctx = { animate: boolean; feedMotion: ReceiptFeedMotion; shouldMove: boolean; stage: ReceiptPrinterStage }

const ReceiptPrinterContext = createContext<Ctx | null>(null)

const easeOut = [0.23, 1, 0.32, 1] as const
const easeInOut = [0.77, 0, 0.175, 1] as const
const PRINT_SECONDS = 1.75

const toothCount = 40
const toothDepth = 4
const toothPoints = Array.from({ length: toothCount * 2 }, (_, i) => {
  const x = 100 - ((i + 1) * 100) / (toothCount * 2)
  const y = i % 2 === 0 ? "100%" : `calc(100% - ${toothDepth}px)`
  return `${x}% ${y}`
}).join(", ")
const receiptClipPath = `polygon(0 0, 100% 0, 100% calc(100% - ${toothDepth}px), ${toothPoints})`

const feedKeyframes = [
  "translateY(calc(-100% + 2px))",
  "translateY(-91%)", "translateY(-91%)",
  "translateY(-81%)", "translateY(-81%)",
  "translateY(-70%)", "translateY(-70%)",
  "translateY(-58%)", "translateY(-58%)",
  "translateY(-45%)", "translateY(-45%)",
  "translateY(-32%)", "translateY(-32%)",
  "translateY(-20%)", "translateY(-20%)",
  "translateY(-10%)", "translateY(-10%)",
  "translateY(-3%)", "translateY(-3%)",
  "translateY(0%)",
]
const feedTimes = [
  0, 0.075, 0.105, 0.18, 0.21, 0.285, 0.315, 0.39, 0.42, 0.495, 0.525, 0.6, 0.63, 0.705, 0.735, 0.81, 0.84, 0.915,
  0.945, 1,
]

const statusLabels: Record<ReceiptPrinterStage, string> = {
  processing: "Confirming payment",
  printing: "Printing receipt",
  complete: "Payment complete",
}

/**
 * Drives the stages from one fact: is the work done? Stays on "processing" until `done`, then
 * prints for as long as the feed animation takes and lands on "complete".
 */
export function useReceiptPrinterStage(done: boolean): ReceiptPrinterStage {
  const [printed, setPrinted] = useState(false)
  const [wasDone, setWasDone] = useState(done)
  if (done !== wasDone) {
    setWasDone(done)
    setPrinted(false)
  }
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setPrinted(true), PRINT_SECONDS * 1000 + 150)
    return () => clearTimeout(t)
  }, [done])
  return !done ? "processing" : printed ? "complete" : "printing"
}

function usePrinter(component: string) {
  const ctx = useContext(ReceiptPrinterContext)
  if (!ctx) throw new Error(`${component} must be used inside ReceiptPrinter.Root.`)
  return ctx
}

function Root({
  "aria-label": ariaLabel = "Receipt printer",
  animate = true,
  children,
  className,
  feedMotion = "stepped",
  stage,
  ...props
}: RootProps) {
  const reduce = useReducedMotion()
  return (
    <ReceiptPrinterContext.Provider value={{ animate, feedMotion, shouldMove: animate && !reduce, stage }}>
      <section
        aria-label={ariaLabel}
        className={cn("relative isolate flex w-full max-w-sm flex-col items-center", className)}
        data-stage={stage}
        {...props}
      >
        {children}
      </section>
    </ReceiptPrinterContext.Provider>
  )
}

function Machine({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-3xl border border-zinc-900 bg-zinc-800 p-3 pb-8",
        "shadow-[0_20px_36px_-20px_rgb(0_0_0/0.55),0_6px_14px_-8px_rgb(0_0_0/0.24),inset_0_1px_0_rgb(255_255_255/0.08),inset_0_-1px_0_rgb(0_0_0/0.5)]",
        "dark:border-zinc-950 dark:bg-zinc-700",
        className,
      )}
      {...props}
    >
      {children}
      {/* The paper slot. */}
      <div
        aria-hidden
        className="absolute inset-x-6 bottom-3 z-40 h-2 rounded-sm border border-zinc-950 bg-zinc-950 shadow-inner"
      />
    </div>
  )
}

function Header({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("relative z-10 flex h-11 items-start justify-between", className)} {...props}>
      {children}
    </div>
  )
}

function Screen({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "relative z-10 isolate overflow-hidden rounded-xl border border-zinc-950 bg-zinc-950 p-4 text-zinc-100",
        "after:pointer-events-none after:absolute after:inset-0 after:z-20 after:rounded-[inherit] after:shadow-[inset_0_0_24px_4px_rgb(0_0_0/0.5)] after:content-['']",
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  )
}

function Status({ children, className, ...props }: StatusProps) {
  const { animate, shouldMove, stage } = usePrinter("ReceiptPrinter.Status")
  const iconMotion = {
    animate: { opacity: 1, transform: "scale(1)" },
    exit: { opacity: animate ? 0 : 1, transform: shouldMove ? "scale(0.96)" : "scale(1)" },
    initial: { opacity: animate ? 0 : 1, transform: shouldMove ? "scale(0.94)" : "scale(1)" },
    transition: { duration: animate ? 0.16 : 0, ease: easeOut },
  }
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)} {...props}>
      <span aria-hidden className="relative grid size-5 shrink-0 place-items-center">
        <AnimatePresence initial={false} mode="sync">
          {stage === "complete" ? (
            <motion.span key="complete" className="col-start-1 row-start-1 grid place-items-center text-green-400" {...iconMotion}>
              <CheckCircle2 className="size-[18px]" />
            </motion.span>
          ) : (
            <motion.span key="working" className="col-start-1 row-start-1 grid place-items-center text-zinc-400" {...iconMotion}>
              <LoaderCircle className={cn("size-[18px]", animate && "animate-spin motion-reduce:animate-none")} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <div aria-live="polite" role="status" className="grid min-w-0 flex-1 items-center">
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={stage}
            className="col-start-1 row-start-1 truncate text-xs leading-none font-medium text-zinc-400"
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            exit={{ opacity: animate ? 0 : 1, transform: shouldMove ? "translateY(-4px)" : "translateY(0px)" }}
            initial={{ opacity: animate ? 0 : 1, transform: shouldMove ? "translateY(4px)" : "translateY(0px)" }}
            transition={{ duration: animate ? 0.18 : 0, ease: easeOut }}
          >
            {children ?? statusLabels[stage]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

function Paper({ children, className, style, ...props }: ComponentPropsWithoutRef<"article">) {
  return (
    <article
      className={cn("relative z-10 bg-white px-6 pt-7 pb-8 font-mono text-zinc-900", className)}
      style={{ clipPath: receiptClipPath, ...style }}
      {...props}
    >
      {children}
    </article>
  )
}

/** Holds the paper. Its height is the paper's, so the space the receipt drops into is reserved up front. */
function Output({ children, className, ...props }: ComponentPropsWithoutRef<"div">) {
  const { animate, feedMotion, shouldMove, stage } = usePrinter("ReceiptPrinter.Output")
  const visible = stage !== "processing"
  const stepped = feedMotion === "stepped" && stage === "printing" && shouldMove

  return (
    <div className={cn("relative z-50 -mt-4 w-[calc(80%+3rem)] max-w-full overflow-hidden px-6 pb-4", className)} {...props}>
      {visible ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-6 -top-1 z-20 h-2 bg-zinc-950/75 blur-[6px]" />
      ) : null}
      <motion.div
        aria-hidden={stage !== "complete"}
        className="relative isolate drop-shadow-[0_8px_16px_rgb(0_0_0/0.18)]"
        initial={false}
        animate={{
          opacity: visible ? 1 : 0,
          transform:
            stage === "printing" && shouldMove
              ? stepped
                ? feedKeyframes
                : "translateY(0%)"
              : visible || !shouldMove
                ? "translateY(0%)"
                : "translateY(calc(-100% + 2px))",
        }}
        transition={{
          opacity: { duration: animate ? 0.16 : 0, ease: easeOut },
          transform: {
            duration: shouldMove ? PRINT_SECONDS : 0,
            ease: stepped ? "linear" : easeInOut,
            times: stepped ? feedTimes : undefined,
          },
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}

/** One label/value line on the paper. */
function Row({ label, value, strong }: { label: ReactNode; value: ReactNode; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4 text-xs", strong && "text-sm font-semibold")}>
      <span className={strong ? undefined : "text-zinc-500"}>{label}</span>
      <span className="truncate text-right tabular-nums">{value}</span>
    </div>
  )
}

function Rule() {
  return <div aria-hidden className="my-3 border-t border-dashed border-zinc-300" />
}

export const ReceiptPrinter = { Root, Machine, Header, Screen, Status, Output, Paper, Row, Rule }
