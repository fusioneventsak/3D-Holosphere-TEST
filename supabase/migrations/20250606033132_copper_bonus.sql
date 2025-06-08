/*
  # Add stickers table and initial sticker collection
  
  1. New Table
    - stickers: Stores sticker metadata and URLs
      - id (uuid, primary key)
      - url (text, not null)
      - category (text, not null)
      - created_at (timestamp)
  
  2. Security
    - Enable RLS
    - Add policy for public viewing
*/

-- Create stickers table
CREATE TABLE IF NOT EXISTS stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

-- Create policy for public viewing
CREATE POLICY "Anyone can view stickers"
  ON stickers FOR SELECT
  TO public
  USING (true);

-- Insert initial sticker collection
INSERT INTO stickers (url, category) VALUES
  -- Fun Emojis
  ('https://images.pexels.com/photos/emoji-smile.png', 'emoji'),
  ('https://images.pexels.com/photos/emoji-heart.png', 'emoji'),
  ('https://images.pexels.com/photos/emoji-star.png', 'emoji'),
  
  -- Party Stickers
  ('https://images.pexels.com/photos/party-hat.png', 'party'),
  ('https://images.pexels.com/photos/confetti.png', 'party'),
  ('https://images.pexels.com/photos/balloon.png', 'party'),
  
  -- Fun Props
  ('https://images.pexels.com/photos/sunglasses.png', 'props'),
  ('https://images.pexels.com/photos/mustache.png', 'props'),
  ('https://images.pexels.com/photos/crown.png', 'props'),
  
  -- Speech Bubbles
  ('https://images.pexels.com/photos/speech-wow.png', 'speech'),
  ('https://images.pexels.com/photos/speech-cool.png', 'speech'),
  ('https://images.pexels.com/photos/speech-love.png', 'speech');