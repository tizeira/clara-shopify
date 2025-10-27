"use client"

import { useState, useEffect } from "react"
import HelpAssistantWidget from "@/components/help-assistant-widget"
import { AuthGate } from "@/components/AuthGate"
import { NameCapture } from "@/components/NameCapture"
import { ClaraCustomerData } from "@/lib/shopify-client"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customerData, setCustomerData] = useState<ClaraCustomerData | null>(null)
  const [customerDataLoading, setCustomerDataLoading] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [showNameCapture, setShowNameCapture] = useState(false)
  const [isInIframe, setIsInIframe] = useState(false)

  // Check authentication status and load Shopify customer data on mount
  useEffect(() => {
    // Detect if app is running inside iframe (Shopify embed)
    const inIframe = window.self !== window.top
    setIsInIframe(inIframe)
    if (inIframe) {
      console.log('🖼️ Running inside iframe (Shopify)')
    }

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
            console.log('✅ Shopify customer data loaded:', data.customer.firstName, data.customer.lastName)
            // Si hay customerData de Shopify, no necesitamos NameCapture
            setShowNameCapture(false)
          }
        })
        .catch((error) => {
          console.error('❌ Failed to load Shopify customer data:', error)
          // Si falla Shopify, verificar localStorage
          checkLocalUserName()
        })
        .finally(() => {
          setCustomerDataLoading(false)
        })
    } else {
      // No hay params de Shopify, verificar localStorage
      checkLocalUserName()
    }

    function checkLocalUserName() {
      const storedName = localStorage.getItem('clara_user_name')
      if (storedName) {
        setUserName(storedName)
        console.log('✅ Loaded userName from localStorage:', storedName)
        setShowNameCapture(false)
      } else {
        // No hay ni Shopify ni localStorage, mostrar NameCapture
        setShowNameCapture(true)
      }
    }
  }, [])

  const handleAuthenticated = () => {
    setIsAuthenticated(true)
  }

  const handleNameSubmit = (name: string | null) => {
    if (name) {
      localStorage.setItem('clara_user_name', name)
      setUserName(name)
      console.log('✅ Saved userName to localStorage:', name)
    }
    setShowNameCapture(false)
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
      {/* Subtle background pattern - skip when in iframe for better performance */}
      {!isInIframe && (
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
      )}

      {/* Conditional rendering: NameCapture, Auth Gate or Clara App */}
      <div className="relative z-10 min-h-screen">
        {showNameCapture ? (
          <NameCapture onNameSubmit={handleNameSubmit} />
        ) : isAuthenticated ? (
          <HelpAssistantWidget
            customerData={customerData}
            customerDataLoading={customerDataLoading}
            userName={userName}
          />
        ) : (
          <AuthGate onAuthenticated={handleAuthenticated} />
        )}
      </div>
    </div>
  )
}
