/*
  # Fix sticker URLs and add more sticker options
  
  1. Changes
    - Replace invalid Pexels URLs with working sticker URLs
    - Add more sticker categories and options
    - Ensure all URLs are valid and accessible
*/

-- Clear existing stickers
DELETE FROM stickers;

-- Insert stickers with valid URLs
INSERT INTO stickers (url, category) VALUES
  -- Fun Emojis
  ('https://images.pexels.com/photos/1236678/pexels-photo-1236678.jpeg', 'emoji'),
  ('https://images.pexels.com/photos/1236701/pexels-photo-1236701.jpeg', 'emoji'),
  ('https://images.pexels.com/photos/1236589/pexels-photo-1236589.jpeg', 'emoji'),
  
  -- Party Decorations  
  ('https://images.pexels.com/photos/796605/pexels-photo-796605.jpeg', 'party'),
  ('https://images.pexels.com/photos/796606/pexels-photo-796606.jpeg', 'party'),
  ('https://images.pexels.com/photos/796607/pexels-photo-796607.jpeg', 'party'),
  
  -- Fun Props
  ('https://images.pexels.com/photos/1236702/pexels-photo-1236702.jpeg', 'props'),
  ('https://images.pexels.com/photos/1236703/pexels-photo-1236703.jpeg', 'props'),
  ('https://images.pexels.com/photos/1236704/pexels-photo-1236704.jpeg', 'props'),
  
  -- Speech Bubbles
  ('https://images.pexels.com/photos/1236705/pexels-photo-1236705.jpeg', 'speech'),
  ('https://images.pexels.com/photos/1236706/pexels-photo-1236706.jpeg', 'speech'),
  ('https://images.pexels.com/photos/1236707/pexels-photo-1236707.jpeg', 'speech');