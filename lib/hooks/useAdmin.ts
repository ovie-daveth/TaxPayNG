import { useState, useEffect } from "react"
import { useAuth } from "./useAuth"
import { adminService } from "@/lib/services/adminService"

export function useAdmin() {
  const { user, loading: authLoading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading) {
        setLoading(true)
        return
      }

      if (!user?.email) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      try {
        const adminStatus = await adminService.isAdmin(user.email, user.uid)
        setIsAdmin(adminStatus)
      } catch (error) {
        console.error("Error checking admin status:", error)
        setIsAdmin(false)
      } finally {
        setLoading(false)
      }
    }

    checkAdminStatus()
  }, [user, authLoading])

  return { isAdmin, loading: loading || authLoading }
}
