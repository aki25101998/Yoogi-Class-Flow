// Finance Management Page (Admin)
import { getFinanceTransactions, addFinanceTransaction, getFinanceCategories } from '../db.js';
import { escapeHtml } from '../utils.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let transactions = [];
let categories = [];

export async function renderFinance(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Sổ Quỹ (Thu / Chi)</h1>
        <p class="page-subtitle">Quản lý dòng tiền của trung tâm</p>
      </div>
      <div style="display:flex;gap:8px;">
        <button class="btn btn-outline" id="btnExport">Xuất Excel</button>
        <button class="btn btn-primary" id="btnAddTransaction">
          <span class="material-icons-round">add</span> Thêm Giao Dịch
        </button>
      </div>
    </div>

    <!-- Summary Widgets -->
    <div class="grid grid-cols-1 md-grid-cols-3" style="gap:var(--sp-4);margin-bottom:var(--sp-6);">
      <div class="card" style="padding:var(--sp-4);display:flex;align-items:center;gap:var(--sp-4);">
        <div class="stat-icon" style="background:rgba(46,204,113,0.15);color:#2ecc71;width:48px;height:48px;flex-shrink:0;">
          <span class="material-icons-round">arrow_downward</span>
        </div>
        <div>
          <div style="color:var(--text-secondary);font-size:0.85rem;font-weight:500;">Tổng Thu</div>
          <div style="font-size:1.4rem;font-weight:700;color:#2ecc71;" id="summaryIncome">0 ₫</div>
        </div>
      </div>
      <div class="card" style="padding:var(--sp-4);display:flex;align-items:center;gap:var(--sp-4);">
        <div class="stat-icon" style="background:rgba(231,76,60,0.15);color:#e74c3c;width:48px;height:48px;flex-shrink:0;">
          <span class="material-icons-round">arrow_upward</span>
        </div>
        <div>
          <div style="color:var(--text-secondary);font-size:0.85rem;font-weight:500;">Tổng Chi</div>
          <div style="font-size:1.4rem;font-weight:700;color:#e74c3c;" id="summaryExpense">0 ₫</div>
        </div>
      </div>
      <div class="card" style="padding:var(--sp-4);display:flex;align-items:center;gap:var(--sp-4);">
        <div class="stat-icon" style="background:rgba(52,152,219,0.15);color:#3498db;width:48px;height:48px;flex-shrink:0;">
          <span class="material-icons-round">account_balance</span>
        </div>
        <div>
          <div style="color:var(--text-secondary);font-size:0.85rem;font-weight:500;">Tồn Quỹ</div>
          <div style="font-size:1.4rem;font-weight:700;color:#3498db;" id="summaryBalance">0 ₫</div>
        </div>
      </div>
    </div>

    <div class="card" style="padding: 0;">
      <div class="table-responsive">
        <table class="table" style="width: 100%;">
          <thead>
            <tr>
              <th>Ngày GD</th>
              <th>Loại</th>
              <th>Danh Mục</th>
              <th>Diễn Giải</th>
              <th>Số Tiền</th>
              <th>Người Phụ Trách</th>
            </tr>
          </thead>
          <tbody id="financeTableBody">
            <tr><td colspan="6" style="text-align:center;padding:var(--sp-4);">Đang tải dữ liệu...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btnAddTransaction').addEventListener('click', () => showTransactionForm());
  
  await loadData();
}

async function loadData() {
  try {
    const [trans, cats] = await Promise.all([
      getFinanceTransactions(),
      getFinanceCategories()
    ]);
    
    transactions = trans.sort((a, b) => new Date(b.date) - new Date(a.date));
    categories = cats;

    let income = 0;
    let expense = 0;

    const tbody = document.getElementById('financeTableBody');
    if (!tbody) return;

    if (transactions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:var(--sp-4);">Chưa có giao dịch nào.</td></tr>';
    } else {
      const catMap = {};
      categories.forEach(c => catMap[c.id] = c);

      tbody.innerHTML = transactions.map(t => {
        if (t.type === 'income') income += Number(t.amount);
        if (t.type === 'expense') expense += Number(t.amount);

        const isIncome = t.type === 'income';
        const color = isIncome ? 'var(--accent-success)' : 'var(--accent-danger)';
        const prefix = isIncome ? '+' : '-';
        const catName = catMap[t.categoryId]?.name || t.categoryName || 'Khác';

        return \`
          <tr>
            <td>\${t.date}</td>
            <td>
              <span class="badge" style="background:\${isIncome ? 'rgba(46,204,113,0.1)' : 'rgba(231,76,60,0.1)'};color:\${color};">
                \${isIncome ? 'THU' : 'CHI'}
              </span>
            </td>
            <td>\${escapeHtml(catName)}</td>
            <td>\${escapeHtml(t.description || '')}</td>
            <td style="color:\${color};font-weight:600;">\${prefix}\${Number(t.amount).toLocaleString('vi-VN')}</td>
            <td>\${escapeHtml(t.recordedBy || 'Admin')}</td>
          </tr>
        \`;
      }).join('');
    }

    // Update summaries
    const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
    document.getElementById('summaryIncome').textContent = formatter.format(income);
    document.getElementById('summaryExpense').textContent = formatter.format(expense);
    document.getElementById('summaryBalance').textContent = formatter.format(income - expense);

  } catch (e) {
    showToast({ message: 'Lỗi tải dữ liệu tài chính: ' + e.message, type: 'error' });
  }
}

function showTransactionForm() {
  const content = \`
    <div class="grid grid-cols-2" style="gap:var(--sp-4);">
      <div class="form-group">
        <label class="form-label">Loại Giao Dịch</label>
        <select id="fType" class="form-select">
          <option value="income">Phiếu Thu</option>
          <option value="expense">Phiếu Chi</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Ngày Giao Dịch</label>
        <input type="date" id="fDate" class="form-input" value="\${new Date().toISOString().split('T')[0]}">
      </div>
    </div>
    
    <div class="form-group">
      <label class="form-label">Số Tiền (VND)</label>
      <input type="number" id="fAmount" class="form-input" required placeholder="100000" min="0">
    </div>

    <div class="form-group">
      <label class="form-label">Danh mục / Tên khoản mục (VD: Tiền điện, Mua võ phục)</label>
      <input type="text" id="fCategoryName" class="form-input" required placeholder="Nhập tên khoản thu/chi">
    </div>

    <div class="form-group">
      <label class="form-label">Diễn giải / Ghi chú</label>
      <input type="text" id="fDesc" class="form-input" placeholder="Chi tiết giao dịch...">
    </div>
  \`;

  showModal({
    title: 'Thêm Giao Dịch Thu/Chi',
    content,
    primaryAction: {
      label: 'Lưu Giao Dịch',
      handler: async () => {
        const type = document.getElementById('fType').value;
        const date = document.getElementById('fDate').value;
        const amount = document.getElementById('fAmount').value;
        const catName = document.getElementById('fCategoryName').value.trim();
        const desc = document.getElementById('fDesc').value.trim();

        if (!amount || !catName) {
          return showToast({ message: 'Vui lòng nhập đủ Số tiền và Danh mục', type: 'error' });
        }

        try {
          await addFinanceTransaction({
            type,
            date,
            amount: Number(amount),
            categoryId: 'custom',
            categoryName: catName,
            description: desc,
            recordedBy: 'admin', // in real app: getCurrentUser()
            paymentMethod: 'cash'
          });
          closeModal();
          showToast({ message: 'Lưu giao dịch thành công', type: 'success' });
          loadData();
        } catch (e) {
          showToast({ message: e.message, type: 'error' });
        }
      }
    }
  });
}
