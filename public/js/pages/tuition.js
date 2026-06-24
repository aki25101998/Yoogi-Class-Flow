// Tuition Management Page (Admin)
import { getTuitionPayments, addTuitionPayment, getAllStudents, getClassesV2, addFinanceTransaction } from '../db.js';
import { escapeHtml } from '../utils.js';
import { showModal, closeModal } from '../components/modal.js';
import { showToast } from '../components/toast.js';

let payments = [];
let allStudents = [];
let allClasses = [];

export async function renderTuition(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Quản Lý Học Phí</h1>
        <p class="page-subtitle">Theo dõi và thu học phí học viên</p>
      </div>
      <button class="btn btn-primary" id="btnCollectTuition">
        <span class="material-icons-round">receipt</span>
        Thu học phí
      </button>
    </div>

    <div class="card" style="padding: 0;">
      <div class="table-responsive">
        <table class="table" style="width: 100%;">
          <thead>
            <tr>
              <th>Mã Phiếu</th>
              <th>Ngày Thu</th>
              <th>Học Viên</th>
              <th>Lớp Học</th>
              <th>Gói Cước</th>
              <th>Số Tiền (VND)</th>
              <th>Hình thức</th>
            </tr>
          </thead>
          <tbody id="tuitionTableBody">
            <tr><td colspan="7" style="text-align:center;padding:var(--sp-4);">Đang tải dữ liệu...</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('btnCollectTuition').addEventListener('click', () => showCollectTuitionForm());
  
  await loadData();
}

async function loadData() {
  try {
    const [pays, students, classes] = await Promise.all([
      getTuitionPayments(),
      getAllStudents(),
      getClassesV2()
    ]);
    payments = pays.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));
    allStudents = students;
    allClasses = classes;

    const tbody = document.getElementById('tuitionTableBody');
    if (!tbody) return;

    if (payments.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:var(--sp-4);">Chưa có phiếu thu học phí nào.</td></tr>';
      return;
    }

    const studentMap = {};
    allStudents.forEach(s => studentMap[s.id] = s);
    const classMap = {};
    allClasses.forEach(c => classMap[c.id] = c);

    tbody.innerHTML = payments.map(p => {
      const stu = studentMap[p.studentId];
      const cls = classMap[p.classId];
      return \`
        <tr>
          <td><span class="badge badge-info">\${p.id.substring(0, 6).toUpperCase()}</span></td>
          <td>\${p.paymentDate}</td>
          <td style="font-weight: 500;">\${escapeHtml(stu?.name || 'Không rõ')}</td>
          <td>\${escapeHtml(cls?.name || 'Không rõ')}</td>
          <td>\${p.packageType} tháng</td>
          <td style="color:var(--accent-success);font-weight:600;">\${Number(p.amount).toLocaleString('vi-VN')}</td>
          <td>\${p.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt'}</td>
        </tr>
      \`;
    }).join('');
  } catch (e) {
    showToast({ message: 'Lỗi tải dữ liệu học phí: ' + e.message, type: 'error' });
  }
}

function showCollectTuitionForm() {
  const content = \`
    <div class="form-group">
      <label class="form-label">Ngày thu</label>
      <input type="date" id="tDate" class="form-input" value="\${new Date().toISOString().split('T')[0]}">
    </div>
    <div class="form-group">
      <label class="form-label">Học viên</label>
      <select id="tStudent" class="form-select" required>
        <option value="">-- Chọn học viên --</option>
        \${allStudents.map(s => \`<option value="\${s.id}">\${escapeHtml(s.name)}</option>\`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Lớp học</label>
      <select id="tClass" class="form-select" required>
        <option value="">-- Chọn lớp học --</option>
        \${allClasses.map(c => \`<option value="\${c.id}">\${escapeHtml(c.name)}</option>\`).join('')}
      </select>
    </div>
    <div class="grid grid-cols-2" style="gap:var(--sp-4);">
      <div class="form-group">
        <label class="form-label">Gói cước (Tháng)</label>
        <select id="tPackage" class="form-select">
          <option value="1">1 Tháng</option>
          <option value="3">3 Tháng</option>
          <option value="6">6 Tháng</option>
          <option value="12">12 Tháng</option>
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Hình thức</label>
        <select id="tMethod" class="form-select">
          <option value="transfer">Chuyển khoản</option>
          <option value="cash">Tiền mặt</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Số tiền thu (VND)</label>
      <input type="number" id="tAmount" class="form-input" required placeholder="500000" min="0">
    </div>
  \`;

  showModal({
    title: 'Thu Học Phí',
    content,
    primaryAction: {
      label: 'Lưu',
      handler: async () => {
        const studentId = document.getElementById('tStudent').value;
        const classId = document.getElementById('tClass').value;
        const amount = document.getElementById('tAmount').value;

        if (!studentId || !classId || !amount) {
          return showToast({ message: 'Vui lòng điền đủ thông tin', type: 'error' });
        }

        try {
          const date = document.getElementById('tDate').value;
          const method = document.getElementById('tMethod').value;
          const pkg = Number(document.getElementById('tPackage').value);
          const amt = Number(amount);

          const studentObj = allStudents.find(s => s.id === studentId);
          const studentName = studentObj ? studentObj.name : 'Học viên';
          
          await addTuitionPayment({
            studentId,
            classId,
            paymentDate: date,
            packageType: pkg,
            amount: amt,
            paymentMethod: method,
            notes: ''
          });

          // Auto-sync to finance
          await addFinanceTransaction({
            type: 'income',
            date: date,
            amount: amt,
            categoryId: 'tuition',
            categoryName: 'Thu học phí',
            description: \`Thu học phí \${pkg} tháng của \${studentName}\`,
            recordedBy: 'admin',
            paymentMethod: method
          });

          closeModal();
          showToast({ message: 'Thu học phí thành công', type: 'success' });
          loadData();
        } catch (e) {
          showToast({ message: e.message, type: 'error' });
        }
      }
    }
  });
}
