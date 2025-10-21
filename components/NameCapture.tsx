"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface NameCaptureProps {
  onNameSubmit: (name: string | null) => void
}

export function NameCapture({ onNameSubmit }: NameCaptureProps) {
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      setIsSubmitting(true)
      onNameSubmit(name.trim())
    }
  }

  const handleSkip = () => {
    setIsSubmitting(true)
    onNameSubmit(null)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      {/* Glassmorphism card */}
      <div className="w-full max-w-md">
        <div className="glass-card p-8 rounded-3xl border border-slate-200/40 shadow-xl">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-slate-800 mb-2">
              ¡Bienvenida a Clara!
            </h1>
            <p className="text-slate-600 text-sm">
              Para una comunicación personalizada, ¿cómo te gustaría que te llame?
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Tu nombre (opcional)
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: María"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-800 placeholder-slate-400"
                disabled={isSubmitting}
                autoFocus
                maxLength={50}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleSkip}
                disabled={isSubmitting}
                className={cn(
                  "flex-1 px-6 py-3 rounded-xl font-medium transition-all",
                  "border border-slate-200 bg-white/50 text-slate-600",
                  "hover:bg-slate-50 hover:border-slate-300",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                Omitir
              </button>

              <button
                type="submit"
                disabled={isSubmitting || !name.trim()}
                className={cn(
                  "flex-1 px-6 py-3 rounded-xl font-medium transition-all",
                  "bg-gradient-to-r from-pink-400 to-rose-500 text-white",
                  "hover:from-pink-500 hover:to-rose-600",
                  "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-pink-400 disabled:hover:to-rose-500"
                )}
              >
                {isSubmitting ? "Iniciando..." : "Continuar"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
