import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generate(message: string): Promise<string> {
    try {
      this.logger.log(`AI request: ${message.substring(0, 50)}`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: message,
          },
        ],
      });

      return completion.choices[0].message.content || 'No response';

    } catch (error) {
      this.logger.error('AI Error', error);
      return 'Something went wrong';
    }
  }
}