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

import { Column, Entity, PrimaryGeneratedColumn, Index, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import Version from './mPeerVersion';
import Country from './mCountry';

@Entity()
class Peer {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ unique: true })
  ip!: string;

  @Column({ nullable: true, type: 'int' })
  port?: number;

  @Index()
  @ManyToOne(() => Version, (version: Version) => version.peers)
  version!: Version;

  @Index()
  @ManyToOne(() => Country, (country: Country) => country.peers)
  country!: Country;

  @Index()
  @Column()
  connected!: boolean;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)" })
  inserted?: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP(6)", onUpdate: "CURRENT_TIMESTAMP(6)" })
  lastSeen?: Date;
}

export default Peer;