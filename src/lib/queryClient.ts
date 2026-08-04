import { QueryClient } from '@tanstack/react-query'

// Cache condivisa: Home, Crew e Room non rifanno gli stessi fetch. Il realtime
// aggiorna la cache (invalidazione in 3a, patch mirate in 3b) invece di uno
// stato locale parallelo. Niente refetch automatici su focus/reconnect: gli
// aggiornamenti live arrivano dal canale Supabase, non dal polling.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
