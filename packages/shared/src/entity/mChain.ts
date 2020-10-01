import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, Index, OneToMany } from 'typeorm';
import Block from './mBlock';
import ChainStatus from './mChainStatus';

@Entity()
class Chain {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'int' })
  height!: number;

  @Column({ unique: true })
  hash!: string;

  @Column({ type: 'int' })
  branchlen!: number;

  @Index()
  @ManyToOne(() => ChainStatus, (chainStatus: ChainStatus) => chainStatus.chains)
  status!: ChainStatus;

  @OneToMany(() => Block, (block: Block) => block.chain)
  blocks?: Block[];
}

export default Chain;