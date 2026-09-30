// UI mock only: all changes are held in memory and reset on reload.
const projects = [
  { id: 'website', name: 'Website công ty', createdAt: '28/09/2026', color: '#eaf2ed', icon: '◈' },
  { id: 'miniflow', name: 'MiniFlow MVP', createdAt: '27/09/2026', color: '#edf0fa', icon: '▧' },
  { id: 'linux', name: 'Linux & Deployment', createdAt: '26/09/2026', color: '#faf0e2', icon: '⌘' },
];
const tasks = [
  { id: 1, projectId: 'website', title: 'Thiết kế trang chủ', description: 'Bố cục đơn giản, thể hiện rõ sản phẩm.', status: 'DONE' },
  { id: 2, projectId: 'website', title: 'Xây dựng trang giới thiệu', description: 'Thông tin về đội ngũ và công ty.', status: 'IN_PROGRESS' },
  { id: 3, projectId: 'website', title: 'Kiểm tra giao diện mobile', description: '', status: 'TODO' },
  { id: 4, projectId: 'miniflow', title: 'Chốt schema database', description: 'User, Project và Task.', status: 'DONE' },
  { id: 5, projectId: 'miniflow', title: 'Xây dựng luồng đăng nhập', description: 'Đăng ký, đăng nhập và kiểm tra quyền.', status: 'IN_PROGRESS' },
  { id: 6, projectId: 'miniflow', title: 'Tạo API cho Project', description: '', status: 'TODO' },
  { id: 7, projectId: 'miniflow', title: 'Kết nối dashboard với API', description: '', status: 'TODO' },
  { id: 8, projectId: 'linux', title: 'Cấu hình Nginx reverse proxy', description: 'Chuyển /api/ đến backend.', status: 'TODO' },
  { id: 9, projectId: 'linux', title: 'Viết Docker Compose', description: '', status: 'TODO' },
];
const labels = { TODO: 'Cần làm', IN_PROGRESS: 'Đang làm', DONE: 'Hoàn thành' };
let filter = 'ALL';
let dialogProjectId = null;
let toastTimer;
const content = document.querySelector('#content');
const dialog = document.querySelector('#create-dialog');
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const projectTasks = (id) => tasks.filter((task) => task.projectId === id);

function stats(items, includeProjects = true) {
  const entries = includeProjects ? [['Tổng Project', projects.length, 'Project trong workspace']] : [['Tổng Task', items.length, 'Task trong project này']];
  entries.push(['Cần làm', items.filter((t) => t.status === 'TODO').length, 'Sẵn sàng bắt đầu'], ['Đang làm', items.filter((t) => t.status === 'IN_PROGRESS').length, 'Đang được thực hiện'], ['Hoàn thành', items.filter((t) => t.status === 'DONE').length, 'Đã hoàn tất']);
  return `<div class="stats">${entries.map(([label, value, hint]) => `<div class="stat"><div class="stat-label">${label}<span>◦</span></div><div class="stat-value">${value}</div><div class="stat-foot">${hint}</div></div>`).join('')}</div>`;
}

function projectCards() {
  return `<div class="project-grid">${projects.map((project) => {
    const items = projectTasks(project.id);
    const done = items.filter((t) => t.status === 'DONE').length;
    const percent = items.length ? Math.round(done / items.length * 100) : 0;
    return `<a class="project-card" href="#projects/${project.id}"><div class="project-icon" style="background:${project.color}">${project.icon}</div><h3>${escapeHtml(project.name)}</h3><p class="muted">${items.length} task trong project</p><div class="progress-info"><span>${done}/${items.length} task hoàn thành</span><span>${percent}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${percent}%"></div></div><div class="project-meta"><span>Tạo ${project.createdAt}</span><span>Xem Project ↗</span></div></a>`;
  }).join('')}</div>`;
}

function taskTable(items, editable = false) {
  if (!items.length) return '<div class="table-panel empty">Chưa có task ở đây.<br>Tạo task mới hoặc chọn trạng thái khác để tiếp tục.</div>';
  return `<div class="table-panel"><table><thead><tr><th>TÊN TASK</th>${editable ? '' : '<th>PROJECT</th>'}<th>TRẠNG THÁI</th></tr></thead><tbody>${items.map((task) => {
    const project = projects.find((p) => p.id === task.projectId);
    const status = editable ? `<select class="status ${task.status.toLowerCase()}" data-task-id="${task.id}" aria-label="Trạng thái ${escapeHtml(task.title)}">${Object.entries(labels).map(([key, label]) => `<option value="${key}" ${task.status === key ? 'selected' : ''}>${label}</option>`).join('')}</select>` : `<span class="badge ${task.status.toLowerCase()}">${labels[task.status]}</span>`;
    return `<tr><td><div class="task-title">${escapeHtml(task.title)}</div>${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}</td>${editable ? '' : `<td><a class="project-link" href="#projects/${project.id}">${escapeHtml(project.name)} ↗</a></td>`}<td>${status}</td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function render() {
  const route = location.hash.slice(1) || 'dashboard';
  const auth = route === 'login' || route === 'register';
  document.querySelector('#auth-view').hidden = !auth;
  document.querySelector('#app-view').hidden = auth;
  if (auth) {
    const register = route === 'register';
    document.querySelector('#auth-title').textContent = register ? 'Bắt đầu với MiniFlow' : 'Chào mừng trở lại';
    document.querySelector('#auth-submit').textContent = register ? 'Tạo tài khoản' : 'Đăng nhập';
    document.querySelector('#auth-question').textContent = register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?';
    document.querySelector('#auth-toggle').textContent = register ? 'Đăng nhập' : 'Đăng ký';
    return;
  }
  document.querySelectorAll('[data-nav]').forEach((link) => link.classList.toggle('active', route.startsWith(link.dataset.nav)));
  document.querySelector('#project-count').textContent = projects.length;
  if (route === 'dashboard') {
    document.querySelector('#breadcrumb').textContent = 'Workspace / Dashboard';
    content.innerHTML = `<div class="page-heading"><div><div class="eyebrow">TỔNG QUAN WORKSPACE</div><h1>Chào bạn, bắt đầu thôi 👋</h1><p class="muted">Mọi project và tiến độ công việc, trong một góc nhìn.</p></div><button class="primary" data-create-project>＋ Tạo Project</button></div>${stats(tasks)}<div class="section-heading"><h2>Project của bạn</h2><a href="#projects">Xem tất cả →</a></div>${projectCards()}<div class="section-heading"><h2>Task cần chú ý</h2><span class="muted">Các task đang làm và cần làm</span></div>${taskTable(tasks.filter((t) => t.status !== 'DONE').slice(0, 5))}`;
  } else if (route === 'projects') {
    document.querySelector('#breadcrumb').textContent = 'Workspace / Projects';
    content.innerHTML = `<div class="page-heading"><div><div class="eyebrow">KHÔNG GIAN LÀM VIỆC</div><h1>Projects</h1><p class="muted">Chia công việc thành những project dễ quản lý.</p></div><button class="primary" data-create-project>＋ Tạo Project</button></div>${projectCards()}`;
  } else {
    const project = projects.find((p) => route === `projects/${p.id}`);
    if (!project) { location.hash = 'dashboard'; return; }
    document.querySelector('#breadcrumb').textContent = `Workspace / Projects / ${project.name}`;
    const items = projectTasks(project.id);
    content.innerHTML = `<a class="back-link" href="#projects">← Tất cả Project</a><div class="page-heading"><div><div class="eyebrow">PROJECT</div><h1>${escapeHtml(project.name)}</h1><p class="muted">Tạo ${project.createdAt} · Bạn là chủ sở hữu</p></div><button class="primary" data-create-task="${project.id}">＋ Tạo Task</button></div>${stats(items, false)}<div class="section-heading"><h2>Danh sách Task</h2><span class="muted">Đổi trạng thái ngay trong bảng</span></div><div class="filters">${[['ALL', 'Tất cả'], ...Object.entries(labels)].map(([key, label]) => `<button class="filter ${filter === key ? 'active' : ''}" data-filter="${key}">${label} <span>${key === 'ALL' ? items.length : items.filter((t) => t.status === key).length}</span></button>`).join('')}</div>${taskTable(items.filter((t) => filter === 'ALL' || t.status === filter), true)}`;
  }
}

function openCreate(projectId = null) {
  dialogProjectId = projectId;
  document.querySelector('#create-form').reset();
  document.querySelector('#dialog-title').textContent = projectId ? 'Tạo Task' : 'Tạo Project';
  document.querySelector('#name-label').firstChild.textContent = projectId ? 'Tên Task' : 'Tên Project';
  document.querySelector('#item-name').placeholder = projectId ? 'Ví dụ: Thiết kế trang đăng nhập' : 'Ví dụ: Website công ty';
  document.querySelector('#description-label').hidden = !projectId;
  dialog.showModal();
}

function notify(message) {
  const toast = document.querySelector('#toast');
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2500);
}

content.addEventListener('click', (event) => {
  if (event.target.closest('[data-create-project]')) openCreate();
  const createTask = event.target.closest('[data-create-task]');
  if (createTask) openCreate(createTask.dataset.createTask);
  const filterButton = event.target.closest('[data-filter]');
  if (filterButton) { filter = filterButton.dataset.filter; render(); }
});
content.addEventListener('change', (event) => {
  if (!event.target.matches('[data-task-id]')) return;
  const task = tasks.find((t) => t.id === Number(event.target.dataset.taskId));
  task.status = event.target.value;
  render();
  notify('Đã cập nhật trạng thái task mẫu');
});
document.querySelector('#create-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.querySelector('#item-name').value.trim();
  if (!name) { document.querySelector('#item-name').focus(); return; }
  if (dialogProjectId) {
    tasks.push({ id: Date.now(), projectId: dialogProjectId, title: name, description: document.querySelector('#item-description').value.trim(), status: 'TODO' });
    filter = 'ALL';
  } else {
    projects.push({ id: `project-${Date.now()}`, name, createdAt: new Date().toLocaleDateString('vi-VN'), color: '#eaf2ed', icon: '◈' });
  }
  dialog.close();
  render();
  notify(dialogProjectId ? 'Đã tạo task mẫu' : 'Đã tạo project mẫu');
});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#auth-toggle').addEventListener('click', () => { location.hash = location.hash === '#register' ? 'login' : 'register'; });
document.querySelector('#auth-form').addEventListener('submit', (event) => { event.preventDefault(); event.target.reset(); location.hash = 'dashboard'; notify('Đang xem workspace mẫu'); });
window.addEventListener('hashchange', () => { filter = 'ALL'; document.querySelector('#auth-form').reset(); render(); });
render();
