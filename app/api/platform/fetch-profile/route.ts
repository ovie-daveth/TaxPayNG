import { NextRequest, NextResponse } from 'next/server'

interface ProfileData {
  name?: string
  avatar?: string
  description?: string
  followerCount?: number
  verified?: boolean
  platform?: string
}

/**
 * Fetch profile information from a platform URL or username
 * Uses Open Graph meta tags and platform-specific APIs where available
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, platform, username } = body

    if (!url && !username) {
      return NextResponse.json(
        { error: 'URL or username is required' },
        { status: 400 }
      )
    }

    // If we have a URL, fetch Open Graph data
    if (url) {
      try {
        // Fetch the page
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          signal: AbortSignal.timeout(10000) // 10 second timeout
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const html = await response.text()
        
        // Extract Open Graph meta tags
        const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]
        const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1]
        const ogDescription = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1]
        
        // Extract Twitter Card data as fallback
        const twitterTitle = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)?.[1]
        const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)?.[1]
        const twitterDescription = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)?.[1]

        // Extract page title as fallback
        const pageTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]

        const profileData: ProfileData = {
          name: ogTitle || twitterTitle || pageTitle || undefined,
          avatar: ogImage || twitterImage || undefined,
          description: ogDescription || twitterDescription || undefined,
          platform: platform || extractPlatformFromUrl(url)
        }

        return NextResponse.json({
          success: true,
          data: profileData
        })
      } catch (error) {
        console.error('Error fetching profile from URL:', error)
        // Return partial data if we can extract platform info
        return NextResponse.json({
          success: true,
          data: {
            platform: platform || extractPlatformFromUrl(url),
            name: extractUsernameFromUrl(url) || username
          }
        })
      }
    }

    // If we only have username, try to construct URL based on platform
    if (username && platform) {
      const platformUrl = constructPlatformUrl(platform, username)
      if (platformUrl) {
        try {
          // Fetch the constructed URL
          const response = await fetch(platformUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(10000)
          })

          if (response.ok) {
            const html = await response.text()
            
            // Extract Open Graph meta tags
            const ogTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)?.[1]
            const ogImage = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i)?.[1]
            const ogDescription = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i)?.[1]
            
            // Extract Twitter Card data as fallback
            const twitterTitle = html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)?.[1]
            const twitterImage = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i)?.[1]
            const twitterDescription = html.match(/<meta\s+name=["']twitter:description["']\s+content=["']([^"']+)["']/i)?.[1]

            // Extract page title as fallback
            const pageTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]

            const profileData: ProfileData = {
              name: ogTitle || twitterTitle || pageTitle || username,
              avatar: ogImage || twitterImage || undefined,
              description: ogDescription || twitterDescription || undefined,
              platform: platform
            }

            return NextResponse.json({
              success: true,
              data: {
                ...profileData,
                url: platformUrl // Include the constructed URL
              }
            })
          }
        } catch (error) {
          console.error('Error fetching profile from constructed URL:', error)
        }
      }
      
      // Return basic data with constructed URL
      return NextResponse.json({
        success: true,
        data: {
          name: username,
          platform: platform,
          url: platformUrl || undefined
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        name: username,
        platform: platform
      }
    })
  } catch (error) {
    console.error('Error fetching platform profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile information' },
      { status: 500 }
    )
  }
}

function extractPlatformFromUrl(url: string): string | undefined {
  const urlLower = url.toLowerCase()
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'YouTube'
  if (urlLower.includes('tiktok.com')) return 'TikTok'
  if (urlLower.includes('instagram.com')) return 'Instagram'
  if (urlLower.includes('facebook.com')) return 'Facebook'
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'Twitter'
  if (urlLower.includes('patreon.com')) return 'Patreon'
  if (urlLower.includes('onlyfans.com')) return 'OnlyFans'
  if (urlLower.includes('twitch.tv')) return 'Twitch'
  if (urlLower.includes('spotify.com')) return 'Spotify'
  if (urlLower.includes('apple.com')) return 'Apple Music'
  if (urlLower.includes('amazon.com')) return 'Amazon'
  if (urlLower.includes('etsy.com')) return 'Etsy'
  if (urlLower.includes('shopify.com')) return 'Shopify'
  if (urlLower.includes('linkedin.com')) return 'LinkedIn'
  if (urlLower.includes('snapchat.com')) return 'Snapchat'
  if (urlLower.includes('pinterest.com')) return 'Pinterest'
  if (urlLower.includes('medium.com')) return 'Medium'
  if (urlLower.includes('substack.com')) return 'Substack'
  if (urlLower.includes('gumroad.com')) return 'Gumroad'
  return undefined
}

function extractUsernameFromUrl(url: string): string | undefined {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split('/').filter(p => p)
    
    // Common patterns
    if (pathParts.length > 0) {
      const username = pathParts[pathParts.length - 1]
      // Remove query params and fragments
      return username.split('?')[0].split('#')[0]
    }
  } catch (e) {
    // Invalid URL
  }
  return undefined
}

function constructPlatformUrl(platform: string, username: string): string | null {
  const cleanUsername = username.replace('@', '').trim()
  
  const platformUrls: Record<string, string> = {
    'YouTube': `https://www.youtube.com/@${cleanUsername}`,
    'TikTok': `https://www.tiktok.com/@${cleanUsername}`,
    'Instagram': `https://www.instagram.com/${cleanUsername}`,
    'Facebook': `https://www.facebook.com/${cleanUsername}`,
    'Twitter': `https://twitter.com/${cleanUsername}`,
    'Patreon': `https://www.patreon.com/${cleanUsername}`,
    'OnlyFans': `https://onlyfans.com/${cleanUsername}`,
    'Twitch': `https://www.twitch.tv/${cleanUsername}`,
    'LinkedIn': `https://www.linkedin.com/in/${cleanUsername}`,
    'Pinterest': `https://www.pinterest.com/${cleanUsername}`,
    'Medium': `https://medium.com/@${cleanUsername}`,
    'Substack': `https://${cleanUsername}.substack.com`,
    'Gumroad': `https://${cleanUsername}.gumroad.com`
  }
  
  return platformUrls[platform] || null
}

