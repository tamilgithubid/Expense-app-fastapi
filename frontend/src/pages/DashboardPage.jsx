import { useState, useMemo } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Wallet, Plus, LogOut, DollarSign, TrendingUp, Tag,
  Loader2, Receipt, Search
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/toast"
import { useExpenses, useCreateExpense } from "@/hooks/useExpenses"
import { logout } from "@/store/authSlice"

const CATEGORIES = [
  "Food", "Transport", "Shopping", "Entertainment",
  "Health", "Education", "Bills", "Other",
]

const CATEGORY_COLORS = {
  Food: "bg-orange-100 text-orange-700 border-orange-200",
  Transport: "bg-blue-100 text-blue-700 border-blue-200",
  Shopping: "bg-pink-100 text-pink-700 border-pink-200",
  Entertainment: "bg-purple-100 text-purple-700 border-purple-200",
  Health: "bg-green-100 text-green-700 border-green-200",
  Education: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Bills: "bg-red-100 text-red-700 border-red-200",
  Other: "bg-gray-100 text-gray-700 border-gray-200",
}

function AnimatedCounter({ value }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      ${value.toFixed(2)}
    </motion.span>
  )
}

function StatCard({ icon: Icon, title, value, color, delay }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-md">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground">ExpenseTracker</h1>
              <p className="text-xs text-muted-foreground">Welcome, {user?.username}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </motion.header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={DollarSign}
            title="Total Expenses"
            value={<AnimatedCounter value={totalAmount} />}
            color="bg-gradient-to-br from-blue-500 to-indigo-600"
            delay={0}
          />
          <StatCard
            icon={Receipt}
            title="Total Items"
            value={expenses.length}
            color="bg-gradient-to-br from-emerald-500 to-teal-600"
            delay={0.1}
          />
          <StatCard
            icon={Tag}
            title="Categories Used"
            value={categoryCount}
            color="bg-gradient-to-br from-purple-500 to-pink-600"
            delay={0.2}
          />
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
        >
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full sm:w-[180px]"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Select>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </motion.div>

        {/* Expense List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                <Receipt className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No expenses found</h3>
              <p className="text-muted-foreground mt-1">
                {expenses.length === 0
                  ? "Start by adding your first expense!"
                  : "Try adjusting your search or filter."}
              </p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {filteredExpenses.map((expense, index) => (
                <motion.div
                  key={expense.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/10 to-indigo-500/10 group-hover:from-blue-500/20 group-hover:to-indigo-500/20 transition-colors">
                          <TrendingUp className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{expense.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(expense.created_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.Other}
                        >
                          {expense.category}
                        </Badge>
                        <span className="text-lg font-bold text-foreground min-w-[80px] text-right">
                          ${expense.amount.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Add Expense Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
            <DialogDescription>Track a new expense by filling out the details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateExpense} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="exp-title">Title</Label>
              <Input
                id="exp-title"
                placeholder="e.g. Coffee, Groceries"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-amount">Amount ($)</Label>
              <Input
                id="exp-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-category">Category</Label>
              <Select
                id="exp-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="" disabled>Select a category</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
            </div>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={createExpense.isPending}>
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
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
