# Thiết Kế Bố Cục Thẻ Tổng Quan 4 Ô Cân Đối & Đồ Họa Năng Lượng

**Ngày:** 2026-10-24  
**Trạng thái:** Đã phê duyệt  
**Mục tiêu:** Giải quyết triệt để vấn đề mất cân đối (ô trống thứ 4 khi chỉ có 3 chỉ số) trên giao diện Tổng quan, mang lại giao diện đầy đặn, hiện đại, mang năng lượng thể thao và võ đạo chuyên nghiệp.

---

## 1. Bối cảnh & Vấn đề

- Trên trang Huấn luyện viên (`CoachesClient`), phần Tổng quan trước đây chỉ có 3 thẻ KPI:
  1. Đang hoạt động
  2. Lời mời chờ
  3. Đã tạm ngưng
- Trong khi đó, CSS của `.overviewGrid` ở màn hình lớn (>= 1024px) được cấu hình cố định `grid-template-columns: repeat(4, 1fr)`.
- **Hệ quả trực quan:** Khi trang chỉ có 3 ô, cột thứ 4 bị rỗng 25% diện tích bên phải, tạo cảm giác bị "thiếu hụt", mất cân đối và các ô bị kéo dài thưa thớt nội dung. Trong khi đó, con số "Tổng số nhân sự" lại bị đẩy lên góc phải tiêu đề header một cách lẻ loi.

---

## 2. Giải Pháp Thiết Kế (Phương Án A Đã Phê Duyệt)

### 2.1 Bổ sung Thẻ KPI thứ 4 cho Trang Huấn luyện viên
Tích hợp chỉ số **"Tổng nhân sự"** vào ô KPI đầu tiên để cấu thành bộ **4 thẻ KPI hoàn chỉnh**:
1. **Ô 1: TỔNG NHÂN SỰ** (Màu Teal - `var(--primary)`)
   - Label: `TỔNG NHÂN SỰ`
   - Value: `totalCount`
   - Caption: `Toàn bộ đội ngũ HLV`
   - Icon chìm (Watermark): `sports_martial_arts` / 🥋
2. **Ô 2: ĐANG HOẠT ĐỘNG** (Màu Xanh lục - `var(--success)`)
   - Label: `ĐANG HOẠT ĐỘNG`
   - Value: `activeCount`
   - Caption: `Sẵn sàng đứng lớp`
   - Icon chìm (Watermark): `bolt` / ⚡
3. **Ô 3: LỜI MỜI CHỜ** (Màu Vàng cam - `var(--warning)`)
   - Label: `LỜI MỜI CHỜ`
   - Value: `invitationsCount`
   - Caption: `Chờ HLV chấp thuận`
   - Icon chìm (Watermark): `mail` / ✉️
4. **Ô 4: ĐÃ TẠM NGƯNG** (Màu Đỏ - `var(--danger)`)
   - Label: `ĐÃ TẠM NGƯNG`
   - Value: `suspendedCount`
   - Caption: `Nghỉ phép hoặc tạm ngưng`
   - Icon chìm (Watermark): `pause_circle` / ⏸️

### 2.2 Nâng Cấp Giao Diện Thẻ KPI (`app/styles/page-standard.module.css`)
- **Watermark Icon chìm:** Thêm icon thể thao mờ ở góc phải dưới thẻ (opacity `0.12`, kích thước lớn `36px - 40px`, pointer-events `none`) để lấp đầy khoảng trắng một cách nghệ thuật.
- **Dòng chú thích phụ (`kpiCaption`):** Font size `0.75rem`, màu `var(--text-secondary)`, giúp giải thích ngắn gọn ý nghĩa của con số.
- **Hệ thống Gradient & Glow:**
  - `kpiPrimary`: Nền gradient nhẹ pha Teal `linear-gradient(135deg, color-mix(in srgb, var(--primary) 6%, var(--surface-hover)) 0%, var(--surface-hover) 100%)`.
  - `kpiSuccess`, `kpiWarning`, `kpiDanger`: Nền gradient tương ứng theo màu trạng thái.
  - Viền trái bo màu 3.5px và hover lift nhẹ `-2px` với bóng đổ nổi bật.
- **Lưới co giãn thích ứng (`overviewGrid`):**
  - Mặc định dùng `grid-template-columns: repeat(auto-fit, minmax(220px, 1fr))` trên các kích thước màn hình để nếu trang nào chỉ có 3 ô (như `FinanceClient`), 3 ô sẽ tự động dàn đều mỗi ô `33.3%` đầy đặn, không bị rỗng cột 4.
  - Trên màn hình lớn (>= 1024px), hỗ trợ tối đa 4 cột cân xứng hoàn hảo.

---

## 3. Các Tệp Sẽ Thay Đổi

1. `app/styles/page-standard.module.css`:
   - Nâng cấp `.overviewGrid` với `auto-fit` linh hoạt.
   - Bổ sung `.kpiItem` relative container, `.kpiWatermark` và `.kpiCaption`.
   - Tối ưu màu sắc text, line-height và hover transitions.
2. `app/(dashboard)/coaches/CoachesClient.tsx`:
   - Cập nhật JSX phần `overviewGrid` gồm 4 ô KPI (Tổng nhân sự, Đang hoạt động, Lời mời chờ, Đã tạm ngưng).
   - Tinh chỉnh `overviewHeader` hiển thị ngắn gọn: `"TỔNG QUAN HUẤN LUYỆN VIÊN"` và trạng thái cập nhật.
3. `CONSTITUTION.md`:
   - Cập nhật tài liệu Hiến pháp Mục 12 và nhật ký thay đổi.

---

## 4. Kế Hoạch Kiểm Thử & Xác Minh

1. **Kiểm tra giao diện:**
   - Trang Huấn luyện viên (`/coaches`): Hiển thị đúng 4 ô đầy đặn, cân xứng 25% mỗi ô trên desktop.
   - Các trang khác (`/dashboard`, `/finance`): Các ô co giãn tự nhiên không bị vỡ hoặc rỗng cột.
2. **Kiểm tra Responsive:**
   - Desktop (>= 1024px): 4 ô thẳng hàng.
   - Tablet (640px - 1023px): 2 hàng x 2 cột.
   - Mobile (< 640px): 1 cột dọc.
3. **Build & Typecheck:**
   - `npx tsc --noEmit` thoát mã 0.
   - `npm run build` thành công toàn bộ 32/32 routes.
4. **Git Commit & Auto-deploy:**
   - Tự động push GitHub và kích hoạt Vercel deploy.
