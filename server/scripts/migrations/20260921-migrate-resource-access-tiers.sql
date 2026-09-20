-- Migration: Normalize Resource Access Control Tiers (Free for All vs Paid Members Only)
-- Date: 2026-09-21

-- 1. Free for All: any resource that allows FREE or has empty/null allowedTiers or minTier = 'FREE'
UPDATE "resources"
SET 
    "minTier" = 'FREE',
    "allowedTiers" = ARRAY['FREE', 'UBUNTU', 'IMANI', 'KIONGOZI']::character varying[]
WHERE 
    "minTier" = 'FREE' 
    OR 'FREE' = ANY("allowedTiers") 
    OR "allowedTiers" IS NULL 
    OR "allowedTiers" = '{}';

-- 2. Paid Members Only: any resource that previously targeted specific paid tiers (Ubuntu, Imani, Kiongozi)
UPDATE "resources"
SET 
    "minTier" = 'UBUNTU',
    "allowedTiers" = ARRAY['UBUNTU', 'IMANI', 'KIONGOZI']::character varying[]
WHERE 
    NOT (
        "minTier" = 'FREE' 
        OR 'FREE' = ANY("allowedTiers") 
        OR "allowedTiers" IS NULL 
        OR "allowedTiers" = '{}'
    );
