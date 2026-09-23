-- Wine Cellar Tracker — Supabase schema
-- Paste this in the SQL Editor at: https://supabase.com/dashboard/project/mtukbovqccvnamacnyst/sql

-- Bins: physical shelf locations with capacity
CREATE TABLE bins (
  bin_id TEXT PRIMARY KEY,
  location TEXT NOT NULL,
  cabinet INTEGER,
  shelf INTEGER,
  capacity INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Trips: physical transport rounds
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planned_at TIMESTAMPTZ DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  bottle_count INTEGER DEFAULT 0,
  notes TEXT
);

-- Bottles: wine bottles with placement state
CREATE TABLE bottles (
  barcode TEXT PRIMARY KEY,
  iwine INTEGER NOT NULL,
  vintage TEXT,
  wine TEXT NOT NULL,
  producer TEXT,
  country TEXT,
  region TEXT,
  size TEXT DEFAULT '750ml',
  wine_type TEXT,
  cost NUMERIC,
  cost_currency TEXT DEFAULT 'SEK',
  -- Fallback price for wines CT records at 0 kr; value_source names the origin
  -- (ct_community, ct_auction, web). Type inferred from the live column.
  estimated_value NUMERIC,
  value_source TEXT,
  -- CT bottle image: 'labels/<uuid>' or 'captures/<uuid>'. Written by sync from
  -- the wine_labels table so it survives bottles being drunk and rebought.
  label_ref TEXT,
  begin_consume INTEGER,
  end_consume INTEGER,

  current_location TEXT,
  current_bin TEXT,
  recommended_location TEXT,
  recommended_bin TEXT,
  move_reason TEXT,
  rule_id TEXT,

  state TEXT DEFAULT 'pending'
    CHECK (state IN ('pending', 'packed', 'in_transit', 'shelved', 'synced')),
  packed_at TIMESTAMPTZ,
  in_transit_at TIMESTAMPTZ,
  shelved_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ,

  trip_id UUID REFERENCES trips(id),
  owc_group TEXT,

  ct_location_at_sync TEXT,
  ct_bin_at_sync TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Wine labels: iwine -> CT bottle image, kept per WINE rather than per bottle.
-- A row with label_ref NULL means "checked, CT has no image", which is why
-- harvest-labels skips re-fetching it.
CREATE TABLE wine_labels (
  iwine INTEGER PRIMARY KEY,
  label_ref TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_bottles_needs_move ON bottles (current_location, recommended_location)
  WHERE current_location IS DISTINCT FROM recommended_location;
CREATE INDEX idx_bottles_state ON bottles (state);
CREATE INDEX idx_bottles_trip ON bottles (trip_id) WHERE trip_id IS NOT NULL;

-- Row Level Security.
--
-- Until 2026-09-23 every policy read "FOR ALL USING (true)" with no role, which
-- included anon. The anon key ships inside the published bundle at
-- paolobrolin.github.io/wine-packing, so the whole cellar — 1264 bottles with
-- purchase prices and storage locations — could be read, changed and deleted by
-- anyone who opened the page source. Supabase's advisor reported it on 15 and
-- 22 September.
--
-- Access now requires a signed-in session. Local scripts use the secret key,
-- which bypasses RLS, so sync and label harvesting are unaffected.
--
-- This is only worth anything while SIGNUPS ARE DISABLED. With open signup,
-- anyone can request their own magic link, arrive as `authenticated`, and these
-- policies hand them everything. Authentication -> Sign In / Up -> "Allow new
-- users to sign up" must stay off, with the one account created by hand.
ALTER TABLE bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wine_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access" ON bins FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON trips FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON bottles FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON wine_labels FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Enable realtime for bottles
ALTER PUBLICATION supabase_realtime ADD TABLE bottles;
