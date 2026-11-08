import * as React from "react"
import { Button, Hr, Section, Text } from "react-email"

import { EmailLayout, emailStyles } from "@/lib/email/templates/shared/EmailLayout"

interface PaymentReceiptProps {
  amountKes: number
  /** "M-Pesa", "Card", … — already humanised by the caller. */
  method: string
  invoiceNumber: string
  /** Campaign name, or null for a standalone top-up. */
  campaignName: string | null
  paidAt: Date
}

export function billingInvoicesUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://app.admobihq.com"
  return `${base.replace(/\/$/, "")}/billing?tab=invoices`
}

export const formatKes = (amount: number) =>
  amount.toLocaleString("en-KE", { minimumFractionDigits: 0, maximumFractionDigits: 2 })

export const PaymentReceipt = ({
  amountKes,
  method,
  invoiceNumber,
  campaignName,
  paidAt,
}: PaymentReceiptProps) => (
  <EmailLayout preview={`Receipt: KES ${formatKes(amountKes)}`}>
    <Text style={emailStyles.heading}>Payment received</Text>

    <Text style={emailStyles.paragraph}>
      Thanks — we received your payment. Keep this email as your receipt.
    </Text>

    <Text style={emailStyles.label}>Amount</Text>
    <Text style={emailStyles.value}>KES {formatKes(amountKes)}</Text>

    <Text style={emailStyles.label}>For</Text>
    <Text style={emailStyles.value}>{campaignName ?? "Account top-up"}</Text>

    <Text style={emailStyles.label}>Paid by</Text>
    <Text style={emailStyles.value}>{method}</Text>

    <Text style={emailStyles.label}>Invoice</Text>
    <Text style={emailStyles.value}>{invoiceNumber}</Text>

    <Text style={emailStyles.label}>Date</Text>
    <Text style={emailStyles.value}>
      {paidAt.toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi", dateStyle: "medium" })}
    </Text>

    <Section style={emailStyles.buttonWrap}>
      <Button style={emailStyles.button} href={billingInvoicesUrl()}>
        View receipt
      </Button>
    </Section>

    <Hr style={emailStyles.divider} />

    <Text style={emailStyles.meta}>© {new Date().getFullYear()} Admobi</Text>
  </EmailLayout>
)
