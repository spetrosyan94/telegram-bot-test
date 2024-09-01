import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot } from 'grammy';
import { IEnvironmentVariables } from 'src/constants/IEnvironmentVariables';
import { TelegramService } from './telegram.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LinksModule } from 'src/link/link.module';

@Module({
  imports: [LinksModule, TypeOrmModule.forFeature([])],
  controllers: [],
  providers: [
    {
      provide: 'TELEGRAM_BOT',
      inject: [ConfigService],
      useFactory: (configService: ConfigService<IEnvironmentVariables>) => {
        const botToken = configService.get('API_TELEGRAM_BOT_TOKEN', {
          infer: true,
        });

        if (!botToken) throw new Error('API_TELEGRAM_BOT_TOKEN is not defined');

        const bot = new Bot(botToken);
        return bot;
      },
    },
    TelegramService,
  ],
  exports: ['TELEGRAM_BOT', TelegramService],
})
export class TelegramModule implements OnModuleInit {
  constructor(private readonly telegramService: TelegramService) {}
  // Вызывается один раз, после того как все провайдеры модуля инициализированы
  onModuleInit() {
    this.telegramService.startBot();
    console.log('Telegram bot has started.');
  }
}
