"use client"

import { useState, useRef } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { ImageIcon, Video, Loader2 } from "lucide-react"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { toast } from "sonner"
import "react-quill/dist/quill.snow.css"

// Dynamically import ReactQuill to avoid SSR issues
// @ts-ignore - ReactQuill type compatibility with Next.js dynamic imports
const ReactQuill = dynamic(() => import("react-quill"), { 
  ssr: false,
  loading: () => <div className="min-h-[400px] flex items-center justify-center text-muted-foreground">Loading editor...</div>
}) as any

interface RichTextEditorProps {
  content: string
  onChange: (content: string) => void
  placeholder?: string
}

export function RichTextEditor({ content, onChange, placeholder = "Start writing your blog post..." }: RichTextEditorProps) {
  const [uploading, setUploading] = useState(false)
  const quillRef = useRef<any>(null)

  // Get Quill instance
  const getQuillInstance = () => {
    if (quillRef.current) {
      // Try different ways to access Quill instance
      return quillRef.current.getEditor?.() || quillRef.current.editor || quillRef.current
    }
    return null
  }

  // Custom image handler
  const handleImageUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image size must be less than 10MB")
        return
      }

      setUploading(true)
      try {
        toast.loading("Uploading image...")
        const result = await uploadToImageKit(file, 'blog')
        
        // Insert image using DOM manipulation as fallback
        setTimeout(() => {
          const quill = getQuillInstance()
          if (quill) {
            try {
              const range = quill.getSelection(true)
              quill.insertEmbed(range?.index || 0, 'image', result.url, 'user')
              quill.setSelection((range?.index || 0) + 1)
            } catch (err) {
              // Fallback: insert HTML directly
              const editor = quill.root || quill.container?.querySelector('.ql-editor')
              if (editor) {
                const img = document.createElement('img')
                img.src = result.url
                img.className = 'max-w-full h-auto rounded-lg'
                editor.appendChild(img)
                onChange(editor.innerHTML)
              }
            }
          }
        }, 100)
        
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

  // Custom video handler
  const handleVideoUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'video/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      // Validate file size (max 100MB)
      if (file.size > 100 * 1024 * 1024) {
        toast.error("Video size must be less than 100MB")
        return
      }

      setUploading(true)
      try {
        toast.loading("Uploading video...")
        const result = await uploadToImageKit(file, 'blog/videos')
        
        // Insert video using DOM manipulation
        setTimeout(() => {
          const quill = getQuillInstance()
          if (quill) {
            try {
              const range = quill.getSelection(true)
              const videoHTML = `<video controls class="max-w-full h-auto rounded-lg" style="max-width: 100%; height: auto;"><source src="${result.url}" type="${file.type}"></video>`
              if (quill.clipboard) {
                quill.clipboard.dangerouslyPasteHTML(range?.index || 0, videoHTML, 'user')
              } else {
                // Fallback: insert HTML directly
                const editor = quill.root || quill.container?.querySelector('.ql-editor')
                if (editor) {
                  editor.insertAdjacentHTML('beforeend', videoHTML)
                  onChange(editor.innerHTML)
                }
              }
              quill.setSelection((range?.index || 0) + 1)
            } catch (err) {
              // Fallback: insert HTML directly
              const editor = quill.root || quill.container?.querySelector('.ql-editor')
              if (editor) {
                const video = document.createElement('video')
                video.controls = true
                video.className = 'max-w-full h-auto rounded-lg'
                const source = document.createElement('source')
                source.src = result.url
                source.type = file.type
                video.appendChild(source)
                editor.appendChild(video)
                onChange(editor.innerHTML)
              }
            }
          }
        }, 100)
        
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

  // Custom toolbar with ImageKit upload buttons
  const modules = {
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'indent': '-1'}, { 'indent': '+1' }],
        ['blockquote', 'code-block'],
        ['link'],
        [{ 'align': [] }],
        ['clean']
      ],
      handlers: {
        'image': handleImageUpload,
        'video': handleVideoUpload,
      }
    },
    clipboard: {
      matchVisual: false,
    }
  }

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'blockquote', 'code-block',
    'align'
  ]

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <style jsx global>{`
        .quill {
          background: hsl(var(--background));
        }
        .ql-container {
          font-family: inherit;
          font-size: 1rem;
          min-height: 400px;
        }
        .ql-editor {
          min-height: 400px;
          color: hsl(var(--foreground));
        }
        .ql-editor.ql-blank::before {
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        .ql-toolbar {
          background: hsl(var(--muted) / 0.5);
          border-bottom: 1px solid hsl(var(--border));
        }
        .ql-toolbar .ql-stroke {
          stroke: hsl(var(--foreground));
        }
        .ql-toolbar .ql-fill {
          fill: hsl(var(--foreground));
        }
        .ql-toolbar button:hover,
        .ql-toolbar button.ql-active {
          color: hsl(var(--primary));
        }
        .ql-toolbar button:hover .ql-stroke,
        .ql-toolbar button.ql-active .ql-stroke {
          stroke: hsl(var(--primary));
        }
        .ql-toolbar button:hover .ql-fill,
        .ql-toolbar button.ql-active .ql-fill {
          fill: hsl(var(--primary));
        }
        .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .ql-editor video {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        .ql-editor a {
          color: hsl(var(--primary));
          text-decoration: underline;
        }
        .ql-toolbar .ql-formats {
          margin-right: 0.5rem;
        }
      `}</style>
      
      {/* Custom Upload Buttons */}
      <div className="border-b border-border bg-muted/50 p-2 flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleImageUpload}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ImageIcon className="w-4 h-4" />
          )}
          <span>Image</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleVideoUpload}
          disabled={uploading}
          className="gap-2"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Video className="w-4 h-4" />
          )}
          <span>Video</span>
        </Button>
      </div>

      {/* React Quill Editor */}
      <div className="bg-background">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
          style={{
            backgroundColor: 'transparent',
          }}
          ref={(el: any) => {
            quillRef.current = el
          }}
        />
      </div>
    </div>
  )
}