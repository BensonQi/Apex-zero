-- ============================================================
--  执行历史查询 SQL
--  接口: GET /api/history?task_id=&test_type=&status=&start_date=
--  表: test_runs（由 DBManager 自动创建）
-- ============================================================

-- 建表语句（DBManager._ensure_test_runs_table 自动执行）
CREATE TABLE IF NOT EXISTS test_runs (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    task_id     VARCHAR(8)   NOT NULL COMMENT '任务ID（8位UUID前缀）',
    test_type   VARCHAR(10)  NOT NULL COMMENT '测试类型: api / ui / all / selected',
    status      VARCHAR(20)  NOT NULL DEFAULT 'pending' COMMENT '状态: pending/running/completed/failed/stopped',
    passed      INT          NOT NULL DEFAULT 0 COMMENT '通过数',
    failed      INT          NOT NULL DEFAULT 0 COMMENT '失败数',
    errors      INT          NOT NULL DEFAULT 0 COMMENT '错误数',
    skipped     INT          NOT NULL DEFAULT 0 COMMENT '跳过数',
    total_tests INT          NOT NULL DEFAULT 0 COMMENT '总用例数',
    started_at  DATETIME     NOT NULL COMMENT '开始时间',
    finished_at DATETIME     NULL     COMMENT '结束时间',
    report_file VARCHAR(255) NULL     COMMENT '报告文件名',
    env_name    VARCHAR(100) NULL     COMMENT '目标环境',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_task_id (task_id),
    INDEX idx_status (status),
    INDEX idx_test_type (test_type),
    INDEX idx_started_at (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='测试执行记录表';


-- 分页查询（带筛选）
SELECT task_id, test_type, status, passed, failed, errors, skipped,
       total_tests, started_at, finished_at, report_file, env_name
FROM test_runs
WHERE 1=1
  AND (:task_id    IS NULL OR :task_id = ''    OR task_id   LIKE CONCAT('%', :task_id, '%'))
  AND (:test_type  IS NULL OR :test_type = ''  OR test_type = :test_type)
  AND (:status     IS NULL OR :status = ''     OR status    = :status)
  AND (:start_date IS NULL OR :start_date = '' OR DATE(started_at) = :start_date)
ORDER BY started_at DESC
LIMIT :page_size OFFSET :offset;


-- 总数查询（用于分页）
SELECT COUNT(*) AS total
FROM test_runs
WHERE 1=1
  AND (:task_id    IS NULL OR :task_id = ''    OR task_id   LIKE CONCAT('%', :task_id, '%'))
  AND (:test_type  IS NULL OR :test_type = ''  OR test_type = :test_type)
  AND (:status     IS NULL OR :status = ''     OR status    = :status)
  AND (:start_date IS NULL OR :start_date = '' OR DATE(started_at) = :start_date);


-- 插入记录（任务完成时调用）
INSERT INTO test_runs (task_id, test_type, status, passed, failed, errors, skipped,
                        total_tests, started_at, finished_at, report_file, env_name)
VALUES (:task_id, :test_type, :status, :passed, :failed, :errors, :skipped,
        :total_tests, :started_at, :finished_at, :report_file, :env_name)
ON DUPLICATE KEY UPDATE
    status      = VALUES(status),
    passed      = VALUES(passed),
    failed      = VALUES(failed),
    errors      = VALUES(errors),
    skipped     = VALUES(skipped),
    total_tests = VALUES(total_tests),
    finished_at = VALUES(finished_at),
    report_file = VALUES(report_file);
