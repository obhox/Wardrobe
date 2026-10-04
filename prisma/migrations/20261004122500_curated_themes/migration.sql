-- Curated themes replace ground + pattern + accent, and the removed layouts
-- fold into the board. This migration only adds and backfills: the old columns,
-- the "Sticker" table and the unused "LayoutMode" values stay, so the previous
-- release keeps working while this one rolls out. A follow-up migration drops them.

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

-- The same for the theme a person's new wardrobes start with.
UPDATE "User" SET "defaultTheme" = CASE
  WHEN "defaultTheme" IN ('bone', 'sage', 'butter') THEN "defaultTheme"
  WHEN "defaultTheme" = 'daylight' THEN 'mist'
  WHEN "defaultTheme" = 'bubblegum' THEN 'rose'
  WHEN "defaultTheme" = 'slate' THEN 'ink'
  WHEN "defaultTheme" ~ '^#[0-9A-Fa-f]{6}$' THEN
    CASE WHEN get_byte(decode(substr("defaultTheme", 2), 'hex'), 0) * 0.2126
            + get_byte(decode(substr("defaultTheme", 2), 'hex'), 1) * 0.7152
            + get_byte(decode(substr("defaultTheme", 2), 'hex'), 2) * 0.0722 < 128
         THEN 'ink' ELSE 'paper' END
  ELSE 'paper'
END;

-- Shelves, columns and the old gallery all become the board.
UPDATE "Wardrobe" SET "layoutMode" = 'grid' WHERE "layoutMode"::text NOT IN ('free', 'grid');
