"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ImageIcon, Video, Loader2, Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Undo, Redo, Link as LinkIcon } from "lucide-react"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder = "Start writing your blog post..." }: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState("")
  const [selectedText, setSelectedText] = useState("")

  // Update editor content when prop changes
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      const selection = window.getSelection()
      const range = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null
      const cursorOffset = range ? range.startOffset : null
      
      // Clean content and ensure LTR
      let cleanContent = content
      cleanContent = cleanContent.replace(/dir=["']rtl["']/gi, 'dir="ltr"')
      cleanContent = cleanContent.replace(/style="[^"]*direction:\s*rtl[^"]*"/gi, '')
      cleanContent = cleanContent.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      
      editorRef.current.innerHTML = cleanContent
      
      // Force LTR on all elements
      forceLTR(editorRef.current)
      
      // Try to restore cursor position
      if (range && cursorOffset !== null) {
        try {
          const newRange = document.createRange()
          const textNode = editorRef.current.childNodes[0] as Text
          if (textNode && textNode.nodeType === Node.TEXT_NODE) {
            newRange.setStart(textNode, Math.min(cursorOffset, textNode.length))
            newRange.collapse(true)
            selection?.removeAllRanges()
            selection?.addRange(newRange)
          }
        } catch (e) {
          // Ignore cursor restoration errors
        }
      }
    }
  }, [content])

  const forceLTR = (element: HTMLElement) => {
    element.setAttribute('dir', 'ltr')
    element.style.direction = 'ltr'
    element.style.textAlign = 'left'
    element.style.unicodeBidi = 'bidi-override'
    
    // Fix all child elements
    const allElements = element.querySelectorAll('*')
    allElements.forEach((el: Element) => {
      (el as HTMLElement).setAttribute('dir', 'ltr')
      ;(el as HTMLElement).style.direction = 'ltr'
      ;(el as HTMLElement).style.unicodeBidi = 'bidi-override'
    })
  }

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      forceLTR(editorRef.current)
    }
    editorRef.current?.focus()
    handleContentChange()
  }

  const handleContentChange = () => {
    if (editorRef.current) {
      forceLTR(editorRef.current)
      
      let htmlContent = editorRef.current.innerHTML
      htmlContent = htmlContent.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
      
      onChange(htmlContent)
    }
  }

  const handleImageUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB")
        return
      }

      setUploading(true)
      try {
        toast.loading("Uploading image...")
        const result = await uploadToImageKit(file, 'blog')
        
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        
        const img = document.createElement('img')
        img.src = result.url
        img.className = 'max-w-full h-auto rounded-lg my-4'
        img.alt = file.name
        
        if (range) {
          range.deleteContents()
          range.insertNode(img)
        } else if (editorRef.current) {
          editorRef.current.appendChild(img)
        }
        
        const newRange = document.createRange()
        newRange.setStartAfter(img)
        newRange.collapse(true)
        selection?.removeAllRanges()
        selection?.addRange(newRange)
        
        handleContentChange()
        toast.dismiss()
        toast.success("Image uploaded successfully!")
      } catch (error) {
        toast.dismiss()
        toast.error("Failed to upload image. Please try again.")
        console.error("Image upload error:", error)
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const handleVideoUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (file.size > 100 * 1024 * 1024) {
        toast.error("Video size must be less than 100MB")
        return
      }

      setUploading(true)
      try {
        toast.loading("Uploading video...")
        const result = await uploadToImageKit(file, 'blog/videos')
        
        const selection = window.getSelection()
        const range = selection?.getRangeAt(0)
        
        const video = document.createElement('video')
        video.controls = true
        video.className = 'max-w-full h-auto rounded-lg my-4'
        const source = document.createElement('source')
        source.src = result.url
        source.type = file.type
        video.appendChild(source)
        
        if (range) {
          range.deleteContents()
          range.insertNode(video)
        } else if (editorRef.current) {
          editorRef.current.appendChild(video)
        }
        
        const newRange = document.createRange()
        newRange.setStartAfter(video)
        newRange.collapse(true)
        selection?.removeAllRanges()
        selection?.addRange(newRange)
        
        handleContentChange()
        toast.dismiss()
        toast.success("Video uploaded successfully!")
      } catch (error) {
        toast.dismiss()
        toast.error("Failed to upload video. Please try again.")
        console.error("Video upload error:", error)
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const handleLink = () => {
    const selection = window.getSelection()
    const selectedText = selection?.toString() || ""
    setSelectedText(selectedText)
    if (selectedText) {
      setShowLinkDialog(true)
    } else {
      toast.error("Please select text to add a link")
    }
  }

  const insertLink = () => {
    if (!linkUrl.trim()) {
      toast.error("Please enter a URL")
      return
    }
    
    const selection = window.getSelection()
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0)
      const link = document.createElement('a')
      link.href = linkUrl
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.className = 'text-primary underline'
      link.textContent = selectedText || linkUrl
      
      try {
        range.deleteContents()
        range.insertNode(link)
        handleContentChange()
        setShowLinkDialog(false)
        setLinkUrl("")
        setSelectedText("")
      } catch (error) {
        execCommand('createLink', linkUrl)
      }
    }
  }

  const isCommandActive = (command: string): boolean => {
    return document.queryCommandState(command)
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden" dir="ltr" style={{ direction: 'ltr' }}>
      <style jsx global>{`
        .rich-text-editor {
          min-height: 400px;
          padding: 1rem;
          outline: none;
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: bidi-override !important;
          writing-mode: horizontal-tb !important;
        }
        .rich-text-editor * {
          direction: ltr !important;
          text-align: left !important;
          unicode-bidi: bidi-override !important;
        }
        .rich-text-editor:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        .rich-text-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .rich-text-editor video {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .rich-text-editor a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .rich-text-editor h1 {
          font-size: 2rem;
          font-weight: bold;
          margin: 1rem 0;
        }
        .rich-text-editor h2 {
          font-size: 1.5rem;
          font-weight: bold;
          margin: 1rem 0;
        }
        .rich-text-editor h3 {
          font-size: 1.25rem;
          font-weight: bold;
          margin: 1rem 0;
        }
        .rich-text-editor ul, .rich-text-editor ol {
          margin: 1rem 0;
          padding-left: 2rem;
        }
        .rich-text-editor blockquote {
          border-left: 4px solid hsl(var(--border));
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
        }
        .rich-text-editor p {
          margin: 0.5rem 0;
        }
      `}</style>
      
      {/* Toolbar */}
      <div className="border-b border-border bg-muted/50 p-2 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('bold')}
          className={isCommandActive('bold') ? 'bg-background' : ''}
        >
          <Bold className="w-4 h-4" />
        </Button>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('italic')}
          className={isCommandActive('italic') ? 'bg-background' : ''}
        >
          <Italic className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', '<h1>')}
          title="Heading 1"
        >
          <Heading1 className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', '<h2>')}
          title="Heading 2"
        >
          <Heading2 className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('formatBlock', '<h3>')}
          title="Heading 3"
        >
          <Heading3 className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertUnorderedList')}
          className={isCommandActive('insertUnorderedList') ? 'bg-background' : ''}
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('insertOrderedList')}
          className={isCommandActive('insertOrderedList') ? 'bg-background' : ''}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <div className="w-px h-6 bg-border" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLink}
        >
          <LinkIcon className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageUpload}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleVideoUpload}
          disabled={uploading}
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Video className="w-4 h-4" />
          )}
        </Button>

        <div className="w-px h-6 bg-border ml-auto" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('undo')}
        >
          <Undo className="w-4 h-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => execCommand('redo')}
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor */}
      <div className="bg-background" dir="ltr" style={{ direction: 'ltr', textAlign: 'left' }}>
        <div
          ref={editorRef}
          contentEditable
          className="rich-text-editor prose prose-lg dark:prose-invert max-w-none focus:outline-none"
          data-placeholder={placeholder}
          onInput={handleContentChange}
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData.getData('text/plain')
            
            if (text) {
              const cleanText = text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
              const selection = window.getSelection()
              if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0)
                range.deleteContents()
                const textNode = document.createTextNode(cleanText)
                range.insertNode(textNode)
                range.setStartAfter(textNode)
                range.collapse(true)
                selection.removeAllRanges()
                selection.addRange(range)
                handleContentChange()
              }
            }
          }}
          dir="ltr"
          spellCheck
        />
      </div>

      {/* Link Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Link</DialogTitle>
            <DialogDescription>Enter the URL for the selected text</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  insertLink()
                }
              }}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
                Cancel
              </Button>
              <Button onClick={insertLink}>
                Add Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}