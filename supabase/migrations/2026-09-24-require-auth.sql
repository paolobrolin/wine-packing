-- Require a signed-in session for every table.
--
-- WHY: the anon key ships inside the published bundle at
-- paolobrolin.github.io/wine-packing, and the previous policies granted FOR ALL
-- to every role including anon. Measured on 2026-09-23 with nothing but that
-- key: bottles 1264 rows with purchase prices and storage locations,
-- wine_labels 717 rows, all of it readable, writable and deletable. Supabase's
-- security advisor reported rls_disabled_in_public on 15 and 22 September.
--
-- RUN THIS ONLY AFTER magic-link sign-in works on the live site. It revokes
-- anon access, so an app that cannot sign in will show an empty cellar rather
-- than an error: PostgREST answers a blocked read with 200 and an empty array.
--
-- Local scripts (sync.mts, harvest-labels.mts) use the secret key, which
-- bypasses RLS, and are unaffected.
--
-- PREREQUISITE, and the whole thing rests on it: signups must be OFF.
-- Authentication -> Sign In / Up -> "Allow new users to sign up" disabled, with
-- the single account created by hand. With open signup, anyone can request
-- their own magic link, arrive as `authenticated`, and these policies hand them
-- everything.

DROP POLICY "Allow all for anon" ON bins;
DROP POLICY "Allow all for anon" ON trips;
DROP POLICY "Allow all for anon" ON bottles;
DROP POLICY "Allow all for anon" ON wine_labels;

CREATE POLICY "Authenticated full access" ON bins FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON trips FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON bottles FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated full access" ON wine_labels FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

-- Rollback, if sign-in turns out to be broken on a device that matters:
--
--   DROP POLICY "Authenticated full access" ON bins;
--   DROP POLICY "Authenticated full access" ON trips;
--   DROP POLICY "Authenticated full access" ON bottles;
--   DROP POLICY "Authenticated full access" ON wine_labels;
--   CREATE POLICY "Allow all for anon" ON bins FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all for anon" ON trips FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all for anon" ON bottles FOR ALL USING (true) WITH CHECK (true);
--   CREATE POLICY "Allow all for anon" ON wine_labels FOR ALL USING (true) WITH CHECK (true);
