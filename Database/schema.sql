-- Uppuveli Beach Database Schema
-- PostgreSQL 13+ compatible
-- Note: Ensure uuid-ossp extension available if using uuid_generate_v4(); we prefer gen_random_uuid() from pgcrypto.
-- Use: psql ... -f schema.sql

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"; -- fallback if needed

-- Enums
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM ('booked', 'confirmed', 'checked_in', 'checked_out', 'cancelled');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
        CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'captured', 'refunded', 'failed', 'voided');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_status') THEN
        CREATE TYPE notification_status AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM ('system', 'promotion', 'booking', 'loyalty', 'payment', 'chat');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('stripe', 'paypal', 'wallet', 'cash', 'card');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'loyalty_reason') THEN
        CREATE TYPE loyalty_reason AS ENUM ('booking', 'purchase', 'referral_reward', 'adjustment', 'reversal');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_status') THEN
        CREATE TYPE referral_status AS ENUM ('generated', 'used', 'expired', 'revoked');
    END IF;
END$$;

-- USERS (guests)
CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email citext UNIQUE NOT NULL,
    password_hash text NOT NULL, -- backend handles hashing; never store plain text
    name text NOT NULL,
    phone text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email citext UNIQUE NOT NULL,
    password_hash text NOT NULL,
    name text NOT NULL,
    role text NOT NULL DEFAULT 'admin', -- extensible
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users (email);

-- ROOMS
CREATE TABLE IF NOT EXISTS rooms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number text UNIQUE, -- optional: unique room number if hotel uses explicit numbers
    type text NOT NULL,      -- aligns with OpenAPI Room.type
    price numeric(12,2) NOT NULL CHECK (price >= 0),
    availability boolean NOT NULL DEFAULT true,
    description text,
    max_occupancy integer NOT NULL DEFAULT 2 CHECK (max_occupancy > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rooms_availability ON rooms (availability);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON rooms (type);

-- BOOKINGS
CREATE TABLE IF NOT EXISTS bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id uuid NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
    status booking_status NOT NULL DEFAULT 'booked',
    check_in date NOT NULL,
    check_out date NOT NULL,
    guests integer NOT NULL DEFAULT 1 CHECK (guests > 0),
    special_requests text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT bookings_dates_valid CHECK (check_out > check_in)
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_room ON bookings (room_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_checkin_checkout ON bookings (check_in, check_out);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount numeric(12,2) NOT NULL CHECK (amount >= 0),
    currency char(3) NOT NULL DEFAULT 'USD',
    method payment_method NOT NULL,
    status payment_status NOT NULL DEFAULT 'pending',
    provider_txn_id text, -- external reference (e.g., stripe charge id)
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments (user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments (created_at);

-- LOYALTY ACCOUNTS
CREATE TABLE IF NOT EXISTS loyalty_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    points integer NOT NULL DEFAULT 0,
    tier text NOT NULL DEFAULT 'basic',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- LOYALTY HISTORY
CREATE TABLE IF NOT EXISTS loyalty_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id uuid NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    change integer NOT NULL, -- positive or negative
    reason loyalty_reason NOT NULL,
    reference_id uuid, -- e.g., booking/payment id; nullable
    note text,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_account ON loyalty_history (account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_user ON loyalty_history (user_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_reason ON loyalty_history (reason);
CREATE INDEX IF NOT EXISTS idx_loyalty_history_created_at ON loyalty_history (created_at);

-- REFERRALS
CREATE TABLE IF NOT EXISTS referrals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code text UNIQUE NOT NULL,
    status referral_status NOT NULL DEFAULT 'generated',
    rewards integer NOT NULL DEFAULT 0,
    referred_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON referrals (user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals (code);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals (status);

-- NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL DEFAULT 'system',
    message text NOT NULL,
    status notification_status NOT NULL DEFAULT 'queued',
    is_read boolean NOT NULL DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    read_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications (status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at);

-- CHAT MESSAGES
CREATE TABLE IF NOT EXISTS chat_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE SET NULL, -- guest side
    admin_id uuid REFERENCES admin_users(id) ON DELETE SET NULL, -- staff side
    message text NOT NULL,
    direction text NOT NULL CHECK (direction IN ('inbound','outbound')), -- who sent it relative to backend
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user ON chat_messages (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_admin ON chat_messages (admin_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages (created_at);

-- BOUTIQUE ITEMS
CREATE TABLE IF NOT EXISTS boutique_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL CHECK (price >= 0),
    stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
    sku text UNIQUE,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_boutique_items_name ON boutique_items (name);

-- HOUSEKEEPING: triggers to keep updated_at current
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
    tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'users','admin_users','rooms','bookings','payments','loyalty_accounts','referrals','notifications','boutique_items'
  ]
  LOOP
    EXECUTE format('
      DO $inner$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = %L
        ) THEN
          CREATE TRIGGER %I
          BEFORE UPDATE ON %I
          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        END IF;
      END
      $inner$;', 'trg_'||tbl||'_updated_at', 'trg_'||tbl||'_updated_at', tbl);
  END LOOP;
END$$;

-- Convenience views aligning with OpenAPI simple schemas (optional, read-only)
-- Users basic view
CREATE OR REPLACE VIEW v_users_basic AS
SELECT id, email::text AS email, name, (SELECT COALESCE(points,0) FROM loyalty_accounts la WHERE la.user_id = u.id) AS loyalty_points, created_at
FROM users u;

-- Rooms basic view
CREATE OR REPLACE VIEW v_rooms_basic AS
SELECT id, type, price, availability FROM rooms;

-- Booking basic view
CREATE OR REPLACE VIEW v_bookings_basic AS
SELECT b.id, b.user_id AS "userId", b.room_id AS "roomId", b.status::text AS status, b.check_in AS "checkIn", b.check_out AS "checkOut", b.created_at
FROM bookings b;

-- Payment basic view
CREATE OR REPLACE VIEW v_payments_basic AS
SELECT p.id, p.booking_id AS "bookingId", p.amount, p.status::text AS status, p.method::text AS method, p.created_at
FROM payments p;

COMMIT;
