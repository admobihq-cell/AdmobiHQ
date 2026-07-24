"use client"

import type { LucideIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { cn } from "@workspace/ui/lib/utils"

type ComingSoonDialogProps = {
  label: string
  body: string
  icon: LucideIcon
  triggerClassName?: string
}

export function ComingSoonDialog({
  label,
  body,
  icon: Icon,
  triggerClassName,
}: ComingSoonDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-auto flex-col gap-2 py-4", triggerClassName)}
        >
          <Icon className="size-5" aria-hidden />
          <span className="text-xs font-medium">{label}</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{body}</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
