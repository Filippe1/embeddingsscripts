CREATE OR REPLACE FUNCTION match_documents_hybrid(
  query_text TEXT,
  query_embedding VECTOR(768),
  filter JSONB DEFAULT NULL,
  match_count INT DEFAULT 10,
  bm25_weight FLOAT DEFAULT 0.5,
  vector_weight FLOAT DEFAULT 0.5
)
RETURNS TABLE (
  id BIGINT,
  content TEXT,
  metadata JSONB,
  combined_score FLOAT,
  bm25_score FLOAT,
  vector_similarity FLOAT
)
LANGUAGE SQL STABLE
AS $$
  WITH vector_results AS (
    SELECT
      id,
      content,
      metadata,
      1 - (embedding <=> query_embedding) AS vector_similarity
    FROM documents
    WHERE 1 - (embedding <=> query_embedding) > 0.5
  ),
  bm25_results AS (
    SELECT
      id,
      content,
      metadata,
      GREATEST(
    ts_rank(to_tsvector('greek', content), phraseto_tsquery('greek', query_text)),
    ts_rank(to_tsvector('greek', content), websearch_to_tsquery('greek', query_text))
  ) AS bm25_score
    FROM documents
    WHERE to_tsvector('greek', content) @@ websearch_to_tsquery('greek', query_text)
  ),
  combined_results AS (
    SELECT
      COALESCE(v.id, b.id) AS id,
      COALESCE(v.content, b.content) AS content,
      COALESCE(v.metadata, b.metadata) AS metadata,
      COALESCE(v.vector_similarity, 0) AS vector_similarity,
      COALESCE(b.bm25_score, 0) AS bm25_score,
      -- Combine scores with weights (normalize if needed)
      (COALESCE(bm25_weight * COALESCE(b.bm25_score, 0), 0) + 
       COALESCE(vector_weight * COALESCE(v.vector_similarity, 0), 0)) AS combined_score
    FROM vector_results v
    FULL OUTER JOIN bm25_results b ON v.id = b.id
  )
  SELECT
    id,
    content,
    metadata,
    combined_score,
    bm25_score,
    vector_similarity
  FROM combined_results
  ORDER BY combined_score DESC
  LIMIT match_count;
$$;