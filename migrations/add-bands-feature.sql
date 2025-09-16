-- Add Bands/Projects feature for color-coding bookings
-- Allows users to organize bookings by band/project with custom colors

-- Create bands table
CREATE TABLE IF NOT EXISTS bands (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) NOT NULL, -- Hex color code like #FF5733
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, name)
);

-- Add index for user lookup
CREATE INDEX IF NOT EXISTS idx_bands_user_id ON bands(user_id);

-- Add band_id to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS band_id INTEGER REFERENCES bands(id) ON DELETE SET NULL;

-- Add index for band lookup on bookings
CREATE INDEX IF NOT EXISTS idx_bookings_band_id ON bookings(band_id);

-- Add band settings to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS bands_config JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS default_band_id INTEGER REFERENCES bands(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS show_band_colors BOOLEAN DEFAULT TRUE;

-- Function to create default bands for new users
CREATE OR REPLACE FUNCTION create_default_bands()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a default "Solo" band for new users
  INSERT INTO bands (user_id, name, color, is_default, display_order)
  VALUES (NEW.id, 'Solo', '#9333ea', TRUE, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS create_user_default_bands ON users;
CREATE TRIGGER create_user_default_bands
AFTER INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION create_default_bands();

-- Create default bands for existing users who don't have any
INSERT INTO bands (user_id, name, color, is_default, display_order)
SELECT
  u.id,
  'Solo',
  '#9333ea',
  TRUE,
  0
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM bands b WHERE b.user_id = u.id
)
ON CONFLICT (user_id, name) DO NOTHING;

-- Update function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_bands_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_bands_updated_at_trigger ON bands;
CREATE TRIGGER update_bands_updated_at_trigger
BEFORE UPDATE ON bands
FOR EACH ROW
EXECUTE FUNCTION update_bands_updated_at();