"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ImageIcon, Video, Loader2, Bold, Italic, List, ListOrdered, Heading1, Heading2, Heading3, Undo, Redo, Link as LinkIcon, Table as TableIcon } from "lucide-react"
import { uploadToImageKit } from "@/lib/utils/imagekit"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "span",
  "div",
  "blockquote",
  "pre",
  "code",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "colgroup",
  "col",
  "a",
  "img",
  "figure",
  "figcaption",
  "hr"
])

const ALLOWED_ATTRS: Record<string, string[]> = {
  "*": ["class", "style"],
  a: ["href", "title", "target", "rel"],
  img: ["src", "alt", "title", "width", "height"],
  col: ["span", "width", "style"]
}

const ALLOWED_STYLE_PROPERTIES = new Set([
  "text-align",
  "font-weight",
  "font-style",
  "text-decoration",
  "border",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-collapse",
  "table-layout",
  "margin",
  "margin-left",
  "margin-right",
  "margin-top",
  "margin-bottom",
  "padding",
  "padding-left",
  "padding-right",
  "padding-top",
  "padding-bottom",
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
  "color",
  "background-color",
  "font-size",
  "line-height",
  "letter-spacing"
])

const sanitizeStyleValue = (styleValue: string): string => {
  const safeRules = styleValue
    .split(";")
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const [property, ...valueParts] = rule.split(":")
      if (!property || valueParts.length === 0) return null

      const propName = property.trim().toLowerCase()
      const propValue = valueParts.join(":").trim()

      if (!ALLOWED_STYLE_PROPERTIES.has(propName)) return null

      const forbiddenPatterns = /(expression|url\s*\(|javascript:|vbscript:)/i
      if (forbiddenPatterns.test(propValue)) return null

      if (propName === "direction" || propName === "unicode-bidi") return null

      if (propName === "width" || propName === "min-width" || propName === "max-width") {
        if (!/^(\d+(\.\d+)?)(px|%)$/.test(propValue)) {
          return null
        }
      }

      if (propName === "height" || propName === "min-height" || propName === "max-height") {
        if (!/^(\d+(\.\d+)?)(px|%)$/.test(propValue)) {
          return null
        }
      }

      return `${propName}: ${propValue}`
    })
    .filter((rule): rule is string => Boolean(rule))

  return safeRules.join("; ")
}

const isSafeUrl = (url: string) => {
  const trimmed = url.trim().toLowerCase()
  if (trimmed === "") return false
  if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) return false
  return true
}

const plainTextToHtml = (text: string): string => {
  const cleaned = text.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
  const normalized = cleaned.replace(/\r\n?/g, "\n")
  const paragraphs = normalized.split(/\n{2,}/)

  return paragraphs
    .map((para) => {
      const trimmed = para.trim()
      if (!trimmed) {
        return "<p><br /></p>"
      }
      const lines = trimmed.split("\n")
      const htmlLines = lines.map((line) => line || "<br />")
      return `<p>${htmlLines.join("<br />")}</p>`
    })
    .join("")
}

const sanitizePastedContent = (rawHtml: string): string => {
  const parser = new DOMParser()
  const parsedDoc = parser.parseFromString(rawHtml, "text/html")

  if (!parsedDoc || !parsedDoc.body || parsedDoc.querySelector("parsererror")) {
    return ""
  }

  const walk = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      const tagName = el.tagName.toLowerCase()

      if (!ALLOWED_TAGS.has(tagName)) {
        const parent = el.parentNode
        if (parent) {
          while (el.firstChild) {
            parent.insertBefore(el.firstChild, el)
          }
          parent.removeChild(el)
        }
        return
      }

      const allowedAttrs = new Set([
        ...(ALLOWED_ATTRS["*"] || []),
        ...(ALLOWED_ATTRS[tagName] || [])
      ])

      Array.from(el.attributes).forEach((attr) => {
        const attrName = attr.name.toLowerCase()
        const attrValue = attr.value

        if (attrName.startsWith("on")) {
          el.removeAttribute(attr.name)
          return
        }

        if (!allowedAttrs.has(attrName)) {
          el.removeAttribute(attr.name)
          return
        }

        if (attrName === "style") {
          const sanitizedStyle = sanitizeStyleValue(attrValue)
          if (sanitizedStyle) {
            el.setAttribute("style", sanitizedStyle)
          } else {
            el.removeAttribute("style")
          }
          return
        }

        if (attrName === "href") {
          if (!isSafeUrl(attrValue)) {
            el.removeAttribute("href")
            return
          }
          el.setAttribute("target", "_blank")
          el.setAttribute("rel", "noopener noreferrer")
        }

        if (attrName === "src" && !isSafeUrl(attrValue)) {
          el.removeAttribute("src")
        }

        if (attrName === "dir") {
          el.setAttribute("dir", "ltr")
        }
      })
    }

    const children = Array.from(node.childNodes)
    children.forEach(walk)
  }

  const root = parsedDoc.body
  if (!root) {
    return ""
  }

  walk(root)

  return root.innerHTML.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "")
}

const MIN_COLUMN_WIDTH_PX = 60

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
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [tableRows, setTableRows] = useState(2)
  const [tableCols, setTableCols] = useState(2)
  const savedSelectionRef = useRef<Range | null>(null)
  const columnResizeStateRef = useRef<{
    table: HTMLTableElement
    colIndex: number
    cell: HTMLElement
    startX: number
    startWidthLeft: number
    startWidthRight: number
    initialTableWidth: number
    colElements: HTMLTableColElement[]
    wrapper: HTMLElement | null
  } | null>(null)
  const tableResizeStateRef = useRef<{
    wrapper: HTMLElement
    table: HTMLTableElement
    startX: number
    startWidth: number
    minWidth: number
  } | null>(null)
  const tableDragStateRef = useRef<{
    wrapper: HTMLElement | null
  }>({ wrapper: null })
  const isApplyingContentRef = useRef(false)
  const pendingContentUpdateRef = useRef<string | null>(null)
  const pendingChangeTimeoutRef = useRef<number | null>(null)

  const wrapTableForResize = useCallback((table: HTMLTableElement): HTMLElement => {
    const existingWrapper = table.closest('.table-resize-wrapper') as HTMLElement | null
    if (existingWrapper) {
      return existingWrapper
    }

    const wrapper = document.createElement('div')
    wrapper.className = 'table-resize-wrapper'
    table.parentNode?.insertBefore(wrapper, table)
    wrapper.appendChild(table)
    return wrapper
  }, [])

  const ensureColGroup = useCallback((table: HTMLTableElement): HTMLTableColElement[] => {
    let colgroup = table.querySelector('colgroup')
    const columnCount = table.rows[0]?.cells.length ?? 0

    if (columnCount === 0) {
      return []
    }

    const defaultWidth = 100 / columnCount

    if (!colgroup) {
      colgroup = document.createElement('colgroup')
      for (let i = 0; i < columnCount; i++) {
        const col = document.createElement('col')
        col.style.width = `${defaultWidth}%`
        colgroup.appendChild(col)
      }
      table.insertBefore(colgroup, table.firstChild)
    } else {
      const currentCols = colgroup.children.length

      if (currentCols < columnCount) {
        for (let i = currentCols; i < columnCount; i++) {
          const col = document.createElement('col')
          col.style.width = `${defaultWidth}%`
          colgroup.appendChild(col)
        }
      } else if (currentCols > columnCount) {
        for (let i = currentCols - 1; i >= columnCount; i--) {
          colgroup.children[i]?.remove()
        }
      }

      const cols = Array.from(colgroup.children) as HTMLTableColElement[]
      const hasWidths = cols.some((col) => col.style.width)
      if (!hasWidths) {
        cols.forEach((col) => {
          col.style.width = `${defaultWidth}%`
        })
      }
    }

    return Array.from(table.querySelectorAll('colgroup col')) as HTMLTableColElement[]
  }, [])

  const normalizeColumnWidths = useCallback(
    (table: HTMLTableElement, colElements: HTMLTableColElement[]) => {
      const firstRow = table.rows[0]
      if (!firstRow || colElements.length === 0) {
        return
      }

      const tableRect = table.getBoundingClientRect()
      const totalWidth = tableRect.width || colElements.length * MIN_COLUMN_WIDTH_PX
      const fallback = totalWidth / colElements.length || MIN_COLUMN_WIDTH_PX

      Array.from(firstRow.cells).forEach((cell, index) => {
        const cellElement = cell as HTMLElement
        const width = Math.max(MIN_COLUMN_WIDTH_PX, cellElement.getBoundingClientRect().width || fallback)
        if (colElements[index]) {
          const percent = (width / totalWidth) * 100
          colElements[index].style.width = `${percent}%`
        }
      })

      colElements.forEach((col, index) => {
        if (index >= firstRow.cells.length) {
          const percent = (fallback / totalWidth) * 100
          col.style.width = `${percent}%`
        }
      })
    },
    []
  )

  const addColumnHandles = useCallback((table: HTMLTableElement) => {
    const allCells = Array.from(table.querySelectorAll('th, td')) as HTMLElement[]
    allCells.forEach((cell) => {
      cell.style.position = 'relative'
      if (!cell.style.minWidth) {
        cell.style.minWidth = `${MIN_COLUMN_WIDTH_PX}px`
      }
    })

    const firstRow = table.rows[0]
    if (!firstRow) {
      return
    }

    Array.from(firstRow.cells).forEach((cell, index, cells) => {
      const cellElement = cell as HTMLElement
      cellElement.querySelectorAll('.column-resize-handle').forEach((handle) => handle.remove())

      if (index === cells.length - 1) {
        return
      }

      const handle = document.createElement('span')
      handle.className = 'column-resize-handle'
      handle.dataset.colIndex = String(index)
      cellElement.appendChild(handle)
    })
  }, [])

  const addCornerHandle = useCallback((wrapper: HTMLElement) => {
    let handle = wrapper.querySelector('.table-corner-handle') as HTMLElement | null
    if (!handle) {
      handle = document.createElement('span')
      handle.className = 'table-corner-handle'
      wrapper.appendChild(handle)
    }
  }, [])

  const addTableToolbar = useCallback((wrapper: HTMLElement) => {
    let toolbar = wrapper.querySelector('.table-toolbar') as HTMLElement | null
    if (!toolbar) {
      toolbar = document.createElement('div')
      toolbar.className = 'table-toolbar'

      const dragButton = document.createElement('button')
      dragButton.type = 'button'
      dragButton.className = 'table-toolbar-button table-toolbar-drag'
      dragButton.title = 'Select table'
      dragButton.dataset.action = 'select-table'
      dragButton.setAttribute('aria-label', 'Select table')
      dragButton.draggable = true

      const deleteButton = document.createElement('button')
      deleteButton.type = 'button'
      deleteButton.className = 'table-toolbar-button table-toolbar-delete'
      deleteButton.title = 'Delete table'
      deleteButton.dataset.action = 'delete-table'
      deleteButton.setAttribute('aria-label', 'Delete table')

      toolbar.appendChild(dragButton)
      toolbar.appendChild(deleteButton)
      wrapper.appendChild(toolbar)
    }
  }, [])

  const prepareTableForResize = useCallback(
    (table: HTMLTableElement) => {
      const wrapper = wrapTableForResize(table)

      table.style.borderCollapse = 'collapse'
      table.style.tableLayout = 'fixed'
      if (!table.style.width) {
        table.style.width = '100%'
      }

      const colElements = ensureColGroup(table)
      normalizeColumnWidths(table, colElements)
      addColumnHandles(table)
      addCornerHandle(wrapper)
      addTableToolbar(wrapper)

      const tableWidth = table.getBoundingClientRect().width || table.offsetWidth || 0
      if (!wrapper.style.width) {
        wrapper.style.width = tableWidth ? `${tableWidth}px` : '100%'
      }
      wrapper.style.maxWidth = '100%'
      wrapper.style.minWidth = `${colElements.length * MIN_COLUMN_WIDTH_PX}px`

      table.dataset.tableResizeReady = 'true'
    },
    [addColumnHandles, addCornerHandle, addTableToolbar, ensureColGroup, normalizeColumnWidths, wrapTableForResize]
  )

  const initializeTables = useCallback((root: HTMLElement) => {
    const tables = Array.from(root.querySelectorAll('table'))
    tables.forEach((table) => prepareTableForResize(table as HTMLTableElement))
    requestAnimationFrame(() => {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        editorRef.current?.focus()
      }
    })
  }, [prepareTableForResize])

  // Update editor content when prop changes
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      const selection = window.getSelection()
      let savedRange: Range | null = null
      let savedNode: Node | null = null
      let savedOffset = 0

      if (selection && selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange()
        savedNode = savedRange.startContainer
        savedOffset = savedRange.startOffset
      }

      // Clean content and ensure LTR
      let cleanContent = content
      cleanContent = cleanContent.replace(/dir=["']rtl["']/gi, 'dir="ltr"')
      cleanContent = cleanContent.replace(/style="[^"]*direction:\s*rtl[^"]*"/gi, '')
      cleanContent = cleanContent.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')

      isApplyingContentRef.current = true
      editorRef.current.innerHTML = cleanContent

      // Force LTR on all elements
      forceLTR(editorRef.current)

      initializeTables(editorRef.current)

      // Restore cursor position
      if (savedNode && selection) {
        try {
          const walker = document.createTreeWalker(
            editorRef.current,
            NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
            null
          )

          walker.currentNode = editorRef.current
          let currentNode: Node | null = walker.nextNode()
          let found = false

          while (currentNode) {
            if (
              currentNode === savedNode ||
              (currentNode.nodeType === savedNode.nodeType &&
                currentNode.textContent === savedNode.textContent)
            ) {
              const newRange = document.createRange()
              const maxOffset =
                currentNode.nodeType === Node.TEXT_NODE
                  ? (currentNode as Text).length
                  : currentNode.childNodes.length
              newRange.setStart(currentNode, Math.min(savedOffset, maxOffset))
              newRange.collapse(true)
              selection.removeAllRanges()
              selection.addRange(newRange)
              found = true
              break
            }
            currentNode = walker.nextNode()
          }

          if (!found && editorRef.current.childNodes.length > 0) {
            const lastChild = editorRef.current.childNodes[editorRef.current.childNodes.length - 1]
            const newRange = document.createRange()
            newRange.selectNodeContents(lastChild)
            newRange.collapse(false)
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
        } catch (e) {
          // Ignore cursor restoration errors
        }
      }
      isApplyingContentRef.current = false
    }
  }, [content, initializeTables])

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

  const getSerializableContent = useCallback(() => {
    if (!editorRef.current) {
      return ""
    }

    const clone = editorRef.current.cloneNode(true) as HTMLElement

    clone.querySelectorAll('.column-resize-handle').forEach((handle) => handle.remove())
    clone.querySelectorAll('.table-corner-handle').forEach((handle) => handle.remove())
    clone.querySelectorAll('.table-resize-wrapper').forEach((wrapper) => {
      const table = wrapper.querySelector('table')
      if (table) {
        wrapper.replaceWith(table)
      } else {
        wrapper.remove()
      }
    })
    clone.querySelectorAll('table').forEach((table) => {
      const tableEl = table as HTMLElement
      tableEl.removeAttribute('data-table-resize-ready')
    })

    return clone.innerHTML.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, '')
  }, [])

  const handleContentChange = useCallback(() => {
    if (isApplyingContentRef.current) {
      return
    }
    if (!editorRef.current) {
      return
    }

    forceLTR(editorRef.current)
    const htmlContent = getSerializableContent()
    if (pendingChangeTimeoutRef.current) {
      window.clearTimeout(pendingChangeTimeoutRef.current)
    }
    pendingContentUpdateRef.current = htmlContent
    pendingChangeTimeoutRef.current = window.setTimeout(() => {
      if (pendingContentUpdateRef.current !== null) {
        onChange(pendingContentUpdateRef.current)
        pendingContentUpdateRef.current = null
      }
    }, 100)
  }, [getSerializableContent, onChange])

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

  const insertTable = (rows: number, cols: number) => {
    const safeRows = Math.min(Math.max(Math.floor(rows), 1), 10)
    const safeCols = Math.min(Math.max(Math.floor(cols), 1), 10)

    const table = document.createElement('table')
    table.className = 'my-4'
    table.style.border = '1px solid #d1d5db'
    table.style.borderCollapse = 'collapse'
    table.style.tableLayout = 'fixed'
    table.style.width = '100%'
    table.style.minWidth = 'unset'

    const tbody = document.createElement('tbody')

    for (let r = 0; r < safeRows; r++) {
      const tr = document.createElement('tr')
      for (let c = 0; c < safeCols; c++) {
        const td = document.createElement('td')
        td.className = 'align-top'
        td.style.border = '1px solid #d1d5db'
        td.style.padding = '0.75rem'
        td.appendChild(document.createElement('br'))
        tr.appendChild(td)
      }
      tbody.appendChild(tr)
    }

    table.appendChild(tbody)

    const selection = window.getSelection()

    if (savedSelectionRef.current && selection) {
      selection.removeAllRanges()
      selection.addRange(savedSelectionRef.current)
      savedSelectionRef.current = null
    }

    if ((!selection || selection.rangeCount === 0) && editorRef.current) {
      const fallbackRange = document.createRange()
      fallbackRange.selectNodeContents(editorRef.current)
      fallbackRange.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(fallbackRange)
    }

    editorRef.current?.focus()

    if (!selection || selection.rangeCount === 0) {
      if (editorRef.current) {
        editorRef.current.appendChild(table)
        prepareTableForResize(table)
      }
      handleContentChange()
      return
    }

    const range = selection.getRangeAt(0)
    range.deleteContents()
    range.insertNode(table)
    prepareTableForResize(table)

    const newRange = document.createRange()
    const firstCell = table.querySelector('td')
    if (firstCell) {
      const focusNode = firstCell.firstChild || firstCell
      newRange.setStart(focusNode, 0)
    } else {
      newRange.setStartAfter(table)
    }
    newRange.collapse(true)
    selection.removeAllRanges()
    selection.addRange(newRange)
    handleContentChange()
  }

  useEffect(() => {
    const editor = editorRef.current
    if (!editor) {
      return
    }

    initializeTables(editor)

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLTableElement) {
            prepareTableForResize(node)
          } else if (node instanceof HTMLElement) {
            const nestedTables = Array.from(node.querySelectorAll('table'))
            nestedTables.forEach((tbl) => prepareTableForResize(tbl as HTMLTableElement))
          }
        })
      })
    })

    observer.observe(editor, { childList: true, subtree: true })

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement

      if (target.classList.contains('table-corner-handle')) {
        event.preventDefault()
        event.stopPropagation()

        const wrapper = target.closest('.table-resize-wrapper') as HTMLElement | null
        const table = wrapper?.querySelector('table') as HTMLTableElement | null

        if (!wrapper || !table) {
          return
        }

        const colElements = ensureColGroup(table)
        normalizeColumnWidths(table, colElements)
        const wrapperRect = wrapper.getBoundingClientRect()
        const tableRect = table.getBoundingClientRect()
        const columnCount = colElements.length || table.rows[0]?.cells.length || 1
        const startWidth = wrapperRect.width || tableRect.width || columnCount * MIN_COLUMN_WIDTH_PX
        const minWidth = columnCount * MIN_COLUMN_WIDTH_PX

        table.style.width = `${startWidth}px`

        tableResizeStateRef.current = {
          wrapper,
          table,
          startX: event.clientX,
          startWidth,
          minWidth
        }

        wrapper.classList.add('resizing-table')
        document.body.style.cursor = 'nwse-resize'
        window.getSelection()?.removeAllRanges()
        return
      }

      if (!target.classList.contains('column-resize-handle')) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const cell = target.closest('td, th') as HTMLElement | null
      const table = cell?.closest('table') as HTMLTableElement | null

      if (!cell || !table) {
        return
      }

      prepareTableForResize(table)

      const wrapper = table.closest('.table-resize-wrapper') as HTMLElement | null
      const row = cell.parentElement as HTMLTableRowElement | null
      if (!row) {
        return
      }

      const colIndex = target.dataset.colIndex
        ? Number(target.dataset.colIndex)
        : Array.from(row.cells).indexOf(cell as HTMLTableCellElement)

      if (colIndex < 0) {
        return
      }

      const nextCell = row.cells[colIndex + 1] as HTMLElement | undefined
      if (!nextCell) {
        return
      }

      const colElements = ensureColGroup(table)
      if (!colElements[colIndex] || !colElements[colIndex + 1]) {
        return
      }

      const leftRect = cell.getBoundingClientRect()
      const rightRect = nextCell.getBoundingClientRect()
      const tableRect = table.getBoundingClientRect()
      const initialTableWidth =
        tableRect.width ||
        Array.from(row.cells).reduce((sum, currentCell) => sum + currentCell.getBoundingClientRect().width, 0) ||
        MIN_COLUMN_WIDTH_PX * colElements.length

      columnResizeStateRef.current = {
        table,
        colIndex,
        cell,
        startX: event.clientX,
        startWidthLeft: leftRect.width,
        startWidthRight: rightRect.width,
        initialTableWidth,
        colElements,
        wrapper
      }

      wrapper?.classList.add('resizing')
      document.body.style.cursor = 'col-resize'
      window.getSelection()?.removeAllRanges()
    }

    const handleMouseMove = (event: MouseEvent) => {
      const tableState = tableResizeStateRef.current
      if (tableState) {
        event.preventDefault()

        const deltaX = event.clientX - tableState.startX
        const newWidth = Math.max(tableState.minWidth, tableState.startWidth + deltaX)

        tableState.wrapper.style.width = `${newWidth}px`
        tableState.table.style.width = `${newWidth}px`
        return
      }

      const state = columnResizeStateRef.current
      if (!state) {
        return
      }

      event.preventDefault()

      const total = state.startWidthLeft + state.startWidthRight
      if (total <= 0) {
        return
      }

      const min = Math.min(MIN_COLUMN_WIDTH_PX, total / 2)
      let newLeft = state.startWidthLeft + (event.clientX - state.startX)
      newLeft = Math.max(min, Math.min(newLeft, total - min))
      const newRight = total - newLeft

      const tableWidth = state.table.getBoundingClientRect().width || state.initialTableWidth
      const percentLeft = (newLeft / tableWidth) * 100
      const percentRight = (newRight / tableWidth) * 100

      state.colElements[state.colIndex].style.width = `${percentLeft}%`
      state.colElements[state.colIndex + 1].style.width = `${percentRight}%`
    }

    const handleMouseUp = () => {
      const tableState = tableResizeStateRef.current
      if (tableState) {
        tableState.wrapper.classList.remove('resizing-table')
        tableResizeStateRef.current = null
        document.body.style.cursor = ''
        handleContentChange()
        return
      }

      const state = columnResizeStateRef.current
      if (!state) {
        return
      }

      const selection = window.getSelection()
      if (selection) {
        const focusNode = state.cell.firstChild || state.cell
        const offset =
          focusNode.nodeType === Node.TEXT_NODE
            ? (focusNode as Text).length
            : focusNode.childNodes.length
        const range = document.createRange()
        range.setStart(focusNode, offset)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }

      state.wrapper?.classList.remove('resizing')
      columnResizeStateRef.current = null
      document.body.style.cursor = ''
      handleContentChange()
    }

    const handleToolbarClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      const button = target.closest('.table-toolbar-button') as HTMLElement | null
      if (!button) {
        return
      }

      event.preventDefault()
      event.stopPropagation()

      const wrapper = button.closest('.table-resize-wrapper') as HTMLElement | null
      const table = wrapper?.querySelector('table') as HTMLTableElement | null

      if (!wrapper || !table) {
        return
      }

      const action = button.dataset.action
      if (action === 'delete-table') {
        const parentNode = wrapper.parentNode
        const nextSibling = wrapper.nextSibling
        const scrollY = window.scrollY

        wrapper.remove()

        const selection = window.getSelection()
        if (selection && parentNode) {
          const rangeAfter = document.createRange()
          if (nextSibling) {
            const index = Array.prototype.indexOf.call(parentNode.childNodes, nextSibling)
            rangeAfter.setStart(parentNode, index)
          } else {
            rangeAfter.setStart(parentNode, parentNode.childNodes.length)
          }
          rangeAfter.collapse(true)
          selection.removeAllRanges()
          selection.addRange(rangeAfter)
        }

        window.scrollTo({ top: scrollY })
        editor.focus()
        handleContentChange()
        return
      }

      if (action === 'select-table') {
        const range = document.createRange()
        range.selectNode(table)
        const selection = window.getSelection()
        selection?.removeAllRanges()
        selection?.addRange(range)
        editor.focus()
      }
    }

    const getDropRange = (event: DragEvent): Range | null => {
      if (document.caretRangeFromPoint) {
        const range = document.caretRangeFromPoint(event.clientX, event.clientY)
        if (range) return range
      }
      const caretPosition = (document as any).caretPositionFromPoint?.(event.clientX, event.clientY)
      if (caretPosition) {
        const range = document.createRange()
        range.setStart(caretPosition.offsetNode, caretPosition.offset)
        range.collapse(true)
        return range
      }
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        return selection.getRangeAt(0).cloneRange()
      }
      return null
    }

    const handleDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement
      const dragButton = target.closest('.table-toolbar-drag') as HTMLElement | null
      if (!dragButton) {
        return
      }

      const wrapper = dragButton.closest('.table-resize-wrapper') as HTMLElement | null
      if (!wrapper) {
        return
      }

      tableDragStateRef.current.wrapper = wrapper
      wrapper.classList.add('dragging-table')
      event.dataTransfer?.setData('text/plain', 'table-drag')
      event.dataTransfer?.setDragImage(wrapper, Math.min(24, wrapper.offsetWidth / 2), 12)
      event.dataTransfer?.setData('application/x-table-drag', 'true')
      if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move'
      }
    }

    const handleDragOver = (event: DragEvent) => {
      if (!tableDragStateRef.current.wrapper) {
        return
      }
      if (!editor.contains(event.target as Node)) {
        return
      }
      event.preventDefault()
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move'
      }
    }

    const handleDrop = (event: DragEvent) => {
      const wrapper = tableDragStateRef.current.wrapper
      if (!wrapper) {
        return
      }
      if (!editor.contains(event.target as Node)) {
        return
      }
      event.preventDefault()
      event.stopPropagation()

      const range = getDropRange(event)
      const parent = wrapper.parentNode

      wrapper.setAttribute('data-moving-table', 'moving')
      const html = wrapper.outerHTML
      wrapper.classList.remove('dragging-table')

      if (parent) {
        parent.removeChild(wrapper)
      } else {
        wrapper.remove()
      }

      const selection = window.getSelection()
      if (!range || !selection) {
        tableDragStateRef.current.wrapper = null
        initializeTables(editor)
        handleContentChange()
        return
      }

      selection.removeAllRanges()
      range.collapse(true)
      selection.addRange(range)

      const scrollY = window.scrollY
      let inserted = false
      let insertedWrapper: HTMLElement | null = null
      try {
        inserted = document.execCommand('insertHTML', false, html)
      } catch (error) {
        inserted = false
      }

      if (!inserted) {
        const temp = document.createElement('div')
        temp.innerHTML = html
        const fallbackWrapper = temp.firstElementChild as HTMLElement | null
        if (fallbackWrapper) {
          insertedWrapper = fallbackWrapper
          range.insertNode(insertedWrapper)
        }
      }

      window.scrollTo({ top: scrollY })

      const newWrapper =
        insertedWrapper ||
        (editor.querySelector('.table-resize-wrapper[data-moving-table="moving"]') as HTMLElement | null)
      if (newWrapper) {
        newWrapper.removeAttribute('data-moving-table')
        const afterRange = document.createRange()
        const parentNode = newWrapper.parentNode
        if (parentNode) {
          afterRange.setStartAfter(newWrapper)
          afterRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(afterRange)
        }
      }

      tableDragStateRef.current.wrapper = null
      initializeTables(editor)
      handleContentChange()
    }

    const handleDragEnd = () => {
      const wrapper = tableDragStateRef.current.wrapper
      if (wrapper) {
        wrapper.classList.remove('dragging-table')
      }
      tableDragStateRef.current.wrapper = null
    }

    editor.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    editor.addEventListener('click', handleToolbarClick)
    editor.addEventListener('dragstart', handleDragStart)
    editor.addEventListener('dragover', handleDragOver)
    editor.addEventListener('drop', handleDrop)
    editor.addEventListener('dragend', handleDragEnd)

    return () => {
      observer.disconnect()
      editor.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      editor.removeEventListener('click', handleToolbarClick)
      editor.removeEventListener('dragstart', handleDragStart)
      editor.removeEventListener('dragover', handleDragOver)
      editor.removeEventListener('drop', handleDrop)
      editor.removeEventListener('dragend', handleDragEnd)
    }
  }, [handleContentChange, ensureColGroup, initializeTables, normalizeColumnWidths, prepareTableForResize])

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
        .table-resize-wrapper {
          display: inline-block;
          max-width: 100%;
          padding: 0.5rem;
          margin: 1rem 0;
          border: 1px solid hsl(var(--border));
          border-radius: 0.5rem;
          background: hsl(var(--background));
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .table-resize-wrapper.resizing {
          cursor: col-resize;
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 1px hsl(var(--primary));
        }
        .table-resize-wrapper.resizing-table {
          cursor: nwse-resize;
          border-color: hsl(var(--primary));
          box-shadow: 0 0 0 1px hsl(var(--primary));
        }
        .table-resize-wrapper.dragging-table {
          opacity: 0.6;
        }
        .table-toolbar {
          position: absolute;
          top: 4px;
          right: 4px;
          display: inline-flex;
          gap: 4px;
          padding: 2px;
          border-radius: 0.375rem;
          background: hsla(var(--background), 0.9);
          border: 1px solid hsl(var(--border));
          backdrop-filter: blur(4px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          z-index: 6;
        }
        .table-toolbar-button {
          width: 20px;
          height: 20px;
          border: none;
          background: transparent;
          color: hsl(var(--muted-foreground));
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.25rem;
          cursor: pointer;
          font-size: 12px;
          line-height: 1;
          padding: 0;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .table-toolbar-drag {
          cursor: grab;
        }
        .table-toolbar-drag:active {
          cursor: grabbing;
        }
        .table-toolbar-button:hover {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }
        .table-toolbar-drag::before {
          content: "⇕";
        }
        .table-toolbar-delete::before {
          content: "✕";
        }
        .table-corner-handle {
          position: absolute;
          width: 16px;
          height: 16px;
          bottom: 6px;
          right: 6px;
          border-radius: 4px;
          background: hsl(var(--muted));
          border: 1px solid hsl(var(--border));
          cursor: nwse-resize;
          display: flex;
          align-items: center;
          justify-content: center;
          color: hsl(var(--muted-foreground));
          font-size: 12px;
        }
        .table-corner-handle::after {
          content: "↘";
        }
        .rich-text-editor table {
          border-collapse: collapse;
          margin: 1rem 0;
          width: 100%;
          min-width: 0;
          max-width: 100%;
        }
        .rich-text-editor th,
        .rich-text-editor td {
          border: 1px solid hsl(var(--border));
          padding: 0.75rem;
          vertical-align: top;
        }
        .rich-text-editor th {
          background: hsl(var(--muted));
          font-weight: 600;
        }
        .column-resize-handle {
          position: absolute;
          top: 0;
          right: -4px;
          width: 8px;
          cursor: col-resize;
          user-select: none;
          height: 100%;
          z-index: 5;
        }
        .column-resize-handle::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          left: 50%;
          width: 2px;
          transform: translateX(-50%);
          background: hsl(var(--border));
          opacity: 0;
          transition: opacity 0.15s ease;
        }
        .column-resize-handle:hover::after,
        td:hover > .column-resize-handle::after,
        th:hover > .column-resize-handle::after {
          opacity: 1;
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
          onClick={() => {
            const selection = window.getSelection()
            if (selection && selection.rangeCount > 0) {
              savedSelectionRef.current = selection.getRangeAt(0).cloneRange()
            } else {
              savedSelectionRef.current = null
            }
            setTableRows(2)
            setTableCols(2)
            setShowTableDialog(true)
          }}
        >
          <TableIcon className="w-4 h-4" />
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
            const clipboardData = e.clipboardData
            const htmlData = clipboardData.getData("text/html")
            const textData = clipboardData.getData("text/plain")

            const selection = window.getSelection()
            if (!selection || selection.rangeCount === 0) {
              return
            }

            const range = selection.getRangeAt(0)
            range.deleteContents()

            let contentToInsert = ""

            if (htmlData) {
              contentToInsert = sanitizePastedContent(htmlData)
            }

            if (!contentToInsert && textData) {
              contentToInsert = plainTextToHtml(textData)
            }

            if (!contentToInsert) {
              return
            }

            const container = document.createElement("div")
            container.innerHTML = contentToInsert

            const fragment = document.createDocumentFragment()
            const nodes = Array.from(container.childNodes)

            nodes.forEach((node) => {
              fragment.appendChild(node)
            })

            const lastNode = nodes[nodes.length - 1] || null
            range.insertNode(fragment)

            if (lastNode) {
              const newRange = document.createRange()
              newRange.setStartAfter(lastNode)
              newRange.collapse(true)
              selection.removeAllRanges()
              selection.addRange(newRange)
            } else {
              range.collapse(false)
              selection.removeAllRanges()
              selection.addRange(range)
            }

            if (editorRef.current) {
              forceLTR(editorRef.current)
            }

            handleContentChange()
            if (editorRef.current) {
              initializeTables(editorRef.current)
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

      <Dialog
        open={showTableDialog}
        onOpenChange={(open) => {
          if (!open) {
            savedSelectionRef.current = null
          }
          setShowTableDialog(open)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert Table</DialogTitle>
            <DialogDescription>Select the number of rows and columns</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 mt-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="table-rows">
                Rows
              </label>
              <Input
                id="table-rows"
                type="number"
                min={1}
                max={10}
                value={tableRows}
                onChange={(e) => setTableRows(Number(e.target.value) || 1)}
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="table-cols">
                Columns
              </label>
              <Input
                id="table-cols"
                type="number"
                min={1}
                max={10}
                value={tableCols}
                onChange={(e) => setTableCols(Number(e.target.value) || 1)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  savedSelectionRef.current = null
                  setShowTableDialog(false)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  insertTable(tableRows, tableCols)
                  setShowTableDialog(false)
                }}
              >
                Insert Table
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}