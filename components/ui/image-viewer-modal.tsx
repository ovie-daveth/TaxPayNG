"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X, Download, ExternalLink, FileText } from "lucide-react"
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
  const [pdfLoadError, setPdfLoadError] = useState(false)

  const currentImage = images[currentIndex]
  const hasMultipleImages = images.length > 1
  
  // Check if current file is a PDF - improved detection
  const isPdf = (url: string) => {
    if (!url) return false
    const lowerUrl = url.toLowerCase()
    
    // Check for .pdf extension (with or without query parameters, hash, etc.)
    if (lowerUrl.match(/\.pdf(\?|#|$)/) || lowerUrl.endsWith('.pdf')) {
      return true
    }
    
    // Check for application/pdf in content-type
    if (lowerUrl.includes('application/pdf') || lowerUrl.includes('content-type=application%2Fpdf')) {
      return true
    }
    
    // Check if URL contains PDF indicators in query params
    if (lowerUrl.includes('pdf') && (lowerUrl.includes('content-type') || lowerUrl.includes('contenttype'))) {
      return true
    }
    
    return false
  }
  
  const currentIsPdf = currentImage ? isPdf(currentImage) : false

  // Reset PDF error when image changes
  useEffect(() => {
    if (currentImage) {
      setPdfLoadError(false)
    }
  }, [currentImage])

  const goToPrevious = () => {
    setCurrentIndex(prev => {
      const newIndex = prev === 0 ? images.length - 1 : prev - 1
      setPdfLoadError(false) // Reset error when changing files
      return newIndex
    })
  }

  const goToNext = () => {
    setCurrentIndex(prev => {
      const newIndex = prev === images.length - 1 ? 0 : prev + 1
      setPdfLoadError(false) // Reset error when changing files
      return newIndex
    })
  }

  const downloadFile = async () => {
    try {
      const response = await fetch(currentImage)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const extension = currentIsPdf ? 'pdf' : 'jpg'
      a.download = `receipt-${currentIndex + 1}.${extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Failed to download file:', error)
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
                onClick={downloadFile}
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
          {/* Image/PDF Container */}
          <div className="relative h-[60vh] flex items-center justify-center bg-black/5 overflow-auto">
            {currentImage ? (
              currentIsPdf ? (
                <div className="w-full h-full flex items-center justify-center relative">
                  {pdfLoadError ? (
                    <div className="text-center p-8">
                      <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">Unable to display PDF in viewer</p>
                      <Button
                        onClick={() => window.open(currentImage, '_blank')}
                        className="gap-2"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open PDF in New Tab
                      </Button>
                    </div>
                  ) : (
                    <>
                      <iframe
                        src={`${currentImage}#toolbar=1`}
                        className="w-full h-full border-0 rounded-lg"
                        title={`Receipt PDF ${currentIndex + 1}`}
                        onLoad={() => setPdfLoadError(false)}
                      />
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 z-10">
                        <FileText className="w-4 h-4" />
                        <span>PDF Document</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(currentImage, '_blank')}
                          className="text-white hover:text-white hover:bg-white/20 h-6 px-2 ml-2"
                        >
                          Open in New Tab
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <img
                  src={currentImage}
                  alt={`Receipt ${currentIndex + 1}`}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    // If image fails to load, check if it might be a PDF
                    const url = (e.target as HTMLImageElement).src
                    if (url.toLowerCase().includes('pdf') || url.toLowerCase().includes('.pdf')) {
                      // It's likely a PDF, reload as iframe
                      window.location.href = url
                    } else {
                      e.currentTarget.src = '/placeholder-image.png'
                    }
                  }}
                />
              )
            ) : (
              <div className="text-center text-muted-foreground">
                <p>No file available</p>
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
                {images.map((image, index) => {
                  const imageIsPdf = isPdf(image)
                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentIndex(index)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentIndex 
                          ? 'border-primary ring-2 ring-primary/20' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {imageIsPdf ? (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <FileText className="w-6 h-6 text-muted-foreground" />
                        </div>
                      ) : (
                        <img
                          src={image}
                          alt={`Receipt ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/placeholder-image.png'
                          }}
                        />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
