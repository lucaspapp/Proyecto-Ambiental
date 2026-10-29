-- Run once against the existing database to remove the insecure shared password default.
ALTER TABLE usuarios ALTER COLUMN Password DROP DEFAULT;
