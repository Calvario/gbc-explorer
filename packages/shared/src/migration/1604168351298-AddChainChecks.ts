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

export class AddChainChecks1604168351298 implements MigrationInterface {
    name = 'AddChainChecks1604168351298'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chain" ADD "available" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "chain" ADD "unknown" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`CREATE INDEX "IDX_ebc20e6cb4256849caf05a7de7" ON "chain" ("available") `);
        await queryRunner.query(`CREATE INDEX "IDX_510c59a6d6d1f8a2160c49bc86" ON "chain" ("unknown") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_510c59a6d6d1f8a2160c49bc86"`);
        await queryRunner.query(`DROP INDEX "IDX_ebc20e6cb4256849caf05a7de7"`);
        await queryRunner.query(`ALTER TABLE "chain" DROP COLUMN "unknown"`);
        await queryRunner.query(`ALTER TABLE "chain" DROP COLUMN "available"`);
    }

}
