"use client"

import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import type { MediaKitInput } from "@/lib/validation/lead-schemas"
import { mediaKitSchema } from "@/lib/validation/lead-schemas"

import { Container } from "@/components/landing/container"

export default function MediaKitPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MediaKitInput>({
    resolver: zodResolver(mediaKitSchema),
    defaultValues: { name: "", email: "" },
  })

  async function onSubmit(data: MediaKitInput) {
    const res = await fetch("/api/media-kit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    const json = (await res.json()) as { success?: boolean }
    if (!res.ok) return
    if (json.success) setSubmitted(true)
  }

  return (
    <div className="border-b border-border py-12 sm:py-20">
      <Container className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
          Media kit
        </h1>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          Specifications on taxi-top LED hardware and delivery bike enclosures, illustration-quality
          reach narratives, codec and creative pixel guidance, plus story framing you can drop into RFIs
          and agency briefs.
        </p>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Once you submit your details below we email the kit. Attach a downloadable PDF alongside this
          page when collateral is finalized.
        </p>

        {submitted ? (
          <p className="text-foreground mt-10 text-base leading-relaxed" role="status">
            Check your inbox for the downloadable media kit shortly.
          </p>
        ) : (
          <form className="mt-10 grid max-w-md gap-4" noValidate onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="mk-name">Name *</Label>
              <Input id="mk-name" autoComplete="name" {...register("name")} />
              {errors.name ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="mk-email">Work email *</Label>
              <Input id="mk-email" type="email" autoComplete="email" {...register("email")} />
              {errors.email ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send me the kit"}
            </Button>
          </form>
        )}
      </Container>
    </div>
  )
}
