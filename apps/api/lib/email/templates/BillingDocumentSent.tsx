import * as React from "react"
import { Button, Hr, Section, Text } from "react-email"

import { billingInvoicesUrl, formatKes } from "@/lib/email/templates/PaymentReceipt"
import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface BillingDocumentSentProps {
  kind: "quote" | "invoice"
  number: string
  customerName: string
  totalKes: number
  /** Due date for an invoice, expiry for a quote. "21 Nov 2026". */
  dueLabel: string
  campaignName: string | null
  /** Only advertisers with an Admobi account get the button; prospects just get the PDF. */
  hasAccount: boolean
}

/** Sent with the PDF attached when ops marks a quote or invoice as sent. */
export const BillingDocumentSent = ({
  kind,
  number,
  customerName,
  totalKes,
  dueLabel,
  campaignName,
  hasAccount,
}: BillingDocumentSentProps) => {
  const noun = kind === "quote" ? "quotation" : "invoice"
  return (
    <EmailLayout preview={`${kind === "quote" ? "Quotation" : "Invoice"} ${number}: KES ${formatKes(totalKes)}`}>
      <Text style={emailStyles.heading}>
        {kind === "quote" ? "Your quotation from Admobi" : "Your invoice from Admobi"}
      </Text>

      <Text style={emailStyles.paragraph}>
        Hello {customerName}, please find {noun} {number} attached as a PDF.
      </Text>

      <Text style={emailStyles.label}>{kind === "quote" ? "Quoted total" : "Amount due"}</Text>
      <Text style={emailStyles.value}>KES {formatKes(totalKes)}</Text>

      <Text style={emailStyles.label}>{kind === "quote" ? "Valid until" : "Due by"}</Text>
      <Text style={emailStyles.value}>{dueLabel}</Text>

      {campaignName ? (
        <>
          <Text style={emailStyles.label}>Campaign</Text>
          <Text style={emailStyles.value}>{campaignName}</Text>
        </>
      ) : null}

      {hasAccount ? (
        <Section style={emailStyles.buttonWrap}>
          <Button style={emailStyles.button} href={billingInvoicesUrl()}>
            View in Billing
          </Button>
        </Section>
      ) : null}

      <Hr style={emailStyles.divider} />

      <Text style={emailStyles.meta}>
        Questions about this {noun}? Reply to your account manager. © {new Date().getFullYear()} Admobi
      </Text>
    </EmailLayout>
  )
}
