/* ============================================================
   family-tree.js – Render cây gia phả từ GENEALOGY_DATA (JS variable)
   Tộc Nguyễn Đức – không dùng fetch(), tương thích GitHub Pages
   ============================================================ */

let allMembers = [];
let filteredMembers = [];

function initFamilyTree() {
  const container = document.getElementById('tree-container');
  if (!container) return;

  if (typeof GENEALOGY_DATA === 'undefined') {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div>
      <p>Không tìm thấy dữ liệu gia phả. Kiểm tra lại file data/genealogy-data.js</p></div>`;
    return;
  }

  allMembers = GENEALOGY_DATA.members;
  filteredMembers = [...allMembers];

  populateDoiFilter();
  renderTree(filteredMembers);

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', debounce(handleSearch, 250));
    searchInput.addEventListener('keydown', e => { if(e.key==='Enter') handleSearch(); });
  }
  const doiSelect = document.getElementById('filter-doi');
  if (doiSelect) doiSelect.addEventListener('change', handleSearch);
  const resetBtn = document.getElementById('btn-reset');
  if (resetBtn) resetBtn.addEventListener('click', resetFilters);
}

function populateDoiFilter() {
  const sel = document.getElementById('filter-doi');
  if (!sel) return;
  const dois = [...new Set(allMembers.map(m => m.doi))].sort((a,b) => a-b);
  sel.innerHTML = '<option value="">Tất cả đời</option>' +
    dois.map(d => `<option value="${d}">Đời ${d}</option>`).join('');
}

function renderTree(members) {
  const container = document.getElementById('tree-container');
  if (!container) return;

  if (members.length === 0) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🔍</div><p>Không tìm thấy thành viên nào.</p></div>`;
    updateCount(0); return;
  }

  const byDoi = {};
  members.forEach(m => { (byDoi[m.doi] = byDoi[m.doi] || []).push(m); });
  const dois = Object.keys(byDoi).sort((a,b) => +a - +b);

  let html = '';
  dois.forEach(doi => {
    const gen = byDoi[doi];
    html += `<div class="gen-label">Đời ${doi} <span style="font-weight:normal;opacity:0.7">– ${gen.length} người</span></div>`;
    html += '<div class="gen-row" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:20px;align-items:flex-start;">';
    gen.forEach(m => {
      const isFemale  = m.gender === 'F';
      const isTaovong = m.notes && m.notes.toLowerCase().includes('tảo vong');
      const isDead    = !!(m.death) || isTaovong;
      const gClass    = isFemale ? 'female' : 'male';
      const dClass    = isTaovong ? 'taovong' : (isDead ? 'deceased' : '');
      const icon      = isFemale ? '♀' : '♂';

      // Tên ngắn để hiển thị gọn
      const short = m.name.replace(/^NGUYỄN ĐỨC /,'').replace(/^NGUYỄN THỊ /,'Thị ');
      const birthY = m.birth ? m.birth.split('/').pop().replace(/[^\d]/g,'').slice(-4) : '';
      const deathY = m.death ? m.death.match(/\d{4}/)?.[0] : '';
      const dates  = [birthY, deathY].filter(Boolean).join('–');

      html += `
        <div class="person-node" onclick="showPersonDetail('${m.id}')">
          <div class="person-card ${gClass} ${dClass}" data-id="${m.id}" title="${m.name}${m.tu ? ' ('+m.tu+')' : ''}">
            <span class="pgender-icon">${icon}</span>
            <div class="pname">${short}</div>
            ${dates ? `<div class="pdates">${dates}</div>` : ''}
          </div>
        </div>`;
    });
    html += '</div>';
  });

  container.innerHTML = html;
  updateCount(members.length);
}

function showPersonDetail(id) {
  const m = allMembers.find(x => x.id === id);
  if (!m) return;

  const isFemale   = m.gender === 'F';
  const genderIcon = isFemale ? '👩' : '👨';
  const father     = m.father_id ? allMembers.find(x => x.id === m.father_id) : null;
  const children   = allMembers.filter(x => x.father_id === m.id);

  const rows = [
    ['Họ và tên',   m.name],
    ['Tự / Hiệu',   m.tu],
    ['Đời',         `Đời thứ ${m.doi}`],
    ['Phái / Chi',  [m.phai && `Phái ${m.phai}`, m.chi && `Chi ${m.chi}`].filter(Boolean).join(' · ')],
    ['Giới tính',   isFemale ? 'Nữ (♀)' : 'Nam (♂)'],
    ['Ngày sinh',   m.birth],
    ['Ngày mất',    m.death],
    ['Kỵ âm lịch',  m.ky],
    ['Phần mộ',     m.burial],
    ['Quê quán',    m.hometown],
    ['Thân phụ',    father ? father.name : null],
  ].filter(r => r[1]);

  let spouseHTML = '';
  if (m.spouses && m.spouses.length > 0) {
    spouseHTML = `<div class="modal-section-title">${isFemale ? 'Chồng' : 'Vợ'}</div>`;
    m.spouses.forEach((s, i) => {
      const label = m.spouses.length > 1 ? (i===0 ? ' (Vợ cả)' : ` (Vợ thứ ${i+1})`) : '';
      spouseHTML += `<div class="info-row">
        <span class="info-label">${isFemale?'Chồng':'Bà'}${label}</span>
        <span class="info-value">${s.name||'—'}${s.hometown?`<br><small style="color:#888">${s.hometown}</small>`:''}
        ${s.death?`<br><small style="color:#888">Mất: ${s.death}</small>`:''}</span>
      </div>`;
    });
  }

  let childHTML = '';
  if (children.length > 0) {
    childHTML = `<div class="modal-section-title">Con cái (${children.length} người)</div>`;
    childHTML += children.map(c => `
      <div class="info-row">
        <span class="info-label" style="min-width:28px">${c.gender==='F'?'♀':'♂'}</span>
        <span class="info-value">
          <a href="#" onclick="event.preventDefault();showPersonDetail('${c.id}')">${c.name}</a>
          ${c.birth?`<small style="color:#888"> · ${c.birth}</small>`:''}
          ${c.death?`<small style="color:#c0392b"> · Mất ${c.death}</small>`:''}
        </span>
      </div>`).join('');
  }

  const notesHTML = m.notes ? `
    <div class="modal-section-title">Ghi chú</div>
    <div class="info-row"><span class="info-value" style="color:#555;font-size:0.87em">${m.notes}</span></div>` : '';

  document.getElementById('modal-name').textContent = m.name;
  document.getElementById('modal-gender-icon').textContent = genderIcon;
  document.getElementById('modal-body').innerHTML =
    rows.map(r=>`<div class="info-row"><span class="info-label">${r[0]}</span><span class="info-value">${r[1]}</span></div>`).join('')
    + spouseHTML + childHTML + notesHTML;

  document.getElementById('person-modal').classList.add('open');

  document.querySelectorAll('.person-card').forEach(c => c.classList.remove('highlighted'));
  const card = document.querySelector(`.person-card[data-id="${id}"]`);
  if (card) { card.classList.add('highlighted'); card.scrollIntoView({behavior:'smooth',block:'center'}); }
}

function closeModal() {
  document.getElementById('person-modal').classList.remove('open');
  document.querySelectorAll('.person-card').forEach(c => c.classList.remove('highlighted'));
}

function handleSearch() {
  const q   = (document.getElementById('search-input')?.value || '').trim().toLowerCase();
  const doi = document.getElementById('filter-doi')?.value || '';
  filteredMembers = allMembers.filter(m => {
    const matchDoi  = !doi || String(m.doi) === doi;
    const matchName = !q || m.name.toLowerCase().includes(q) || (m.tu && m.tu.toLowerCase().includes(q));
    return matchDoi && matchName;
  });
  renderTree(filteredMembers);
}

function resetFilters() {
  const s = document.getElementById('search-input'); if(s) s.value='';
  const d = document.getElementById('filter-doi');   if(d) d.value='';
  filteredMembers = [...allMembers];
  renderTree(filteredMembers);
}

function updateCount(n) {
  const el = document.getElementById('tree-count');
  if (el) el.textContent = `Hiển thị ${n} / ${allMembers.length} thành viên`;
}

function debounce(fn, ms) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(()=>fn(...a), ms); };
}
