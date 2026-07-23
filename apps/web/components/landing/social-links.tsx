import { InstagramIcon, LinkedInIcon, TikTokIcon } from "./social-icons"

export const socialLinks = [
  {
    href: "https://www.instagram.com/admobihq/",
    label: "Admobi on Instagram",
    icon: InstagramIcon,
  },
  {
    href: "https://www.tiktok.com/@admobi.media",
    label: "Admobi on TikTok",
    icon: TikTokIcon,
  },
  {
    href: "https://www.linkedin.com/company/admobi-hq/",
    label: "Admobi on LinkedIn",
    icon: LinkedInIcon,
  },
] as const

const socialLinkClass =
  "inline-flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

export function SocialLinks() {
  return (
    <div className="space-y-3">
      <p className="text-foreground font-mono text-[0.6875rem] font-medium uppercase tracking-[0.17em]">
        Follow us
      </p>
      <ul className="flex flex-wrap items-center gap-1">
        {socialLinks.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={socialLinkClass}
            >
              <Icon />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
