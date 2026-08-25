# Legacy Migration Status

Dự án đang chuyển đổi từ kiến trúc thuần SPA (HTML/JS) sang Next.js App Router. Thư mục `public/js/` chứa toàn bộ mã nguồn cũ. Bảng dưới đây theo dõi tình trạng của từng thành phần.

| Legacy file | Status | Replacement | Safe to delete |
|---|---|---|---|
| `public/js/auth.js` | Đã thay thế hoàn toàn | `utils/supabase/*`, `app/login/`, `utils/auth/*` | Có thể xóa (Cần verify) |
| `public/js/db.js` | Đã thay thế một phần (Auth, Users) | RLS, Server Actions/Services (sẽ làm) | Chưa (Đang chứa DB logic) |
| `public/js/app.js` | Obsolete (Khởi tạo SPA cũ) | `app/layout.tsx`, `middleware.ts` | Có thể xóa |
| `public/js/router.js`| Obsolete | Next.js File-system Routing (`app/`) | Có thể xóa |
| `public/js/utils.js` | Cần rà soát (Format ngày, số) | Các hàm helper trong `utils/` hoặc Frontend component | Chưa (Cần migrate helper) |
| `public/js/pages/*` | Đang thay thế dần | `app/(dashboard)/*` | Chỉ xóa khi page tương ứng đã có trên Next.js |
| `public/js/components/*` | Đang thay thế dần | `app/components/*` | Đợi migration hoàn tất |

**Ghi chú (Tuân thủ PHASE 26):**
Không được tự ý xóa bất kỳ file nào trong `public/js/` nếu chưa chứng minh rằng không còn file HTML (như index.html cũ) hoặc route nào phụ thuộc vào runtime của chúng. 
