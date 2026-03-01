import * as React from "react"
import { AnimatePresence, motion } from "framer-motion"
import { X, CheckCircle, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const ToastContext = React.createContext({})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([])

  const addToast = React.useCallback(({ title, description, variant = "default" }) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, title, description, variant }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className={cn(
                "flex items-start gap-3 rounded-lg border bg-background p-4 shadow-lg min-w-[320px]",
                toast.variant === "destructive" && "border-destructive/50 text-destructive"
              )}
            >
              {toast.variant === "destructive" ? (
                <AlertCircle className="h-5 w-5 shrink-0 text-destructive" />
              ) : (
                <CheckCircle className="h-5 w-5 shrink-0 text-emerald-500" />
              )}
              <div className="flex-1">
                {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
                {toast.description && <p className="text-sm text-muted-foreground">{toast.description}</p>}
              </div>
              <button onClick={() => removeToast(toast.id)} className="shrink-0 cursor-pointer">
                <X className="h-4 w-4 opacity-50 hover:opacity-100" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) throw new Error("useToast must be used within ToastProvider")
  return context
}
