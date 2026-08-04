import { Info, MapPin } from "lucide-react"

import { Avatar, AvatarFallback, AvatarGroup } from "@workspace/ui/components/avatar"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Separator } from "@workspace/ui/components/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip"

import { Sheet, Block } from "./sheet-shell"

const BUTTON_VARIANTS = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const

const CORRIDORS = [
  { name: "Thika Rd — CBD to Kasarani", screens: 42, status: "Live" },
  { name: "Mombasa Rd — CBD to JKIA", screens: 28, status: "Live" },
  { name: "Waiyaki Way — Westlands loop", screens: 17, status: "Scheduled" },
]

export function SheetComponents() {
  return (
    <Sheet
      id="sheet-components"
      index="05"
      title="Components"
      meta="packages/ui/src/components — radix-nova · cva"
      lead="Radix primitives underneath, class-variance-authority on top, every variant reachable through a prop. This is a working sample, not a mockup — every control below is the real component."
    >
      <TooltipProvider>
        <div className="flex flex-col gap-10">
          <Block label="Buttons">
            <div className="divide-y divide-border rounded-xl border border-border">
              {BUTTON_VARIANTS.map((variant) => (
                <div
                  key={variant}
                  className="flex flex-wrap items-center gap-3 px-4 py-3"
                >
                  <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">
                    {variant}
                  </span>
                  <Button variant={variant} size="sm">
                    Start campaign
                  </Button>
                  <Button variant={variant}>Start campaign</Button>
                  <Button variant={variant} size="lg">
                    Start campaign
                  </Button>
                  <Button variant={variant} disabled>
                    Disabled
                  </Button>
                </div>
              ))}
            </div>
          </Block>

          <Block label="Badges">
            <div className="flex flex-wrap gap-2 rounded-xl border border-border p-4">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="ghost">Ghost</Badge>
              <Badge variant="link">Link</Badge>
            </div>
          </Block>

          <Block label="Form fields">
            <div className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ds-campaign">Campaign name</Label>
                <Input id="ds-campaign" placeholder="Nairobi launch week" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ds-budget">Budget (invalid state)</Label>
                <Input
                  id="ds-budget"
                  defaultValue="KES 0"
                  aria-invalid
                  placeholder="Minimum KES 15,000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ds-disabled">Disabled field</Label>
                <Input id="ds-disabled" placeholder="Locked while pending" disabled />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ds-city">Launch city</Label>
                <Select defaultValue="nairobi">
                  <SelectTrigger id="ds-city" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nairobi">Nairobi</SelectItem>
                    <SelectItem value="mombasa">Mombasa</SelectItem>
                    <SelectItem value="kisumu">Kisumu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox id="ds-consent" />
                <Label htmlFor="ds-consent" className="font-normal">
                  Notify fleet managers when this corridor goes live
                </Label>
              </div>
            </div>
          </Block>

          <Block label="Card">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Thika Rd — CBD to Kasarani</CardTitle>
                <CardDescription>42 screens · updated 4 minutes ago</CardDescription>
                <CardAction>
                  <Badge variant="secondary">Live</Badge>
                </CardAction>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Average 1.8M weekly impressions across peak commute
                  windows, geo-fenced to the CBD–Kasarani corridor.
                </p>
              </CardContent>
              <CardFooter className="justify-end gap-2">
                <Button variant="outline" size="sm">
                  View corridor
                </Button>
                <Button size="sm">Book screens</Button>
              </CardFooter>
            </Card>
          </Block>

          <Block label="Overlays">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline">Open dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Pause this campaign?</DialogTitle>
                    <DialogDescription>
                      Screens finish their current loop, then go dark until
                      you resume. Booked corridors stay reserved.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter showCloseButton>
                    <Button variant="destructive">Pause campaign</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Info />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Proof-of-play data lands within 24h</TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Corridors</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Screens</span>
                <Separator orientation="vertical" className="h-4" />
                <span>Drivers</span>
              </div>
            </div>
          </Block>

          <Block label="Avatar">
            <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border p-4">
              <div className="flex items-center gap-2">
                <Avatar size="sm">
                  <AvatarFallback>KE</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>AD</AvatarFallback>
                </Avatar>
                <Avatar size="lg">
                  <AvatarFallback>NB</AvatarFallback>
                </Avatar>
              </div>
              <AvatarGroup>
                <Avatar>
                  <AvatarFallback>
                    <MapPin className="size-4" />
                  </AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>MB</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback>KS</AvatarFallback>
                </Avatar>
              </AvatarGroup>
            </div>
          </Block>

          <Block label="Table">
            <div className="overflow-hidden rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Corridor</TableHead>
                    <TableHead>Screens</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CORRIDORS.map((c) => (
                    <TableRow key={c.name}>
                      <TableCell className="font-medium whitespace-normal text-foreground">
                        {c.name}
                      </TableCell>
                      <TableCell>{c.screens}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "Live" ? "default" : "secondary"}>
                          {c.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Block>
        </div>
      </TooltipProvider>
    </Sheet>
  )
}
