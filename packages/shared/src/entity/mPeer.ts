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