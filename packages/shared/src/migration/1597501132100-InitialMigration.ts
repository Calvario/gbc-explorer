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

export class InitialMigration1597501132100 implements MigrationInterface {
    name = 'InitialMigration1597501132100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "block" ("id" SERIAL NOT NULL, "hash" character varying NOT NULL, "onMainChain" boolean NOT NULL, "strippedsize" integer NOT NULL, "size" integer NOT NULL, "mint" numeric NOT NULL, "weight" integer NOT NULL, "height" integer NOT NULL, "version" integer NOT NULL, "merkleroot" character varying NOT NULL, "time" integer NOT NULL, "nonce" character varying NOT NULL, "bits" character varying NOT NULL, "difficulty" numeric NOT NULL, "chainwork" character varying NOT NULL, "nTx" integer NOT NULL, "inputC" integer, "inputT" numeric, "outputC" integer, "outputT" numeric, "feesT" numeric, "generation" numeric, "previousblockhash" character varying NOT NULL, "nextblockhash" character varying, "minerId" integer, CONSTRAINT "UQ_f8fba63d7965bfee9f304c487aa" UNIQUE ("hash"), CONSTRAINT "PK_d0925763efb591c2e2ffb267572" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_709862d0cbf24279e0483f1761" ON "block" ("minerId") `);
        await queryRunner.query(`CREATE INDEX "IDX_bce676e2b005104ccb768495db" ON "block" ("height") `);
        await queryRunner.query(`CREATE INDEX "IDX_cf1c8786e46aec252aba27aa17" ON "block" ("time") `);
        await queryRunner.query(`CREATE TABLE "vin" ("id" SERIAL NOT NULL, "coinbase" boolean NOT NULL, "voutId" integer, "transactionId" integer, CONSTRAINT "REL_9e26f058e1e813516b50ca3bf6" UNIQUE ("voutId"), CONSTRAINT "PK_d9a01638ca3294db34207fbf42b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_214a4e04c8d333088dd6bd18f3" ON "vin" ("transactionId") `);
        await queryRunner.query(`CREATE TABLE "transaction" ("id" SERIAL NOT NULL, "txid" character varying NOT NULL, "hash" character varying NOT NULL, "version" integer NOT NULL, "time" integer NOT NULL, "size" integer NOT NULL, "vsize" integer NOT NULL, "locktime" integer NOT NULL, "inputC" integer, "inputT" numeric, "outputC" integer, "outputT" numeric, "fee" numeric, "blockId" integer, CONSTRAINT "UQ_1c73bebbbe93c21b41ecae64bb2" UNIQUE ("txid"), CONSTRAINT "UQ_de4f0899c41c688529784bc443f" UNIQUE ("hash"), CONSTRAINT "PK_89eadb93a89810556e1cbcd6ab9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_ac3a4377dd117a7cf615cde7b6" ON "transaction" ("blockId") `);
        await queryRunner.query(`CREATE TABLE "vout" ("id" SERIAL NOT NULL, "value" numeric NOT NULL, "n" integer NOT NULL, "type" character varying NOT NULL, "transactionId" integer, CONSTRAINT "PK_bfe9aae221a4f271bd201616705" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1ca422d3942a79d4e42417a794" ON "vout" ("transactionId") `);
        await queryRunner.query(`CREATE TABLE "address" ("id" SERIAL NOT NULL, "address" character varying NOT NULL, "label" character varying, "nTx" integer NOT NULL, "balance" numeric NOT NULL, "inputC" integer NOT NULL, "outputC" integer NOT NULL, CONSTRAINT "UQ_0a1ed89729fa10ba8b81b99f305" UNIQUE ("address"), CONSTRAINT "PK_d92de1f82754668b5f5f5dd4fd5" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_b5bda6d3b59815ee4bce1ec9bb" ON "address" ("balance") `);
        await queryRunner.query(`CREATE TABLE "vout_addresses_address" ("voutId" integer NOT NULL, "addressId" integer NOT NULL, CONSTRAINT "PK_d5019cddf43359bf991bd161c5b" PRIMARY KEY ("voutId", "addressId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d7f09735efb5b74a9bec4abf2e" ON "vout_addresses_address" ("voutId") `);
        await queryRunner.query(`CREATE INDEX "IDX_23ece19d0e71cb01ca654e5ea4" ON "vout_addresses_address" ("addressId") `);
        await queryRunner.query(`ALTER TABLE "block" ADD CONSTRAINT "FK_709862d0cbf24279e0483f17616" FOREIGN KEY ("minerId") REFERENCES "address"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vin" ADD CONSTRAINT "FK_9e26f058e1e813516b50ca3bf6f" FOREIGN KEY ("voutId") REFERENCES "vout"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vin" ADD CONSTRAINT "FK_214a4e04c8d333088dd6bd18f34" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transaction" ADD CONSTRAINT "FK_ac3a4377dd117a7cf615cde7b63" FOREIGN KEY ("blockId") REFERENCES "block"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vout" ADD CONSTRAINT "FK_1ca422d3942a79d4e42417a794a" FOREIGN KEY ("transactionId") REFERENCES "transaction"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vout_addresses_address" ADD CONSTRAINT "FK_d7f09735efb5b74a9bec4abf2e4" FOREIGN KEY ("voutId") REFERENCES "vout"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "vout_addresses_address" ADD CONSTRAINT "FK_23ece19d0e71cb01ca654e5ea4f" FOREIGN KEY ("addressId") REFERENCES "address"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "vout_addresses_address" DROP CONSTRAINT "FK_23ece19d0e71cb01ca654e5ea4f"`);
        await queryRunner.query(`ALTER TABLE "vout_addresses_address" DROP CONSTRAINT "FK_d7f09735efb5b74a9bec4abf2e4"`);
        await queryRunner.query(`ALTER TABLE "vout" DROP CONSTRAINT "FK_1ca422d3942a79d4e42417a794a"`);
        await queryRunner.query(`ALTER TABLE "transaction" DROP CONSTRAINT "FK_ac3a4377dd117a7cf615cde7b63"`);
        await queryRunner.query(`ALTER TABLE "vin" DROP CONSTRAINT "FK_214a4e04c8d333088dd6bd18f34"`);
        await queryRunner.query(`ALTER TABLE "vin" DROP CONSTRAINT "FK_9e26f058e1e813516b50ca3bf6f"`);
        await queryRunner.query(`ALTER TABLE "block" DROP CONSTRAINT "FK_709862d0cbf24279e0483f17616"`);
        await queryRunner.query(`DROP INDEX "IDX_23ece19d0e71cb01ca654e5ea4"`);
        await queryRunner.query(`DROP INDEX "IDX_d7f09735efb5b74a9bec4abf2e"`);
        await queryRunner.query(`DROP TABLE "vout_addresses_address"`);
        await queryRunner.query(`DROP INDEX "IDX_b5bda6d3b59815ee4bce1ec9bb"`);
        await queryRunner.query(`DROP TABLE "address"`);
        await queryRunner.query(`DROP INDEX "IDX_1ca422d3942a79d4e42417a794"`);
        await queryRunner.query(`DROP TABLE "vout"`);
        await queryRunner.query(`DROP INDEX "IDX_ac3a4377dd117a7cf615cde7b6"`);
        await queryRunner.query(`DROP TABLE "transaction"`);
        await queryRunner.query(`DROP INDEX "IDX_214a4e04c8d333088dd6bd18f3"`);
        await queryRunner.query(`DROP TABLE "vin"`);
        await queryRunner.query(`DROP INDEX "IDX_cf1c8786e46aec252aba27aa17"`);
        await queryRunner.query(`DROP INDEX "IDX_bce676e2b005104ccb768495db"`);
        await queryRunner.query(`DROP INDEX "IDX_709862d0cbf24279e0483f1761"`);
        await queryRunner.query(`DROP TABLE "block"`);
    }

}
