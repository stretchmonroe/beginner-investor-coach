import posthog from 'posthog-js'

export const trackEvent = (
  event: string,
  properties?: Record<string, any>
) => {
  console.log('[analytics]', event, properties)

  if (typeof window !== 'undefined') {
    posthog.capture(event, properties)
  }
}
