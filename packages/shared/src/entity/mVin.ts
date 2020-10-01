import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import Transaction from './mTransaction';
import Vout from './mVout';

@Entity()
class Vin {
  @PrimaryGeneratedColumn()
  id?: number;

  @Index()
  @ManyToOne(() => Vout, (vout: Vout) => vout.vins)
  vout?: Vout;

  @Column()
  coinbase!: boolean;

  @Index()
  @ManyToOne(() => Transaction, (transaction: Transaction) => transaction.vins)
  transaction!: Transaction;
}

export default Vin;