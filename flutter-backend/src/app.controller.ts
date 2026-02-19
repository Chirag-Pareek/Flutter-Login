import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Health/demo endpoint for quick service checks.
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
