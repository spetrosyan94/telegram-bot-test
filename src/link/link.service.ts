import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Link } from 'src/database/entities/link/link.entity';
import { Repository } from 'typeorm';

@Injectable()
export class LinksService {
  constructor(
    @InjectRepository(Link)
    private linksRepository: Repository<Link>,
  ) {}

  async create(title: string, url: string, userId: number): Promise<Link> {
    const code = await this.generateUniqueCode();

    const link = this.linksRepository.create({ title, url, code, userId });
    return this.linksRepository.save(link);
  }

  findAllByUser(userId: number): Promise<Link[]> {
    return this.linksRepository.find({ where: { userId } });
  }

  findOne(code: string): Promise<Link> {
    return this.linksRepository.findOne({ where: { code } });
  }

  async remove(code: string): Promise<void> {
    const link = await this.linksRepository.findOne({ where: { code } });
    await this.linksRepository.remove(link);
  }

  // Генерируем уникальный 4х-значный код для ссылки
  generateRandomCode(): string {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }

  async generateUniqueCode(): Promise<string> {
    let code: string;
    let linkWithCode: Link | undefined;

    do {
      code = this.generateRandomCode();
      linkWithCode = await this.linksRepository.findOne({ where: { code } });
    } while (linkWithCode);

    return code;
  }
}
