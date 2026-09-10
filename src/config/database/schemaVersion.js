const DEFAULT_SCHEMA_VERSION = 1;
const rawSchemaVersion = Number.parseInt(
  process.env.SCHEMA_VERSION || String(DEFAULT_SCHEMA_VERSION),
  10,
);

export const EXPECTED_SCHEMA_VERSION =
  Number.isInteger(rawSchemaVersion) && rawSchemaVersion > 0
    ? rawSchemaVersion
    : DEFAULT_SCHEMA_VERSION;

export const EXPECTED_SCHEMA_LABEL =
  process.env.SCHEMA_VERSION_LABEL || `usagi-tien-ton-v${EXPECTED_SCHEMA_VERSION}`;
