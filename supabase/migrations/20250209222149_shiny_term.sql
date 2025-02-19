-- Add notes column to tickets table
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS notes text;

-- Add index for notes column
CREATE INDEX IF NOT EXISTS idx_tickets_notes ON tickets(notes);

-- Update existing tickets to have empty notes
UPDATE tickets SET notes = '' WHERE notes IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN tickets.notes IS 'Additional notes or comments for the ticket';