-- 026_harden_session_constraints.sql

-- Đảm bảo không tạo 2 session cho cùng 1 schedule trong cùng 1 ngày
-- Dùng partial index thay vì unique constraint để linh hoạt, nhưng
-- CREATE UNIQUE INDEX cũng hoạt động tương đương.
-- Ở đây PostgreSQL cho phép UNIQUE(schedule_id, date) và 
-- nếu schedule_id là NULL thì sẽ không bị tính là duplicate (tuỳ chuẩn PG, nhưng PG hỗ trợ nhiều NULLs).
-- Để an toàn tuyệt đối 100%, ta dùng Partial Unique Index:

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_schedule_date 
ON public.class_sessions(schedule_id, date)
WHERE schedule_id IS NOT NULL AND status != 'cancelled';

-- Ghi chú: Nếu ca học bị 'cancelled', ta có cho phép tạo lại ca mới cho schedule đó không?
-- Thường thì có (để override/thay thế), nên ta thêm điều kiện status != 'cancelled'.
-- Nếu logic cũ là ghi đè (update) luôn thì index trên vẫn đúng.
