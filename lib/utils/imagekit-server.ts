import ImageKit from 'imagekit'

// Initialize ImageKit for server-side use only
export const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || '',
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || '',
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || ''
})

export default imagekit
