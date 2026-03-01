import { createSlice } from "@reduxjs/toolkit"

const initialState = {
  token: localStorage.getItem("token") || null,
  user: JSON.parse(localStorage.getItem("user") || "null"),
  isAuthenticated: !!localStorage.getItem("token"),
}

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { token, user } = action.payload
      state.token = token
      state.user = user
      state.isAuthenticated = true
      localStorage.setItem("token", token)
      localStorage.setItem("user", JSON.stringify(user))
    },
    logout: (state) => {
      state.token = null
      state.user = null
      state.isAuthenticated = false
      localStorage.removeItem("token")
      localStorage.removeItem("user")
    },
  },
})

export const { setCredentials, logout } = authSlice.actions
export default authSlice.reducer
