'use client'

import { useAuth } from '@/lib/firebase/auth-context';
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { SimpleSpinner } from "@/components/loading"

export function NoTenantAccess() {
  const { user, loading, isAuthenticated } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    // Redirect to login if not authenticated
    if (isClient && !loading && !isAuthenticated) {
      router.replace("/partners")
    }
  }, [isAuthenticated, loading, router, isClient])

  if (!isClient || loading) {
    return <SimpleSpinner />
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <div className="max-w-md w-full bg-base-100 shadow-lg rounded-lg p-8 text-center">
        <div className="mb-6">
          <svg className="mx-auto h-16 w-16 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-bold text-base-content mb-4">
          Access Pending
        </h2>
        
        <p className="text-base-content/70 mb-6">
          Your account is ready, but partner access has not been assigned yet.
          Please contact Nash to request access.
        </p>
        
        <div className="bg-base-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-base-content/60 mb-2">Account Details:</p>
          <p className="text-sm font-mono text-base-content">
            {user?.email}
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <button 
            onClick={() => router.push("/partners")}
            className="btn btn-primary w-full"
          >
            Back to Login
          </button>
          
          <button 
            onClick={() => {
              router.push("/partners#contact")
            }}
            className="btn btn-outline w-full"
          >
            Contact Nash
          </button>
        </div>
      </div>
    </div>
  )
} 