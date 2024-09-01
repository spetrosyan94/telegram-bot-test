import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { IEnvironmentVariables } from './constants/IEnvironmentVariables';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.setGlobalPrefix('api');

  const configService = app.get(ConfigService<IEnvironmentVariables>);
  const PORT = configService.get('PORT', 3005, { infer: true });

  await app.listen(PORT, () => console.log(`Server started on port = ${PORT}`));
}
bootstrap();
