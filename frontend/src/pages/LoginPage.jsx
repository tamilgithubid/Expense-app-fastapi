import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useDispatch } from "react-redux"
import { motion } from "framer-motion"
import { Wallet, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/toast"
import { loginUser } from "@/services/api"
import { setCredentials } from "@/store/authSlice"
import { Particles, BlurText, DecryptedText, StarBorder, ClickSpark } from "@/components/reactbits"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const data = await loginUser(username, password)
      dispatch(setCredentials({ token: data.access_token, user: { username } }))
      addToast({ title: "Welcome back!", description: `Logged in as ${username}` })
      navigate("/dashboard")
    } catch (err) {
      addToast({
        title: "Login failed",
        description: err.response?.data?.detail || "Invalid credentials",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#060918]">
      {/* Interactive particle network */}
      <Particles
        count={90}
        colors={["#6366f1", "#818cf8", "#a78bfa", "#c084fc"]}
        connectDistance={130}
        speed={0.3}
        mouseRadius={160}
      />

      {/* Ambient glow blobs */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-600/8 blur-[130px] rounded-full pointer-events-none" />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 w-full max-w-[420px] px-4"
      >
        <StarBorder color="rgba(99, 102, 241, 0.5)" speed="6s">
          <div className="bg-[#0d1028]/90 backdrop-blur-2xl rounded-xl p-8">
            {/* Icon */}
            <div className="text-center mb-6">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", duration: 0.8, delay: 0.2 }}
                className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-xl shadow-indigo-500/25"
              >
                <Wallet className="h-8 w-8 text-white" />
              </motion.div>

              {/* Title */}
              <h1 className="text-3xl font-bold mb-2">
                <BlurText
                  text="Welcome Back"
                  delay={100}
                  className="justify-center text-white"
                />
              </h1>

              {/* Subtitle */}
              <div className="text-indigo-300/60 text-sm">
                <DecryptedText
                  text="Sign in to manage your expenses"
                  speed={35}
                  className="text-indigo-300/60"
                />
              </div>
            </div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-5"
            >
              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Username</label>
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full h-12 px-4 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full h-12 px-4 pr-12 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition-all text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <ClickSpark sparkColor="#818cf8" sparkCount={10}>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-[15px] font-semibold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/20 border-0 rounded-lg"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </ClickSpark>

              {/* Footer */}
              <p className="text-center text-sm text-slate-500 pt-1">
                Don't have an account?{" "}
                <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                  Create one
                </Link>
              </p>
            </motion.form>
          </div>
        </StarBorder>
      </motion.div>
    </div>
  )
}
