# Thiết Kế Chi Tiết: Báo Cáo Tài Chính Đa Chiều & Phân Tích Lợi Nhuận (P&L) Theo Cơ Sở (Financial Reports & Venue P&L Analytics)

- **Ngày tạo:** 2026-11-01
- **Trạng thái:** Chờ kiểm duyệt (Pending Review)
- **Tác giả:** Antigravity & User Pair-Programming
- **Phạm vi:** Trọng tâm 3 (Phase 3) — Báo cáo Kết quả Kinh doanh (P&L Statement), Bóc tách & So sánh Lợi nhuận theo Chi nhánh (Multi-Venue P&L), Phân tích Cơ cấu Tài chính (Visual Analytics), So sánh Tăng trưởng Kỳ trước (MoM/QoQ) và Xuất Báo cáo Excel (.xlsx).

---

## 1. TỔNG QUAN & MỤC TIÊU (Overview & Objectives)

### 1.1 Bối cảnh & Vấn đề
- Sau khi hoàn thành **Phase 1** (Chuẩn hóa Sổ quỹ `/finance` với cây danh mục 2 cấp, gắn cơ sở `venue_id`, phương thức thanh toán) và **Phase 2** (Nâng cấp Học phí `/tuition` với VietQR động, tạo hàng loạt và đồng bộ tự động sang Sổ quỹ), hệ thống **Yoogi Class Flow** đã có toàn bộ dữ liệu dòng tiền ra/vào.
- Tuy nhiên, Ban quản trị và Chủ trung tâm (Owner / Admin) hiện tại:
  1. **Chưa có Báo cáo Kết quả Kinh doanh (P&L Statement):** Phải tự cộng trừ thủ công giữa các mục để biết trung tâm thực sự đang Lời hay Lỗ bao nhiêu trong tháng/quý.
  2. **Chưa so sánh được hiệu quả giữa các Cơ sở (Venue P&L):** Không rõ cơ sở nào đang là "đầu tàu" sinh lời cao nhất, cơ sở nào đang hoạt động kém hiệu quả hoặc gánh chi phí mặt bằng/lương quá lớn.
  3. **Thiếu trực quan hóa cấu trúc chi phí & tăng trưởng:** Chưa có biểu đồ so sánh doanh thu - chi phí đa chi nhánh, chưa có tỷ lệ phần trăm phân bổ chi phí (Lương HLV chiếm bao nhiêu %, Mặt bằng chiếm bao nhiêu %).
  4. **Chưa có công cụ Xuất Excel P&L chuyên nghiệp:** Không thể xuất bảng báo cáo tài chính phân tầng để nộp cho đối tác, nhà đầu tư hoặc kế toán tổng hợp.

### 1.2 Mục tiêu của Phase 3
1. **Tích hợp Tab chuyên dụng `[Báo Cáo Lãi - Lỗ & Phân Tích]`:** Nằm ngay trong trang Sổ Quỹ (`/finance`), giữ Sidebar tinh gọn và tập trung trọn vẹn nghiệp vụ tài chính tại một nơi.
2. **Dynamic P&L Matrix Engine:** Tự động tổng hợp số liệu từ `finance_transactions` thành bảng P&L phân tầng chuẩn kế toán quản trị:
   - **Doanh thu thuần (Revenue):** Học phí, Sản phẩm & Dụng cụ, Sự kiện & Khác.
   - **Chi phí vận hành (Operating Expenses):** Lương HLV & Nhân sự, Mặt bằng & Điện nước, Mua sắm dụng cụ, Marketing & Quản lý.
   - **Lợi nhuận ròng (Net Profit):** $Doanh\ thu - Chi\ phí$.
   - **Biên lợi nhuận ròng (Net Profit Margin %):** $\frac{Lợi\ nhuận\ ròng}{Doanh\ thu} \times 100\%$.
3. **So sánh Đa Cơ sở (Multi-Venue Breakdown):** Bóc tách doanh thu, chi phí, lợi nhuận cho từng chi nhánh độc lập, đồng thời xử lý các khoản chi phí chung (`venue_id IS NULL`) thành cột riêng biệt "Chung toàn trung tâm" một cách minh bạch.
4. **So sánh Tăng trưởng Kỳ trước (MoM / QoQ Comparison):** Tự động tính toán tỷ lệ tăng/giảm (+/- %) so với kỳ liền trước trên cả 4 thẻ Bento KPI và các dòng báo cáo.
5. **Trực quan hóa Dữ liệu (SVG/CSS Visual Analytics):**
   - Biểu đồ Cột So sánh P&L giữa các Chi nhánh.
   - Biểu đồ Phân bổ Cơ cấu Chi phí theo nhóm cha.
6. **Xuất Excel Chuẩn Kế toán Quản trị (`.xlsx`):** Xuất bảng P&L đa cột chi nhánh, định dạng tiền tệ VND, có công thức tổng cộng rõ ràng.
7. **Hỗ trợ In Báo Cáo Sạch (`@media print`):** Tối ưu in khổ A4 ngang gửi ban lãnh đạo.

---

## 2. KIẾN TRÚC DỮ LIỆU & NGUYÊN TẮC SINGLE-SOURCE OF TRUTH

### 2.1 Không Cần Thêm Migration Database Mới
Nhờ nền tảng vững chắc của Migration `044_finance_categories_and_enhancements.sql` (Phase 1) và Migration `045_tuition_enhancements_and_vietqr.sql` (Phase 2), bảng `finance_transactions` đã chứa đầy đủ:
- `organization_id`: Đảm bảo cô lập đa tổ chức (Multi-Tenant Isolation qua RLS).
- `type`: `income` (Thu) hoặc `expense` (Chi).
- `amount`: Số tiền thực tế phát sinh.
- `date`: Ngày ghi nhận giao dịch (YYYY-MM-DD).
- `venue_id`: Khóa ngoại trỏ về `venues(id)` (`NULL` = Chi phí/doanh thu chung toàn trung tâm).
- `parent_category`: Tên danh mục cấp 1 (Nhóm cha).
- `sub_category`: Tên danh mục cấp 2 (Hạng mục con chi tiết).
- `source_type`: `MANUAL`, `TUITION_PAYMENT` (học phí tự động), `PAYROLL_PAYMENT` (lương HLV tự động).
- `payment_method`: `cash` (Tiền mặt), `bank_transfer` (Chuyển khoản).

$\rightarrow$ **Quyết định kiến trúc:** Sử dụng bảng `finance_transactions` làm **Single Source of Truth** tuyệt đối. Không thêm bảng snapshot hay RPC phức tạp, giúp loại bỏ 100% rủi ro lệch số liệu hoặc xung đột migration.

### 2.2 Quy Tắc Phân Bổ Chi Nhánh & Chi Phí Chung
1. **Chiến lược Fetch Dữ Liệu Toàn Tổ Chức (Organization-Wide Query Scope):**
   - Hook `useFinancialReport` luôn truy vấn toàn bộ giao dịch của tổ chức trong cả Kỳ hiện tại và Kỳ đối chiếu (Previous Period).
   - Danh sách chi nhánh luôn được nạp đầy đủ từ bảng `venues` (kể cả cơ sở chưa phát sinh giao dịch trong kỳ, giá trị sẽ là 0) để đảm bảo cấu trúc cột trên Bảng So Sánh và Biểu Đồ luôn ổn định 100%, không bị co giật (layout shift) khi đổi ngày.
   - Fallback giao dịch cũ: Đối với các giao dịch lịch sử chưa có `parent_category` hoặc `sub_category`, hệ thống tự động fallback lấy giá trị từ cột `category` cũ hoặc gán vào nhóm "Khác" để bảo đảm 100% dòng tiền đều được hạch toán vào P&L.
2. **Khi xem Toàn trung tâm (`selectedVenueId = 'ALL'`):**
   - Lưới 4 Thẻ Bento KPI hiển thị toàn bộ chỉ số tổng hợp của trung tâm (bao gồm tất cả cơ sở và các khoản thu/chi chung).
   - Biểu đồ và Bảng so sánh hiển thị đầy đủ các cột của từng cơ sở, cột "Chung toàn trung tâm" và cột "Tổng cộng".
3. **Khi lọc xem riêng Cơ sở X (`selectedVenueId = 'uuid_x'`):**
   - Lưới 4 Thẻ Bento KPI tự động cập nhật hiển thị số liệu riêng của Cơ sở X (Doanh thu, Chi phí, Lợi nhuận ròng, Tỷ suất lợi nhuận và các chỉ số so sánh % tăng trưởng MoM/QoQ riêng của Cơ sở X).
   - Bảng ma trận P&L và Biểu đồ so sánh vẫn giữ trọn vẹn dữ liệu đa cơ sở nhưng tự động highlight nổi bật cột Cơ sở X (hoặc cung cấp nút toggle "Chỉ xem cơ sở đã chọn" / "Xem so sánh tất cả").
   - Tuân thủ nguyên tắc người dùng lựa chọn: Giữ nguyên tuyệt đối, không tự ý phân bổ chia đều chi phí chung vào cơ sở để phản ánh trung thực nhất số liệu thực tế phát sinh tại cơ sở đó.
4. **Trên Bảng So Sánh Đa Chi Nhánh (Venue Comparison Matrix):**
   - Các cột bao gồm: `[ Danh mục ]` | `[ Cơ sở 1 ]` | `[ Cơ sở 2 ]` | ... | `[ Chung toàn trung tâm ]` | `[ Tổng cộng ]`.
   - Cột "Chung toàn trung tâm" tập hợp tất cả các dòng giao dịch có `venue_id IS NULL`.

---

## 3. THIẾT KẾ DATA ENGINE: `useFinancialReport` HOOK & TYPES

### 3.1 Type Definitions (`types/financeReport.ts`)

```typescript
export interface FinancialReportFilters {
  preset: TimeRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  venueId?: string; // 'ALL' or specific venue UUID
}

export interface PnLSubCategoryItem {
  name: string;
  total: number;
  byVenue: Record<string, number>; // venueId or 'SHARED' -> amount
  prevTotal: number;
  growthRate: number | null; // % delta MoM/QoQ
}

export interface PnLCategoryGroup {
  parentCategory: string;
  total: number;
  byVenue: Record<string, number>;
  prevTotal: number;
  growthRate: number | null;
  items: PnLSubCategoryItem[];
}

export interface VenuePnlSummary {
  venueId: string;
  venueName: string;
  // Kỳ hiện tại
  revenue: number;
  expense: number;
  netProfit: number;
  profitMargin: number; // percentage
  revenueContribution: number; // % of total revenue
  // Kỳ đối chiếu (Previous Period)
  prevRevenue: number;
  prevExpense: number;
  prevNetProfit: number;
  prevProfitMargin: number;
  // Tỷ lệ tăng trưởng riêng của cơ sở
  revenueGrowthRate: number | null;
  expenseGrowthRate: number | null;
  profitGrowthRate: number | null;
}

export interface FinancialReportData {
  currentPeriod: { startDate: string; endDate: string };
  previousPeriod: { startDate: string; endDate: string };
  
  // Tổng hợp chỉ số toàn hệ thống
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
  profitMargin: number;
  
  // So sánh tăng trưởng với kỳ trước
  prevRevenue: number;
  prevExpense: number;
  prevNetProfit: number;
  prevProfitMargin: number;
  revenueGrowthRate: number | null;
  expenseGrowthRate: number | null;
  profitGrowthRate: number | null;

  // Ma trận P&L phân tầng
  revenueGroups: PnLCategoryGroup[];
  expenseGroups: PnLCategoryGroup[];
  
  // Bóc tách theo từng chi nhánh & Chung toàn trung tâm
  venueSummaries: VenuePnlSummary[];
  sharedSummary: VenuePnlSummary; // Đồng nhất type với venueId: 'SHARED', venueName: 'Chung toàn trung tâm'
  
  // Phân bổ cơ cấu chi phí (% từng nhóm cha)
  expenseStructure: {
    category: string;
    amount: number;
    percentage: number;
  }[];
}
```

### 3.2 Thuật Toán Xác Định Kỳ Đối Chiếu & Tính Toán Tăng Trưởng (MoM / QoQ Engine)
Trong hook `useFinancialReport(organizationId: string | undefined, filters: FinancialReportFilters)`:
- **Chuẩn hóa bộ lọc thời gian:** Tái sử dụng `TimeRangePreset` từ `@/types/finance` gồm: `'today' | 'this_week' | 'this_month' | 'last_month' | 'this_quarter' | 'this_year' | 'custom'`, kèm `customStartDate`, `customEndDate`.
- **Hàm `calculatePeriodRanges(preset, customStart, customEnd)`:**
  - Nếu `this_month` (ví dụ: `2026-10-01` đến `2026-10-31`):
    - `currentPeriod`: Tháng này (10/2026).
    - `previousPeriod`: Tháng trước (01/09/2026 đến 30/09/2026).
  - Nếu `this_quarter` (ví dụ Quý 3: 01/07 đến 30/09):
    - `previousPeriod`: Quý 2 (01/04 đến 30/06).
  - Nếu `this_year` (2026):
    - `previousPeriod`: Năm trước (2025).
  - Nếu `custom` (khoảng cách $D$ ngày):
    - `previousPeriod`: Khoảng thời gian $D$ ngày liền trước `customStartDate`.
- **Hàm tính Tỷ lệ Tăng trưởng Chống Lỗi Chia Cho 0 Tuyệt Đối (`calculateGrowthRate`):**
  Xử lý triệt để mọi trường hợp $prev = 0$ (kể cả khi $current < 0$) để không bao giờ xảy ra phép chia cho 0:
  $$\Delta \% = \begin{cases} 
  \text{null} & \text{khi } prev = 0 \text{ và } current = 0 \\
  +100\% & \text{khi } prev = 0 \text{ và } current > 0 \\
  -100\% & \text{khi } prev = 0 \text{ và } current < 0 \\
  -100\% & \text{khi } prev > 0 \text{ và } current = 0 \\
  \frac{current - prev}{|prev|} \times 100\% & \text{khi } prev \neq 0
  \end{cases}$$
  Thuật toán này đảm bảo an toàn toán học 100%, trả về số hữu hạn hoặc `null` và không bao giờ xuất hiện `NaN`, `Infinity` hay `-Infinity` trên giao diện người dùng.

---

## 4. THIẾT KẾ GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

Tuân thủ nghiêm ngặt **Hiến Pháp Dự Án (CONSTITUTION.md v1.9.1)** và **Vibrant Athletic & Martial Arts Design System**:
- Màu sắc chủ đạo: Electric Teal `#14B8A6`, Cam San Hô `#FF6B35`, Emerald `#10B981`, Deep Obsidian `#090A0F`.
- Font chữ: Inter & Material Icons Round (`.material-icons-round`).
- Bo góc: Thẻ Bento `20px - 28px`, Pill buttons `9999px`.
- CSS Modules thuần: `FinanceReports.module.css`.

### 4.1 Thanh Chuyển Đổi Tab Chính (`FinanceClient.tsx`)
Bổ sung thanh điều hướng Sub-Nav 2 tab ở đầu trang Sổ quỹ:
```tsx
<div className={styles.tabNav}>
  <button 
    className={`${styles.tabBtn} ${activeTab === 'transactions' ? styles.activeTabBtn : ''}`}
    onClick={() => setActiveTab('transactions')}
  >
    <span className="material-icons-round">receipt_long</span>
    Sổ Quỹ Giao Dịch
  </button>
  <button 
    className={`${styles.tabBtn} ${activeTab === 'reports' ? styles.activeTabBtn : ''}`}
    onClick={() => setActiveTab('reports')}
  >
    <span className="material-icons-round">analytics</span>
    Báo Cáo Lãi - Lỗ & Phân Tích (P&L)
  </button>
</div>
```

### 4.2 Thanh Công Cụ & Bộ Lọc (`FinanceReportFiltersBar.tsx`)
- **Dải chọn thời gian chuẩn kế toán:** Hôm nay, Tuần này, Tháng này (mặc định), Tháng trước, Quý này, Năm nay, Tùy chọn ngày.
- **Dropdown chọn Cơ sở:** [ Tất cả cơ sở ] hoặc chọn riêng từng chi nhánh.
- **Nút tác vụ nhanh:**
  - `[ In báo cáo ]` (icon `print`, gọi `window.print()` với print isolation).
  - `[ Xuất Excel P&L ]` (icon `download` / `table_view`, gradient cam san hô).

### 4.3 Lưới 4 Thẻ Bento KPI (`FinanceReportKpiGrid.tsx`)
1. **Doanh Thu Thuần (Net Revenue):**
   - Số tiền lớn, icon `trending_up` vòng tròn Teal.
   - Badge tăng trưởng: `+15.4% so với kỳ trước` (xanh nếu tăng, đỏ nếu giảm).
   - Watermark chìm `payments`.
2. **Tổng Chi Phí Vận Hành (Operating Expenses):**
   - Số tiền lớn, icon `account_balance_wallet` vòng tròn Cam San Hô.
   - Badge biến động: `+3.8% so với kỳ trước`.
   - Watermark chìm `receipt`.
3. **Lợi Nhuận Ròng (Net Profit):**
   - Số tiền lớn (màu Teal nếu lãi $> 0$, màu Đỏ/Cam nếu lỗ $< 0$).
   - Icon `monetization_on`.
   - Badge biến động: `+28.5% so với kỳ trước`.
   - Watermark chìm `insights`.
4. **Tỷ Suất Lợi Nhuận & Cơ Sở Xuất Sắc (Margin & Top Venue):**
   - Tỷ lệ % lợi nhuận (VD: `38.2%`).
   - Icon `emoji_events` hoặc `stars`.
   - Capsule phụ: `🏆 CC Riverside dẫn đầu (42.5%)`.
   - Watermark chìm `military_tech`.

### 4.4 Khối Biểu Đồ Trực Quan (`FinanceReportCharts.tsx`)
Dựng bằng SVG và Flexbox thuần, đảm bảo render tức thì và siêu nhẹ:
1. **Biểu đồ Cột So Sánh P&L Giữa Các Cơ Sở (Venue Comparison Bar Chart):**
   - Hiển thị từng cụm cột cho mỗi chi nhánh: Cột Doanh thu (Teal), Cột Chi phí (Coral), Cột Lợi nhuận (Emerald/Slate).
   - Có tooltip hiển thị số tiền chính xác khi hover.
2. **Biểu đồ Phân Bổ Cơ Cấu Chi Phí (Cost Structure Breakdown):**
   - Thanh phân bổ tỷ trọng phần trăm (Stacked Horizontal Bar): Lương HLV (52%), Mặt bằng (24%), Điện nước (8%), Dụng cụ (10%), Khác (6%).
   - Danh sách chú giải kèm số tiền thực tế và tỷ lệ %.

### 4.5 Bảng P&L Phân Tầng Chuẩn Kế Toán Quản Trị (`FinanceReportTable.tsx`)
Bảng ma trận đa cột:
- **Hàng:**
  - **I. DOANH THU THUẦN (REVENUES)**
    - *Học phí võ sinh*
    - *Bán võ phục & dụng cụ*
    - *Sự kiện & Khác*
    - **Tổng Doanh Thu** (Hàng in đậm, nền nhẹ)
  - **II. CHI PHÍ VẬN HÀNH (OPERATING EXPENSES)**
    - *Lương HLV & Trợ giảng*
    - *Mặt bằng & Cơ sở vật chất*
    - *Nhập hàng & Trang thiết bị*
    - *Marketing & Quản lý*
    - **Tổng Chi Phí** (Hàng in đậm, nền nhẹ)
  - **III. LỢI NHUẬN RÒNG (NET PROFIT = I - II)** (Hàng nổi bật màu Teal/Coral, font 1.1rem)
  - **IV. TỶ SUẤT LỢI NHUẬN (%)** (Tỷ lệ Net Margin)
- **Cột:**
  - `Hạng Mục`: Cây danh mục 2 cấp có nút gập/mở (Accordion Toggle) để xem chi tiết hoặc thu gọn.
  - Cột cho từng Cơ sở (Cơ sở 1, Cơ sở 2...).
  - Cột `Chung toàn trung tâm` (cho các chi phí/doanh thu `venue_id = NULL`).
  - Cột `Tổng cộng` (Toàn hệ thống).
  - Cột `Tỷ trọng %` (% of Revenue).
  - Cột `So với kỳ trước` (Biến động % MoM/QoQ).

### 4.6 Xuất File Excel Chuẩn Kế Toán (`utils/exportPnLExcel.ts`)
Sử dụng thư viện `xlsx` (đã có sẵn trong dự án):
- Header: Tên trung tâm, Tiêu đề Báo Cáo Kết Quả Kinh Doanh (P&L), Kỳ báo cáo (Từ ngày ... đến ngày ...).
- Bảng dữ liệu: Đầy đủ các cột cơ sở, định dạng số có dấu phẩy ngăn hàng nghìn (`#,##0 đ`).
- Hàng tổng kết: Lợi nhuận ròng, Biên lợi nhuận %.
- File name tự động: `Bao_Cao_Lai_Lo_Yoogi_[Tu_Ngay]_[Den_Ngay].xlsx`.

---

## 5. CẤU TRÚC TỆP TIN & PHÂN CHIA MODULES

```
app/(dashboard)/finance/
├── FinanceClient.tsx                   # Nâng cấp: Sub-nav tabs [Sổ Quỹ] | [Báo Cáo P&L]
├── FinanceReportsClient.tsx             # Trang Báo cáo P&L chính (Container)
├── components/
│   ├── FinanceReportFiltersBar.tsx     # Bộ lọc thời gian, cơ sở, nút in & xuất Excel
│   ├── FinanceReportKpiGrid.tsx        # 4 Thẻ Bento KPI kèm % tăng trưởng kỳ trước
│   ├── FinanceReportCharts.tsx         # 2 Biểu đồ cột so sánh cơ sở & cơ cấu chi phí
│   └── FinanceReportTable.tsx          # Bảng ma trận P&L phân tầng chi tiết
types/
└── financeReport.ts                    # Type definitions cho P&L và ma trận cơ sở
hooks/
└── useFinancialReport.ts               # Custom React Query hook tổng hợp số liệu P&L
utils/
└── exportPnLExcel.ts                   # Hàm xuất file Excel chuyên nghiệp
app/styles/
└── FinanceReports.module.css           # Styling chuẩn Vibrant Athletic cho phân hệ báo cáo
```

---

## 6. KẾ HOẠCH KIỂM THỬ & TIÊU CHÍ HOÀN THÀNH (Testing & Acceptance Criteria)

### 6.1 Tiêu chí Kiểm Thử Nghiệp Vụ
1. **Tính chính xác của công thức:**
   - $Net\ Profit = Total\ Revenue - Total\ Expense$.
   - Khi lọc theo Chi nhánh A, tổng doanh thu và chi phí phải khớp 100% với danh sách giao dịch có `venue_id = A` trên tab Sổ quỹ.
   - Khi chọn "Tất cả cơ sở", tổng cộng phải bao gồm cả các giao dịch chung `venue_id IS NULL`.
2. **So sánh Kỳ trước (MoM/QoQ):**
   - Khi chuyển sang "Tháng này" (10/2026), kỳ đối chiếu phải là đúng tháng 9/2026.
   - Tỷ lệ % delta không bị lỗi chia cho 0 khi kỳ trước có doanh thu/chi phí = 0.
3. **Hiển thị Biểu đồ:**
   - Biểu đồ cột hiển thị đúng tỷ lệ tương quan giữa các cơ sở.
   - Cơ cấu chi phí hiển thị đúng tỷ trọng % của từng nhóm danh mục.
4. **Xuất Excel & In:**
   - Bấm `[ Xuất Excel ]` tải về file `.xlsx` mở được bằng Microsoft Excel / Google Sheets, không bị lỗi font Tiếng Việt, số liệu chuẩn xác.
   - Bấm `[ In báo cáo ]` kích hoạt hộp thoại in ấn gọn gàng, ẩn sidebar và thanh tác vụ.
5. **Kiểm tra tương thích & Build:**
   - Lệnh `cmd /c "npm run build"` phải biên dịch thành công 35/35 routes với 0 lỗi TypeScript hoặc CSS Module.

---

## 7. QUY TRÌNH ĐÓNG GÓI & DEPLOY (Hiến Pháp & GEMINI.md)
1. Cập nhật `CONSTITUTION.md` lên phiên bản **1.9.2** ghi nhận kiến trúc P&L Engine & Financial Analytics.
2. Tự động commit và push toàn bộ lên GitHub `origin/main` để kích hoạt Vercel Production Deployment.

