import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dns from 'dns';
import { ValidationPipe } from '@nestjs/common';

dns.setServers(['8.8.8.8', '8.8.4.4']);

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT || 8000);
}
bootstrap().catch((err) => {
  console.error('Error during application bootstrap:', err);
  process.exit(1);
});
