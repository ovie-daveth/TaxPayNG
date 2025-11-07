"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserTypeSelectorProps {
  userType: string
  onUserTypeChange: (value: string) => void
}

export function UserTypeSelector({ userType, onUserTypeChange }: UserTypeSelectorProps) {
  return (
    <div className="space-y-1.5 sm:space-y-2">
      <Label htmlFor="userType" className="text-sm sm:text-base">I am a...</Label>
      <Select value={userType} onValueChange={onUserTypeChange}>
        <SelectTrigger id="userType" className="h-9 sm:h-10 text-sm sm:text-base">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="freelancer" className="text-sm">Freelancer / Self-Employed</SelectItem>
          <SelectItem value="creator" className="text-sm">Content Creator / Influencer</SelectItem>
          <SelectItem value="business" className="text-sm">Business Owner</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

