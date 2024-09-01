import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Links')
export class Link {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @Column()
  title: string;

  @Column()
  url: string;

  @Column({ unique: true })
  code: string;
}
