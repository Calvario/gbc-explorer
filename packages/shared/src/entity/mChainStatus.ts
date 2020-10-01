import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import Chain from './mChain';

@Entity()
class ChainStatus {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  name!: string;

  @OneToMany(() => Chain, (chain: Chain) => chain.status)
  chains?: Chain[];
}

export default ChainStatus;