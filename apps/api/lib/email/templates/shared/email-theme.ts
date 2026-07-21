export const emailColors = {
  canvas: "#F4F0EB",
  surface: "#FDFBF8",
  ink: "#2C2824",
  muted: "#5E5852",
  faint: "#8A837C",
  border: "#DDD6CE",
  primary: "#A85432",
  primaryText: "#FDFBF8",
} as const

export const emailFonts = {
  sans: 'Georgia, "Times New Roman", Times, serif',
  ui: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
} as const

export const emailStyles = {
  main: {
    backgroundColor: emailColors.canvas,
    margin: 0,
    padding: "32px 16px",
    fontFamily: emailFonts.sans,
  },
  container: {
    margin: "0 auto",
    maxWidth: "560px",
  },
  header: {
    borderBottom: `1px solid ${emailColors.border}`,
    marginBottom: "28px",
    paddingBottom: "20px",
  },
  brand: {
    color: emailColors.primary,
    fontFamily: emailFonts.ui,
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.14em",
    lineHeight: "16px",
    margin: 0,
    textTransform: "uppercase" as const,
  },
  content: {
    backgroundColor: emailColors.surface,
    border: `1px solid ${emailColors.border}`,
    borderRadius: "8px",
    padding: "32px 28px",
  },
  heading: {
    color: emailColors.ink,
    fontSize: "24px",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    lineHeight: "30px",
    margin: "0 0 20px",
  },
  paragraph: {
    color: emailColors.muted,
    fontSize: "16px",
    lineHeight: "26px",
    margin: "0 0 16px",
  },
  label: {
    color: emailColors.faint,
    fontFamily: emailFonts.ui,
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.08em",
    lineHeight: "14px",
    margin: "0 0 6px",
    textTransform: "uppercase" as const,
  },
  value: {
    color: emailColors.ink,
    fontSize: "15px",
    lineHeight: "22px",
    margin: "0 0 18px",
  },
  list: {
    margin: "0 0 20px",
    padding: 0,
  },
  listItem: {
    color: emailColors.muted,
    fontSize: "15px",
    lineHeight: "24px",
    margin: "0 0 8px",
    paddingLeft: "14px",
  },
  buttonWrap: {
    margin: "28px 0 8px",
  },
  button: {
    backgroundColor: emailColors.primary,
    borderRadius: "6px",
    color: emailColors.primaryText,
    display: "inline-block",
    fontFamily: emailFonts.ui,
    fontSize: "14px",
    fontWeight: 600,
    lineHeight: "20px",
    padding: "12px 20px",
    textDecoration: "none",
  },
  divider: {
    borderColor: emailColors.border,
    margin: "24px 0",
  },
  footer: {
    marginTop: "24px",
    paddingTop: "8px",
  },
  footerText: {
    color: emailColors.faint,
    fontFamily: emailFonts.ui,
    fontSize: "12px",
    lineHeight: "18px",
    margin: "0 0 6px",
  },
  link: {
    color: emailColors.primary,
    textDecoration: "underline",
  },
  meta: {
    color: emailColors.faint,
    fontFamily: emailFonts.ui,
    fontSize: "12px",
    lineHeight: "18px",
    margin: 0,
  },
} as const
