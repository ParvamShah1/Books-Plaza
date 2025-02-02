ALTER TABLE books
ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Update existing records to have a created_at value
UPDATE books 
SET created_at = CURRENT_TIMESTAMP 
WHERE created_at IS NULL;