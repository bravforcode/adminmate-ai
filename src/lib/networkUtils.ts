/**
 * Network utilities for SSRF protection.
 * Validates that URLs do not resolve to private/internal IP ranges.
 */

// RFC 1918 + link-local + loopback ranges
const PRIVATE_RANGES: Array<{ start: number[]; end: number[] }> = [
  // 10.0.0.0/8
  { start: [10, 0, 0, 0], end: [10, 255, 255, 255] },
  // 172.16.0.0/12
  { start: [172, 16, 0, 0], end: [172, 31, 255, 255] },
  // 192.168.0.0/16
  { start: [192, 168, 0, 0], end: [192, 168, 255, 255] },
  // 169.254.0.0/16 (link-local)
  { start: [169, 254, 0, 0], end: [169, 254, 255, 255] },
  // 127.0.0.0/8 (loopback)
  { start: [127, 0, 0, 0], end: [127, 255, 255, 255] },
  // 0.0.0.0/8
  { start: [0, 0, 0, 0], end: [0, 255, 255, 255] },
]

function ipToNumber(ip: string): number {
  const parts = ip.split('.').map(Number)
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function isIpInPrivateRanges(ip: string): boolean {
  const ipNum = ipToNumber(ip)
  for (const range of PRIVATE_RANGES) {
    const startNum = ipToNumber(range.start.join('.'))
    const endNum = ipToNumber(range.end.join('.'))
    if (ipNum >= startNum && ipNum <= endNum) {
      return true
    }
  }
  return false
}

function isIpv6Private(ip: string): boolean {
  const normalized = ip.toLowerCase()
  return (
    normalized === '::1' ||
    normalized === '::' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    normalized.startsWith('fe80') ||
    normalized.startsWith('::ffff:127.') ||
    normalized.startsWith('::ffff:10.') ||
    normalized.startsWith('::ffff:172.16.') ||
    normalized.startsWith('::ffff:192.168.')
  )
}

/**
 * Resolve a hostname to its IP address(es) using DNS-over-HTTPS.
 * Returns the resolved IPs or throws on failure.
 */
async function resolveHostname(hostname: string): Promise<string[]> {
  // Use Cloudflare's DNS-over-HTTPS API
  const response = await fetch(
    `https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`,
    {
      headers: { Accept: 'application/dns-json' },
      signal: AbortSignal.timeout(5000),
    }
  )

  if (!response.ok) {
    throw new Error(`DNS resolution failed: ${response.status}`)
  }

  const data = await response.json()
  const ips: string[] = []

  if (data.Answer) {
    for (const answer of data.Answer) {
      if (answer.type === 1 && answer.data) {
        ips.push(answer.data)
      }
    }
  }

  if (ips.length === 0) {
    throw new Error('No A records found for hostname')
  }

  return ips
}

/**
 * Check if a hostname resolves to a private/internal IP address.
 * Returns true if the hostname resolves to a private IP (SSRF risk).
 * Returns false if the hostname resolves to a public IP (safe).
 * Throws if DNS resolution fails (fail-closed).
 */
export async function isPrivateIp(hostname: string): Promise<boolean> {
  // Quick checks for obvious private addresses
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true
  }

  // Check if hostname is already an IP address
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  if (ipv4Regex.test(hostname)) {
    return isIpInPrivateRanges(hostname)
  }

  // Resolve hostname to IP addresses
  const ips = await resolveHostname(hostname)

  // Check if ANY resolved IP is in a private range
  for (const ip of ips) {
    if (ipv4Regex.test(ip)) {
      if (isIpInPrivateRanges(ip)) {
        return true
      }
    } else {
      // IPv6
      if (isIpv6Private(ip)) {
        return true
      }
    }
  }

  return false
}
