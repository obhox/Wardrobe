-- Curated themes replace ground + pattern + accent. This migration only adds:
-- it creates "Wardrobe"."theme" and fills it from each wardrobe's ground. No
-- existing value is changed, so the previous release keeps working while this
-- one rolls out, and rolling back needs no data repair.
--
-- Left for the follow-up migration, once this release is settled: dropping
-- "ground"/"pattern"/"accent" and the "Sticker" table, moving removed layouts
-- to 'grid' and shrinking the "LayoutMode" enum. Until then the app reads old
-- layout and theme values through toLayoutMode() and toThemeId().

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "defaultTheme" SET DEFAULT 'paper';

-- AlterTable
ALTER TABLE "Wardrobe" ADD COLUMN     "theme" TEXT NOT NULL DEFAULT 'paper';

-- Carry each wardrobe's ground over to its theme. A custom "#rrggbb" ground
-- becomes ink when it is dark (brightness under 128 of 255) and paper otherwise.
-- The nested CASE keeps decode() away from values that are not hex colours.
UPDATE "Wardrobe" SET "theme" = CASE
  WHEN "ground" IN ('bone', 'sage', 'butter') THEN "ground"
  WHEN "ground" = 'daylight' THEN 'mist'
  WHEN "ground" = 'bubblegum' THEN 'rose'
  WHEN "ground" = 'slate' THEN 'ink'
  WHEN "ground" ~ '^#[0-9A-Fa-f]{6}$' THEN
    CASE WHEN get_byte(decode(substr("ground", 2), 'hex'), 0) * 0.2126
            + get_byte(decode(substr("ground", 2), 'hex'), 1) * 0.7152
            + get_byte(decode(substr("ground", 2), 'hex'), 2) * 0.0722 < 128
         THEN 'ink' ELSE 'paper' END
  ELSE 'paper'
END;
