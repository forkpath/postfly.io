import { app } from 'electron'

// Report startup failures to the process log instead of an unobservable modal dialog.
void import('./application').catch((error: unknown) => {
  console.error('Desktop startup failed', error)
  app.exit(1)
})
