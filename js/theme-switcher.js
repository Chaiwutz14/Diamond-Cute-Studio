/* Diamond Cute Studio — Theme Switcher (injects into navbar) */
(function(){
  'use strict';
  var THEMES = [
    {id:'sky',      label:'Sky Fresh',    swatch:'linear-gradient(135deg,#0EA5E9,#38BDF8)'},
    {id:'sakura',   label:'Sakura Pink',  swatch:'linear-gradient(135deg,#EC4899,#F472B6)'},
    {id:'mint',     label:'Forest Mint',  swatch:'linear-gradient(135deg,#10B981,#34D399)'},
    {id:'peach',    label:'Sunset Peach', swatch:'linear-gradient(135deg,#F97316,#FB923C)'},
    {id:'lavender', label:'Lavender',     swatch:'linear-gradient(135deg,#8B5CF6,#A78BFA)'},
    {id:'midnight', label:'Midnight',     swatch:'linear-gradient(135deg,#111827,#38BDF8)'},
  ];

  function current(){ return localStorage.getItem('dmc_theme')||'sky'; }

  function apply(id){
    document.documentElement.setAttribute('data-theme', id);
    localStorage.setItem('dmc_theme', id);
    document.querySelectorAll('.ts-option').forEach(function(o){
      o.classList.toggle('active', o.dataset.theme === id);
    });
  }

  function inject(){
    var actions = document.querySelector('.nav-actions');
    if (!actions || document.querySelector('.nav-theme-wrap')) return;

    var cur = current();
    var opts = THEMES.map(function(t){
      return '<button class="ts-option'+(t.id===cur?' active':'')+'" data-theme="'+t.id+'" title="'+t.label+'">'
        +'<span class="ts-swatch" style="background:'+t.swatch+'"></span>'
        +'<span>'+t.label+'</span>'
        +'</button>';
    }).join('');

    var wrap = document.createElement('div');
    wrap.className = 'nav-theme-wrap';
    wrap.innerHTML =
      '<button class="nav-icon-btn ts-btn" id="ts-btn" title="เปลี่ยนธีม" aria-label="Theme">🎨</button>'
      +'<div class="ts-panel" id="ts-panel">'
      +'<div class="ts-title">🎨 เลือกธีม</div>'
      +opts
      +'</div>';

    var cartBtn = actions.querySelector('a[href="cart.html"]');
    actions.insertBefore(wrap, cartBtn || null);

    var btn   = document.getElementById('ts-btn');
    var panel = document.getElementById('ts-panel');

    btn.addEventListener('click', function(e){
      e.stopPropagation();
      panel.classList.toggle('open');
    });

    document.addEventListener('click', function(e){
      if (!wrap.contains(e.target)) panel.classList.remove('open');
    });

    panel.querySelectorAll('.ts-option').forEach(function(opt){
      opt.addEventListener('click', function(){
        apply(opt.dataset.theme);
        panel.classList.remove('open');
      });
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){ setTimeout(inject, 0); });
  } else {
    setTimeout(inject, 0);
  }
})();
