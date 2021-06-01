import {MigrationInterface, QueryRunner} from "typeorm";

export class RemoveUnusedChainChecks1622583490960 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_510c59a6d6d1f8a2160c49bc86"`);
        await queryRunner.query(`DROP INDEX "IDX_ebc20e6cb4256849caf05a7de7"`);
        await queryRunner.query(`ALTER TABLE "chain" DROP COLUMN "unknown"`);
        await queryRunner.query(`ALTER TABLE "chain" DROP COLUMN "available"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chain" ADD "available" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "chain" ADD "unknown" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE INDEX "IDX_ebc20e6cb4256849caf05a7de7" ON "chain" ("available") `);
        await queryRunner.query(`CREATE INDEX "IDX_510c59a6d6d1f8a2160c49bc86" ON "chain" ("unknown") `);
    }
}
