interface Props {
  name: string
  logoUrl?: string | null
  primaryColor?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE = {
  xs: 'h-5 w-5 text-[8px] rounded-md',
  sm: 'h-7 w-7 text-[10px] rounded-lg',
  md: 'h-9 w-9 text-xs rounded-lg',
  lg: 'h-14 w-14 text-base rounded-xl',
}

export function TeamAvatar({ name, logoUrl, primaryColor, size = 'md', className = '' }: Props) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div
      className={`${SIZE[size]} overflow-hidden flex items-center justify-center font-black shrink-0 ${className}`}
      style={{ background: logoUrl ? undefined : (primaryColor ?? '#1c2e44') }}
    >
      {logoUrl ? (
        <img src={logoUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="text-white/90 font-black leading-none">{initials}</span>
      )}
    </div>
  )
}
