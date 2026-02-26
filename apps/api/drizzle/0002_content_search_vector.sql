-- Add tsvector column for full-text search on contents
ALTER TABLE "contents" ADD COLUMN "search_vector" tsvector;

-- Function: extract all string values from JSONB and build a tsvector
CREATE OR REPLACE FUNCTION jsonb_to_tsvector_simple(data jsonb)
RETURNS tsvector AS $$
DECLARE
  result text;
BEGIN
  SELECT COALESCE(
    string_agg(value, ' '),
    ''
  )
  INTO result
  FROM jsonb_each_text(data);
  RETURN to_tsvector('simple', result);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function: update search_vector before insert/update
CREATE OR REPLACE FUNCTION contents_search_vector_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := jsonb_to_tsvector_simple(NEW.data);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: fire on INSERT or UPDATE OF data
CREATE TRIGGER trg_contents_search_vector
  BEFORE INSERT OR UPDATE OF data ON "contents"
  FOR EACH ROW
  EXECUTE FUNCTION contents_search_vector_trigger();

-- GIN index for fast full-text lookups
CREATE INDEX idx_contents_search_vector ON "contents" USING gin("search_vector");

-- Backfill existing rows
UPDATE "contents" SET search_vector = jsonb_to_tsvector_simple(data);
