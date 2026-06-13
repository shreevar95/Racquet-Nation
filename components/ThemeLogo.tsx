'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeLogo() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const src = !mounted || resolvedTheme === 'dark'
    ? '/images/logos/rn-monogram-white.png'
    : '/images/logos/rn-icon.png'

  return (
    <Image
      src={src}
      alt="RN"
      width={44}
      height={44}
      className="h-8 w-8 object-contain"
      priority
    />
  )
}
