export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.round(diffMs / 60_000)

  if (diffMin < 1) return 'adesso'
  if (diffMin < 60) return `${diffMin} min fa`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `${diffH} or${diffH === 1 ? 'a' : 'e'} fa`
  const diffD = Math.round(diffH / 24)
  return `${diffD} giorn${diffD === 1 ? 'o' : 'i'} fa`
}
