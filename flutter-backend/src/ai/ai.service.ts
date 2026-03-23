import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
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

  async generate(
    message: string,
    personaStyle?: string,
    tone?: string,
    language?: string,
  ): Promise<string> {
    const replyTone = tone || 'Natural';
    const replyLanguage = language || 'English';

    const personaDescriptions: Record<string, string> = {
      girlfriend: 'a loving, caring girlfriend who is warm, playful, and emotionally present',
      boyfriend: 'a charming, affectionate boyfriend who is flirty, caring, and devoted',
      boss: 'a direct, results-driven boss who is professional, decisive, and clear',
      manager: 'a calm and strategic manager who leads with clarity and encourages the team',
      friend: 'a fun, easygoing best friend who is casual, supportive, and always up for anything',
      mother: 'a nurturing, caring mother who is warm, protective, and always puts family first',
      mentor: 'a wise, experienced mentor who gives thoughtful, grounded, and practical advice',
    };

    const personaKey = (personaStyle || '').toLowerCase();
    const personaDesc = personaDescriptions[personaKey] || 'a helpful assistant';

    const systemPrompt = `You are ${personaDesc}.
Tone: ${replyTone}.
Always reply in ${replyLanguage} language using English/Latin alphabet only (romanized script). Never use native script like Devanagari, Gujarati script, Tamil script, Telugu script, Japanese script, etc. Write everything in Roman letters only.
Keep replies short, conversational, and fully in character.
Do not break character, do not explain your role, do not add disclaimers.`;

    try {
      this.logger.log(`AI request — persona:${personaKey} tone:${replyTone} lang:${replyLanguage} msg:${message.substring(0, 50)}`);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
      });

      return completion.choices[0].message.content || 'No response';
    } catch (error) {
      this.logger.error('AI Error', error);
      throw new InternalServerErrorException('AI service is temporarily unavailable.');
    }
  }
}