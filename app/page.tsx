"use client"

import { useState, useEffect } from "react"
import HelpAssistantWidget from "@/components/help-assistant-widget"
import { AuthGate } from "@/components/AuthGate"
import { ClaraCustomerData } from "@/lib/shopify-client"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customerData, setCustomerData] = useState<ClaraCustomerData | null>(null)
  const [customerDataLoading, setCustomerDataLoading] = useState(false)

  // Check authentication status and load Shopify customer data on mount
  useEffect(() => {
    const authEnabled = process.env.NEXT_PUBLIC_AUTH_ENABLED === 'true'

    if (!authEnabled) {
      setIsAuthenticated(true)
    }

    setIsLoading(false)

    // Check for Shopify URL parameters
    const params = new URLSearchParams(window.location.search)
    const shopifyToken = params.get('shopify_token')
    const customerId = params.get('customer_id')

    // If Shopify params exist, fetch customer data
    if (shopifyToken && customerId) {
      setCustomerDataLoading(true)

      fetch('/api/shopify-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shopify_token: shopifyToken,
          customer_id: customerId
        })
      })
        .then(async (response) => {
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Failed to fetch customer data')
          }
          return response.json()
        })
        .then((data) => {
          if (data.success && data.customer) {
            setCustomerData(data.customer)
            console.log('✅ Customer data loaded:', data.customer.firstName, data.customer.lastName)
          }
        })
        .catch((error) => {
          console.error('❌ Failed to load customer data:', error)
          // Continue without customer data - Clara will work in generic mode
        })
        .finally(() => {
          setCustomerDataLoading(false)
        })
    }
  }, [])

  const handleAuthenticated = () => {
    setIsAuthenticated(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Subtle background pattern for clean white theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/20 to-white"></div>
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02]">
          <svg className="w-full h-full" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" className="text-slate-100"/>
          </svg>
        </div>
      </div>

      {/* Conditional rendering: Auth Gate or Clara App */}
      <div className="relative z-10 min-h-screen">
        {isAuthenticated ? (
          <HelpAssistantWidget
            customerData={customerData}
            customerDataLoading={customerDataLoading}
          />
        ) : (
          <AuthGate onAuthenticated={handleAuthenticated} />
        )}
      </div>
    </div>
  )
}
