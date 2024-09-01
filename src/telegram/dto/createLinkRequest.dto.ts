import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateLinkRequestDto {
  @IsUrl({}, { message: 'Неверная ссылка' })
  url: string;

  @IsNotEmpty({ message: 'Название не может быть пустым' })
  @IsString({ message: 'Ссылка должна быть строкой' })
  title: string;
}
