import { useMutation } from '@tanstack/react-query'

import { authClient } from '~/lib/auth'
import { auth } from '~/modules/auth/lib/api'
import { Alert } from 'react-native'

import { useTranslation } from '@libs/i18n'

export const useTwoFactor = () => {
  const { data } = authClient.useSession()
  const { t } = useTranslation(['auth', 'common'])

  const enabled = data?.user.twoFactorEnabled ?? false

  const enable = useMutation(auth.mutations.twoFactor.enable)

  const disable = useMutation({
    ...auth.mutations.twoFactor.disable,
    onSuccess: () => {
      Alert.alert(t('account.twoFactor.disable.success'))
    }
  })

  return { enabled, enable, disable }
}
