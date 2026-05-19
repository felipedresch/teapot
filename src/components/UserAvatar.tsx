import { useEffect, useState } from 'react'
import { cn } from '../lib/utils'

type UserAvatarProps = {
  src?: string | null
  name?: string | null
  className?: string
  alt?: string
}

function getInitials(name?: string | null) {
  if (!name) return ''
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
}

export function UserAvatar({ src, name, className, alt }: UserAvatarProps) {
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setHasError(false)
  }, [src])

  if (!src || hasError) {
    return (
      <div
        className={cn(
          'inline-flex items-center justify-center rounded-full bg-blush/35 ring-1 ring-border text-[10px] font-semibold text-espresso/75 select-none',
          className,
        )}
        aria-label={alt ?? name ?? ''}
      >
        {getInitials(name) || (
          <span className="block size-1.5 rounded-full bg-espresso/40" />
        )}
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt ?? name ?? ''}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={cn(
        'rounded-full object-cover ring-1 ring-border',
        className,
      )}
    />
  )
}
