import type { DriverDocument, DriverProfile } from "@prisma/client"
import type { DriverDocumentDto, DriverProfileDto } from "@workspace/ops-contracts"

export function toDriverDocumentDto(doc: DriverDocument): DriverDocumentDto {
  return {
    id: doc.id,
    type: doc.type,
    content_type: doc.content_type,
    size_bytes: doc.size_bytes,
    original_filename: doc.original_filename,
    created_at: doc.created_at.toISOString(),
  }
}

export function toDriverProfileDto(
  profile: DriverProfile & { documents: DriverDocument[] },
): DriverProfileDto {
  return {
    id: profile.id,
    full_name: profile.full_name,
    phone: profile.phone,
    city: profile.city,
    national_id_number: profile.national_id_number,
    kra_pin: profile.kra_pin,
    payout_method: profile.payout_method,
    payout_mpesa_msisdn: profile.payout_mpesa_msisdn,
    payout_bank_name: profile.payout_bank_name,
    payout_bank_account: profile.payout_bank_account,
    status: profile.status,
    submitted_at: profile.submitted_at?.toISOString() ?? null,
    reviewed_at: profile.reviewed_at?.toISOString() ?? null,
    rejection_reason: profile.rejection_reason,
    created_at: profile.created_at.toISOString(),
    updated_at: profile.updated_at.toISOString(),
    documents: profile.documents.map(toDriverDocumentDto),
  }
}

/** Fields required before a profile can move from draft/changes_requested to
 * submitted. Returns the list of missing field labels (empty = ready). */
export function missingProfileFields(profile: DriverProfile): string[] {
  const missing: string[] = []
  if (!profile.full_name) missing.push("full_name")
  if (!profile.phone) missing.push("phone")
  if (!profile.city) missing.push("city")
  if (!profile.national_id_number) missing.push("national_id_number")
  if (!profile.kra_pin) missing.push("kra_pin")
  if (!profile.payout_method) {
    missing.push("payout_method")
  } else if (profile.payout_method === "mpesa" && !profile.payout_mpesa_msisdn) {
    missing.push("payout_mpesa_msisdn")
  } else if (
    profile.payout_method === "bank" &&
    (!profile.payout_bank_name || !profile.payout_bank_account)
  ) {
    missing.push("payout_bank_details")
  }
  return missing
}

const REQUIRED_DOCUMENT_TYPES = ["national_id", "profile_photo"] as const

export function missingProfileDocuments(documents: DriverDocument[]): string[] {
  const present = new Set(documents.map((d) => d.type))
  return REQUIRED_DOCUMENT_TYPES.filter((type) => !present.has(type))
}
