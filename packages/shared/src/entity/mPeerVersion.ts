import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import Peer from './mPeer';

@Entity()
class PeerVersion {
  @PrimaryGeneratedColumn()
  id?: number;

  @Column({ type: 'int' })
  version!: number;

  @Column({ unique: true })
  subVersion!: string;

  @OneToMany(() => Peer, (peer: Peer) => peer.version)
  peers?: Peer[];
}

export default PeerVersion;