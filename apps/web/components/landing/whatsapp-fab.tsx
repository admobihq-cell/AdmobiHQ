const WHATSAPP_NUMBER = "254703643560"
const WHATSAPP_MESSAGE = "Hi Admobi, I'd like to learn more about taxi-top campaigns."

export function WhatsappFab() {
  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with Admobi on WhatsApp"
      className="fixed bottom-[5.25rem] right-4 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_24px_-6px_oklch(0.55_0.18_152/0.45)] outline-none transition-transform duration-200 ease-out hover:-translate-y-0.5 focus-visible:ring-3 focus-visible:ring-[#25D366]/40 lg:bottom-6 lg:right-6"
    >
      <svg
        viewBox="0 0 32 32"
        width="28"
        height="28"
        aria-hidden
        className="drop-shadow-[0_1px_0_oklch(0.32_0.1_152/0.4)]"
      >
        <path
          fill="currentColor"
          d="M16.003 3.2c-7.07 0-12.8 5.73-12.8 12.8 0 2.255.59 4.46 1.71 6.402L3.2 28.8l6.55-1.715a12.77 12.77 0 0 0 6.252 1.6h.005c7.067 0 12.8-5.73 12.8-12.8 0-3.422-1.332-6.638-3.752-9.057A12.71 12.71 0 0 0 16.003 3.2Zm0 23.36h-.003a10.62 10.62 0 0 1-5.412-1.483l-.388-.23-4.005 1.05 1.07-3.905-.253-.4a10.6 10.6 0 0 1-1.625-5.692c0-5.866 4.773-10.64 10.642-10.64a10.57 10.57 0 0 1 7.523 3.118 10.57 10.57 0 0 1 3.117 7.524c-.002 5.867-4.776 10.658-10.666 10.658Zm5.836-7.97c-.32-.16-1.893-.935-2.187-1.042-.293-.107-.506-.16-.72.16-.213.32-.826 1.042-1.013 1.255-.187.213-.373.24-.693.08-.32-.16-1.35-.498-2.572-1.587-.951-.848-1.593-1.894-1.78-2.214-.187-.32-.02-.493.14-.652.144-.143.32-.373.48-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.72-1.734-.986-2.374-.26-.624-.524-.54-.72-.55-.187-.01-.4-.012-.613-.012-.213 0-.56.08-.853.4-.293.32-1.12 1.094-1.12 2.668 0 1.574 1.147 3.094 1.307 3.307.16.213 2.255 3.443 5.464 4.83.764.33 1.36.526 1.825.673.766.244 1.464.21 2.015.127.615-.092 1.893-.774 2.16-1.521.267-.747.267-1.387.187-1.521-.08-.134-.293-.214-.613-.374Z"
        />
      </svg>
    </a>
  )
}
