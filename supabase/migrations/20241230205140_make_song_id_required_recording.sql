UPDATE recordings
SET song_id = 'cdea17c2-5c84-4ca9-b152-c41439c64222'
WHERE song_id IS NULL;
ALTER TABLE recordings
ALTER COLUMN song_id SET NOT NULL;
