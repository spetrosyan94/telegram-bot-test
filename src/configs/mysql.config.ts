import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { IEnvironmentVariables } from 'src/constants/IEnvironmentVariables';
import * as path from 'path';

export const getMySQLConfig = async (
  configService: ConfigService<IEnvironmentVariables>,
): Promise<TypeOrmModuleOptions> => ({
  type: 'mysql',
  host: configService.get('MYSQL_HOST', 'localhost', { infer: true }),
  port: configService.get('MYSQL_PORT', 3306, { infer: true }),
  username: configService.get('MYSQL_USERNAME', 'root', {
    infer: true,
  }),
  password: configService.get('MYSQL_PASSWORD', 'root', {
    infer: true,
  }),
  database: configService.get('MYSQL_DATABASE', 'telegram-bot', {
    infer: true,
  }),
  synchronize: true,
  autoLoadEntities: true,
  logging: true,
  // entities: [path.join(__dirname, '../database/entities/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../database/migrations/*{.ts,.js}')],
  subscribers: [
    path.join(__dirname, '../database/subscribers/*.subscriber.{ts,js}'),
  ],
});
