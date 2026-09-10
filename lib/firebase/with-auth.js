// 'use client'
//
// import { useAuth } from '@/lib/firebase/auth-context';
// import { useRouter } from "next/navigation"
// import { useEffect, useState } from "react"
// import { AuthLoader } from "@/app/components/blog"
//
// export function withAuth(WrappedComponent) {
//   const ComponentWithAuth = (props) => {
//     const { user, loading, isInitializing, isAuthenticating, isAuthenticated } = useAuth()
//     const router = useRouter()
//     const [isClient, setIsClient] = useState(false)
//
//     useEffect(() => {
//       setIsClient(true)
//     }, [])
//
//     useEffect(() => {
//       // Only redirect on client side and if we're not loading and user is not authenticated
//       if (isClient && !loading && !isAuthenticated) {
//         router.replace("/partners")
//       }
//     }, [isAuthenticated, loading, router, isClient])
//
//     // Always render a container div to prevent hydration mismatches
//     return (
//       <div>
//         {/* Show loading during SSR or if we're loading */}
//         {(!isClient || loading) && (
//           <AuthLoader isInitializing={isInitializing} isAuthenticating={isAuthenticating} />
//         )}
//
//         {/* Only render the component if we're on client and authenticated */}
//         {isClient && isAuthenticated && !loading && (
//           <WrappedComponent {...props} />
//         )}
//       </div>
//     )
//   }
//
//   ComponentWithAuth.displayName = `withAuth(${
//     WrappedComponent.displayName || WrappedComponent.name || "Component"
//   })`
//
//   return ComponentWithAuth
// }
