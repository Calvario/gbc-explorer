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

import {MigrationInterface, QueryRunner} from "typeorm";

export class ProofOfStake1599836161680 implements MigrationInterface {
    name = 'ProofOfStake1599836161680'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "block" ADD "chaintrust" character varying`);
        await queryRunner.query(`ALTER TABLE "block" ADD "blocktrust" character varying`);
        await queryRunner.query(`ALTER TABLE "block" ADD "flags" character varying`);
        await queryRunner.query(`ALTER TABLE "block" ADD "proofhash" character varying`);
        await queryRunner.query(`ALTER TABLE "block" ADD "entropybit" integer`);
        await queryRunner.query(`ALTER TABLE "block" ADD "modifier" character varying`);
        await queryRunner.query(`ALTER TABLE "block" ADD "modifierchecksum" character varying`);
        await queryRunner.query(`ALTER TABLE "block" ADD "signature" character varying`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD "weight" integer`);
        await queryRunner.query(`ALTER TABLE "block" ALTER COLUMN "strippedsize" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "block" ALTER COLUMN "weight" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "block" ALTER COLUMN "chainwork" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "hash" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "size" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "vsize" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "vsize" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "size" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" ALTER COLUMN "hash" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "block" ALTER COLUMN "chainwork" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "block" ALTER COLUMN "weight" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "block" ALTER COLUMN "strippedsize" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP COLUMN "weight"`);
        await queryRunner.query(`ALTER TABLE "block" DROP COLUMN "signature"`);
        await queryRunner.query(`ALTER TABLE "block" DROP COLUMN "modifierchecksum"`);
        await queryRunner.query(`ALTER TABLE "block" DROP COLUMN "modifier"`);
        await queryRunner.query(`ALTER TABLE "block" DROP COLUMN "entropybit"`);
        await queryRunner.query(`ALTER TABLE "block" DROP COLUMN "proofhash"`);
        await queryRunner.query(`ALTER TABLE "block" DROP COLUMN "flags"`);
        await queryRunner.query(`ALTER TABLE "block" DROP COLUMN "blocktrust"`);
        await queryRunner.query(`ALTER TABLE "block" DROP COLUMN "chaintrust"`);
    }

}
