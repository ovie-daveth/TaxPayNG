"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/firebase/firebase"
import { doc, getDoc, collection, getDocs } from "firebase/firestore"
import { useAuth } from "@/lib/hooks/useAuth"
import { adminService } from "@/lib/services/adminService"
import { Loader2, RefreshCw } from "lucide-react"

export function AdminDebug() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const testAdminStatus = async () => {
    if (!user) {
      setResults({ error: "No user logged in" })
      return
    }

    setLoading(true)
    const debugResults: any = {
      userId: user.uid,
      email: user.email,
      timestamp: new Date().toISOString()
    }

    try {
      // 1. Check userProfile for admin role (no separate admins collection)
      console.log("🔍 Test: Checking userProfile for admin role...")
      const userProfileQuery = await import("firebase/firestore").then(m => 
        m.query(
          m.collection(db, "userProfiles"),
          m.where("userId", "==", user.uid)
        )
      )
      const userProfileSnapshot = await getDocs(userProfileQuery)
      const userProfileData = !userProfileSnapshot.empty ? userProfileSnapshot.docs[0].data() : null
      debugResults.userProfileAdmin = {
        found: !userProfileSnapshot.empty,
        role: userProfileData?.role || null,
        data: userProfileData
      }
      console.log("🔍 Test: UserProfile admin role result:", debugResults.userProfileAdmin)

      // 2. Test app-level admin check
      console.log("🔍 Test: Testing app-level admin check...")
      const isAdminApp = await adminService.isAdmin(user.email || "", user.uid)
      debugResults.appLevelAdmin = isAdminApp
      console.log("🔍 Test: App-level admin check:", isAdminApp)

      // 4. Test Firestore rule by trying to read a restricted collection
      console.log("🔍 Test: Testing Firestore rule by reading userProfiles...")
      try {
        const testQuery = await import("firebase/firestore").then(m => 
          m.getDocs(m.collection(db, "userProfiles"))
        )
        debugResults.firestoreRule = {
          success: true,
          message: "Firestore rule allows reading userProfiles",
          count: testQuery.size
        }
        console.log("🔍 Test: Firestore rule test passed!")
      } catch (error: any) {
        debugResults.firestoreRule = {
          success: false,
          error: error.message,
          code: error.code
        }
        console.error("🔍 Test: Firestore rule test failed:", error)
      }

      // 5. Try to ensure admin role is set in userProfile
      console.log("🔍 Test: Attempting to set admin role in userProfile...")
      try {
        await adminService.setAdmin(user.email || "", user.uid)
        // Verify it was set
        const verifyQuery = await import("firebase/firestore").then(m => 
          m.query(
            m.collection(db, "userProfiles"),
            m.where("userId", "==", user.uid)
          )
        )
        const verifySnapshot = await getDocs(verifyQuery)
        const verifyData = !verifySnapshot.empty ? verifySnapshot.docs[0].data() : null
        debugResults.adminRoleUpdate = {
          success: true,
          roleAfter: verifyData?.role || null,
          data: verifyData
        }
        console.log("🔍 Test: Admin role update result:", debugResults.adminRoleUpdate)
      } catch (error: any) {
        debugResults.adminRoleUpdate = {
          success: false,
          error: error.message,
          code: error.code
        }
        console.error("🔍 Test: Admin role update failed:", error)
      }

    } catch (error: any) {
      debugResults.error = {
        message: error.message,
        code: error.code,
        stack: error.stack
      }
      console.error("🔍 Test: General error:", error)
    } finally {
      setLoading(false)
      setResults(debugResults)
      console.log("🔍 Test: Full debug results:", debugResults)
    }
  }

  return (
    <Card className="border-2 border-dashed">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Admin Debug Tool</CardTitle>
            <CardDescription>
              Test admin status and Firestore rules
            </CardDescription>
          </div>
          <Button
            onClick={testAdminStatus}
            disabled={loading || !user}
            size="sm"
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {results && (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-xs overflow-auto max-h-96">
              <pre>{JSON.stringify(results, null, 2)}</pre>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>User Profile Role:</strong>{" "}
                <span className={results.userProfileAdmin?.role === "admin" ? "text-green-600" : "text-yellow-600"}>
                  {results.userProfileAdmin?.role || "Not set"}
                </span>
              </div>
              <div>
                <strong>App-Level Admin:</strong>{" "}
                <span className={results.appLevelAdmin ? "text-green-600" : "text-red-600"}>
                  {results.appLevelAdmin ? "✓ Yes" : "✗ No"}
                </span>
              </div>
              <div>
                <strong>Firestore Rule:</strong>{" "}
                <span className={results.firestoreRule?.success ? "text-green-600" : "text-red-600"}>
                  {results.firestoreRule?.success ? "✓ Allowed" : "✗ Denied"}
                </span>
              </div>
              <div>
                <strong>Profile Found:</strong>{" "}
                <span className={results.userProfileAdmin?.found ? "text-green-600" : "text-red-600"}>
                  {results.userProfileAdmin?.found ? "✓ Yes" : "✗ No"}
                </span>
              </div>
            </div>
          </div>
        )}
        {!results && !loading && (
          <p className="text-sm text-muted-foreground">
            Click "Run Test" to check admin status and Firestore rules.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

