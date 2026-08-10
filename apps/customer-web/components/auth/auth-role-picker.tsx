import Link from "next/link"

import { AuthSplitShell } from "@workspace/ui/components/auth-split-shell"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { driverPublicUrl } from "@/lib/site-urls"

type Mode = "login" | "signup"

const HERO_PHOTO_SRC = "/auth/hero-advertiser.jpg"

const copy = {
  login: {
    title: "Sign in to Admobi",
    switchPrompt: "Don't have an account?",
    switchLabel: "Sign up",
    switchHref: "/auth/signup",
  },
  signup: {
    title: "Create your Admobi account",
    switchPrompt: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/auth/login",
  },
} as const

/**
 * Pure route picker — no Clerk here. The advertiser choice is a real
 * navigation to /auth/{mode}/advertiser, not a client-state toggle, so
 * Clerk's own internal step navigation (email verification, OAuth
 * callback) never remounts this and loses your place.
 */
export function AuthRolePicker({ mode }: { mode: Mode }) {
  return (
    <AuthSplitShell
      photoSrc={HERO_PHOTO_SRC}
      photoAlt="A Nairobi street at golden hour"
      statement="Book screens that move with the city."
      statementDetail="Zones, schedule, and spend for taxi-top campaigns across Nairobi — one place to run it all."
    >
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-heading text-xl font-medium">{copy[mode].title}</h1>
          <p className="text-sm text-muted-foreground">
            Tell us who you are so we can take you to the right place.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>I&apos;m an advertiser</CardTitle>
            <CardDescription>Book taxi-top campaigns and track your spend.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/auth/${mode}/advertiser`}>Continue as advertiser</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>I&apos;m a driver</CardTitle>
            <CardDescription>Track earnings, routes, and screen-on hours.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <a href={`${driverPublicUrl()}/auth/${mode}`}>Continue as driver</a>
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground">
          {copy[mode].switchPrompt}{" "}
          <Link
            href={copy[mode].switchHref}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {copy[mode].switchLabel}
          </Link>
        </p>
      </div>
    </AuthSplitShell>
  )
}
