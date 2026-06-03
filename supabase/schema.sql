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
  cost NUMERIC,
  cost_currency TEXT DEFAULT 'SEK',
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

-- Indexes
CREATE INDEX idx_bottles_needs_move ON bottles (current_location, recommended_location)
  WHERE current_location IS DISTINCT FROM recommended_location;
CREATE INDEX idx_bottles_state ON bottles (state);
CREATE INDEX idx_bottles_trip ON bottles (trip_id) WHERE trip_id IS NOT NULL;

-- Row Level Security: allow all for anon (single-user app)
ALTER TABLE bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE bottles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON bins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON trips FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON bottles FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for bottles
ALTER PUBLICATION supabase_realtime ADD TABLE bottles;
