import { Column, Entity, PrimaryGeneratedColumn, Index, ManyToMany } from 'typeorm';
import Vout from './mVout';

@Entity()
class Address {
	@PrimaryGeneratedColumn()
	id?: number;

	@Column({ unique: true })
	address!: string;

	@Column({ nullable: true })
	label?: string;

	@Column({ type: 'int'})
	nTx!: number;

	@Index()
	@Column({ type: 'decimal' })
	balance!: number;

	@Column({ type: 'int' })
	inputC!: number;

	@Column({ type: 'int' })
	outputC!: number;

	@ManyToMany(() => Vout, (vout: Vout) => vout.addresses)
    vouts?: Vout[];
}

export default Address;