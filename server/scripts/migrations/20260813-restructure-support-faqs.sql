-- Create support_faq_categories table
CREATE TABLE IF NOT EXISTS support_faq_categories (
    id UUID PRIMARY KEY,
    category VARCHAR(255) UNIQUE NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Add categoryId column to support_faqs referencing support_faq_categories
ALTER TABLE support_faqs ADD COLUMN IF NOT EXISTS "categoryId" UUID REFERENCES support_faq_categories(id) ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing categories from support_faqs into support_faq_categories
INSERT INTO support_faq_categories (id, category, "createdAt", "updatedAt")
SELECT DISTINCT 
    gen_random_uuid(), 
    UPPER(TRIM(category)), 
    NOW(), 
    NOW()
FROM support_faqs
WHERE category IS NOT NULL AND category != ''
ON CONFLICT (category) DO NOTHING;

-- Map and set categoryId in support_faqs
UPDATE support_faqs sf
SET "categoryId" = sfc.id
FROM support_faq_categories sfc
WHERE UPPER(TRIM(sf.category)) = sfc.category;

-- Drop the old category string column from support_faqs
ALTER TABLE support_faqs DROP COLUMN IF EXISTS category;
