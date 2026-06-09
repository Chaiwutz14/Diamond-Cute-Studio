/* Diamond Cute Studio — Theme Init (load before CSS render) */
(function(){
  var t = localStorage.getItem('dmc_theme') || 'sky';
  document.documentElement.setAttribute('data-theme', t);
})();
