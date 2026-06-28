/* Diamond Cute Studio — admin dashboard page glue (externalized for strict CSP) */
(function(){
  var ov = document.getElementById('modal-overlay');
  ov && ov.addEventListener('click', function(e){ if (e.target === this && typeof closeModal === 'function') closeModal(); });

  var lo2 = document.getElementById('logout-btn-2');
  lo2 && lo2.addEventListener('click', function(){
    if (confirm('ออกจากระบบ?')) { DMC.clearSession(); window.location.href = 'admin-login.html'; }
  });

  var sidebarToggle = document.getElementById('sidebar-toggle');
  var sidebar       = document.getElementById('admin-sidebar');
  var overlay       = document.getElementById('sidebar-overlay');
  if (!sidebarToggle || !sidebar || !overlay) return;

  function showToggle(){ sidebarToggle.style.display = (window.innerWidth <= 900) ? '' : 'none'; }
  showToggle();
  window.addEventListener('resize', showToggle);
  sidebarToggle.addEventListener('click', function(){ sidebar.classList.toggle('open'); overlay.classList.toggle('visible'); });
  overlay.addEventListener('click', function(){ sidebar.classList.remove('open'); overlay.classList.remove('visible'); });
  document.querySelectorAll('.sidebar-item[data-section]').forEach(function(item){
    item.addEventListener('click', function(){
      if (window.innerWidth <= 900) { sidebar.classList.remove('open'); overlay.classList.remove('visible'); }
    });
  });
})();
