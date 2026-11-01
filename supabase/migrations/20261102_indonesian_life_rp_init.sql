-- ========================================================================
-- INDONESIAN LIFE ROLEPLAY (ILRP) - INITIAL POSTGRESQL SCHEMA & RLS
-- Migration: 20261102_indonesian_life_rp_init.sql
-- ========================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. GAME WORLDS & ROOMS
CREATE TABLE IF NOT EXISTS public.game_worlds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    max_players INT DEFAULT 500,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.game_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    world_id UUID REFERENCES public.game_worlds(id) ON DELETE CASCADE,
    room_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    capacity INT DEFAULT 50,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CHARACTERS TABLE
CREATE TABLE IF NOT EXISTS public.characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(60) NOT NULL,
    gender VARCHAR(10) NOT NULL CHECK (gender IN ('male', 'female')),
    appearance JSONB NOT NULL DEFAULT '{
        "skinColor": "#f8d9b5",
        "hairStyle": "short",
        "hairColor": "#1a1a1a",
        "outfit": "batik",
        "outfitColor": "#3b82f6"
    }'::jsonb,
    x FLOAT DEFAULT 1200.0,
    y FLOAT DEFAULT 900.0,
    current_room VARCHAR(50) DEFAULT 'nusantara_town',
    health INT DEFAULT 100 CHECK (health >= 0 AND health <= 100),
    energy INT DEFAULT 100 CHECK (energy >= 0 AND energy <= 100),
    job_title VARCHAR(50) DEFAULT 'Warga Sipil',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. PLAYER WALLETS (Economic System)
CREATE TABLE IF NOT EXISTS public.player_wallets (
    character_id UUID PRIMARY KEY REFERENCES public.characters(id) ON DELETE CASCADE,
    cash_balance BIGINT DEFAULT 50000 CHECK (cash_balance >= 0),
    bank_balance BIGINT DEFAULT 250000 CHECK (bank_balance >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. PLAYER INVENTORY
CREATE TABLE IF NOT EXISTS public.player_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    character_id UUID NOT NULL REFERENCES public.characters(id) ON DELETE CASCADE,
    item_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_type VARCHAR(30) NOT NULL DEFAULT 'misc',
    quantity INT DEFAULT 1 CHECK (quantity > 0),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (character_id, item_id)
);

-- 5. AUDITED TRANSACTIONS
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
    to_character_id UUID REFERENCES public.characters(id) ON DELETE SET NULL,
    amount BIGINT NOT NULL CHECK (amount > 0),
    transaction_type VARCHAR(50) NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_characters_user_id ON public.characters(user_id);
CREATE INDEX IF NOT EXISTS idx_characters_room ON public.characters(current_room);
CREATE INDEX IF NOT EXISTS idx_inventory_character ON public.player_inventory(character_id);
CREATE INDEX IF NOT EXISTS idx_transactions_character ON public.transactions(from_character_id, to_character_id);

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.game_worlds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Public can read active game worlds and rooms
CREATE POLICY "Public read active game worlds" ON public.game_worlds
    FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Public read active game rooms" ON public.game_rooms
    FOR SELECT USING (is_active = TRUE);

-- Characters: Authenticated users can view characters in their vicinity
CREATE POLICY "Users can view characters" ON public.characters
    FOR SELECT USING (true);

-- Characters: Users can insert their own character
CREATE POLICY "Users can insert own character" ON public.characters
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Characters: Users can update only their own character
CREATE POLICY "Users can update own character" ON public.characters
    FOR UPDATE USING (auth.uid() = user_id);

-- Wallets: Users can view their own wallet
CREATE POLICY "Users can view own wallet" ON public.player_wallets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.characters c
            WHERE c.id = player_wallets.character_id AND c.user_id = auth.uid()
        )
    );

-- Inventory: Users can view and manage their own inventory
CREATE POLICY "Users can view own inventory" ON public.player_inventory
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.characters c
            WHERE c.id = player_inventory.character_id AND c.user_id = auth.uid()
        )
    );

-- Transactions: Users can view transactions they participated in
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.characters c
            WHERE (c.id = transactions.from_character_id OR c.id = transactions.to_character_id) 
            AND c.user_id = auth.uid()
        )
    );

-- 8. INITIAL SEED DATA FOR PROTOTYPE WORLD
INSERT INTO public.game_worlds (code, name, description, max_players)
VALUES ('nusantara_asri', 'Kota Nusantara Asri', 'Kota percontohan modern bernuansa lokal Indonesia dengan fasilitas sekolah, pasar, dan balai warga.', 500)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.game_rooms (world_id, room_code, name, capacity)
SELECT id, 'town_center_1', 'Pusat Kota Nusantara - Channel 1', 50
FROM public.game_worlds
WHERE code = 'nusantara_asri'
ON CONFLICT (room_code) DO NOTHING;

