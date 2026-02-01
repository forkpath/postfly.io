import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceSelector } from '@libs/studio'

export const Route = createFileRoute('/workspace/select')({
  component: WorkspaceSelectPage
})

function WorkspaceSelectPage() {
  return <WorkspaceSelector />
}
