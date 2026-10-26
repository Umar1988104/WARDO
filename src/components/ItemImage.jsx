import { useEffect, useState } from 'react'

// Shows an image that is stored as a Blob in the local database.
// Lazy + async decoding: pictures far off-screen are not decoded until you scroll near them.
export default function ItemImage({ blob, alt = '', className }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return undefined
    }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])

  return url ? <img className={className} src={url} alt={alt} loading="lazy" decoding="async" draggable={false} /> : null
}
