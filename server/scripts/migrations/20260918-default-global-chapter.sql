-- Migration: Backfill users without a chapter to Global Chapter (code 1007)
-- and update their member IDs from TATT-XXXX-<seq> to proper TATT-<chapterCode>-<seq>

DO $$
DECLARE
    global_chapter_id UUID;
BEGIN
    -- Look up Global Chapter ID by code 1007
    SELECT id INTO global_chapter_id FROM chapters WHERE code = '1007' LIMIT 1;

    IF global_chapter_id IS NOT NULL THEN
        -- 1. Update all users with NULL chapterId to Global Chapter
        UPDATE users
        SET "chapterId" = global_chapter_id
        WHERE "chapterId" IS NULL;

        -- 2. Update tattMemberId for any user with TATT-XXXX- to their chapter's code
        UPDATE users u
        SET "tattMemberId" = 'TATT-' || c.code || '-' || u."sequenceNumber"
        FROM chapters c
        WHERE u."chapterId" = c.id AND u."tattMemberId" LIKE 'TATT-XXXX-%';

        RAISE NOTICE 'Updated users to Global Chapter: %', global_chapter_id;
    ELSE
        RAISE WARNING 'Global Chapter with code 1007 not found!';
    END IF;
END $$;
