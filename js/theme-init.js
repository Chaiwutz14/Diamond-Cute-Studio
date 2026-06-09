/* Diamond Cute Studio — Theme Init (runs before CSS) */
(function(){
  var t = localStorage.getItem('dmc_theme') || 'sky';
  document.documentElement.setAttribute('data-theme', t);
})();
