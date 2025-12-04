"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X, Download, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ImageViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  images: string[]
  title?: string
}

export function ImageViewerModal({ 
  open, 
  onOpenChange, 
  images, 
  title = "Receipt Images" 
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  const currentImage = images[currentIndex]
  const hasMultipleImages = images.length > 1

  const goToPrevious = () => {
    setCurrentIndex(prev => prev === 0 ? images.length - 1 : prev - 1)
  }

  const goToNext = () => {
    setCurrentIndex(prev => prev === images.length - 1 ? 0 : prev + 1)
  }

  const downloadImage = async () => {
    try {
      const response = await fetch(currentImage)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${currentIndex + 1}.jpg`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download image:', error)
    }
  }

  const openInNewTab = () => {
    window.open(currentImage, '_blank')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b pr-12">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {title}
              {hasMultipleImages && (
                <Badge variant="secondary">
                  {currentIndex + 1} of {images.length}
                </Badge>
              )}
            </DialogTitle>
            <div className="flex items-center gap-2 mr-2">
              <Button
                variant="outline"
                size="sm"
                onClick={downloadImage}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={openInNewTab}
                className="flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="relative flex-1 min-h-0">
          {/* Image Container */}
          <div className="relative h-[60vh] flex items-center justify-center bg-black/5">
            {currentImage ? (
              <img
                src={currentImage}
                alt={`Receipt ${currentIndex + 1}`}
                className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder-image.png'
                }}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <p>No image available</p>
              </div>
            )}

            {/* Navigation Arrows */}
            {hasMultipleImages && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={goToPrevious}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white"
                  onClick={goToNext}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Thumbnail Navigation */}
          {hasMultipleImages && (
            <div className="p-4 border-t bg-muted/30">
              <div className="flex gap-2 overflow-x-auto">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentIndex 
                        ? 'border-primary ring-2 ring-primary/20' 
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Receipt ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-image.png'
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
