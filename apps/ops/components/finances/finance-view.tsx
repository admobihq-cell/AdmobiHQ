import type { DateRangeKey } from "@workspace/ops-contracts"

import { ApiErrorBanner } from "@workspace/ui/components/api-error-banner"
import { LedgerTab } from "@/components/finances/ledger-tab"
import { OverviewTab } from "@/components/finances/overview-tab"
import { PayoutsTab } from "@/components/finances/payouts-tab"
import { ToolCostsTab } from "@/components/finances/tool-costs-tab"
import { WalletsTab } from "@/components/finances/wallets-tab"
import {
  getFinanceLedger,
  getFinanceOverview,
  getFinancePayouts,
  getFinanceWallets,
  getRecordOptions,
  getToolCosts,
} from "@/lib/queries/finance"

export const FINANCE_TABS = [
  { value: "overview", label: "Overview" },
  { value: "ledger", label: "Ledger" },
  { value: "wallets", label: "Wallets" },
  { value: "payouts", label: "Payouts" },
  { value: "tools", label: "Tool costs" },
]

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
      case "wallets":
        return <WalletsTab wallets={await getFinanceWallets()} />
      case "payouts":
        return <PayoutsTab data={await getFinancePayouts(range)} />
      case "tools":
        return <ToolCostsTab data={await getToolCosts()} />
      default:
        return <OverviewTab data={await getFinanceOverview(range)} />
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
