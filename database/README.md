# Cấu trúc Database

Thư mục này chứa các file SQL để khởi tạo các bảng trong Supabase.

Để đảm bảo dữ liệu không bị xóa hoặc ghi đè, các câu lệnh tạo bảng đều sử dụng `CREATE TABLE IF NOT EXISTS`. Điều này có nghĩa là nếu bảng đã tồn tại, nó sẽ không làm gì cả, bảo toàn dữ liệu của bạn.

## Thứ tự chạy file SQL
Khi bạn thiết lập dự án mới hoặc cập nhật schema, hãy chạy các file theo thứ tự đánh số để tránh lỗi khóa ngoại (Foreign Key):

1. `01_coaches.sql`
2. `02_venues.sql`
3. `03_venue_coaches.sql`
4. `04_venue_classes.sql`
5. `05_schedules.sql`
6. `06_attendance.sql`
7. `07_teacher_salaries.sql`
8. `08_teacher_salary_sessions.sql`
9. `09_student_attendance.sql`
10. `10_rls_policies.sql` (Cấu hình bảo mật RLS)
