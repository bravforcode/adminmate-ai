export function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-background">
      <div className="w-10 h-10 border-4 border-outline-variant border-t-primary rounded-full animate-spin" />
      <p className="mt-4 text-sm text-on-surface-variant animate-pulse">Loading...</p>
    </div>
  )
}
