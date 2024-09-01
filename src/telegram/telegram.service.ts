import { Inject, Injectable } from '@nestjs/common';
import { validate } from 'class-validator';
import { Bot, InlineKeyboard } from 'grammy';
import { LinksService } from 'src/link/link.service';
import { CreateLinkRequestDto } from './dto/createLinkRequest.dto';
import { EUserState } from 'src/constants/EUserState';
import { GetLinkRequestDto } from './dto/getLinkRequest.dto';

@Injectable()
export class TelegramService {
  constructor(
    @Inject('TELEGRAM_BOT') private readonly bot: Bot,
    private readonly linksService: LinksService,
  ) {}

  private userState: Record<number, string> = {}; // Хранение состояния пользователей по их ID

  startBot() {
    // Обработчик для команды /start
    this.bot.command('start', async (ctx) => {
      const keyboard = new InlineKeyboard()
        .text('Сохранить ссылку', 'save')
        .row()
        .text('Список ссылок', 'list')
        .row()
        .text('Получить ссылку', 'get')
        .row()
        .text('Удалить ссылку', 'delete');

      await ctx.reply(
        'Привет! Я бот для хранения ссылок. Выбери нужное действие',
        {
          reply_markup: keyboard,
        },
      );
    });

    this.bot.callbackQuery('list', (ctx) => this.sendLinkList(ctx));

    this.bot.callbackQuery('save', async (ctx) => {
      const userId = ctx.from?.id;
      if (userId) {
        this.userState[userId] = EUserState.AWAITING_LINK;
      }

      await ctx.reply(
        'Пожалуйста, отправьте название и URL вашей ссылки через точку.',
      );
    });

    this.bot.callbackQuery('get', async (ctx) => {
      const userId = ctx.from?.id;
      if (userId) {
        this.userState[userId] = EUserState.AWAITING_CODE;
      }

      await ctx.reply(
        'Пожалуйста, отправьте код ссылки, которую хотите получить.',
      );
    });
    this.bot.callbackQuery('delete', async (ctx) => {
      const userId = ctx.from?.id;
      if (userId) {
        this.userState[userId] = EUserState.AWAITING_DELETE_CODE;
      }

      await ctx.reply(
        'Пожалуйста, отправьте код ссылки, которую хотите удалить.',
      );
    });

    this.bot.command('list', (ctx) => this.sendLinkList(ctx));

    // Обработчики для команд (должны быть зарегистрированы один раз)
    this.bot.command('save', async (ctx) => {
      const userId = ctx.from?.id;

      // Проверяем, что ctx.message и ctx.message.text существуют
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply(
          'Не удалось обработать запрос, пожалуйста, укажите название и URL через точку.',
        );
        return;
      }

      // Удаляем команду /save и любые переносы строк
      const messageText = ctx.message.text
        .replace('/save', '')
        .replace(/\n/g, '')
        .trim();

      // Если название и URL не указаны, попросим пользователя ввести их
      if (!messageText || messageText.split('.').length < 2) {
        if (userId) {
          this.userState[userId] = EUserState.AWAITING_LINK;
        }
        await ctx.reply(
          'Пожалуйста, укажите название и URL вашей ссылки через точку.',
        );
        return;
      }

      // Извлекаем название и URL
      const { title, url } = this.extractTitleAndUrl(messageText);

      if (!title || !url) {
        await ctx.reply(
          'Ошибка: пожалуйста, отправьте название и URL через точку.',
        );
        return;
      }

      await this.validateAndSaveLink(ctx, title, url.trim(), userId);
    });

    this.bot.command('get', async (ctx) => {
      const userId = ctx.from?.id;

      // Проверяем, что ctx.message и ctx.message.text существуют
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply(
          'Не удалось обработать запрос, пожалуйста, укажите код ссылки.',
        );
        return;
      }

      // Удаляем команду /get и любые переносы строк
      const code = ctx.message.text
        .replace('/get', '')
        .replace(/\n/g, '')
        .trim();

      // Если код не указан, попросим пользователя ввести его
      if (!code || code.length === 0) {
        if (userId) {
          this.userState[userId] = EUserState.AWAITING_CODE;
        }
        await ctx.reply(
          'Пожалуйста, укажите код ссылки, которую хотите получить.',
        );
        return;
      }

      // Валидация и получение ссылки
      const error = await this.validateCode(ctx, code);
      if (!error) {
        await this.getLink(ctx, code);
      }
    });

    this.bot.command('delete', async (ctx) => {
      const userId = ctx.from?.id;

      // Если команда вызвана без указания кода
      if (!ctx.message || !ctx.message.text) {
        await ctx.reply(
          'Не удалось обработать запрос, пожалуйста, укажите код ссылки.',
        );
        return;
      }

      // Удаляем команду /delete и любые переносы строк
      const code = ctx.message.text
        .replace('/delete', '')
        .replace(/\n/g, '')
        .trim();

      // Если код не указан, попросим пользователя ввести его
      if (!code || code.length === 0) {
        if (userId) {
          this.userState[userId] = EUserState.AWAITING_DELETE_CODE;
        }
        await ctx.reply(
          'Пожалуйста, укажите код ссылки, которую хотите удалить.',
        );
        return;
      }

      // Валидация и удаление ссылки
      const error = await this.validateCode(ctx, code);
      if (!error) {
        await this.deleteLink(ctx, code);
      }
    });

    // Объединенный обработчик для текстовых сообщений
    this.bot.on('message:text', async (ctx) => {
      const userId = ctx.from?.id;
      const messageText = ctx.message.text?.trim() || '';

      // Игнорируем команды в ручную, чтобы они не перехватывались раньше, так как у них есть свои обработчики
      if (messageText.startsWith('/')) {
        return;
      }

      const { title, url } = this.extractTitleAndUrl(messageText);

      switch (true) {
        case this.userState[userId] === EUserState.AWAITING_LINK: {
          if (!title || !url) {
            await ctx.reply(
              'Ошибка: пожалуйста, отправьте название и URL через точку.',
            );
            return;
          }

          const errorMessage = await this.validateAndSaveLink(
            ctx,
            title,
            url,
            userId,
          );
          if (!errorMessage) {
            delete this.userState[userId];
          }
          break;
        }

        case this.userState[userId] === EUserState.AWAITING_CODE: {
          const code = messageText.trim();

          if (!code || code.length === 0) {
            await ctx.reply('Пожалуйста, укажите код ссылки.');
            return;
          }

          const errorMessage = await this.validateCode(ctx, code);
          if (!errorMessage) {
            await this.getLink(ctx, code);
            delete this.userState[userId];
          }
          break;
        }

        case this.userState[userId] === EUserState.AWAITING_DELETE_CODE: {
          const code = messageText.trim();

          if (!code || code.length === 0) {
            await ctx.reply('Пожалуйста, укажите код ссылки.');
            return;
          }

          const errorMessage = await this.validateCode(ctx, code);
          if (!errorMessage) {
            await this.deleteLink(ctx, code);
            delete this.userState[userId];
          }
          break;
        }

        default:
          await ctx.reply(
            'Команда не распознана. Пожалуйста, выберите действие.',
          );
      }
    });

    // Стартуем бот
    this.bot.start();
  }

  private async validateCode(ctx: any, code: string) {
    const getLinkDto = new GetLinkRequestDto();
    getLinkDto.code = code.trim();

    const errors = await validate(getLinkDto);
    if (errors.length > 0) {
      const errorMessage = errors
        .map((err) => Object.values(err.constraints))
        .join('\n');
      await ctx.reply(`Ошибка валидации:\n${errorMessage}`);
      return errorMessage;
    }
    return null;
  }

  private async validateAndSaveLink(
    ctx: any,
    title: string,
    url: string,
    userId: number,
  ): Promise<string | null> {
    const createLinkDto = new CreateLinkRequestDto();
    createLinkDto.title = title.trim();
    createLinkDto.url = url.trim();

    const errors = await validate(createLinkDto);
    if (errors.length > 0) {
      const errorMessage = errors
        .map((err) => Object.values(err.constraints))
        .join('\n');
      await ctx.reply(`Ошибка валидации:\n${errorMessage}`);
      return errorMessage;
    }

    const link = await this.linksService.create(
      title.trim(),
      url.trim(),
      userId,
    );
    await ctx.reply(`Ссылка сохранена! Ваш уникальный код: ${link.code}`);

    return null;
  }

  private async sendLinkList(ctx: any) {
    const userId = ctx.from?.id;

    if (!userId) {
      await ctx.reply(
        'Не удалось получить список ссылок. Пожалуйста, повторите попытку.',
      );
      return;
    }

    const links = await this.linksService.findAllByUser(userId);
    if (links.length === 0) {
      await ctx.reply('У вас пока нет сохраненных ссылок.');
      return;
    }

    let response = 'Ваши сохраненные ссылки:\n';
    links.forEach((link) => {
      response += `- ${link.title}: ${link.url}\n`;
    });
    await ctx.reply(response);
  }

  private async getLink(ctx: any, code: string) {
    const link = await this.linksService.findOne(code);

    if (!link) {
      await ctx.reply('Ссылка с таким кодом не найдена.');
      return;
    }

    await ctx.reply(`Ваша ссылка: ${link.url}`);
  }

  private extractTitleAndUrl(messageText: string): {
    title: string;
    url: string | null;
  } {
    const urlRegex = /(https?:\/\/[^\s]+)/;
    const match = messageText.match(urlRegex);

    if (match) {
      const url = match[0]; // найденный URL
      const title = messageText.replace(url, '').trim(); // остальной текст без URL
      return { title, url };
    } else {
      return { title: messageText.trim(), url: null };
    }
  }

  private async deleteLink(ctx: any, code: string) {
    const userId = ctx.from?.id;
    const link = await this.linksService.findOne(code);

    if (!link) {
      await ctx.reply('Ссылка с таким кодом не найдена.');
      return;
    }

    if (link.userId !== userId) {
      await ctx.reply(
        'Вы не можете удалить эту ссылку, так как она не принадлежит вам.',
      );
      return;
    }

    await this.linksService.remove(code);
    await ctx.reply('Ссылка успешно удалена.');
  }
}
