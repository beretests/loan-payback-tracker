ALTER TABLE schedule_songs
ADD CONSTRAINT unique_schedule_song UNIQUE (schedule_id, song_id);
