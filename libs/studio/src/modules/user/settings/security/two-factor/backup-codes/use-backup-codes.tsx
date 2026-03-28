import { useMutation } from '@tanstack/react-query'

import { create } from 'zustand'

import { auth } from '../../../../../auth/lib/api'

const useBackupCodesStore = create<{
  codes: string[]
  setCodes: (codes: string[]) => void
}>(set => ({
  codes: [],
  setCodes: codes => set({ codes })
}))

export const useBackupCodes = () => {
  const { codes, setCodes } = useBackupCodesStore()

  const generate = useMutation({
    ...auth.mutations.twoFactor.backupCodes.generate,
    onSuccess: (data: unknown) => {
      const result = data as { backupCodes: string[] }
      setCodes(result.backupCodes)
    }
  })

  const verify = useMutation(auth.mutations.twoFactor.backupCodes.verify)

  return { codes, setCodes, generate, verify }
}
