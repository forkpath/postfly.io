import { MonitoringProvider, registerExtensionMonitoringAdapter } from '@libs/monitoring'

import { posthogMonitoringAdapter } from './posthog'
import { sentryMonitoringAdapter } from './sentry'

registerExtensionMonitoringAdapter(MonitoringProvider.POSTHOG, posthogMonitoringAdapter)
registerExtensionMonitoringAdapter(MonitoringProvider.SENTRY, sentryMonitoringAdapter)
