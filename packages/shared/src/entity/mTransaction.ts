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

import { Column, Entity, PrimaryGeneratedColumn, OneToMany, ManyToMany } from 'typeorm';
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

  @ManyToMany(() => Block, (block: Block) => block.transactions)
  blocks?: Block[];

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