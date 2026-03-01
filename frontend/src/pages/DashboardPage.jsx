import { useState, useMemo } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet, Plus, LogOut, DollarSign, Tag,
  Loader2, Receipt, Search, Sparkles,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { useExpenses, useCreateExpense } from "@/hooks/useExpenses"
import { logout } from "@/store/authSlice"
import {
  Squares, SpotlightCard, TiltedCard, CountUp,
  GradientText, BlurText, ClickSpark,
} from "@/components/reactbits"

const CATEGORIES = [
  "Food", "Transport", "Shopping", "Entertainment",
  "Health", "Education", "Bills", "Other",
]

const CATEGORY_COLORS = {
  Food: "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Transport: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Shopping: "bg-pink-500/15 text-pink-400 border-pink-500/20",
  Entertainment: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Health: "bg-green-500/15 text-green-400 border-green-500/20",
  Education: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  Bills: "bg-red-500/15 text-red-400 border-red-500/20",
  Other: "bg-gray-500/15 text-gray-400 border-gray-500/20",
}

const CATEGORY_ICONS = {
  Food: "🍕", Transport: "🚗", Shopping: "🛍️", Entertainment: "🎬",
  Health: "💊", Education: "📚", Bills: "📄", Other: "📌",
}

function StatCard({ icon: Icon, title, value, gradient, spotlightColor, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <SpotlightCard
        className="bg-slate-900/60 border-white/5 backdrop-blur-sm"
        spotlightColor={spotlightColor}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">{title}</p>
              <p className="text-3xl font-bold text-white mt-2">{value}</p>
            </div>
            <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${gradient} shadow-lg`}>
              <Icon className="h-7 w-7 text-white" />
            </div>
          </div>
        </CardContent>
      </SpotlightCard>
    </motion.div>
  )
}

export default function DashboardPage() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState("")

  const user = useSelector((state) => state.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { addToast } = useToast()

  const { data: expenses = [], isLoading } = useExpenses()
  const createExpense = useCreateExpense()

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesSearch = exp.title.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesCategory = !filterCategory || exp.category === filterCategory
      return matchesSearch && matchesCategory
    })
  }, [expenses, searchQuery, filterCategory])

  const totalAmount = useMemo(
    () => expenses.reduce((sum, exp) => sum + exp.amount, 0),
    [expenses]
  )

  const categoryCount = useMemo(
    () => new Set(expenses.map((exp) => exp.category)).size,
    [expenses]
  )

  const handleLogout = () => {
    dispatch(logout())
    navigate("/login")
  }

  const handleCreateExpense = async (e) => {
    e.preventDefault()
    try {
      await createExpense.mutateAsync({
        title,
        amount: parseFloat(amount),
        category,
      })
      addToast({ title: "Expense added!", description: `${title} — $${parseFloat(amount).toFixed(2)}` })
      setTitle("")
      setAmount("")
      setCategory("")
      setDialogOpen(false)
    } catch (err) {
      addToast({
        title: "Failed to add expense",
        description: err.response?.data?.detail || "Something went wrong",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* Animated grid background */}
      <Squares
        speed={0.2}
        squareSize={50}
        borderColor="rgba(99, 102, 241, 0.06)"
        hoverFillColor="rgba(99, 102, 241, 0.08)"
        direction="diagonal"
      />

      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 border-b border-white/5 bg-slate-950/80 backdrop-blur-2xl"
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20"
            >
              <Wallet className="h-5 w-5 text-white" />
            </motion.div>
            <div>
              <GradientText
                colors={["#60a5fa", "#818cf8", "#a78bfa", "#60a5fa"]}
                speed={3}
                className="text-lg"
              >
                ExpenseTracker
              </GradientText>
              <p className="text-xs text-slate-500">Welcome, {user?.username}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </motion.header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <BlurText
            text={`Good ${new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, ${user?.username || "User"}`}
            delay={80}
            className="text-2xl font-bold text-white"
          />
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <StatCard
            icon={DollarSign}
            title="Total Spent"
            value={
              <CountUp
                from={0}
                to={totalAmount}
                duration={1.5}
                decimals={2}
                prefix="$"
                className="text-3xl font-bold text-white"
              />
            }
            gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
            spotlightColor="rgba(99, 102, 241, 0.2)"
            delay={0.15}
          />
          <StatCard
            icon={Receipt}
            title="Total Items"
            value={
              <CountUp
                from={0}
                to={expenses.length}
                duration={1}
                decimals={0}
                className="text-3xl font-bold text-white"
              />
            }
            gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
            spotlightColor="rgba(16, 185, 129, 0.2)"
            delay={0.25}
          />
          <StatCard
            icon={Tag}
            title="Categories"
            value={
              <CountUp
                from={0}
                to={categoryCount}
                duration={1}
                decimals={0}
                className="text-3xl font-bold text-white"
              />
            }
            gradient="bg-gradient-to-br from-purple-500 to-pink-600"
            spotlightColor="rgba(168, 85, 247, 0.2)"
            delay={0.35}
          />
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
        >
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/50"
              />
            </div>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full sm:w-[180px] bg-slate-900/60 border-white/10 text-white"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>
          <ClickSpark sparkColor="#818cf8" sparkCount={12}>
            <Button
              onClick={() => setDialogOpen(true)}
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/20 border-0 h-10"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </ClickSpark>
        </motion.div>

        {/* Expense List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className="h-10 w-10 text-indigo-400" />
              </motion.div>
              <p className="text-sm text-slate-500">Loading expenses...</p>
            </div>
          ) : filteredExpenses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-24"
            >
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-800/50 border border-white/5"
              >
                <Receipt className="h-12 w-12 text-slate-600" />
              </motion.div>
              <h3 className="text-xl font-semibold text-slate-300">No expenses found</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">
                {expenses.length === 0
                  ? "Start tracking your spending by adding your first expense!"
                  : "Try adjusting your search or filter."}
              </p>
              {expenses.length === 0 && (
                <Button
                  onClick={() => setDialogOpen(true)}
                  className="mt-6 bg-indigo-600 hover:bg-indigo-500"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Add First Expense
                </Button>
              )}
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredExpenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.35, delay: index * 0.04 }}
                >
                  <TiltedCard tiltDegree={3} glareOpacity={0.08}>
                    <Card className="bg-slate-900/60 border-white/5 hover:border-white/10 transition-all duration-300 group">
                      <CardContent className="flex items-center justify-between p-5">
                        <div className="flex items-center gap-4">
                          <motion.div
                            whileHover={{ scale: 1.15, rotate: 5 }}
                            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-white/5 text-xl"
                          >
                            {CATEGORY_ICONS[expense.category] || "📌"}
                          </motion.div>
                          <div>
                            <p className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                              {expense.title}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {new Date(expense.created_at).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge
                            variant="outline"
                            className={`${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other} border`}
                          >
                            {expense.category}
                          </Badge>
                          <span className="text-xl font-bold text-white min-w-[90px] text-right font-mono">
                            ${expense.amount.toFixed(2)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </TiltedCard>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              <span className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
                  <Plus className="h-4 w-4 text-indigo-400" />
                </div>
                Add New Expense
              </span>
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Track a new expense by filling out the details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="exp-title" className="text-slate-300">Title</Label>
              <Input
                id="exp-title"
                placeholder="e.g. Coffee, Groceries"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/50 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-amount" className="text-slate-300">Amount ($)</Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500/50 h-11 font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-category" className="text-slate-300">Category</Label>
              <Select
                id="exp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="bg-slate-800/60 border-white/10 text-white h-11"
              >
                <option value="" disabled>Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
                ))}
              </Select>
            </div>
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/10 text-slate-300 hover:bg-slate-800 hover:text-white"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <ClickSpark sparkColor="#818cf8" sparkCount={8}>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0"
                  disabled={createExpense.isPending}
                >
                  {createExpense.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Expense
                    </>
                  )}
                </Button>
              </ClickSpark>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
