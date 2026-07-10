-- Gamification Engine tables
-- Points ledger, badges, leaderboards, recognition

-- Points ledger
CREATE TABLE IF NOT EXISTS gamification_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES user_profiles(id),
  points INT NOT NULL,
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  awarded_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badge definitions
CREATE TABLE IF NOT EXISTS gamification_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT DEFAULT '🏅',
  category TEXT NOT NULL,
  required_points INT NOT NULL DEFAULT 100,
  required_streak INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee badge awards
CREATE TABLE IF NOT EXISTS gamification_employee_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES user_profiles(id),
  badge_id UUID NOT NULL REFERENCES gamification_badges(id) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, badge_id)
);

-- Peer recognition
CREATE TABLE IF NOT EXISTS gamification_recognitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_employee_id UUID NOT NULL REFERENCES user_profiles(id),
  to_employee_id UUID NOT NULL REFERENCES user_profiles(id),
  message TEXT NOT NULL,
  points INT NOT NULL DEFAULT 10,
  badge_id UUID REFERENCES gamification_badges(id),
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gamification_points_employee ON gamification_points(employee_id);
CREATE INDEX IF NOT EXISTS idx_gamification_points_company ON gamification_points(company_id);
CREATE INDEX IF NOT EXISTS idx_gamification_points_category ON gamification_points(category);
CREATE INDEX IF NOT EXISTS idx_gamification_badges_company ON gamification_badges(company_id);
CREATE INDEX IF NOT EXISTS idx_gamification_employee_badges_employee ON gamification_employee_badges(employee_id);
CREATE INDEX IF NOT EXISTS idx_gamification_recognitions_company ON gamification_recognitions(company_id);
CREATE INDEX IF NOT EXISTS idx_gamification_recognitions_to ON gamification_recognitions(to_employee_id);

-- RLS policies
ALTER TABLE gamification_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_employee_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_recognitions ENABLE ROW LEVEL SECURITY;

-- Company isolation
CREATE POLICY "gamification_points_company_isolation" ON gamification_points
  FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "gamification_badges_company_isolation" ON gamification_badges
  FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "gamification_employee_badges_company_isolation" ON gamification_employee_badges
  FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "gamification_recognitions_company_isolation" ON gamification_recognitions
  FOR ALL USING (company_id = (SELECT company_id FROM user_profiles WHERE id = auth.uid()));

-- Employee can view own points and badges
CREATE POLICY "gamification_points_employee_read" ON gamification_points
  FOR SELECT USING (employee_id = auth.uid());

CREATE POLICY "gamification_employee_badges_employee_read" ON gamification_employee_badges
  FOR SELECT USING (employee_id = auth.uid());
