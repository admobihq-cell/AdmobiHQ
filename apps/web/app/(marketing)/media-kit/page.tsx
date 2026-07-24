"use client"

import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { FileDown } from "lucide-react"
import { useForm } from "react-hook-form"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import type { MediaKitInput } from "@/lib/validation/lead-schemas"
import { mediaKitSchema } from "@/lib/validation/lead-schemas"

import { publicApiFetch } from "@workspace/ops-api-client"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { SubmissionSuccess } from "@/components/forms/submission-success"
import { Container } from "@/components/landing/container"

export default function MediaKitPage() {
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MediaKitInput>({
    resolver: zodResolver(mediaKitSchema),
    defaultValues: { name: "", email: "" },
  })

  async function onSubmit(data: MediaKitInput) {
    setSubmitError(null)
    const result = await publicApiFetch<{ success?: boolean }>("/media-kit", {
      method: "POST",
      body: JSON.stringify(data),
    })
    if (!result.ok) {
      setSubmitError(result.message)
      return
    }
    if (result.data.success) setSubmitted(true)
  }

  function handleReset() {
    reset()
    setSubmitError(null)
    setSubmitted(false)
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
          <div className="mt-10">
            <SubmissionSuccess
              icon={FileDown}
              title="Kit's in your inbox"
              message="Check your inbox for the downloadable media kit — specs, reach data, and creative guidance ready to drop into your next brief."
              onReset={handleReset}
            />
          </div>
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
            {submitError ? (
              <ApiErrorBanner
                message={submitError}
                onDismiss={() => setSubmitError(null)}
              />
            ) : null}
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send me the kit"}
            </Button>
          </form>
        )}
      </Container>
    </div>
  )
}
