-- ============================================================
-- Fix Thai PIT Tax Brackets: Replace incorrect 3-bracket seed
-- with the correct 8-bracket progressive rate table
-- Source: Revenue Department of Thailand, 2024
--
-- The original seed in 20240620000023 used placeholder rates:
--   0-150K: 0%, 150K-1.8M: 10%, 1.8M-99.9M: 15%
-- These are WRONG. The correct Thai PIT brackets are:
--   0-150K: 0%, 150K-300K: 5%, 300K-500K: 10%, ...
--
-- SAFETY: DELETE + INSERT within a transaction. If this fails,
-- the original (incorrect) data remains intact.
-- ============================================================

BEGIN;

-- Delete incorrect seed data for Thailand 2024
DELETE FROM th_tax_brackets WHERE year = 2024;

-- Insert the correct 8-bracket Thai PIT progressive rates
INSERT INTO th_tax_brackets (year, min_income, max_income, tax_rate) VALUES
  (2024, 0,          150000,     0.00),   -- 0 – 150,000:     0%
  (2024, 150001,     300000,     5.00),   -- 150,001 – 300,000:   5%
  (2024, 300001,     500000,    10.00),   -- 300,001 – 500,000:  10%
  (2024, 500001,     750000,    15.00),   -- 500,001 – 750,000:  15%
  (2024, 750001,     1000000,   20.00),   -- 750,001 – 1,000,000: 20%
  (2024, 1000001,    2000000,   25.00),   -- 1,000,001 – 2,000,000: 25%
  (2024, 2000001,    5000000,   30.00),   -- 2,000,001 – 5,000,000: 30%
  (2024, 5000001,    NULL,      35.00);   -- Above 5,000,000: 35%

COMMIT;
