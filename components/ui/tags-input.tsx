"use client"

import { useState, KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

interface TagsInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  placeholder?: string
  maxTags?: number
}

export function TagsInput({ 
  tags, 
  onTagsChange, 
  placeholder = "Add tags...", 
  maxTags = 10 
}: TagsInputProps) {
  const [inputValue, setInputValue] = useState("")

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onTagsChange([...tags, trimmedTag])
      setInputValue("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    
    // Auto-add tag when comma is typed
    if (value.includes(',')) {
      const tagsToAdd = value.split(',').filter(tag => tag.trim())
      tagsToAdd.forEach(tag => addTag(tag))
      setInputValue("")
    } else {
      setInputValue(value)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 min-h-[2.5rem] p-2 border border-input rounded-md bg-background">
        {tags.map((tag, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {tags.length < maxTags && (
          <Input
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="border-0 shadow-none focus-visible:ring-0 flex-1 min-w-[120px]"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {tags.length}/{maxTags} tags. Press Enter or comma to add.
      </p>
    </div>
  )
}
