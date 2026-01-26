import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { AuthProvider } from '@libs/auth'
import { useTranslation } from '@libs/i18n'
import { Badge, Button, Icons } from '@libs/ui-shared/web'

import { pathsConfig } from '../../../config/paths'
import { authClient } from '../../../lib/auth/client'
import { auth } from '../../lib/api'
import { useAuthFormStore } from '../store'

interface PasskeyLoginProps {
  readonly redirectTo?: string
}

export const PasskeyLogin = ({ redirectTo = pathsConfig.dashboard.user.index }: PasskeyLoginProps) => {
  const navigate = useNavigate()
  const { setProvider, setIsSubmitting, isSubmitting, provider } = useAuthFormStore()
  const { t } = useTranslation(['auth', 'common'])

  const queryClient = useQueryClient()

  const signIn = useMutation({
    ...auth.mutations.signIn.passkey,
    onMutate: () => {
      setProvider(AuthProvider.PASSKEY)
      setIsSubmitting(true)
    },
    onSettled: () => {
      setIsSubmitting(false)
    },
    onSuccess: () => {
      navigate({ to: redirectTo })
    }
  })

  useEffect(() => {
    void queryClient.getMutationCache().build(queryClient, auth.mutations.signIn.passkey).execute({ autoFill: true })
  }, [queryClient])

  return (
    <Button
      variant="outline"
      className="relative gap-2"
      size="lg"
      onClick={() => signIn.mutate(undefined)}
      disabled={isSubmitting}
    >
      {isSubmitting && provider === AuthProvider.PASSKEY ? (
        <Icons.Loader2 className="size-4 animate-spin" />
      ) : (
        <>
          <Icons.Key className="size-4" />
          {t('login.passkey.cta')}
        </>
      )}

      {authClient.isLastUsedLoginMethod(AuthProvider.PASSKEY) && (
        <Badge className="absolute top-0 -right-4 z-10 -translate-y-1/2 shadow-sm">{t('lastUsed')}</Badge>
      )}
    </Button>
  )
}
