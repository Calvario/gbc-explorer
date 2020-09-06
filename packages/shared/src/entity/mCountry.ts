import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import Peer from './mPeer';

@Entity()
class Country {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column()
  name!: string;

  @Column({ unique: true })
  code!: string;

  @OneToMany(() => Peer, (peer: Peer) => peer.version)
  peers?: Peer[];
}

export default Country;