-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company TEXT,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create jobs table for scraping tasks
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'paused', 'completed', 'failed', 'cancelled')),
  total_urls INTEGER NOT NULL DEFAULT 0,
  processed_urls INTEGER NOT NULL DEFAULT 0,
  progress DECIMAL(5,2) NOT NULL DEFAULT 0,
  input_file_id UUID,
  output_file_id UUID,
  settings JSONB DEFAULT '{}',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create scraped_profiles table for storing extracted data
CREATE TABLE public.scraped_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  linkedin_url TEXT NOT NULL,
  profile_data JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'skipped')),
  error_message TEXT,
  scraped_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create file_uploads table for tracking uploaded files
CREATE TABLE public.file_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  upload_status TEXT NOT NULL DEFAULT 'uploading' CHECK (upload_status IN ('uploading', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create proxy_configs table for proxy management
CREATE TABLE public.proxy_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  username TEXT,
  password TEXT,
  is_active BOOLEAN DEFAULT true,
  success_rate DECIMAL(5,2) DEFAULT 100.0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proxy_configs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for jobs
CREATE POLICY "Users can view own jobs" ON public.jobs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for scraped_profiles
CREATE POLICY "Users can view own scraped profiles" ON public.scraped_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = scraped_profiles.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own scraped profiles" ON public.scraped_profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jobs 
      WHERE jobs.id = scraped_profiles.job_id 
      AND jobs.user_id = auth.uid()
    )
  );

-- Create RLS policies for file_uploads
CREATE POLICY "Users can view own file uploads" ON public.file_uploads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own file uploads" ON public.file_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own file uploads" ON public.file_uploads
  FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS policies for proxy_configs
CREATE POLICY "Users can view own proxy configs" ON public.proxy_configs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own proxy configs" ON public.proxy_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own proxy configs" ON public.proxy_configs
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own proxy configs" ON public.proxy_configs
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_jobs_user_status ON public.jobs(user_id, status);
CREATE INDEX idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX idx_scraped_profiles_job_id ON public.scraped_profiles(job_id);
CREATE INDEX idx_file_uploads_user_id ON public.file_uploads(user_id);
CREATE INDEX idx_proxy_configs_user_active ON public.proxy_configs(user_id, is_active);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage buckets for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', false);

INSERT INTO storage.buckets (id, name, public) 
VALUES ('exports', 'exports', false);

-- Create storage policies
CREATE POLICY "Users can upload their own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view their own uploads" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'uploads' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can download their exports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exports' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "System can create exports" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'exports');