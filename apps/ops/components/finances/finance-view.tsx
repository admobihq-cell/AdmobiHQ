import type { DateRangeKey } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { getOpsAccess } from "@/lib/auth"
import { AttentionTab } from "@/components/finances/attention-tab"
import { BillingDocumentsTab } from "@/components/finances/billing-documents-tab"
import { LedgerTab } from "@/components/finances/ledger-tab"
import { OverviewTab } from "@/components/finances/overview-tab"
import { PayoutsTab } from "@/components/finances/payouts-tab"
import { PaystackTab } from "@/components/finances/paystack-tab"
import { ToolCostsTab } from "@/components/finances/tool-costs-tab"
import { WalletsTab } from "@/components/finances/wallets-tab"
import {
  getFinanceLedger,
  getFinanceOverview,
  getFinancePayouts,
  getFinanceWallets,
  getPaymentsNeedingAttention,
  getRecordOptions,
  getToolCosts,
} from "@/lib/queries/finance"

export { FINANCE_TABS } from "@/lib/navigation"

/**
 * Loads only the open tab. The page has already checked the `finances` permission, and every
 * query is in the same cached module, so there is no money on this page for anyone without it.
 */
export async function FinanceTab({ tab, range }: { tab: string; range: DateRangeKey }) {
  try {
    switch (tab) {
      case "ledger": {
        const [data, options] = await Promise.all([getFinanceLedger(range), getRecordOptions()])
        return <LedgerTab data={data} options={options} />
      }
      case "documents":
        return <BillingDocumentsTab />
      case "wallets":
        return <WalletsTab wallets={await getFinanceWallets()} />
      case "payouts": {
        const [data, access] = await Promise.all([getFinancePayouts(range), getOpsAccess()])
        const canDisburse = access.status === "authorized" && access.permissions.includes("payouts")
        return <PayoutsTab data={data} canDisburse={canDisburse} />
      }
      case "attention":
        return <AttentionTab attention={await getPaymentsNeedingAttention()} />
      case "paystack":
        return <PaystackTab range={range} />
      case "tools":
        return <ToolCostsTab data={await getToolCosts()} />
      default: {
        const [data, options] = await Promise.all([getFinanceOverview(range), getRecordOptions()])
        return <OverviewTab data={data} orgs={options.orgs} />
      }
    }
  } catch (error: unknown) {
    return (
      <ApiErrorBanner
        message={
          error instanceof Error
            ? error.message
            : "Could not load finance data. Check that secrets are loaded with `npm run env:pull -w ops`."
        }
      />
    )
  }
}
