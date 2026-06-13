import { ImageResponse } from 'next/og'
import { readFileSync } from 'fs'
import { join } from 'path'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function Icon() {
  const logoBuffer = readFileSync(
    join(process.cwd(), 'public/images/logos/rn-icon-dark.png'),
  )
  const logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`

  return new ImageResponse(
    (
      <div
        style={{
          background: '#0f1923',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* rn-icon-dark is landscape (2940×1912) — contain centres it with dark navy padding */}
        <img
          src={logoSrc}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    ),
    { ...size },
  )
}
