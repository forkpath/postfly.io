import { MonitoringProvider, registerExtensionMonitoringAdapter } from '@libs/monitoring'

import { posthogMonitoringAdapter } from './posthog'

registerExtensionMonitoringAdapter(MonitoringProvider.POSTHOG, posthogMonitoringAdapter)
