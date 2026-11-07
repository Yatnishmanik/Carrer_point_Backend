-- Existing installations may predate the SUPERADMIN enum value.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPERADMIN';
