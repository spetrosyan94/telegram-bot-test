import { IsNotEmpty, IsString } from 'class-validator';

export class GetLinkRequestDto {
  @IsNotEmpty({ message: 'Код не может быть пустым' })
  @IsString({ message: 'Код должен быть строкой' })
  code: string;
}
