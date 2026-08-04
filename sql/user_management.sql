-- ============================================================
--  用户管理查询 SQL
--  接口: GET /api/users/list
-- ============================================================

-- 分页查询（带筛选）
SELECT id, username, display_name, email, role, is_active, created_at
FROM users
WHERE 1=1
  AND (:username IS NULL OR username LIKE CONCAT('%', :username, '%'))
  AND (:display_name IS NULL OR display_name LIKE CONCAT('%', :display_name, '%'))
  AND (:email IS NULL OR email LIKE CONCAT('%', :email, '%'))
  AND (:role IS NULL OR role = :role)
  AND (:is_active IS NULL OR is_active = :is_active)
ORDER BY created_at DESC
LIMIT :page_size OFFSET :offset;

-- 总数查询（用于分页）
SELECT COUNT(*) AS total
FROM users
WHERE 1=1
  AND (:username IS NULL OR username LIKE CONCAT('%', :username, '%'))
  AND (:display_name IS NULL OR display_name LIKE CONCAT('%', :display_name, '%'))
  AND (:email IS NULL OR email LIKE CONCAT('%', :email, '%'))
  AND (:role IS NULL OR role = :role)
  AND (:is_active IS NULL OR is_active = :is_active);
