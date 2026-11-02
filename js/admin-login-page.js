/* Diamond Cute Studio — admin login page glue (externalized for strict CSP) */
(function(){
  var btn   = document.getElementById('toggle-pass');
  var input = document.getElementById('login-password');
  var shown = false;
  btn && btn.addEventListener('click', function(){
    shown = !shown;
    input.type = shown ? 'text' : 'password';
    btn.textContent = shown ? '🙈' : '👁️';
    btn.setAttribute('aria-label', shown ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน');
    btn.setAttribute('aria-pressed', String(shown));
    input.focus();
  });
})();
