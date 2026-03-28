import { useMutation } from '@tanstack/react-query'

import { toast } from 'sonner'

import { useTranslation } from '@libs/i18n'

import { authClient } from '../../../../../lib/auth/client'
import { auth } from '../../../../auth/lib/api'

export const useTwoFactor = () => {
  const sessionResult = authClient.useSession()
  const { t } = useTranslation('auth')

  const sessionData = sessionResult as unknown as {
    data?: { user?: { twoFactorEnabled?: boolean } }
  }
  const enabled = sessionData.data?.user?.twoFactorEnabled ?? false

  const enable = useMutation(auth.mutations.twoFactor.enable)

  const disable = useMutation({
    ...auth.mutations.twoFactor.disable,
    onSuccess: () => {
      toast.success(
        t('account.twoFactor.disable.success', {
          defaultValue: '2FA disabled'
        })
      )
    }
  })

  return { enabled, enable, disable }
}
