-- Add deleted_at column to books table
ALTER TABLE books
ADD COLUMN deleted_at TIMESTAMP;

-- Update existing records to have NULL deleted_at
UPDATE books SET deleted_at = NULL WHERE deleted_at IS NOT NULL;