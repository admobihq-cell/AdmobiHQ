"use client"

import { useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { LifeBuoy } from "lucide-react"
import { useForm } from "react-hook-form"

import { publicApiFetch } from "@workspace/ops-api-client"
import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { Container } from "@/components/landing/container"
import { SubmissionSuccess } from "@/components/forms/submission-success"
import {
  supportContactSchema,
  type SupportContactInput,
} from "@/lib/validation/lead-schemas"

const selectClass =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive flex h-9 w-full rounded-lg border bg-transparent px-3 py-1 text-base outline-none focus-visible:ring-3 md:text-sm disabled:opacity-50"

export function ContactSupportForm() {
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SupportContactInput>({
    resolver: zodResolver(supportContactSchema),
    defaultValues: {
      contact_name: "",
      contact_email: "",
      category: "general",
      subject: "",
      message: "",
    },
  })

  async function onSubmit(data: SupportContactInput) {
    setSubmitError(null)
    const result = await publicApiFetch<{ success?: boolean }>("/support", {
      method: "POST",
      body: JSON.stringify({ ...data, channel: "web" }),
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
    <div className="border-b border-border py-10 sm:py-16 lg:py-20">
      <Container>
        <div className="mb-10 max-w-2xl space-y-6">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            Contact support
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Billing question, campaign issue, or something not working? Tell us
            what&apos;s going on and the Admobi team will get back to you.
          </p>
        </div>

        {submitted ? (
          <SubmissionSuccess
            icon={LifeBuoy}
            title="Request received"
            message="We've got your case and will follow up by email shortly."
            onReset={handleReset}
            resetLabel="Send another request"
          />
        ) : (
          <form className="max-w-xl space-y-6" noValidate onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <Label htmlFor="cs-name">Your name *</Label>
              <Input
                id="cs-name"
                autoComplete="name"
                aria-invalid={!!errors.contact_name}
                {...register("contact_name")}
              />
              {errors.contact_name ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.contact_name.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cs-email">Email *</Label>
              <Input
                id="cs-email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.contact_email}
                {...register("contact_email")}
              />
              {errors.contact_email ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.contact_email.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cs-category">Category *</Label>
              <select id="cs-category" className={selectClass} {...register("category")}>
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="campaign">Campaign</option>
                <option value="technical">Technical</option>
                <option value="driver">Driver</option>
              </select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cs-subject">Subject *</Label>
              <Input id="cs-subject" aria-invalid={!!errors.subject} {...register("subject")} />
              {errors.subject ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.subject.message}
                </p>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cs-message">Message *</Label>
              <textarea
                id="cs-message"
                rows={5}
                placeholder="What's going on?"
                className="border-input placeholder:text-muted-foreground focus-visible:ring-ring/50 aria-invalid:border-destructive focus-visible:border-ring flex min-h-24 w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
                aria-invalid={!!errors.message}
                {...register("message")}
              />
              {errors.message ? (
                <p className="text-destructive text-xs font-medium" role="alert">
                  {errors.message.message}
                </p>
              ) : null}
            </div>

            {submitError ? (
              <ApiErrorBanner message={submitError} onDismiss={() => setSubmitError(null)} />
            ) : null}

            <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
              {isSubmitting ? "Sending…" : "Send request"}
            </Button>
          </form>
        )}
      </Container>
    </div>
  )
}
