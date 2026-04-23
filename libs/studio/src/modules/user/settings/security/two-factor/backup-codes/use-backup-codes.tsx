import { useMutation } from '@tanstack/react-query'

import { create } from 'zustand'

import { auth } from '../../../../../auth/lib/api'
import { authClient } from '../../../../../../lib/auth/client'

const useBackupCodesStore = create<{
  codes: string[]
  setCodes: (codes: string[]) => void
}>(set => ({
  codes: [],
  setCodes: codes => set({ codes })
}))

export const useBackupCodes = () => {
  const { codes, setCodes } = useBackupCodesStore()

  const generate = useMutation<
    { backupCodes: string[] },
    Error,
    Parameters<typeof authClient.twoFactor.generateBackupCodes>[0]
  >({
    mutationKey: auth.mutations.twoFactor.backupCodes.generate.mutationKey,
    mutationFn: params =>
      authClient.twoFactor.generateBackupCodes({
        ...params,
        fetchOptions: {
          throw: true
        }
      }) as Promise<{ backupCodes: string[] }>,
    onSuccess: data => {
      setCodes(data.backupCodes)
    }
  })

  const verify = useMutation(auth.mutations.twoFactor.backupCodes.verify)

  return { codes, setCodes, generate, verify }
}
