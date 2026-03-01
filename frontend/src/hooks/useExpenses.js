import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { getExpenses, createExpense } from "@/services/api"

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: getExpenses,
    staleTime: 55 * 1000,
    refetchOnWindowFocus: true,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] })
    },
  })
}
