import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, ManyToMany, JoinTable, Index, OneToMany } from 'typeorm';
import Transaction from './mTransaction';
import Address from './mAddress';
import Vin from './mVin';

@Entity()
class Vout {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'decimal' })
  value!: number;

  @Column({ type: 'int' })
  n!: number;

  @Column()
  type!: string;

  @ManyToMany(() => Address, (address: Address) => address.vouts)
  @JoinTable()
  addresses?: Address[];

  @Index()
  @ManyToOne(() => Transaction, (transaction: Transaction) => transaction.vins)
  transaction!: Transaction;

  @OneToMany(() => Vin, (vin: Vin) => vin.vout)
  vins?: Vin[];
}

export default Vout;