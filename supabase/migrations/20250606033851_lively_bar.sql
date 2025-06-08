-- Clear existing stickers
DELETE FROM stickers;

-- Insert stickers with vector URLs
INSERT INTO stickers (url, category) VALUES
  -- Fun Sayings
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/fun-sayings/awesome.svg', 'text'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/fun-sayings/fabulous.svg', 'text'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/fun-sayings/party-time.svg', 'text'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/fun-sayings/love-it.svg', 'text'),
  
  -- Decorative Elements
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/decorative/confetti-burst.svg', 'decorative'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/decorative/stars-sparkle.svg', 'decorative'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/decorative/hearts-float.svg', 'decorative'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/decorative/rainbow-arc.svg', 'decorative'),
  
  -- Props
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/props/party-hat.svg', 'props'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/props/sunglasses-cool.svg', 'props'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/props/mustache-fancy.svg', 'props'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/props/crown-royal.svg', 'props'),
  
  -- Speech Bubbles
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/speech/wow-bubble.svg', 'speech'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/speech/awesome-cloud.svg', 'speech'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/speech/love-heart.svg', 'speech'),
  ('https://cdn.jsdelivr.net/gh/photobooth-stickers/speech/cool-star.svg', 'speech');