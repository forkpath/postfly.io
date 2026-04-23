import { useMutation } from '@tanstack/react-query'

import { toast } from 'sonner'
import { create } from 'zustand'

import { useTranslation } from '@libs/i18n'

import { auth } from '../../../../../auth/lib/api'
import { authClient } from '../../../../../../lib/auth/client'
import { useBackupCodes } from '../backup-codes/use-backup-codes'

const useUri = create<{
  uri: string
  setUri: (uri: string) => void
}>(set => ({
  uri: '',
  setUri: uri => set({ uri })
}))

export const useTotp = () => {
  const { t } = useTranslation(['auth'])
  const { uri, setUri } = useUri()
  const { codes, generate } = useBackupCodes()

  const getUri = useMutation<
    { totpURI: string },
    Error,
    Parameters<typeof authClient.twoFactor.getTotpUri>[0]
  >({
    mutationKey: auth.mutations.twoFactor.totp.getUri.mutationKey,
    mutationFn: params =>
      authClient.twoFactor.getTotpUri({
        ...params,
        fetchOptions: { throw: true }
      }) as Promise<{ totpURI: string }>,
    onSuccess: async ({ totpURI }, variables) => {
      setUri(totpURI)
      if (!codes.length) {
        await generate.mutateAsync(variables)
      }
    }
  })

  const verify = useMutation({
    ...auth.mutations.twoFactor.totp.verify,
    onSuccess: () => {
      toast.success(
        t('auth:account.twoFactor.totp.success', {
          defaultValue: 'TOTP verified'
        })
      )
    }
  })

  return { uri, setUri, verify, getUri }
}
