"use client"

import Link from "next/link"

import { zodResolver } from "@hookform/resolvers/zod"
import {
  ArrowRight,
  CircleCheck,
  Clock,
  LifeBuoy,
  Mail,
  Megaphone,
  MessageCircle,
  ShieldCheck,
  Wallet,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { useForm } from "react-hook-form"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

import { Container } from "@/components/landing/container"
import { HoneypotField } from "@/components/forms/honeypot-field"
import { SubmissionSuccess } from "@/components/forms/submission-success"
import { useLeadForm } from "@/components/forms/use-lead-form"
import {
  supportContactSchema,
  type SupportContactInput,
} from "@/lib/validation/lead-schemas"

const CATEGORIES: {
  value: SupportContactInput["category"]
  label: string
  icon: LucideIcon
}[] = [
  { value: "general", label: "General", icon: MessageCircle },
  { value: "billing", label: "Billing", icon: Wallet },
  { value: "campaign", label: "Campaign", icon: Megaphone },
  { value: "technical", label: "Technical", icon: Wrench },
  { value: "driver", label: "Driver", icon: ShieldCheck },
]

export function ContactSupportForm() {
  const { submitted, submitError, dismissError, honeypot, setHoneypot, submit, reset: resetLeadForm } =
    useLeadForm({ endpoint: "/support", extra: { channel: "web" } })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
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

  const category = watch("category")

  async function onSubmit(data: SupportContactInput) {
    await submit(data)
  }

  function handleReset() {
    reset()
    resetLeadForm()
  }

  return (
    <div className="border-b border-border py-10 sm:py-16 lg:py-20">
      <Container>
        <div className="mb-10 max-w-2xl space-y-4">
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
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-14">
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

              <fieldset className="grid gap-2">
                <legend className="mb-0.5 text-sm font-medium text-foreground">
                  Category *
                </legend>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {CATEGORIES.map(({ value, label, icon: Icon }) => {
                    const active = category === value
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setValue("category", value, { shouldValidate: true })}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-center transition-colors",
                          active
                            ? "border-primary bg-primary/[0.06] text-primary"
                            : "border-input text-muted-foreground hover:border-foreground/25 hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4.5" strokeWidth={2} aria-hidden />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>

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
                <ApiErrorBanner message={submitError} onDismiss={dismissError} />
              ) : null}

              <HoneypotField value={honeypot} onChange={setHoneypot} />

              <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting} size="lg">
                {isSubmitting ? "Sending…" : "Send request"}
              </Button>
            </form>

            <aside className="space-y-6 lg:pt-1">
              <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
                <h2 className="text-sm font-semibold text-foreground">What to expect</h2>
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <Clock className="size-4.5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      A reply within one business day, by email.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <CircleCheck className="size-4.5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      We&apos;ll send a case reference so you can follow up on the
                      same thread.
                    </span>
                  </li>
                  <li className="flex gap-3">
                    <Mail className="size-4.5 shrink-0 text-primary" strokeWidth={2} aria-hidden />
                    <span className="text-sm leading-relaxed text-muted-foreground">
                      Already have an account? Track requests from Settings →
                      Help &amp; contact in the app.
                    </span>
                  </li>
                </ul>
              </div>

              <Link
                href="/help"
                className="group flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
              >
                Browse the help center
                <ArrowRight
                  className="size-3.5 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </aside>
          </div>
        )}
      </Container>
    </div>
  )
}
