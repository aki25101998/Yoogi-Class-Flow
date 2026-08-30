-- 025_restore_integrity_fix.sql
-- Thêm cột sequence_id để đảm bảo thứ tự khôi phục chính xác tuyệt đối
-- cho các thay đổi diễn ra trong cùng một database transaction.

ALTER TABLE public.version_changes ADD COLUMN IF NOT EXISTS sequence_id BIGSERIAL;
CREATE INDEX IF NOT EXISTS idx_version_changes_sequence ON public.version_changes(sequence_id DESC);

-- Cập nhật lại view/hàm khôi phục nếu cần (sẽ chạy qua 022_restore_functions.sql sửa đổi)
