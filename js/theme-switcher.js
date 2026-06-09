/* ═══════════════════════════════════════════════
   Diamond Cute Studio — Theme Switcher  (shared)
   Include after navbar renders
═══════════════════════════════════════════════ */
(function(){
  'use strict';

  const THEMES = [
    { id:'sky',      label:'Sky Fresh',     swatch:'linear-gradient(135deg,#0EA5E9,#38BDF8)',   emoji:'☀️' },
    { id:'sakura',   label:'Sakura Pink',   swatch:'linear-gradient(135deg,#EC4899,#F472B6)',   emoji:'🌸' },
    { id:'mint',     label:'Forest Mint',   swatch:'linear-gradient(135deg,#10B981,#34D399)',   emoji:'🌿' },
    { id:'peach',    label:'Sunset Peach',  swatch:'linear-gradient(135deg,#F97316,#FB923C)',   emoji:'🍊' },
    { id:'lavender', label:'Lavender',      swatch:'linear-gradient(135deg,#8B5CF6,#A78BFA)',   emoji:'💜' },
    { id:'midnight', label:'Midnight',      swatch:'linear-gradient(135deg,#111827,#38BDF8)',   emoji:'🌙' },
  ];

  function getTheme(){ return localStorage.getItem('dmc_theme') || 'sky'; }

  function applyTheme(id){
    document.documentElement.setAttribute('data-theme', id);
    localStorage.setItem('dmc_theme', id);
    document.querySelectorAll('.ts-option').forEach(o => {
      o.classList.toggle('active', o.dataset.theme === id);
    });
  }

  function buildPanel(){
    return THEMES.map(t => `
      <button class="ts-option${t.id === getTheme() ? ' active' : ''}" data-theme="${t.id}" title="${t.label}">
        <span class="ts-swatch" style="background:${t.swatch}"></span>
        <span class="ts-label">${t.label}</span>
      </button>
    `).join('');
  }

  function inject(){
    // Insert button into navbar right area (next to LINE button)
    const actions = document.querySelector('.nav-actions');
    if (!actions) return;

    const wrap = document.createElement('div');
    wrap.className = 'nav-theme-wrap';
    wrap.innerHTML = `
      <button class="nav-icon-btn ts-btn" id="ts-btn" title="เปลี่ยนธีม" aria-label="Theme">🎨</button>
      <div class="ts-panel" id="ts-panel" role="menu" aria-hidden="true">
        <div class="ts-title">🎨 เลือกธีม</div>
        ${buildPanel()}
      </div>
    `;

    // Insert before cart icon
    const cartBtn = actions.querySelector('a[href="cart.html"], a[href*="cart"]');
    actions.insertBefore(wrap, cartBtn || actions.firstChild);

    const btn   = document.getElementById('ts-btn');
    const panel = document.getElementById('ts-panel');

    btn.addEventListener('click', e => {
      e.stopPropagation();
      const open = panel.classList.toggle('open');
      panel.setAttribute('aria-hidden', !open);
    });

    document.addEventListener('click', e => {
      if (!wrap.contains(e.target)) {
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
      }
    });

    panel.querySelectorAll('.ts-option').forEach(opt => {
      opt.addEventListener('click', () => {
        applyTheme(opt.dataset.theme);
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
      });
    });
  }

  // Run after navbar renders
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    // navbar.js renders synchronously — wait one tick
    setTimeout(inject, 0);
  }
})();
