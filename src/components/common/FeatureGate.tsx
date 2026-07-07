import { useState, useEffect, type ReactNode } from 'react'
import { getCapability, type CapabilityStatus } from '../../services/capability/capabilityRegistryService'
import { ComingSoon } from './ComingSoon'
import { NeedsConfiguration } from './NeedsConfiguration'

interface FeatureGateProps {
  featureKey: string
  children: ReactNode
  fallback?: ReactNode
}

function getComponentForStatus(status: CapabilityStatus, featureKey: string) {
  switch (status) {
    case 'complete':
    case 'sandbox_verified':
    case 'functional_local':
      return null
    case 'not_started':
      return <ComingSoon feature={featureKey} />
    case 'schema_only':
    case 'adapter_only':
      return <ComingSoon feature={featureKey} isUnderDevelopment />
    case 'partial':
    case 'disabled_not_configured':
      return <NeedsConfiguration feature={featureKey} />
    default:
      return null
  }
}

export function FeatureGate({ featureKey, children, fallback }: FeatureGateProps) {
  const [status, setStatus] = useState<CapabilityStatus | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getCapability(featureKey)
      .then(cap => {
        if (!cancelled) {
          setStatus(cap?.capability_status ?? null)
          setLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus(null)
          setLoaded(true)
        }
      })
    return () => { cancelled = true }
  }, [featureKey])

  if (!loaded) return null

  const blocked = getComponentForStatus(status ?? 'complete', featureKey)
  if (blocked) return fallback ?? blocked

  return <>{children}</>
}
