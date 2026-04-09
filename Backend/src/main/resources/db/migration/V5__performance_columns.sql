ALTER TABLE weekly_performance ADD COLUMN week_start_date DATE NOT NULL DEFAULT '2025-01-01';
ALTER TABLE demo_performance ADD COLUMN demo_number INT NOT NULL DEFAULT 1;
