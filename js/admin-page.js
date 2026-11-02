/* Diamond Cute Studio — admin dashboard page glue (externalized for strict CSP) */
(function(){
  var ov = document.getElementById('modal-overlay');
  ov && ov.addEventListener('click', function(e){ if (e.target === this && typeof closeModal === 'function') closeModal(); });

  var sidebarToggle = document.getElementById('sidebar-toggle');
  var sidebar       = document.getElementById('admin-sidebar');
  var overlay       = document.getElementById('sidebar-overlay');
  if (!sidebarToggle || !sidebar || !overlay) return;
  sidebarToggle.setAttribute('aria-expanded', 'false');

  function setSidebarOpen(open){
    sidebar.classList.toggle('open', open);
    overlay.classList.toggle('visible', open);
    sidebarToggle.setAttribute('aria-expanded', String(open));
  }
  function showToggle(){
    var mobile = window.innerWidth <= 900;
    sidebarToggle.style.display = mobile ? '' : 'none';
    if (!mobile) setSidebarOpen(false);
  }
  showToggle();
  window.addEventListener('resize', showToggle);
  sidebarToggle.addEventListener('click', function(){ setSidebarOpen(!sidebar.classList.contains('open')); });
  overlay.addEventListener('click', function(){ setSidebarOpen(false); });
  document.addEventListener('keydown', function(event){
    if (event.key === 'Escape' && sidebar.classList.contains('open')) {
      setSidebarOpen(false);
      sidebarToggle.focus();
    }
  });
  document.querySelectorAll('.sidebar-item[data-section]').forEach(function(item){
    item.addEventListener('click', function(){
      if (window.innerWidth <= 900) setSidebarOpen(false);
    });
  });
})();
