-- Minimal Seed Data for Uppuveli Beach DB
-- Applies on top of schema.sql
-- Ensures extensions are available, inserts rooms, an admin user, and an optional sample guest.
-- Notes:
--  - Password hashes are placeholders. Replace with real hashes during provisioning.
--  - Uses gen_random_uuid() (pgcrypto). schema.sql already enables required extensions.

BEGIN;

-- Ensure required extensions (idempotent)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper: upsert admin user (email unique)
-- Admin user with placeholder bcrypt hash ("$2b$..." format typical). Replace with real value in deployment.
INSERT INTO admin_users (id, email, password_hash, name, role, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@uppuvelibeach.com',
  -- PLACEHOLDER ONLY: DO NOT USE IN PRODUCTION. Provide a secure bcrypt/argon2 hash from your backend pipeline.
  '$2b$12$REPLACE_WITH_SECURE_BCRYPT_HASH_________________________',
  'Site Administrator',
  'admin',
  true,
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Optional: Sample guest user (useful for dev/testing)
INSERT INTO users (id, email, password_hash, name, phone, is_active, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'guest@example.com',
  -- PLACEHOLDER ONLY: DO NOT USE IN PRODUCTION. Provide a secure hash during seeding pipeline.
  '$2b$12$REPLACE_WITH_SECURE_BCRYPT_HASH_________________________',
  'Sample Guest',
  '+1-555-0100',
  true,
  now(),
  now()
)
ON CONFLICT (email) DO UPDATE
SET
  name = EXCLUDED.name,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  updated_at = now();

-- Rooms: a few examples across types with availability
-- Use room_number when you want uniqueness across visible numbers; can be null per schema.
-- Upsert on unique room_number when provided; otherwise upsert by (type, price, max_occupancy) as a heuristic for idempotency.
-- To support idempotent upserts for entries without room_number, we create a temporary unique key via ON CONFLICT on an expression using COALESCE.
-- Since there is no natural unique constraint for (type, price, max_occupancy), we'll use room_number to drive idempotency for these seeds by providing values.

-- Standard Queen
INSERT INTO rooms (id, room_number, type, price, availability, description, max_occupancy, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '101',
  'Standard Queen',
  85.00,
  true,
  'Cozy queen room with garden view.',
  2,
  now(),
  now()
)
ON CONFLICT (room_number) DO UPDATE
SET
  type = EXCLUDED.type,
  price = EXCLUDED.price,
  availability = EXCLUDED.availability,
  description = EXCLUDED.description,
  max_occupancy = EXCLUDED.max_occupancy,
  updated_at = now();

-- Deluxe King
INSERT INTO rooms (id, room_number, type, price, availability, description, max_occupancy, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '202',
  'Deluxe King',
  129.00,
  true,
  'Spacious king room with partial ocean view.',
  3,
  now(),
  now()
)
ON CONFLICT (room_number) DO UPDATE
SET
  type = EXCLUDED.type,
  price = EXCLUDED.price,
  availability = EXCLUDED.availability,
  description = EXCLUDED.description,
  max_occupancy = EXCLUDED.max_occupancy,
  updated_at = now();

-- Ocean Suite
INSERT INTO rooms (id, room_number, type, price, availability, description, max_occupancy, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '305',
  'Ocean Suite',
  199.00,
  true,
  'Suite with oceanfront balcony and lounge area.',
  4,
  now(),
  now()
)
ON CONFLICT (room_number) DO UPDATE
SET
  type = EXCLUDED.type,
  price = EXCLUDED.price,
  availability = EXCLUDED.availability,
  description = EXCLUDED.description,
  max_occupancy = EXCLUDED.max_occupancy,
  updated_at = now();

-- Family Room
INSERT INTO rooms (id, room_number, type, price, availability, description, max_occupancy, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  '402',
  'Family Room',
  149.00,
  true,
  'Two double beds, ideal for families.',
  4,
  now(),
  now()
)
ON CONFLICT (room_number) DO UPDATE
SET
  type = EXCLUDED.type,
  price = EXCLUDED.price,
  availability = EXCLUDED.availability,
  description = EXCLUDED.description,
  max_occupancy = EXCLUDED.max_occupancy,
  updated_at = now();

-- Boutique items (optional sample, aligns with schema but not mandatory)
INSERT INTO boutique_items (id, name, description, price, stock, sku, created_at, updated_at)
VALUES
  (gen_random_uuid(), 'Uppuveli Beach T-Shirt', 'Organic cotton tee with resort logo', 25.00, 50, 'TSHIRT-UB-001', now(), now()),
  (gen_random_uuid(), 'Beach Hat', 'Wide-brim sun hat', 18.50, 30, 'HAT-UB-010', now(), now())
ON CONFLICT (sku) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  stock = EXCLUDED.stock,
  updated_at = now();

COMMIT;

-- Usage:
--   psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}" -f schema.sql
--   psql "postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}" -f seed.sql

-- Security Note:
--   Replace placeholder password hashes with secure bcrypt/argon2 hashes generated by your backend provisioning pipeline.
