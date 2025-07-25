import { DuckDBConnection } from "@duckdb/node-api";

const attachDucklake = async () => {
  const connection = await DuckDBConnection.create();
  const { DUCKLAKE_POSTGRES } = Bun.env;
  const { S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = Bun.env;
  if (!S3_ENDPOINT) throw new Error("S3_ENDPOINT IS NOT SET");
  const [bucket, ...endpoints] = S3_ENDPOINT.split(".");
  const [region] = endpoints;
  const endpoint = endpoints.join(".");
  await connection.run(`
    INSTALL ducklake;
    INSTALL postgres;

    CREATE SECRET ducklake_s3_secret (
      TYPE s3,
      PROVIDER config,
      KEY_ID '${S3_ACCESS_KEY_ID}',
      SECRET '${S3_SECRET_ACCESS_KEY}',
      ENDPOINT '${endpoint}',
      REGION '${region}'
    );

    CREATE SECRET ducklake_secret (
    	TYPE DUCKLAKE,
	    METADATA_PATH 'postgres:${DUCKLAKE_POSTGRES}',
      DATA_PATH 's3://${bucket}/ducklake/'
    );

    ATTACH 'ducklake:ducklake_secret' AS ducklake;
  `);
  return connection;
};

export const ducklake = await attachDucklake();
