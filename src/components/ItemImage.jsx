import { useEffect, useState } from 'react'

// Shows an image that is stored as a Blob in the local database.
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

  return url ? <img className={className} src={url} alt={alt} draggable={false} /> : null
}
