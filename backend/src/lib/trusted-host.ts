export function getTrustedHost(host: string | undefined): string {
  const baseHost = new URL(process.env.BETTER_AUTH_URL || 'http://localhost:3001').host
  const frontendHost = new URL(process.env.FRONTEND_URL || 'http://localhost:5173').host
  const allowedHosts = new Set(['localhost:3001', 'localhost:5173', baseHost, frontendHost])

  if (host && allowedHosts.has(host)) return host
  return baseHost
}
