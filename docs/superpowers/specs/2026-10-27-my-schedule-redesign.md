# Thiết Kế Chi Tiết: Tái Cấu Trúc Giao Diện Lịch Dạy Của HLV (My Schedule Redesign)

> **Mục tiêu:** Nâng cấp trang "Lịch dạy của tôi" (`/my-schedule`) từ bố cục 7 cột tĩnh gây khoảng trống lớn thành giao diện Hybrid linh hoạt: Mặc định là **Dải 7 ngày tương tác (Weekly Strip + Day Focus Timeline)**, kèm bộ chuyển đổi góc nhìn nhanh sang **Lưới tuần thích ứng (Adaptive Week Grid)** và **Gom nhóm theo lớp (Class Bento Cards)**.

---

## 1. Vấn Đề Cần Khắc Phục Ở Giao Diện Cũ
- **Khoảng trắng thừa lớn:** `min-height: 480px` cố định khiến các cột ngày chỉ có 1 ca học bị trống đến 70% bên dưới.
- **Thanh cuộn ngang (Horizontal Scroll):** 7 cột với độ rộng tối thiểu 1100px ép người dùng màn hình laptop/desktop vừa phải cuộn ngang để xem thứ 7 và Chủ nhật.
- **Trùng lặp & nhàm chán:** Hiển thị lặp lại các thẻ cùng nội dung trên từng ngày.
- **Thiếu định vị ngày hiện tại:** HLV khó định vị ngay ca dạy hôm nay và ngày mai.

---

## 2. Giải Pháp Giao Diện Mới (Hybrid Architecture)

### 2.1 View Switcher Capsule (Thanh Chuyển Góc Nhìn)
Đặt ngay cạnh tiêu đề trang, cho phép HLV chuyển đổi 3 góc nhìn tức thì:
- `daily` (Mặc định): **Hàng ngày** — Dải 7 ngày bấm chọn, hiển thị sâu chi tiết ca học ngày được chọn.
- `weekly`: **Lưới tuần** — 7 cột ngày tự co giãn chiều cao (không còn min-height 480px vô nghĩa), co giãn 100% không cuộn ngang.
- `class`: **Theo lớp** — Gom nhóm theo các lớp cố định HLV phụ trách kèm dải ngày học trong tuần (`[T2]` `[T4]` `[T6]`).

### 2.2 Quick KPI Bar (Thanh Thống Kê Nhanh)
- **Tổng ca tuần:** Tính tổng các ca dạy trong tuần.
- **Thời lượng giảng dạy:** Ước tính tổng thời gian (ví dụ: `9 giờ dạy / tuần`).
- **Lớp phụ trách:** Tổng số lớp khác nhau được phân công.

### 2.3 Chế Độ "Hàng Ngày" (Phương Án B - Mặc Định)
1. **Dải 7 ngày (Weekly Strip):**
   - 7 pill buttons (T2 -> CN).
   - Hiển thị thứ, ngày trong tháng của tuần hiện tại.
   - Nhận diện ngày hôm nay: Badge `NAY`, viền cam năng động (`--accent-energy: #FF6B35`).
   - Badge số ca mỗi ngày (`● 1 ca` hoặc `Nghỉ`).
   - Click chọn ngày cập nhật `selectedDay`.
2. **Khu vực Ca học Ngày được chọn:**
   - Header ca: Ngày được chọn, số ca trong ngày, tổng thời lượng.
   - Nếu có ca học:
     - Thẻ ca học Bento sang trọng: Icon môn võ 🥋, Tên lớp học, Giờ học (`18:00 - 19:30`), Thời lượng tự động tính (`90 phút`).
     - Thông tin chi tiết: Địa điểm (`CC Riverside`), Vai trò (`HLV Chính` / `Trợ giảng`).
     - Tác vụ 1-chạm:
       - `[Xem chi tiết lớp]`: Dẫn đến `/training/[venueId]`.
       - `[Điểm danh học viên →]`: Mở thẳng `/attendance?classId=...`.
   - Nếu không có ca học:
     - Khung thông báo tinh tế: "Hôm nay bạn không có lịch dạy. Chúc bạn có một ngày nghỉ ngơi tràn đầy năng lượng! 🌴".

### 2.4 Chế Độ "Lưới Tuần" (Phương Án A)
- 7 cột ngày tự động điều chỉnh độ cao theo nội dung thực tế (`min-height: auto`).
- Tự động co giãn theo chiều rộng màn hình, không còn thanh cuộn ngang gây ức chế.
- Highlight viền cam rực rỡ cho cột ngày Hôm nay.

### 2.5 Chế Độ "Theo Lớp" (Phương Án C)
- Gom nhóm các buổi học theo từng lớp (`class_id`).
- Hiển thị thẻ lớp Bento: Tên lớp, địa điểm, khung giờ, thời lượng.
- Dải 7 ngày trong tuần với các ngày diễn ra lớp học được highlight nổi bật (ví dụ: T2 - T4 - T6 sáng màu Teal, các ngày khác làm mờ).

---

## 3. Cấu Trúc CSS & Theme
- Sử dụng CSS Module: `app/(dashboard)/my-schedule/MySchedule.module.css`.
- Tuân thủ toàn diện Hiến Pháp Yoogi Class Flow:
  - Font: Inter / Plus Jakarta Sans.
  - CSS Variables: `--primary` (#14B8A6), `--accent-energy` (#FF6B35), `--surface`, `--surface-hover`, `--text-main`, `--radius-xl`, `--radius-full`.
  - Hỗ trợ hoàn hảo cả Light Mode (`#FAF9F6`) và Dark Mode (`#090A0F`).
  - Responsive: Co giãn linh hoạt trên Mobile và Desktop.
