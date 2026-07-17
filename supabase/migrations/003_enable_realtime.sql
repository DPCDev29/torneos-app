-- Enable Realtime for matches table to allow live score updates
-- This allows public viewers to see referee updates in real-time

-- Enable realtime for matches table
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- Ensure RLS is enabled (should already be from previous migrations)
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE matches IS 'Tournament matches with realtime updates enabled for live scoring';
