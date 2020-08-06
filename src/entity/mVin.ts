import { Column, Entity, PrimaryGeneratedColumn, ManyToOne, OneToOne, JoinColumn, Index } from 'typeorm';
import Transaction from './mTransaction';
import Vout from './mVout';

@Entity()
class Vin {
	@PrimaryGeneratedColumn()
	id?: number;

	@OneToOne(() => Vout, (vout: Vout) => vout.vin)
	@JoinColumn()
	vout?: Vout;

	@Column()
	coinbase!: boolean;

	@Index()
	@ManyToOne(() => Transaction, (transaction: Transaction) => transaction.vins)
  	transaction!: Transaction;
}

export default Vin;