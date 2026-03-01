import axios from "axios"
import { store } from "@/store/store"
import { logout } from "@/store/authSlice"

const api = axios.create({
  baseURL: "/api",
})

api.interceptors.request.use((config) => {
  const token = store.getState().auth.token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || ""
    const isAuthRoute = url.includes("/login") || url.includes("/register")
    if (error.response?.status === 401 && !isAuthRoute) {
      store.dispatch(logout())
    }
    return Promise.reject(error)
  }
)

export async function loginUser(username, password) {
  const formData = new URLSearchParams()
  formData.append("username", username)
  formData.append("password", password)
  const { data } = await api.post("/login", formData, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  })
  return data
}

export async function registerUser(username, email, password) {
  const { data } = await api.post("/register", { username, email, password })
  return data
}

export async function getExpenses() {
  const { data } = await api.get("/expenses")
  return data
}

export async function createExpense(expense) {
  const { data } = await api.post("/expenses", expense)
  return data
}

export default api
