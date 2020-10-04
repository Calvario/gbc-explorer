/**
 * Copyright (C) 2020 Steve Calvário
 *
 * This file is part of GBC Explorer, a web multi-coin blockchain explorer.
 *
 * GBC Explorer is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version.
 *
 * GBC Explorer is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
 * FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
 * more details.
 *
 * You should have received a copy of the GNU General Public License along with
 * GBC Explorer. If not, see <https://www.gnu.org/licenses/>.
 */

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