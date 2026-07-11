-- RPC function for policy document vector search
-- Used by AI Policy Assistant for permission-scoped retrieval

CREATE OR REPLACE FUNCTION search_policy_documents(
  p_company_id UUID,
  p_embedding TEXT,
  p_user_role TEXT,
  p_limit INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  category TEXT,
  department TEXT,
  min_role TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pd.id,
    pd.title,
    pd.content,
    pd.category,
    pd.department,
    pd.min_role,
    1 - (pd.embedding <=> p_embedding::vector) AS similarity
  FROM policy_documents pd
  WHERE pd.company_id = p_company_id
    AND (
      pd.min_role = 'employee'
      OR (pd.min_role = 'manager' AND p_user_role IN ('manager', 'hr', 'admin'))
      OR (pd.min_role = 'hr' AND p_user_role IN ('hr', 'admin'))
      OR (pd.min_role = 'admin' AND p_user_role = 'admin')
    )
  ORDER BY pd.embedding <=> p_embedding::vector
  LIMIT p_limit;
END;
$$;
