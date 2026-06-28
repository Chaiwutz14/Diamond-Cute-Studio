/* Diamond Cute Studio — admin login page glue (externalized for strict CSP) */
(function(){
  var btn   = document.getElementById('toggle-pass');
  var input = document.getElementById('login-password');
  var shown = false;
  btn && btn.addEventListener('click', function(){
    shown = !shown;
    input.type = shown ? 'text' : 'password';
    btn.textContent = shown ? '🙈' : '👁️';
    input.focus();
  });
})();
