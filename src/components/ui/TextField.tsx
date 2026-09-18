import { useId, type InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: string
  error?: string
}

export default function TextField({ label, hint, error, id, className = '', ...props }: TextFieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <div className="space-y-2">
      <label htmlFor={fieldId} className="block text-sm font-medium text-fg">{label}</label>
      <input
        {...props}
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${fieldId}-help` : undefined}
        className={`min-h-12 w-full rounded-xl border border-line-strong bg-canvas px-3.5 py-3 text-base text-fg placeholder:text-fg-muted ${className}`}
      />
      {(error || hint) && <p id={`${fieldId}-help`} className={`text-sm ${error ? 'text-danger' : 'text-fg-muted'}`}>{error || hint}</p>}
    </div>
  )
}
