import { QueryClient } from '@tanstack/react-query'

// setupRouterSsrQueryIntegration installs QueryClientProvider in router.tsx.
export function getContext() {
  return { queryClient: new QueryClient() }
}
