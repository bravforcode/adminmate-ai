CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), COALESCE(NEW.raw_user_meta_data->>'role', 'hr'))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['companies','user_profiles','jobs','candidates','applications','interviews','offers','documents','onboarding_checklists','onboarding_tasks','chat_platform_connections','subscriptions','pdpa_consents'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t, t);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION update_job_filled_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'hired' THEN
    UPDATE jobs SET filled_count = filled_count + 1 WHERE id = NEW.job_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'hired' AND OLD.status != 'hired' THEN
      UPDATE jobs SET filled_count = filled_count + 1 WHERE id = NEW.job_id;
    ELSIF OLD.status = 'hired' AND NEW.status != 'hired' THEN
      UPDATE jobs SET filled_count = GREATEST(0, filled_count - 1) WHERE id = NEW.job_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_application_hired ON applications;
CREATE TRIGGER on_application_hired AFTER INSERT OR UPDATE OF status ON applications FOR EACH ROW EXECUTE FUNCTION update_job_filled_count();
