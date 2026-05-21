import { NextResponse } from "next/server"

import { supabase } from "@/lib/supabase"
import { leadBodySchema } from "@/lib/validation/lead-schemas"

export async function POST(req: Request) {
  console.log('[Leads API] NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('[Leads API] NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20) + '...')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = leadBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  let insertData: Record<string, unknown>
  let tableName: string

  if (parsed.data.audience === 'campaign') {
    tableName = 'leads'
    insertData = {
      email: parsed.data.email,
      company_name: parsed.data.company,
      phone: parsed.data.phone || '',
      audience: parsed.data.audience,
      budget_range: parsed.data.budget,
      campaign_start_date: null,
      additional_info: parsed.data.brief || '',
    }
  } else {
    tableName = 'fleet_partners'
    insertData = {
      email: parsed.data.email,
      company_name: parsed.data.fleetOrCompanyName,
      primary_contact_name: parsed.data.primaryContactName,
      phone: parsed.data.phone,
      city: parsed.data.city,
      fleet_types: parsed.data.fleetTypes,
      fleet_size: parsed.data.vehicleCount,
      vehicles_active: parsed.data.vehiclesActive,
      notes: parsed.data.notes || '',
    }
  }

  const { data, error } = await supabase
    .from(tableName)
    .insert([insertData])

  if (error) {
    console.error('[Admobi API leads] Database error:', error)
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 })
  }

  console.log("[Admobi API leads] Saved:", parsed.data)
  return NextResponse.json({ success: true, data })
}
