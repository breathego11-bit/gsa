import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    helpText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helpText, className = '', id, ...props }, ref) => {
        const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label htmlFor={inputId} className="form-label">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    id={inputId}
                    className={`form-input ${error ? 'border-error focus:border-error focus:shadow-none' : ''} ${className}`}
                    {...props}
                />
                {error && (
                    <p className="text-xs" style={{ color: 'var(--error)' }}>
                        {error}
                    </p>
                )}
                {helpText && !error && (
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {helpText}
                    </p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'
