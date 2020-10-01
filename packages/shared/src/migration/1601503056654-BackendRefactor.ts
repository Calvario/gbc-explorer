import {MigrationInterface, QueryRunner} from "typeorm";

export class BackendRefactor1601503056654 implements MigrationInterface {
    name = 'BackendRefactor1601503056654'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_ac3a4377dd117a7cf615cde7b63"`);
        await queryRunner.query(`DROP INDEX "IDX_ac3a4377dd117a7cf615cde7b6"`);
        await queryRunner.query(`ALTER TABLE "block" RENAME COLUMN "onMainChain" TO "chainId"`);
        await queryRunner.query(`CREATE TABLE "chain_status" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_1015a973ebb7a0b25b98e87df65" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "chain" ("id" SERIAL NOT NULL, "height" integer NOT NULL, "hash" character varying NOT NULL, "branchlen" integer NOT NULL, "statusId" integer, CONSTRAINT "UQ_0d0267bb5736a992af8412823e1" UNIQUE ("hash"), CONSTRAINT "PK_8e273aafae283b886672c952ecd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_899e065ca14950b099c65fc35b" ON "chain" ("statusId") `);
        await queryRunner.query(`CREATE TABLE "block_transactions_transaction" ("blockId" integer NOT NULL, "transactionId" integer NOT NULL, CONSTRAINT "PK_676f6b93622f53d830ec33875d3" PRIMARY KEY ("blockId", "transactionId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_575f358435de9637ef6993c570" ON "block_transactions_transaction" ("blockId") `);
        await queryRunner.query(`CREATE INDEX "IDX_eca82b394694ee9daa244678a8" ON "block_transactions_transaction" ("transactionId") `);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "blockId"`);
        await queryRunner.query(`ALTER TABLE "block" DROP COLUMN "chainId"`);
        await queryRunner.query(`ALTER TABLE "block" ADD "chainId" integer`);
        await queryRunner.query(`ALTER TABLE "vin" DROP CONSTRAINT "FK_9e26f058e1e813516b50ca3bf6f"`);
        await queryRunner.query(`ALTER TABLE "vin" DROP CONSTRAINT "REL_9e26f058e1e813516b50ca3bf6"`);
        await queryRunner.query(`ALTER TABLE "peer" ALTER COLUMN "port" DROP NOT NULL`);
        await queryRunner.query(`CREATE INDEX "IDX_3396ab8b18c9241389d8c5182b" ON "block" ("chainId") `);
        await queryRunner.query(`CREATE INDEX "IDX_9e26f058e1e813516b50ca3bf6" ON "vin" ("voutId") `);
        await queryRunner.query(`ALTER TABLE "chain" ADD CONSTRAINT "FK_899e065ca14950b099c65fc35bd" FOREIGN KEY ("statusId") REFERENCES "chain_status"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "block" ADD CONSTRAINT "FK_3396ab8b18c9241389d8c5182bf" FOREIGN KEY ("chainId") REFERENCES "chain"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vin" ADD CONSTRAINT "FK_9e26f058e1e813516b50ca3bf6f" FOREIGN KEY ("voutId") REFERENCES "vout"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "block_transactions_transaction" ADD CONSTRAINT "FK_575f358435de9637ef6993c5709" FOREIGN KEY ("blockId") REFERENCES "block"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "block_transactions_transaction" ADD CONSTRAINT "FK_eca82b394694ee9daa244678a86" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "block_transactions_transaction" DROP CONSTRAINT "FK_eca82b394694ee9daa244678a86"`);
        await queryRunner.query(`ALTER TABLE "block_transactions_transaction" DROP CONSTRAINT "FK_575f358435de9637ef6993c5709"`);
        await queryRunner.query(`ALTER TABLE "vin" DROP CONSTRAINT "FK_9e26f058e1e813516b50ca3bf6f"`);
        await queryRunner.query(`ALTER TABLE "block" DROP CONSTRAINT "FK_3396ab8b18c9241389d8c5182bf"`);
        await queryRunner.query(`ALTER TABLE "chain" DROP CONSTRAINT "FK_899e065ca14950b099c65fc35bd"`);
        await queryRunner.query(`DROP INDEX "IDX_9e26f058e1e813516b50ca3bf6"`);
        await queryRunner.query(`DROP INDEX "IDX_3396ab8b18c9241389d8c5182b"`);
        await queryRunner.query(`ALTER TABLE "peer" ALTER COLUMN "port" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "vin" ADD CONSTRAINT "REL_9e26f058e1e813516b50ca3bf6" UNIQUE ("voutId")`);
        await queryRunner.query(`ALTER TABLE "vin" ADD CONSTRAINT "FK_9e26f058e1e813516b50ca3bf6f" FOREIGN KEY ("voutId") REFERENCES "vout"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "block" DROP COLUMN "chainId"`);
        await queryRunner.query(`ALTER TABLE "block" ADD "chainId" boolean NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "blockId" integer`);
        await queryRunner.query(`DROP INDEX "IDX_eca82b394694ee9daa244678a8"`);
        await queryRunner.query(`DROP INDEX "IDX_575f358435de9637ef6993c570"`);
        await queryRunner.query(`DROP TABLE "block_transactions_transaction"`);
        await queryRunner.query(`DROP INDEX "IDX_899e065ca14950b099c65fc35b"`);
        await queryRunner.query(`DROP TABLE "chain"`);
        await queryRunner.query(`DROP TABLE "chain_status"`);
        await queryRunner.query(`ALTER TABLE "block" RENAME COLUMN "chainId" TO "onMainChain"`);
        await queryRunner.query(`CREATE INDEX "IDX_ac3a4377dd117a7cf615cde7b6" ON "transaction" ("blockId") `);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_ac3a4377dd117a7cf615cde7b63" FOREIGN KEY ("blockId") REFERENCES "block"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
