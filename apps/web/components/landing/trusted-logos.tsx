import Image from "next/image"

import { Container } from "./container"

const PREFIX = "/logo%20Carousel"

const logos = [
  { src: `${PREFIX}/safaricom.png`, alt: "Safaricom" },
  { src: `${PREFIX}/naivas.png`, alt: "Naivas" },
  { src: `${PREFIX}/sarova.png`, alt: "Sarova Hotels" },
  { src: `${PREFIX}/eabl.png`, alt: "EABL" },
  { src: `${PREFIX}/java.png`, alt: "Java House" },
  { src: `${PREFIX}/chickenInn.png`, alt: "Chicken Inn" },
  { src: `${PREFIX}/strath.png`, alt: "Strathmore University" },
  { src: `${PREFIX}/tsavo.png`, alt: "Tsavo" },
] as const

function LogoChip({ logo }: { logo: (typeof logos)[number] }) {
  return (
    <div className="flex h-14 w-[7.5rem] shrink-0 items-center justify-center px-3 sm:h-16 sm:w-36">
      <Image
        src={logo.src}
        alt={logo.alt}
        width={120}
        height={48}
        className="max-h-9 w-auto max-w-[6.5rem] object-contain opacity-[0.88] sm:max-h-10"
      />
    </div>
  )
}

export function TrustedLogosSection() {
  const strip = [...logos, ...logos]

  return (
    <section className="scroll-mt-20 border-b border-border py-14 sm:py-20">
      <Container>
        <div className="max-w-2xl space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2rem]">
            The brands we&apos;re built for
          </h2>
          <p className="text-muted-foreground text-base leading-relaxed sm:text-lg">
            Teams that reward motion-in-market storytelling and repeatable launch windows.
          </p>
        </div>

        <div className="motion-reduce:hidden mt-12 overflow-hidden">
          <div className="trusted-logo-marquee-track flex w-max items-center gap-8 sm:gap-12 lg:gap-14">
            {strip.map((logo, idx) => (
              <LogoChip key={`${logo.src}-${idx}`} logo={logo} />
            ))}
          </div>
        </div>

        <div className="mt-12 hidden flex-wrap gap-x-8 gap-y-6 motion-reduce:flex sm:gap-x-12 sm:gap-y-8">
          {logos.map((logo) => (
            <LogoChip key={logo.src} logo={logo} />
          ))}
        </div>
      </Container>
    </section>
  )
}
