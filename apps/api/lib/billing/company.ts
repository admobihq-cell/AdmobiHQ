/**
 * Admobi's own details as printed on every quote and invoice, and the
 * defaults a new document starts with. Lives in code until someone needs to
 * change it often enough to deserve a settings page.
 */
export const ADMOBI_COMPANY = {
  name: "Admobi Media",
  contactPerson: "Victor Musembi",
  city: "Nairobi",
  email: "victor@admobihq.com",
  phone: "+254703643560",
  website: "https://admobihq.com/",
  // TODO(user): Admobi's real KRA PIN. Left empty so nothing fake is printed.
  taxPin: "",
  defaults: {
    note: "Thank you for choosing Admobi.",
    // TODO(user): add bank account and M-Pesa paybill details.
    paymentInstructions: "Pay by bank transfer or M-Pesa. Quote the document number as your reference.",
    quoteTerms: "This quote is valid until the expiry date shown above.",
    invoiceTerms: "Payment is due by the due date shown above.",
  },
} as const
