import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { adminService } from "@/lib/services/adminService"

export function useEditor() {
  const { user, loading: authLoading } = useAuth()
  const [isEditor, setIsEditor] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkEditorStatus = async () => {
      if (authLoading) {
        setLoading(true)
        return
      }

      if (!user?.email) {
        setIsEditor(false)
        setLoading(false)
        return
      }

      try {
        const editorStatus = await adminService.isEditor(user.email, user.uid)
        setIsEditor(editorStatus)
      } catch (error) {
        console.error("Error checking editor status:", error)
        setIsEditor(false)
      } finally {
        setLoading(false)
      }
    }

    checkEditorStatus()
  }, [user, authLoading])

  return { isEditor, loading: loading || authLoading }
}

