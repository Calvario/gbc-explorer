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

import { Column, Entity, PrimaryGeneratedColumn, ManyToMany, ManyToOne, Index, JoinTable } from 'typeorm';
import Chain from './mChain';
import Address from './mAddress';
import Transaction from './mTransaction';

@Entity()
class Block {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  hash!: string;

  @Index()
  @ManyToOne(() => Chain, (chain: Chain) => chain.blocks)
  chain!: Chain;

  @Index()
  @ManyToOne(() => Address, (address: Address) => address.address)
  miner?: Address;

  // PoW
  @Column({ nullable: true, type: 'int' })
  strippedsize?: number;

  @Column({ type: 'int' })
  size!: number;

  @Column({ type: 'decimal' })
  mint!: number;

  // PoW
  @Column({ nullable: true, type: 'int' })
  weight?: number;

  @Index()
  @Column({ type: 'int' })
  height!: number;

  @Column({ type: 'int' })
  version!: number;

  @Column()
  merkleroot!: string;

  @ManyToMany(() => Transaction, (transaction: Transaction) => transaction.blocks)
  @JoinTable()
  transactions?: Transaction[];

  @Index()
  @Column({ type: 'int' })
  time!: number;

  @Column()
  nonce!: string;

  @Column()
  bits!: string;

  @Column({ type: 'decimal' })
  difficulty!: number;

  // PoW
  @Column({ nullable: true })
  chainwork?: string;

  // PoS
  @Column({ nullable: true })
  chaintrust?: string;

  // PoS
  @Column({ nullable: true })
  blocktrust?: string;

  // PoS
  @Column({ nullable: true })
  flags?: string;

  // PoS
  @Column({ nullable: true })
  proofhash?: string;

  // PoS
  @Column({ nullable: true, type: 'int' })
  entropybit?: number;

  // PoS
  @Column({ nullable: true })
  modifier?: string;

  // PoS
  @Column({ nullable: true })
  modifierchecksum?: string;

  // PoS
  @Column({ nullable: true })
  signature?: string;

  // PoW
  // PoS not native, calculated
  @Column({ type: 'int' })
  nTx!: number;

  @Column({ nullable: true, type: 'int' })
  inputC?: number;

  @Column({ nullable: true, type: 'decimal' })
  inputT?: number;

  @Column({ nullable: true, type: 'int' })
  outputC?: number;

  @Column({ nullable: true, type: 'decimal' })
  outputT?: number;

  @Column({ nullable: true, type: 'decimal' })
  feesT?: number;

  @Column({ nullable: true, type: 'decimal' })
  generation?: number;

  @Column()
  previousblockhash!: string;

  @Column({ nullable: true })
  nextblockhash!: string;
}

export default Block;