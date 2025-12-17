"use client"

import { Button } from "./button"
import { Loader2, X } from "lucide-react"

interface DeleteConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting: boolean
  title?: string
  description?: string
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
  title = "Delete Item",
  description = "Are you sure you want to delete this item? This action cannot be undone."
}: DeleteConfirmationModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !isDeleting && onClose()}
      />
      
      {/* Modal */}
      <div className="relative bg-background border border-border rounded-lg shadow-lg w-full max-w-md mx-4 p-6 z-50">
        {/* Close button */}
        {!isDeleting && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Content */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground mt-2">{description}</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50"
              onClick={(e) => {
                console.log('🟢 CONFIRM DELETE BUTTON CLICKED in DeleteConfirmationModal')
                console.log('🟢 isDeleting:', isDeleting)
                e.preventDefault()
                e.stopPropagation()
                onConfirm()
              }}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

