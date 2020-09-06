import {MigrationInterface, QueryRunner} from "typeorm";

export class NetworkPeers1599230879690 implements MigrationInterface {
    name = 'NetworkPeers1599230879690'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "peer_version" ("id" SERIAL NOT NULL, "version" integer NOT NULL, "subVersion" character varying NOT NULL, CONSTRAINT "UQ_ba258651bf3c8288d0c3cff2fbc" UNIQUE ("subVersion"), CONSTRAINT "PK_06a0b227e447b3e789477f137ad" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "peer" ("id" SERIAL NOT NULL, "ip" character varying NOT NULL, "port" integer NOT NULL, "connected" boolean NOT NULL, "inserted" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "lastSeen" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(6), "versionId" integer, "countryId" integer, CONSTRAINT "UQ_101734c214a76a67850ce67b760" UNIQUE ("ip"), CONSTRAINT "PK_3a3bede69c11e056079aaece6db" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7c666785ca9d8ac16ca62b8bdc" ON "peer" ("versionId") `);
        await queryRunner.query(`CREATE INDEX "IDX_44bd1bdbc74cdf98840385c08b" ON "peer" ("countryId") `);
        await queryRunner.query(`CREATE INDEX "IDX_26cbd67b17fc911572850b5ddc" ON "peer" ("connected") `);
        await queryRunner.query(`CREATE TABLE "country" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "code" character varying NOT NULL, CONSTRAINT "UQ_8ff4c23dc9a3f3856555bd86186" UNIQUE ("code"), CONSTRAINT "PK_bf6e37c231c4f4ea56dcd887269" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "peer" ADD CONSTRAINT "FK_7c666785ca9d8ac16ca62b8bdc7" FOREIGN KEY ("versionId") REFERENCES "peer_version"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "peer" ADD CONSTRAINT "FK_44bd1bdbc74cdf98840385c08ba" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "peer" DROP CONSTRAINT "FK_44bd1bdbc74cdf98840385c08ba"`);
        await queryRunner.query(`ALTER TABLE "peer" DROP CONSTRAINT "FK_7c666785ca9d8ac16ca62b8bdc7"`);
        await queryRunner.query(`DROP TABLE "country"`);
        await queryRunner.query(`DROP INDEX "IDX_26cbd67b17fc911572850b5ddc"`);
        await queryRunner.query(`DROP INDEX "IDX_44bd1bdbc74cdf98840385c08b"`);
        await queryRunner.query(`DROP INDEX "IDX_7c666785ca9d8ac16ca62b8bdc"`);
        await queryRunner.query(`DROP TABLE "peer"`);
        await queryRunner.query(`DROP TABLE "peer_version"`);
    }

}
