import type { UIMessage } from 'ai'
import type { Response } from 'express'

import { BadRequestException, Body, Controller, Post, Res } from '@nestjs/common'

import { openai } from '@ai-sdk/openai'
import { convertToModelMessages, streamText } from 'ai'

interface ChatBody {
  messages: UIMessage[]
}

@Controller('ai')
export class AiController {
  @Post('chat')
  async chat(@Body() body: ChatBody, @Res({ passthrough: false }) res: Response): Promise<void> {
    const messages = body?.messages
    if (!messages || !Array.isArray(messages)) {
      throw new BadRequestException('messages must be an array')
    }

    const result = streamText({
      model: openai.responses('gpt-4.1-nano'),
      messages: convertToModelMessages(messages)
    })

    result.pipeUIMessageStreamToResponse(res)
  }
}
