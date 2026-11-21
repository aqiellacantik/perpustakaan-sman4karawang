// ==========================================
// DATA AWAL & PENYIMPANAN LOCALSTORAGE
// ==========================================
const STORAGE_KEYS = {
  BOOKS: 'sman4_perpus_books',
  VISITORS: 'sman4_perpus_visitors',
  LOANS: 'sman4_perpus_loans'
};

const defaultBooks = [
  { id: 'BK-001', title: 'Matematika Tingkat Lanjut Kelas XI', author: 'Kemendikbudristek', category: 'Buku Pelajaran', stock: 12 },
  { id: 'BK-002', title: 'Bahasa Indonesia: Cerdas Cergas Berbahasa', author: 'Kemendikbudristek', category: 'Buku Pelajaran', stock: 15 },
  { id: 'BK-003', title: 'Sejarah Indonesia Modern 1200–2008', author: 'M.C. Ricklefs', category: 'Ensiklopedia', stock: 6 },
  { id: 'BK-004', title: 'Laskar Pelangi', author: 'Andrea Hirata', category: 'Fiksi & Novel', stock: 8 },
  { id: 'BK-005', title: 'Bumi Manusia', author: 'Pramoedya Ananta Toer', category: 'Fiksi & Novel', stock: 5 },
  { id: 'BK-006', title: 'Biologi SMA/MA Kelas XII', author: 'Erlangga', category: 'Buku Pelajaran', stock: 10 }
];

let books = JSON.parse(localStorage.getItem(STORAGE_KEYS.BOOKS)) || defaultBooks;
let visitors = JSON.parse(localStorage.getItem(STORAGE_KEYS.VISITORS)) || [];
let loans = JSON.parse(localStorage.getItem(STORAGE_KEYS.LOANS)) || [];

function saveData() {
  localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
  localStorage.setItem(STORAGE_KEYS.VISITORS, JSON.stringify(visitors));
  localStorage.setItem(STORAGE_KEYS.LOANS, JSON.stringify(loans));
}

// ==========================================
// UTILITAS NOTIFIKASI & FORMAT TANGGAL
// ==========================================
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3200);
}

function getTodayISO() {
  return new Date().toISOString().split('T')[0];
}

function getDueDateISO(days = 7) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
}

function getCurrentTimestamp() {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }) + ' ' + now.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

// ==========================================
// NAVIGASI TAB
// ==========================================
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `tab-${tabName}`);
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ==========================================
// RENDER DASHBOARD & STATISTIK
// ==========================================
function renderDashboard() {
  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const todayVisitors = visitors.filter(v => v.timestamp.startsWith(todayStr)).length;
  const activeBorrowed = loans.filter(l => l.status === 'Dipinjam').length;
  const returnedCount = loans.filter(l => l.status === 'Dikembalikan').length;
  const totalBookStock = books.reduce((sum, b) => sum + Number(b.stock), 0);

  document.getElementById('stat-visitors').textContent = todayVisitors;
  document.getElementById('stat-borrowed').textContent = activeBorrowed;
  document.getElementById('stat-returned').textContent = returnedCount;
  document.getElementById('stat-books').textContent = totalBookStock;

  const tbody = document.getElementById('recent-loans-body');
  const recent = [...loans].reverse().slice(0, 6);

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada transaksi peminjaman atau pengembalian buku.</td></tr>`;
    return;
  }

  tbody.innerHTML = recent.map(loan => `
    <tr>
      <td>${loan.borrowDate}</td>
      <td>${loan.nis}</td>
      <td><strong>${loan.studentName}</strong></td>
      <td>${loan.studentClass}</td>
      <td>${loan.bookTitle}</td>
      <td>
        <span class="status-badge ${loan.status === 'Dipinjam' ? 'status-borrowed' : 'status-returned'}">
          ${loan.status}
        </span>
      </td>
    </tr>
  `).join('');
}

// ==========================================
// FITUR 1: ABSENSI PENGUNJUNG ONLINE
// ==========================================
document.getElementById('form-visitor').addEventListener('submit', function(e) {
  e.preventDefault();

  const newVisitor = {
    id: Date.now(),
    timestamp: getCurrentTimestamp(),
    nis: document.getElementById('v-nis').value.trim(),
    name: document.getElementById('v-name').value.trim(),
    studentClass: document.getElementById('v-class').value,
    purpose: document.getElementById('v-purpose').value
  };

  visitors.push(newVisitor);
  saveData();
  this.reset();
  renderAll();
  showToast(`✅ Absensi ${newVisitor.name} (${newVisitor.studentClass}) berhasil dicatat!`);
});

function renderVisitors() {
  const keyword = document.getElementById('search-visitor').value.toLowerCase();
  const tbody = document.getElementById('visitors-table-body');

  const filtered = [...visitors].reverse().filter(v =>
    v.name.toLowerCase().includes(keyword) ||
    v.studentClass.toLowerCase().includes(keyword) ||
    v.nis.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Belum ada data pengunjung yang sesuai.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(v => `
    <tr>
      <td>${v.timestamp}</td>
      <td>${v.nis}</td>
      <td><strong>${v.name}</strong></td>
      <td>${v.studentClass}</td>
      <td>${v.purpose}</td>
    </tr>
  `).join('');
}

document.getElementById('search-visitor').addEventListener('input', renderVisitors);

// ==========================================
// FITUR 2: PEMINJAMAN & PENGEMBALIAN BUKU
// ==========================================
function populateBookDropdown() {
  const select = document.getElementById('b-book');
  const availableBooks = books.filter(b => Number(b.stock) > 0);

  if (availableBooks.length === 0) {
    select.innerHTML = `<option value="">-- Semua stok buku sedang habis --</option>`;
    return;
  }

  select.innerHTML = `<option value="">-- Pilih Buku yang Tersedia --</option>` +
    availableBooks.map(b => `<option value="${b.id}">[${b.id}] ${b.title} (Sisa: ${b.stock})</option>`).join('');
}

document.getElementById('form-borrow').addEventListener('submit', function(e) {
  e.preventDefault();

  const bookId = document.getElementById('b-book').value;
  const book = books.find(b => b.id === bookId);

  if (!book || book.stock <= 0) {
    showToast('⚠️ Stok buku tidak tersedia!');
    return;
  }

  const newLoan = {
    id: 'LN-' + Date.now(),
    nis: document.getElementById('b-nis').value.trim(),
    studentName: document.getElementById('b-name').value.trim(),
    studentClass: document.getElementById('b-class').value,
    bookId: book.id,
    bookTitle: book.title,
    borrowDate: document.getElementById('b-date').value,
    dueDate: document.getElementById('b-due').value,
    returnDate: null,
    status: 'Dipinjam'
  };

  // Kurangi stok buku
  book.stock = Number(book.stock) - 1;
  loans.push(newLoan);
  saveData();

  this.reset();
  document.getElementById('b-date').value = getTodayISO();
  document.getElementById('b-due').value = getDueDateISO(7);

  renderAll();
  showToast(`📖 Peminjaman "${book.title}" oleh ${newLoan.studentName} berhasil dicatat!`);
});

function returnBook(loanId) {
  const loan = loans.find(l => l.id === loanId);
  if (!loan || loan.status === 'Dikembalikan') return;

  loan.status = 'Dikembalikan';
  loan.returnDate = getTodayISO();

  // Kembalikan stok buku
  const book = books.find(b => b.id === loan.bookId);
  if (book) {
    book.stock = Number(book.stock) + 1;
  }

  saveData();
  renderAll();
  showToast(`✅ Buku "${loan.bookTitle}" telah dikembalikan oleh ${loan.studentName}.`);
}

function renderLoans() {
  const keyword = document.getElementById('search-loan').value.toLowerCase();
  const statusFilter = document.getElementById('filter-loan-status').value;
  const tbody = document.getElementById('loans-table-body');

  const filtered = [...loans].reverse().filter(l => {
    const matchKeyword =
      l.studentName.toLowerCase().includes(keyword) ||
      l.bookTitle.toLowerCase().includes(keyword) ||
      l.nis.toLowerCase().includes(keyword);
    const matchStatus = statusFilter === 'ALL' || l.status === statusFilter;
    return matchKeyword && matchStatus;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Tidak ada data peminjaman yang ditemukan.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(l => `
    <tr>
      <td>
        <strong>${l.studentName}</strong><br>
        <small style="color: var(--text-muted);">${l.nis} &bull; ${l.studentClass}</small>
      </td>
      <td>${l.bookTitle}</td>
      <td>
        <small>Pinjam: ${l.borrowDate}</small><br>
        <small style="color: var(--purple-600);">Tempo: ${l.dueDate}</small>
      </td>
      <td>
        <span class="status-badge ${l.status === 'Dipinjam' ? 'status-borrowed' : 'status-returned'}">
          ${l.status}
        </span>
      </td>
      <td>
        ${l.status === 'Dipinjam'
          ? `<button class="btn btn-return" onclick="returnBook('${l.id}')">Kembalikan</button>`
          : `<small style="color: var(--text-muted);">Kembali: ${l.returnDate}</small>`
        }
      </td>
    </tr>
  `).join('');
}

document.getElementById('search-loan').addEventListener('input', renderLoans);
document.getElementById('filter-loan-status').addEventListener('change', renderLoans);

// ==========================================
// FITUR 3: KATALOG BUKU
// ==========================================
document.getElementById('form-book').addEventListener('submit', function(e) {
  e.preventDefault();

  const code = document.getElementById('k-code').value.trim().toUpperCase();
  const existing = books.find(b => b.id === code);

  if (existing) {
    existing.stock = Number(existing.stock) + Number(document.getElementById('k-stock').value);
    showToast(`📚 Stok buku "${existing.title}" berhasil ditambahkan!`);
  } else {
    books.push({
      id: code,
      title: document.getElementById('k-title').value.trim(),
      author: document.getElementById('k-author').value.trim(),
      category: document.getElementById('k-category').value,
      stock: Number(document.getElementById('k-stock').value)
    });
    showToast(`📚 Buku baru berhasil ditambahkan ke katalog!`);
  }

  saveData();
  this.reset();
  renderAll();
});

function renderBooks() {
  const keyword = document.getElementById('search-book').value.toLowerCase();
  const tbody = document.getElementById('books-table-body');

  const filtered = books.filter(b =>
    b.title.toLowerCase().includes(keyword) ||
    b.id.toLowerCase().includes(keyword) ||
    b.author.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">Buku tidak ditemukan di katalog.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(b => `
    <tr>
      <td><strong>${b.id}</strong></td>
      <td>
        <strong>${b.title}</strong><br>
        <small style="color: var(--text-muted);">${b.author}</small>
      </td>
      <td>${b.category}</td>
      <td><span class="stock-pill">${b.stock} eks</span></td>
    </tr>
  `).join('');
}

document.getElementById('search-book').addEventListener('input', renderBooks);

// ==========================================
// FITUR 4: EKSPOR LAPORAN KE CSV (EXCEL)
// ==========================================
function exportCSV(type) {
  let csvContent = '';
  let filename = '';

  if (type === 'visitors') {
    if (visitors.length === 0) {
      showToast('⚠️ Data absen pengunjung masih kosong.');
      return;
    }
    csvContent = 'Waktu Kunjungan,NIS/NISN,Nama Siswa,Kelas,Keperluan\n' +
      visitors.map(v => `"${v.timestamp}","${v.nis}","${v.name}","${v.studentClass}","${v.purpose}"`).join('\n');
    filename = `Laporan_Absen_SMAN4_Karawang_${getTodayISO()}.csv`;
  } else {
    if (loans.length === 0) {
      showToast('⚠️ Data peminjaman buku masih kosong.');
      return;
    }
    csvContent = 'ID Transaksi,NIS/NISN,Nama Siswa,Kelas,Judul Buku,Tgl Pinjam,Batas Kembali,Tgl Dikembalikan,Status\n' +
      loans.map(l => `"${l.id}","${l.nis}","${l.studentName}","${l.studentClass}","${l.bookTitle}","${l.borrowDate}","${l.dueDate}","${l.returnDate || '-'}","${l.status}"`).join('\n');
    filename = `Laporan_Sirkulasi_Buku_SMAN4_Karawang_${getTodayISO()}.csv`;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  showToast(`📥 File ${filename} berhasil diunduh!`);
}

// ==========================================
// INISIALISASI SAAT HALAMAN DIBUKA
// ==========================================
function renderAll() {
  renderDashboard();
  renderVisitors();
  populateBookDropdown();
  renderLoans();
  renderBooks();
}

window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('b-date').value = getTodayISO();
  document.getElementById('b-due').value = getDueDateISO(7);
  renderAll();
});