'use client'

import { useTranslation } from '@libs/i18n'
import { Alert, AlertDescription, AlertTitle } from '@libs/ui-shared/mobile/components/alert'
import { Icons } from '@libs/ui-shared/mobile/components/icons'

export const InvitationDisclaimer = () => {
  const { t } = useTranslation('organization')

  return (
    <Alert icon={Icons.MailPlus} variant="primary">
      <AlertTitle>{t('invitations.disclaimer.title')}</AlertTitle>
      <AlertDescription>{t('invitations.disclaimer.description')}</AlertDescription>
    </Alert>
  )
}
