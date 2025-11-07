"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserTypeSelectorProps {
  userType: string
  onUserTypeChange: (value: string) => void
}

export function UserTypeSelector({ userType, onUserTypeChange }: UserTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="userType">I am a...</Label>
      <Select value={userType} onValueChange={onUserTypeChange}>
        <SelectTrigger id="userType">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="freelancer">Freelancer / Self-Employed</SelectItem>
          <SelectItem value="creator">Content Creator / Influencer</SelectItem>
          <SelectItem value="business">Business Owner</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

