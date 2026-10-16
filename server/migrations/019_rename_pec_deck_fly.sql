-- Run once after 018, only after a verified database backup.
-- Preserve exercise IDs and immutable training-session snapshots.
UPDATE exercises
SET name = CASE catalog_key WHEN 'machine_chest_fly' THEN '正向飞鸟' ELSE '反向飞鸟' END,
    name_normalized = CASE catalog_key WHEN 'machine_chest_fly' THEN '正向飞鸟' ELSE '反向飞鸟' END,
    default_display_name_zh = CASE catalog_key WHEN 'machine_chest_fly' THEN '正向飞鸟' ELSE '反向飞鸟' END,
    default_display_name_normalized = CASE catalog_key WHEN 'machine_chest_fly' THEN '正向飞鸟' ELSE '反向飞鸟' END
WHERE is_system = 1 AND catalog_key IN ('machine_chest_fly', 'reverse_pec_deck');

-- Only replace old catalog-driven labels. Other personal names remain untouched.
UPDATE user_exercise_preferences p
JOIN exercises e ON e.id = p.exercise_id
SET p.display_name = e.default_display_name_zh,
    p.display_name_normalized = e.default_display_name_normalized
WHERE e.catalog_key IN ('machine_chest_fly', 'reverse_pec_deck')
  AND ((e.catalog_key = 'machine_chest_fly' AND p.display_name IN ('正向蝴蝶机', '蝴蝶机夹胸'))
    OR (e.catalog_key = 'reverse_pec_deck' AND p.display_name = '反向蝴蝶机'));
