import { Card, CardContent } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"

/** Matches the wallet balance hero — dark card, balance line, 3-action row. */
export function WalletHeroSkeleton() {
  return (
    <Card className="border-0 bg-primary/90 shadow-none">
      <CardContent className="space-y-6 p-6 md:p-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-40 bg-primary-foreground/25" />
          <Skeleton className="size-6 rounded-full bg-primary-foreground/25" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-9 w-48 bg-primary-foreground/25" />
          <Skeleton className="h-3 w-56 bg-primary-foreground/25" />
        </div>
        <div className="grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg bg-primary-foreground/15" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
