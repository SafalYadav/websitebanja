CREATE TABLE IF NOT EXISTS public.preview_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
    json_data jsonb NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz DEFAULT now()
);

-- RLS Policies
ALTER TABLE public.preview_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to preview links"
    ON public.preview_links FOR SELECT
    USING (true);

CREATE POLICY "Allow authenticated users to create preview links for their projects"
    ON public.preview_links FOR INSERT
    WITH CHECK (auth.uid() IN (SELECT user_id FROM public.projects WHERE id = project_id));
