import { NextRequest, NextResponse } from 'next/server'
import { imagekit } from '@/lib/utils/imagekit-server'

export async function POST(request: NextRequest) {
  try {
    const { file, fileName, folder, useUniqueFileName } = await request.json()

    const result = await imagekit.upload({
      file,
      fileName,
      folder,
      useUniqueFileName: useUniqueFileName !== false, // Default to true
      overwriteFile: false,
      overwriteAITags: false,
      overwriteTags: false,
      overwriteCustomMetadata: false
    })

    return NextResponse.json({
      url: result.url,
      fileId: result.fileId,
      name: result.name,
      size: result.size,
      thumbnailUrl: result.thumbnailUrl || result.url,
      fileType: result.fileType // 'image' or 'video'
    })
  } catch (error) {
    console.error('ImageKit upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
