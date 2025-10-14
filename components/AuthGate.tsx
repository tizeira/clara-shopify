"use client"

import { useState, useEffect } from "react"
import { Lock, Eye, EyeOff } from "lucide-react"

interface AuthGateProps {
  onAuthenticated: () => void
}

const AUTH_STORAGE_KEY = 'clara_auth_token'
const AUTH_EXPIRY_DAYS = 7

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const correctPassword = process.env.NEXT_PUBLIC_ACCESS_PASSWORD || "clara2024"

  // Check if already authenticated on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem(AUTH_STORAGE_KEY)
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth)
        const expiryDate = new Date(authData.expiry)

        if (new Date() < expiryDate) {
          onAuthenticated()
          return
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY)
        }
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    }
  }, [onAuthenticated])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    // Simulate brief loading for better UX
    await new Promise(resolve => setTimeout(resolve, 800))

    if (password === correctPassword) {
      // Save auth state if remember me is checked
      if (rememberMe) {
        const expiryDate = new Date()
        expiryDate.setDate(expiryDate.getDate() + AUTH_EXPIRY_DAYS)

        const authData = {
          authenticated: true,
          expiry: expiryDate.toISOString()
        }

        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData))
      }

      onAuthenticated()
    } else {
      setError("Contraseña incorrecta. Intenta nuevamente.")
      setPassword("")
    }

    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="w-full max-w-sm mx-auto space-y-8">
        {/* Logo/Header */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 shadow-lg">
            <Lock className="w-10 h-10 text-slate-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Acceso a Clara</h2>
            <p className="text-slate-600 mt-2">Ingresa la contraseña para continuar</p>
          </div>
        </div>

        {/* Auth Form */}
        <div className="bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 px-4 pr-12 bg-white/30 backdrop-blur-sm border border-white/40 rounded-xl text-slate-800 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Ingresa tu contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center space-x-3">
              <input
                id="remember"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/40 bg-white/30 text-blue-600 focus:ring-blue-500/50"
              />
              <label htmlFor="remember" className="text-sm text-slate-700">
                Recordarme por 7 días
              </label>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-lg p-3">
                <p className="text-sm text-red-700 text-center">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-blue-500/80 hover:bg-blue-500 backdrop-blur-md text-white font-semibold rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 border border-blue-400/30 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Verificando...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Acceder a Clara
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-slate-500">
            Consulta con tu administrador si no tienes la contraseña
          </p>
        </div>
      </div>
    </div>
  )
}