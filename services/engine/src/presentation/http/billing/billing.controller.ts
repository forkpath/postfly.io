import { BadRequestException, Body, Controller, Get, Headers, Post, Req } from '@nestjs/common'

import { getBillingSummaryByReferenceId } from '@libs/billing/server'
import {
  billingPortalSchema,
  checkoutSchema,
  createStripeBillingPortalSession,
  createStripeCheckoutSession,
  handleStripeWebhook
} from '@libs/billing/web'
import { Session } from '@libs/srv-shared'

interface SessionUser {
  id: string
  email: string
  name: string
  role?: string
}

interface AuthSession {
  user: SessionUser
}

@Controller('billing')
export class BillingController {
  @Get('me')
  async getSummary(@Session() session: AuthSession) {
    return getBillingSummaryByReferenceId(session.user.id)
  }

  @Post('checkout')
  async createCheckoutSession(@Session() session: AuthSession, @Body() body: unknown) {
    const input = checkoutSchema.parse(body)

    return createStripeCheckoutSession({
      referenceId: session.user.id,
      email: session.user.email,
      variantId: input.variantId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl
    })
  }

  @Post('portal')
  async createBillingPortal(@Session() session: AuthSession, @Body() body: unknown) {
    const input = billingPortalSchema.parse(body)

    return createStripeBillingPortalSession({
      referenceId: session.user.id,
      email: session.user.email,
      returnUrl: input.returnUrl
    })
  }

  @Post('webhook/stripe')
  async handleStripeWebhookRequest(
    @Req() req: { body: Buffer | string },
    @Headers('stripe-signature') signature?: string
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header')
    }

    if (!Buffer.isBuffer(req.body) && typeof req.body !== 'string') {
      throw new BadRequestException('Webhook payload must be raw')
    }

    return handleStripeWebhook({
      payload: req.body,
      signature
    })
  }
}
