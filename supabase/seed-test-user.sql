-- Create a demo company for the test user
-- This enables E2E tests to pass on all pages

DO $$
DECLARE
  v_user_id UUID := 'a07ac229-65da-488a-a2e5-0aeec1474510';
  v_company_id UUID;
BEGIN
  -- Check if user already has a company
  SELECT company_id INTO v_company_id FROM user_profiles WHERE id = v_user_id;
  
  IF v_company_id IS NULL THEN
    -- Create company
    INSERT INTO companies (name, industry, country, currency, timezone, locale)
    VALUES ('E2E Test Company', 'Technology', 'TH', 'THB', 'Asia/Bangkok', 'th-TH')
    RETURNING id INTO v_company_id;
    
    -- Link user to company
    UPDATE user_profiles SET company_id = v_company_id, role = 'admin' WHERE id = v_user_id;
    
    -- Create demo jobs
    INSERT INTO jobs (company_id, title, department, location, employment_type, status, description)
    VALUES 
      (v_company_id, 'Senior Frontend Developer', 'Engineering', 'Bangkok', 'full_time', 'active', 'React/TypeScript developer with 5+ years experience'),
      (v_company_id, 'Backend Engineer', 'Engineering', 'Bangkok', 'full_time', 'active', 'Node.js/Python developer'),
      (v_company_id, 'Product Manager', 'Product', 'Bangkok', 'full_time', 'closed', 'Product management role'),
      (v_company_id, 'UI/UX Designer', 'Design', 'Remote', 'contract', 'active', 'Figma/Sketch designer');
    
    -- Create demo candidates
    INSERT INTO candidates (company_id, name, email, phone, status)
    VALUES
      (v_company_id, 'Somchai Jaidee', 'somchai@example.com', '081-234-5678', 'new'),
      (v_company_id, 'Suda Rakdee', 'suda@example.com', '082-345-6789', 'screening'),
      (v_company_id, 'Nattapong Wongkan', 'nat@example.com', '083-456-7890', 'interview'),
      (v_company_id, 'Ploy Srisuwan', 'ploy@example.com', '084-567-8901', 'offer'),
      (v_company_id, 'Krisana Thongdee', 'kris@example.com', '085-678-9012', 'new');
    
    RAISE NOTICE 'Created company % with demo data', v_company_id;
  ELSE
    RAISE NOTICE 'User already has company %', v_company_id;
  END IF;
END $$;
