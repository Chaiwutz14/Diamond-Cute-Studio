/* Accessible custom select enhancement. The native select remains the source of truth. */
(function () {
  'use strict';

  var nextId = 0;
  var mobileQuery = window.matchMedia('(max-width:760px)');

  function injectCSS() {
    if (document.getElementById('dcs-cs-style')) return;
    var css = ''
      + '.cs-wrap{position:relative;width:100%;min-width:0}'
      + '.cs-trigger{width:100%;min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:.5rem;'
      + 'padding:.65rem .9rem;border:1.5px solid var(--border);border-radius:var(--r-md,10px);'
      + 'background:var(--bg-card,#fff);color:var(--text-1);font:inherit;cursor:pointer;text-align:left;transition:border-color .15s}'
      + '.cs-trigger:hover,.cs-trigger[aria-expanded="true"]{border-color:var(--accent)}'
      + '.cs-trigger:focus-visible,.cs-opt:focus-visible,.cs-sheet-close:focus-visible{outline:3px solid rgba(22,137,210,.42);outline-offset:2px;z-index:1}'
      + '.cs-trigger:disabled{opacity:.55;cursor:not-allowed}'
      + '.cs-trigger-label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
      + '.cs-caret{font-size:.75rem;color:var(--text-3);flex-shrink:0;transition:transform .2s}'
      + '.cs-trigger[aria-expanded="true"] .cs-caret{transform:rotate(180deg)}'
      + '.cs-panel{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:9500;'
      + 'background:var(--bg-card,#fff);border:1.5px solid var(--border);border-radius:var(--r-md,10px);'
      + 'box-shadow:0 10px 30px rgba(0,0,0,.14);max-height:300px;overflow-y:auto;padding:.3rem;'
      + 'opacity:0;transform:translateY(-6px);pointer-events:none;transition:opacity .15s,transform .15s}'
      + '.cs-panel.cs-show{opacity:1;transform:translateY(0);pointer-events:auto}'
      + '.cs-opt{display:flex;align-items:center;gap:.5rem;min-height:44px;padding:.55rem .75rem;border-radius:var(--r-sm,7px);'
      + 'cursor:pointer;font-size:.95rem;color:var(--text-1);transition:background .12s}'
      + '.cs-opt:hover,.cs-opt:focus{background:var(--bg-mid,rgba(125,125,125,.08));outline:none}'
      + '.cs-opt.cs-sel{background:var(--accent);color:#fff}'
      + '.cs-opt[aria-disabled="true"]{opacity:.5;cursor:not-allowed}'
      + '.cs-opt-check{margin-left:auto;font-size:.9rem;opacity:0}'
      + '.cs-opt.cs-sel .cs-opt-check{opacity:1}'
      + '.cs-backdrop{position:fixed;inset:0;z-index:9600;background:rgba(0,0,0,.45);opacity:0;transition:opacity .2s;display:none}'
      + '.cs-backdrop.cs-show{display:block;opacity:1}'
      + '.cs-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9601;background:var(--bg-card,#fff);'
      + 'border-radius:18px 18px 0 0;max-height:78vh;overflow-y:auto;padding:.5rem .75rem calc(.75rem + env(safe-area-inset-bottom,0px));'
      + 'transform:translateY(100%);transition:transform .26s cubic-bezier(.2,.9,.3,1);box-shadow:0 -8px 30px rgba(0,0,0,.2)}'
      + '.cs-sheet.cs-show{transform:translateY(0)}'
      + '.cs-sheet-head{display:flex;align-items:center;justify-content:space-between;gap:.5rem;border-bottom:1px solid var(--border);margin-bottom:.4rem}'
      + '.cs-sheet-title{flex:1;text-align:center;font-family:var(--font-display,inherit);font-weight:700;font-size:1rem;color:var(--text-1);padding:.65rem .25rem}'
      + '.cs-sheet-close{width:44px;height:44px;flex:0 0 44px;border:0;border-radius:50%;background:transparent;color:var(--text-2);font-size:1.4rem;cursor:pointer}'
      + '.cs-sheet .cs-opt{min-height:48px;padding:.7rem .85rem;font-size:1rem}'
      + '.cs-sheet .cs-opt.cs-sel{border-radius:var(--r-md,10px)}'
      + '@media(max-width:760px){.cs-trigger{min-height:48px}.cs-panel{display:none}}'
      + '@media(prefers-reduced-motion:reduce){.cs-trigger,.cs-caret,.cs-panel,.cs-backdrop,.cs-sheet,.cs-opt{transition:none!important}}';
    var style = document.createElement('style');
    style.id = 'dcs-cs-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function makeId() {
    var id;
    do { id = 'dcs-select-list-' + (++nextId); } while (document.getElementById(id));
    return id;
  }

  function getAccessibleName(select) {
    var explicit = select.getAttribute('aria-label') || select.dataset.title;
    if (explicit) return explicit.trim();
    var labels = select.labels;
    if (labels && labels.length) return Array.prototype.map.call(labels, function (label) {
      return label.textContent.trim();
    }).filter(Boolean).join(' ');
    return 'เลือกตัวเลือก';
  }

  function build(select) {
    if (select.dataset.csReady || !select.parentNode) return;
    select.dataset.csReady = '1';

    var wrap = document.createElement('div');
    wrap.className = 'cs-wrap';
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    select.style.display = 'none';
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    var accessibleName = getAccessibleName(select);
    var selectLabels = select.labels ? Array.prototype.slice.call(select.labels) : [];
    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'cs-trigger';
    trigger.id = select.id ? select.id + '-custom' : makeId() + '-trigger';
    trigger.setAttribute('role', 'combobox');
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    var listboxId = makeId();
    trigger.setAttribute('aria-label', accessibleName);
    selectLabels.forEach(function (label) {
      if (select.id && label.htmlFor === select.id) label.htmlFor = trigger.id;
    });

    var label = document.createElement('span');
    label.className = 'cs-trigger-label';
    var caret = document.createElement('span');
    caret.className = 'cs-caret';
    caret.setAttribute('aria-hidden', 'true');
    caret.textContent = '▾';
    trigger.append(label, caret);
    wrap.appendChild(trigger);

    var panel = null;
    var sheet = null;
    var backdrop = null;
    var listbox = null;
    var optionNodes = [];
    var activeIndex = Math.max(0, select.selectedIndex);
    var savedBodyOverflow = '';
    var typeBuffer = '';
    var typeTimer = 0;

    function syncLabel() {
      var selected = select.options[select.selectedIndex];
      label.textContent = selected ? selected.textContent.trim() : '';
      trigger.setAttribute('aria-valuetext', selected ? selected.textContent.trim() : '');
      trigger.disabled = select.disabled;
      trigger.setAttribute('aria-disabled', String(select.disabled));
      optionNodes.forEach(function (node, index) {
        var isSelected = index === select.selectedIndex;
        node.setAttribute('aria-selected', String(isSelected));
        node.classList.toggle('cs-sel', isSelected);
      });
    }

    function isOptionDisabled(option) {
      return !!(option.disabled || (option.parentElement && option.parentElement.tagName === 'OPTGROUP' && option.parentElement.disabled));
    }

    function focusOption(index) {
      var enabled = optionNodes.filter(function (node) { return node.getAttribute('aria-disabled') !== 'true'; });
      if (!enabled.length) return;
      index = Math.max(0, Math.min(index, optionNodes.length - 1));
      var node = optionNodes[index];
      if (!node || node.getAttribute('aria-disabled') === 'true') {
        var direction = index >= activeIndex ? 1 : -1;
        for (var step = 0; step < optionNodes.length; step++) {
          var candidate = optionNodes[(index + step * direction + optionNodes.length) % optionNodes.length];
          if (candidate.getAttribute('aria-disabled') !== 'true') { node = candidate; index = optionNodes.indexOf(candidate); break; }
        }
      }
      if (!node) return;
      activeIndex = index;
      optionNodes.forEach(function (option, i) { option.tabIndex = i === activeIndex ? 0 : -1; });
      node.focus();
      if (node.scrollIntoView) node.scrollIntoView({ block: 'nearest' });
    }

    function close(restoreFocus) {
      if (!panel && !sheet && !backdrop) return;
      trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onOutside, true);
      document.removeEventListener('keydown', onDocumentKeydown, true);
      trigger.removeAttribute('aria-controls');
      if (sheet) {
        sheet.classList.remove('cs-show');
        sheet.remove();
        sheet = null;
        document.body.style.overflow = savedBodyOverflow;
      }
      if (backdrop) { backdrop.remove(); backdrop = null; }
      if (panel) { panel.classList.remove('cs-show'); panel.remove(); panel = null; }
      listbox = null;
      optionNodes = [];
      if (restoreFocus) trigger.focus();
    }

    function choose(index) {
      var option = select.options[index];
      if (!option || isOptionDisabled(option)) return;
      select.selectedIndex = index;
      syncLabel();
      close(true);
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function matchTypeahead(character) {
      typeBuffer += character.toLocaleLowerCase();
      window.clearTimeout(typeTimer);
      typeTimer = window.setTimeout(function () { typeBuffer = ''; }, 700);
      var count = select.options.length;
      for (var offset = 1; offset <= count; offset++) {
        var index = (activeIndex + offset) % count;
        var option = select.options[index];
        if (!isOptionDisabled(option) && option.textContent.trim().toLocaleLowerCase().indexOf(typeBuffer) === 0) {
          focusOption(index);
          return;
        }
      }
    }

    function onListKeydown(event) {
      var key = event.key;
      if (key === 'Escape') { event.preventDefault(); close(true); return; }
      if (key === 'Tab' && sheet) {
        var focusable = [sheet.querySelector('.cs-sheet-close')];
        if (optionNodes[activeIndex] && optionNodes[activeIndex].getAttribute('aria-disabled') !== 'true') {
          focusable.push(optionNodes[activeIndex]);
        }
        var current = focusable.indexOf(document.activeElement);
        var next = event.shiftKey ? current - 1 : current + 1;
        if (next < 0 || next >= focusable.length) {
          event.preventDefault();
          focusable[event.shiftKey ? focusable.length - 1 : 0].focus();
        }
        return;
      }
      if (key === 'ArrowDown' || key === 'ArrowUp') {
        event.preventDefault();
        var direction = key === 'ArrowDown' ? 1 : -1;
        focusOption((activeIndex + direction + optionNodes.length) % optionNodes.length);
      } else if (key === 'Home' || key === 'End') {
        event.preventDefault();
        focusOption(key === 'Home' ? 0 : optionNodes.length - 1);
      } else if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        choose(activeIndex);
      } else if (key && key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
        matchTypeahead(key);
      }
    }

    function addOptions(container) {
      listbox = document.createElement('div');
      listbox.id = listboxId;
      listbox.className = 'cs-listbox';
      listbox.setAttribute('role', 'listbox');
      listbox.setAttribute('aria-label', accessibleName);
      optionNodes = [];
      Array.prototype.forEach.call(select.options, function (option, index) {
        var row = document.createElement('div');
        row.id = listbox.id + '-option-' + index;
        row.className = 'cs-opt' + (index === select.selectedIndex ? ' cs-sel' : '');
        row.setAttribute('role', 'option');
        row.setAttribute('aria-selected', String(index === select.selectedIndex));
        row.setAttribute('aria-disabled', String(isOptionDisabled(option)));
        row.tabIndex = -1;
        var text = document.createElement('span');
        text.textContent = option.textContent.trim();
        var check = document.createElement('span');
        check.className = 'cs-opt-check';
        check.setAttribute('aria-hidden', 'true');
        check.textContent = '✓';
        row.append(text, check);
        row.addEventListener('click', function () { choose(index); });
        row.addEventListener('mousemove', function () { if (!isOptionDisabled(option)) focusOption(index); });
        container.appendChild(row);
        optionNodes.push(row);
      });
      container.appendChild(listbox);
      // Move the rows into the semantic listbox after creation.
      Array.prototype.forEach.call(container.children, function (child) {
        if (child !== listbox) listbox.appendChild(child);
      });
      listbox.addEventListener('keydown', onListKeydown);
    }

    function open() {
      if (select.disabled || panel || sheet) return;
      activeIndex = Math.max(0, select.selectedIndex);
      if (mobileQuery.matches) {
        backdrop = document.createElement('div');
        backdrop.className = 'cs-backdrop cs-show';
        backdrop.setAttribute('aria-hidden', 'true');
        sheet = document.createElement('div');
        sheet.className = 'cs-sheet cs-show';
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        var headingId = makeId() + '-title';
        var head = document.createElement('div');
        head.className = 'cs-sheet-head';
        var title = document.createElement('div');
        title.className = 'cs-sheet-title';
        title.id = headingId;
        title.textContent = accessibleName;
        var closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'cs-sheet-close';
        closeButton.setAttribute('aria-label', 'ปิดรายการตัวเลือก');
        closeButton.textContent = '×';
        closeButton.addEventListener('click', function () { close(true); });
        head.append(title, closeButton);
        sheet.setAttribute('aria-labelledby', headingId);
        var optionsHost = document.createElement('div');
        addOptions(optionsHost);
        sheet.append(head, optionsHost);
        document.body.append(backdrop, sheet);
        savedBodyOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        backdrop.addEventListener('click', function () { close(true); });
      } else {
        panel = document.createElement('div');
        panel.className = 'cs-panel cs-show';
        addOptions(panel);
        wrap.appendChild(panel);
        document.addEventListener('click', onOutside, true);
      }
      trigger.setAttribute('aria-controls', listboxId);
      trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onDocumentKeydown, true);
      focusOption(activeIndex);
    }

    function onOutside(event) {
      if (!wrap.contains(event.target)) close(false);
    }

    function onDocumentKeydown(event) {
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
    }

    trigger.addEventListener('click', function () {
      if (panel || sheet) close(true); else open();
    });
    trigger.addEventListener('keydown', function (event) {
      if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' '].indexOf(event.key) === -1) return;
      event.preventDefault();
      if (!panel && !sheet) {
        open();
        if (event.key === 'Home') focusOption(0);
        if (event.key === 'End') focusOption(optionNodes.length - 1);
      } else if (event.key === 'Escape') close(true);
    });

    syncLabel();
    select.addEventListener('change', syncLabel);
    if (window.MutationObserver) {
      new MutationObserver(syncLabel).observe(select, { childList: true, attributes: true, subtree: true });
    }
  }

  function initAll(root) {
    injectCSS();
    (root || document).querySelectorAll('select[data-custom]').forEach(build);
    startGlobalObserver();
  }

  var observerStarted = false;
  function startGlobalObserver() {
    if (observerStarted || !window.MutationObserver || !document.body) return;
    observerStarted = true;
    new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        Array.prototype.forEach.call(mutation.addedNodes || [], function (node) {
          if (node.nodeType !== 1) return;
          if (node.matches && node.matches('select[data-custom]')) build(node);
          if (node.querySelectorAll) node.querySelectorAll('select[data-custom]').forEach(build);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }

  window.CustomSelect = { init: initAll };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initAll(); });
  else initAll();
})();
