import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // Returns a static response used by the root endpoint and tests.
  getHello(): string {
    return 'Hello World!';
  }
}
