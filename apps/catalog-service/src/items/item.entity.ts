import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, default: '0' })
  price!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
