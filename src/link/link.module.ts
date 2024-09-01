import { Module } from '@nestjs/common';
import { LinksService } from './link.service';
import { LinksController } from './link.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Link } from 'src/database/entities/link/link.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Link])],
  providers: [LinksService],
  controllers: [LinksController],
  exports: [LinksService],
})
export class LinksModule {}
