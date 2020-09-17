import { Column, Entity, PrimaryGeneratedColumn, OneToMany, ManyToOne, Index } from 'typeorm';
import Block from './mBlock';
import Vin from './mVin';
import Vout from './mVout';

@Entity()
class Transaction {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  txid!: string;

  // PoW
  @Column({ nullable: true, unique: true })
  hash?: string;

  @Column({ type: 'int' })
  version!: number;

  @Column({ type: 'int' })
  time!: number;

  // PoW
  @Column({ nullable: true, type: 'int' })
  size?: number;

  // PoW
  @Column({ nullable: true, type: 'int' })
  vsize?: number;

  // PoW
  @Column({ nullable: true, type: 'int' })
  weight?: number;

  @Column({ type: 'int' })
  locktime!: number;

  @OneToMany(() => Vin, (vin: Vin) => vin.transaction)
  vins?: Vin[];

  @OneToMany(() => Vout, (vout: Vout) => vout.transaction)
  vouts?: Vout[];

  @Index()
  @ManyToOne(() => Block, (blockhash: Block) => blockhash.transactions)
  block?: Block;

  @Column({ nullable: true, type: 'int' })
  inputC?: number;

  @Column({ nullable: true, type: 'decimal' })
  inputT?: number;

  @Column({ nullable: true, type: 'int' })
  outputC?: number;

  @Column({ nullable: true, type: 'decimal' })
  outputT?: number;

  @Column({ nullable: true, type: 'decimal' })
  fee?: number;
}

export default Transaction;