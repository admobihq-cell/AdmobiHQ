"use client"

import type { FormEvent } from "react"
import { useState } from "react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { cn } from "@workspace/ui/lib/utils"

import { isEmail } from "@/lib/is-email"

function FormSuccess({ message }: { message: string }) {
  return (
    <p
      className="text-sm text-primary"
      role="status"
      style={{ transition: "opacity 220ms var(--ease-out-strong, ease-out)" }}
    >
      {message}
    </p>
  )
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) return null
  return (
    <p id={id} className="text-destructive text-xs font-medium" role="alert">
      {message}
    </p>
  )
}

export function LeadForms() {
  const [waitlist, setWaitlist] = useState({ email: "", role: "" })
  const [waitlistErr, setWaitlistErr] = useState<string | null>(null)
  const [waitlistOk, setWaitlistOk] = useState(false)

  const [campaign, setCampaign] = useState({
    name: "",
    email: "",
    company: "",
    note: "",
  })
  const [campaignErr, setCampaignErr] = useState<Record<string, string | null>>({})
  const [campaignOk, setCampaignOk] = useState(false)

  const [fleet, setFleet] = useState({
    company: "",
    name: "",
    email: "",
    phone: "",
  })
  const [fleetErr, setFleetErr] = useState<Record<string, string | null>>({})
  const [fleetOk, setFleetOk] = useState(false)

  const [driver, setDriver] = useState({ name: "", phone: "", area: "" })
  const [driverErr, setDriverErr] = useState<Record<string, string | null>>({})
  const [driverOk, setDriverOk] = useState(false)

  function onWaitlistSubmit(e: FormEvent) {
    e.preventDefault()
    setWaitlistOk(false)
    setWaitlistErr(null)
    if (!waitlist.email.trim()) {
      setWaitlistErr("Enter your email.")
      return
    }
    if (!isEmail(waitlist.email)) {
      setWaitlistErr("Use a valid email address.")
      return
    }
    setWaitlistOk(true)
    if (typeof window !== "undefined") {
      console.info("[Admobi waitlist]", waitlist)
    }
  }

  function onCampaignSubmit(e: FormEvent) {
    e.preventDefault()
    setCampaignOk(false)
    const next: Record<string, string | null> = {}
    if (!campaign.name.trim()) next.name = "Add your name."
    if (!campaign.email.trim()) next.email = "Add your email."
    else if (!isEmail(campaign.email)) next.email = "Use a valid email address."
    if (!campaign.company.trim()) next.company = "Add your company."
    setCampaignErr(next)
    if (Object.keys(next).length) return
    setCampaignOk(true)
    if (typeof window !== "undefined") {
      console.info("[Admobi campaign lead]", campaign)
    }
  }

  function onFleetSubmit(e: FormEvent) {
    e.preventDefault()
    setFleetOk(false)
    const next: Record<string, string | null> = {}
    if (!fleet.company.trim()) next.company = "Add company name."
    if (!fleet.name.trim()) next.name = "Add contact name."
    if (!fleet.email.trim()) next.email = "Add email."
    else if (!isEmail(fleet.email)) next.email = "Use a valid email address."
    if (!fleet.phone.trim()) next.phone = "Add phone."
    setFleetErr(next)
    if (Object.keys(next).length) return
    setFleetOk(true)
    console.info("[Admobi fleet]", fleet)
  }

  function onDriverSubmit(e: FormEvent) {
    e.preventDefault()
    setDriverOk(false)
    const next: Record<string, string | null> = {}
    if (!driver.name.trim()) next.name = "Add your name."
    if (!driver.phone.trim()) next.phone = "Add phone."
    setDriverErr(next)
    if (Object.keys(next).length) return
    setDriverOk(true)
    console.info("[Admobi driver]", driver)
  }

  const fieldGap = "grid gap-2"

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      {/* Waitlist */}
      <section
        id="waitlist"
        className={cn(
          "scroll-mt-24 rounded-2xl border border-border bg-card p-6 sm:p-8"
        )}
      >
        <h3 className="text-lg font-semibold text-foreground">Waitlist updates</h3>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Short notes on rollout cities and network capacity. No spam.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={onWaitlistSubmit} noValidate>
          <div className={fieldGap}>
            <Label htmlFor="waitlist-email">Work email</Label>
            <Input
              id="waitlist-email"
              type="email"
              name="email"
              autoComplete="email"
              value={waitlist.email}
              onChange={(e) =>
                setWaitlist((s) => ({ ...s, email: e.target.value }))
              }
              aria-invalid={!!waitlistErr}
              aria-describedby={waitlistErr ? "waitlist-email-error" : undefined}
            />
            <FieldError id="waitlist-email-error" message={waitlistErr} />
          </div>
          <div className={fieldGap}>
            <Label htmlFor="waitlist-role">Role (optional)</Label>
            <Input
              id="waitlist-role"
              name="role"
              value={waitlist.role}
              onChange={(e) =>
                setWaitlist((s) => ({ ...s, role: e.target.value }))
              }
              placeholder="Marketer, operator, journalist…"
            />
          </div>
          <Button type="submit">Join waitlist</Button>
          {waitlistOk ? (
            <FormSuccess message="Thanks. This form is wired for demo; connect your CRM when ready." />
          ) : null}
        </form>
      </section>

      {/* Campaign */}
      <section
        id="campaign"
        className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 sm:p-8"
      >
        <h3 className="text-lg font-semibold text-foreground">
          Start a campaign
        </h3>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Tell us what you want to ship. We reply with availability and specs.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={onCampaignSubmit} noValidate>
          <div className={fieldGap}>
            <Label htmlFor="camp-name">Your name</Label>
            <Input
              id="camp-name"
              name="name"
              value={campaign.name}
              onChange={(e) =>
                setCampaign((s) => ({ ...s, name: e.target.value }))
              }
              aria-invalid={!!campaignErr.name}
              aria-describedby={campaignErr.name ? "camp-name-err" : undefined}
            />
            <FieldError id="camp-name-err" message={campaignErr.name ?? null} />
          </div>
          <div className={fieldGap}>
            <Label htmlFor="camp-email">Work email</Label>
            <Input
              id="camp-email"
              type="email"
              name="email"
              autoComplete="email"
              value={campaign.email}
              onChange={(e) =>
                setCampaign((s) => ({ ...s, email: e.target.value }))
              }
              aria-invalid={!!campaignErr.email}
              aria-describedby={campaignErr.email ? "camp-email-err" : undefined}
            />
            <FieldError id="camp-email-err" message={campaignErr.email ?? null} />
          </div>
          <div className={fieldGap}>
            <Label htmlFor="camp-co">Organization</Label>
            <Input
              id="camp-co"
              name="company"
              value={campaign.company}
              onChange={(e) =>
                setCampaign((s) => ({ ...s, company: e.target.value }))
              }
              aria-invalid={!!campaignErr.company}
              aria-describedby={
                campaignErr.company ? "camp-co-err" : undefined
              }
            />
            <FieldError id="camp-co-err" message={campaignErr.company ?? null} />
          </div>
          <div className={fieldGap}>
            <Label htmlFor="camp-note">Brief (optional)</Label>
            <textarea
              id="camp-note"
              name="note"
              rows={3}
              value={campaign.note}
              onChange={(e) =>
                setCampaign((s) => ({ ...s, note: e.target.value }))
              }
              className="border-input placeholder:text-muted-foreground focus-visible:ring-ring/50 aria-invalid:border-destructive focus-visible:border-ring flex min-h-20 w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-3 md:text-sm"
              placeholder="Markets, flight dates, creatives in progress…"
            />
          </div>
          <Button type="submit">Send brief</Button>
          {campaignOk ? (
            <FormSuccess message="Received. Connect your API route to store this lead." />
          ) : null}
        </form>
      </section>

      {/* Fleet manager */}
      <section
        id="fleet"
        className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 sm:p-8"
      >
        <h3 className="text-lg font-semibold text-foreground">
          Join as fleet manager
        </h3>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          For outfits that run taxis or aggregators onboarding multiple vehicles.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={onFleetSubmit} noValidate>
          <div className={fieldGap}>
            <Label htmlFor="fleet-co">Fleet or company name</Label>
            <Input
              id="fleet-co"
              name="company"
              value={fleet.company}
              onChange={(e) =>
                setFleet((s) => ({ ...s, company: e.target.value }))
              }
              aria-invalid={!!fleetErr.company}
              aria-describedby={fleetErr.company ? "fleet-co-err" : undefined}
            />
            <FieldError id="fleet-co-err" message={fleetErr.company ?? null} />
          </div>
          <div className={fieldGap}>
            <Label htmlFor="fleet-name">Primary contact</Label>
            <Input
              id="fleet-name"
              name="name"
              value={fleet.name}
              onChange={(e) =>
                setFleet((s) => ({ ...s, name: e.target.value }))
              }
              aria-invalid={!!fleetErr.name}
              aria-describedby={fleetErr.name ? "fleet-name-err" : undefined}
            />
            <FieldError id="fleet-name-err" message={fleetErr.name ?? null} />
          </div>
          <div className={fieldGap}>
            <Label htmlFor="fleet-email">Email</Label>
            <Input
              id="fleet-email"
              type="email"
              name="email"
              autoComplete="email"
              value={fleet.email}
              onChange={(e) =>
                setFleet((s) => ({ ...s, email: e.target.value }))
              }
              aria-invalid={!!fleetErr.email}
              aria-describedby={fleetErr.email ? "fleet-email-err" : undefined}
            />
            <FieldError id="fleet-email-err" message={fleetErr.email ?? null} />
          </div>
          <div className={fieldGap}>
            <Label htmlFor="fleet-phone">Phone</Label>
            <Input
              id="fleet-phone"
              type="tel"
              name="phone"
              autoComplete="tel"
              value={fleet.phone}
              onChange={(e) =>
                setFleet((s) => ({ ...s, phone: e.target.value }))
              }
              aria-invalid={!!fleetErr.phone}
              aria-describedby={fleetErr.phone ? "fleet-phone-err" : undefined}
            />
            <FieldError id="fleet-phone-err" message={fleetErr.phone ?? null} />
          </div>
          <Button type="submit">Request partnership deck</Button>
          {fleetOk ? (
            <FormSuccess message="Captured locally for demo purposes." />
          ) : null}
        </form>
      </section>

      {/* Driver */}
      <section
        id="drivers"
        className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 sm:p-8"
      >
        <h3 className="text-lg font-semibold text-foreground">
          Drive with Admobi hardware
        </h3>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          For individual drivers curious about installs and payouts. Separate from fleet-managed rollouts.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={onDriverSubmit} noValidate>
          <div className={fieldGap}>
            <Label htmlFor="drive-name">Name</Label>
            <Input
              id="drive-name"
              name="name"
              value={driver.name}
              onChange={(e) =>
                setDriver((s) => ({ ...s, name: e.target.value }))
              }
              aria-invalid={!!driverErr.name}
              aria-describedby={driverErr.name ? "drive-name-err" : undefined}
            />
            <FieldError id="drive-name-err" message={driverErr.name ?? null} />
          </div>
          <div className={fieldGap}>
            <Label htmlFor="drive-phone">Mobile</Label>
            <Input
              id="drive-phone"
              type="tel"
              name="phone"
              autoComplete="tel"
              value={driver.phone}
              onChange={(e) =>
                setDriver((s) => ({ ...s, phone: e.target.value }))
              }
              aria-invalid={!!driverErr.phone}
              aria-describedby={
                driverErr.phone ? "drive-phone-err" : undefined
              }
            />
            <FieldError id="drive-phone-err" message={driverErr.phone ?? null} />
          </div>
          <div className={fieldGap}>
            <Label htmlFor="drive-area">Usual operating area</Label>
            <Input
              id="drive-area"
              name="area"
              value={driver.area}
              onChange={(e) =>
                setDriver((s) => ({ ...s, area: e.target.value }))
              }
              placeholder="Estate, staging lot, aggregator…"
            />
          </div>
          <Button type="submit">Raise hand</Button>
          {driverOk ? (
            <FormSuccess message="Received. Ops will contact eligible drivers as hardware batches open." />
          ) : null}
        </form>
      </section>
    </div>
  )
}
