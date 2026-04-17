import { pathsConfig } from '~/config/paths'
import { AuthLayout } from '~/modules/auth/layout/base'
import { AuthHeader } from '~/modules/auth/layout/header'
import { router } from 'expo-router'

import { useTranslation } from '@libs/i18n'
import { Button } from '@libs/ui-shared/mobile/components/button'
import { Text } from '@libs/ui-shared/mobile/components/text'

export const InvitationExpired = () => {
  const { t } = useTranslation('organization')

  return (
    <AuthLayout>
      <AuthHeader title={t('invitations.expired.title')} description={t('invitations.expired.description')} />
      <Button onPress={() => router.replace(pathsConfig.index)} size="lg" variant="outline">
        <Text>{t('invitations.expired.cta')}</Text>
      </Button>
    </AuthLayout>
  )
}
