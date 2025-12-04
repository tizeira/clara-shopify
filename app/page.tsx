"use client"

import { useState, useEffect, useCallback } from "react"
import HelpAssistantWidget from "@/components/help-assistant-widget"
import ConversationWidget from "@/components/conversation-widget"
import { AuthGate } from "@/components/AuthGate"
import { NameCapture } from "@/components/NameCapture"
import { ClaraCustomerData } from "@/lib/shopify-client"
import { isCustomConversationEnabled } from "@/config/features"

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [customerData, setCustomerData] = useState<ClaraCustomerData | null>(null)
  const [customerDataLoading, setCustomerDataLoading] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [showNameCapture, setShowNameCapture] = useState(false)
  const [isInIframe, setIsInIframe] = useState(false)

  // FASE 3: Custom pipeline fallback state
  const [useFallback, setUseFallback] = useState(false)

  // Handle fallback from custom pipeline to HeyGen built-in
  const handleFallback = useCallback(() => {
    console.warn('🔄 Switching to HeyGen built-in voice chat (fallback)')
    setUseFallback(true)
  }, [])

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

    // FASE 2: Check for Shopify URL parameters including Liquid-provided PII
    const params = new URLSearchParams(window.location.search)
    const shopifyToken = params.get('shopify_token')
    const customerId = params.get('customer_id')

    // Parse Liquid-provided PII data from URL params
    const firstName = params.get('first_name')
    const lastName = params.get('last_name')
    const email = params.get('email')
    const ordersCountStr = params.get('orders_count')
    const ordersCount = ordersCountStr ? parseInt(ordersCountStr, 10) : undefined

    // Flag to track if we have Liquid data (PII from Shopify template)
    const hasLiquidData = !!(firstName || lastName || email)

    // Validate orders_count is a valid number
    if (ordersCountStr && isNaN(ordersCount!)) {
      console.warn('⚠️ Invalid orders_count format:', ordersCountStr)
    }

    console.log('📊 Data sources:', {
      hasLiquidData,
      hasShopifyParams: !!(shopifyToken && customerId),
      firstName: firstName || '(none)',
      ordersCount: ordersCount || 0,
      source: hasLiquidData ? 'Liquid template' : 'API only'
    })

    // Build liquidData object from URL params
    const liquidData = hasLiquidData ? {
      firstName: firstName || undefined,
      lastName: lastName || undefined,
      email: email || undefined,
      ordersCount: ordersCount
    } : undefined

    // If Shopify params exist, fetch customer data and merge with Liquid data
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
            const apiData = data.customer

            // MERGE STRATEGY: Prioritize Liquid data (PII) over API data
            // This is critical for Basic plan where API has no PII access
            const mergedData: ClaraCustomerData = {
              // PII from Liquid (prioritized) - works on Basic plan
              firstName: liquidData?.firstName || apiData.firstName || '',
              lastName: liquidData?.lastName || apiData.lastName || '',
              email: liquidData?.email || apiData.email || '',
              ordersCount: liquidData?.ordersCount ?? apiData.ordersCount ?? 0,

              // Non-PII from API (metafields, detailed orders) - always from API
              skinType: apiData.skinType,
              skinConcerns: apiData.skinConcerns,
              recentOrders: apiData.recentOrders || []
            }

            setCustomerData(mergedData)

            console.log('✅ Customer data merged successfully:', {
              source: hasLiquidData ? 'Liquid + API' : 'API only',
              firstName: mergedData.firstName,
              lastName: mergedData.lastName,
              skinType: mergedData.skinType,
              ordersCount: mergedData.ordersCount,
              hasOrders: mergedData.recentOrders.length > 0
            })

            // If we have customer data from Shopify, don't show NameCapture
            setShowNameCapture(false)

            // Show warning if using Basic plan mode
            if (data.warning) {
              console.warn('⚠️', data.warning)
            }
          }
        })
        .catch((error) => {
          console.error('❌ Failed to load customer data from API:', error)

          // FALLBACK: If API fails but we have Liquid data, use it
          if (hasLiquidData && liquidData) {
            const fallbackData: ClaraCustomerData = {
              firstName: liquidData.firstName || '',
              lastName: liquidData.lastName || '',
              email: liquidData.email || '',
              ordersCount: liquidData.ordersCount || 0,
              recentOrders: []
              // Note: No skinType or skinConcerns (API data not available)
            }

            setCustomerData(fallbackData)
            console.log('⚠️ Using Liquid data only (API failed):', fallbackData)
            setShowNameCapture(false)
          } else {
            // No data at all - fall back to localStorage
            console.log('⚠️ No Liquid data and API failed. Checking localStorage...')
            checkLocalUserName()
          }
        })
        .finally(() => {
          setCustomerDataLoading(false)
        })
    } else {
      // No Shopify params - check localStorage for standalone mode
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
          // FASE 3: Switch between custom pipeline and HeyGen built-in
          isCustomConversationEnabled() && !useFallback ? (
            <ConversationWidget
              customerData={customerData}
              customerDataLoading={customerDataLoading}
              userName={userName}
              onFallback={handleFallback}
            />
          ) : (
            <HelpAssistantWidget
              customerData={customerData}
              customerDataLoading={customerDataLoading}
              userName={userName}
            />
          )
        ) : (
          <AuthGate onAuthenticated={handleAuthenticated} />
        )}
      </div>
    </div>
  )
}
