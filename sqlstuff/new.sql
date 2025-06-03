CREATE OR REPLACE FUNCTION match_documents (
  query_embedding VECTOR(768),
  filter JSONB DEFAULT NULL,
  match_count INT DEFAULT 10  -- Added a default value for match_count, works with n8n vector retrieval
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    id,
    content,
    metadata,
    1 - (embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE 1 - (embedding <=> query_embedding) > 0.5  -- Default threshold or make this a parameter
  ORDER BY similarity DESC
  LIMIT match_count;
$$;