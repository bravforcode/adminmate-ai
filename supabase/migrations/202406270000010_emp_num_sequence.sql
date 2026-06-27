-- Fix employee number generation race condition
-- Create a PostgreSQL sequence for generating unique employee numbers.
-- This replaces the COUNT(*) + 1 approach which is subject to race conditions
-- under concurrent inserts.

CREATE SEQUENCE IF NOT EXISTS emp_num_seq START 1000;
