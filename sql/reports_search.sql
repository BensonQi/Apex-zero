-- ============================================================
--  测试报告查询 SQL
--  接口: GET /api/reports?task_id=&test_type=&type=&date=
--  说明: 报告数据来源于文件系统扫描，以下 SQL 为等价查询逻辑参考
--        若后续将报告元数据存入 MySQL，可直接使用
-- ============================================================

-- 建表语句（如需将报告元数据持久化到 MySQL）
CREATE TABLE IF NOT EXISTS test_reports (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    task_id     VARCHAR(8)   NOT NULL COMMENT '任务ID（8位UUID前缀）',
    test_type   VARCHAR(10)  NOT NULL COMMENT '测试类型: API / UI / ALL',
    report_type VARCHAR(10)  NOT NULL COMMENT '报告格式: html / allure',
    file_name   VARCHAR(255) NOT NULL COMMENT '文件名',
    file_path   VARCHAR(500) NOT NULL COMMENT '文件路径',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报告生成时间',
    INDEX idx_task_id (task_id),
    INDEX idx_test_type (test_type),
    INDEX idx_report_type (report_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='测试报告元数据表';


-- 分页查询（带筛选）
SELECT task_id, test_type, report_type, file_name, file_path, created_at
FROM test_reports
WHERE 1=1
  AND (:task_id   IS NULL OR :task_id = ''   OR task_id   LIKE CONCAT('%', :task_id, '%'))
  AND (:test_type IS NULL OR :test_type = ''  OR test_type = :test_type)
  AND (:type      IS NULL OR :type = ''       OR report_type = :type)
  AND (:date      IS NULL OR :date = ''       OR DATE(created_at) = :date)
ORDER BY created_at DESC
LIMIT :page_size OFFSET :offset;


-- 总数查询（用于分页）
SELECT COUNT(*) AS total
FROM test_reports
WHERE 1=1
  AND (:task_id   IS NULL OR :task_id = ''   OR task_id   LIKE CONCAT('%', :task_id, '%'))
  AND (:test_type IS NULL OR :test_type = ''  OR test_type = :test_type)
  AND (:type      IS NULL OR :type = ''       OR report_type = :type)
  AND (:date      IS NULL OR :date = ''       OR DATE(created_at) = :date);


-- 插入报告记录（任务完成时调用）
INSERT INTO test_reports (task_id, test_type, report_type, file_name, file_path, created_at)
VALUES (:task_id, :test_type, :report_type, :file_name, :file_path, NOW());
