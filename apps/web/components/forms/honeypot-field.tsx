type HoneypotFieldProps = {
  value: string
  onChange: (value: string) => void
}

/** Invisible to real visitors; bots that fill every input on a form tend to fill this one too. */
export function HoneypotField({ value, onChange }: HoneypotFieldProps) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor="lf-website">Leave this field blank</label>
      <input
        id="lf-website"
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}
