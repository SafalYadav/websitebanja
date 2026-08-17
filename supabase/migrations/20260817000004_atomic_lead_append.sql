-- Create an RPC to atomically append a lead to the project's json_data->'leads' array
CREATE OR REPLACE FUNCTION append_lead_to_project(p_project_id UUID, p_lead_data JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE projects
  SET 
    json_data = jsonb_set(
      COALESCE(json_data, '{}'::jsonb),
      '{leads}',
      -- Prepend the new lead to the beginning of the array
      jsonb_build_array(p_lead_data) || COALESCE(json_data->'leads', '[]'::jsonb)
    ),
    updated_at = NOW()
  WHERE id = p_project_id;
END;
$$;
