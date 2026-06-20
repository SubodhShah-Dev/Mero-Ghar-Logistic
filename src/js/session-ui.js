(function () {
  function getSession() {
    try { var s = JSON.parse(localStorage.getItem('meroGharUser')); return s && s.loggedIn ? s : null; }
    catch (e) { return null; }
  }

  var ROLE_DASHBOARD = {
    user: '/src/pages/user.html',
    admin: '/src/pages/admin.html',
    vendor: '/src/pages/vendor.html'
  };

  function getDashUrl(session) {
    return ROLE_DASHBOARD[session ? session.role : ''] || '/src/pages/user.html';
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function showLogoutModal(onConfirm) {
    var existing = document.getElementById('mg-logout-modal');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'mg-logout-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;padding:24px';

    var box = document.createElement('div');
    box.style.cssText = 'background:#111d16;border:1px solid rgba(248,192,106,0.18);border-radius:16px;padding:28px 24px 22px;max-width:300px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);text-align:center';

    box.innerHTML =
      '<div style="margin:0 auto 14px;width:48px;height:48px;border-radius:50%;background:rgba(248,192,106,0.12);display:flex;align-items:center;justify-content:center;font-size:22px">\u2753</div>' +
      '<p style="color:#eef2ee;font-size:15px;font-weight:600;margin:0 0 6px">Logout?</p>' +
      '<p style="color:rgba(238,242,238,0.5);font-size:13px;margin:0 0 20px">Are you sure you want to logout?</p>' +
      '<div style="display:flex;gap:10px">' +
        '<button id="mg-logout-cancel" style="flex:1;padding:11px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);background:transparent;color:rgba(238,242,238,0.55);font-size:13px;font-weight:500;cursor:pointer">Cancel</button>' +
        '<button id="mg-logout-confirm" style="flex:1;padding:11px;border-radius:10px;background:#f8c06a;color:#0b1510;font-size:13px;font-weight:700;cursor:pointer">Logout</button>' +
      '</div>';

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    document.getElementById('mg-logout-cancel').addEventListener('click', function () { overlay.remove(); });
    document.getElementById('mg-logout-confirm').addEventListener('click', function () { overlay.remove(); onConfirm(); });
  }

  function doLogout() {
    showLogoutModal(function () {
      localStorage.removeItem('meroGharUser');
      window.location.href = '/index.html';
    });
  }

  function enhanceNav(session) {
    // ── Enhance index.html desktop nav ──
    var loginBtn = document.getElementById('index-login-btn');
    if (loginBtn && session) {
      var a = document.createElement('a');
      a.href = getDashUrl(session);
      a.className = 'bg-saffron-400 hover:bg-saffron-300 text-forest-900 font-bold text-sm px-5 py-2.5 rounded-sm transition-all hover:-translate-y-0.5 shadow-md shadow-saffron-600/20';
      a.textContent = 'Dashboard \u2192';
      loginBtn.parentNode.replaceChild(a, loginBtn);
    }

    // ── Enhance index.html mobile menu ──
    var mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu && session) {
      var bookLink = mobileMenu.querySelector('a[href="/src/pages/login.html"]');
      if (bookLink) {
        var a = document.createElement('a');
        a.href = getDashUrl(session);
        a.className = 'block bg-saffron-400 text-forest-900 font-bold text-sm px-5 py-3 rounded-sm text-center';
        a.textContent = escapeHtml(session.name) + ' \u2014 Dashboard \u2192';
        a.onclick = function () { if (window.toggleMenu) window.toggleMenu(); };
        bookLink.parentNode.replaceChild(a, bookLink);
      }
    }
  }

  function injectTopbar(session) {
    var container = document.getElementById('app-topbar');
    if (!container) return;

    container.innerHTML = '';

    var topbar = document.createElement('div');
    topbar.className = 'app-navbar';
    topbar.innerHTML =
      '<div style="position:sticky;top:0;z-index:999;display:flex;align-items:center;justify-content:space-between;background:#0b1510;border-bottom:1px solid rgba(255,255,255,0.07);padding:0 16px;height:48px;flex-shrink:0">' +
        '<a href="/index.html" style="display:flex;align-items:center;gap:8px;text-decoration:none">' +
          '<span style="width:26px;height:26px;background:#f8c06a;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#0b1510;font-size:12px;font-weight:900;line-height:1">M</span>' +
          '<span style="color:#eef2ee;font-weight:700;font-size:15px">Mero<span style="color:#f8c06a">Ghar</span></span>' +
        '</a>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          (session
            ? '<span style="color:rgba(238,242,238,0.5);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100px">' +
              escapeHtml(session.name) + '</span>' +
              '<button id="topbar-logout-btn" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.07);color:rgba(238,242,238,0.7);font-size:12px;padding:6px 12px;border-radius:6px;cursor:pointer">Logout</button>'
            : '<a href="/src/pages/login.html" style="background:#f8c06a;color:#0b1510;font-weight:700;font-size:12px;padding:6px 14px;border-radius:6px;text-decoration:none">Login</a>'
          ) +
        '</div>' +
      '</div>';

    container.appendChild(topbar);

    var logoutBtn = document.getElementById('topbar-logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', doLogout);
  }

  function applySession() {
    var session = getSession();
    enhanceNav(session);
    injectTopbar(session);
  }

  applySession();

  // Re-apply every time page is shown (handles back-nav in Android WebView and bfcache)
  window.addEventListener('pageshow', applySession);

  // Safety net if DOM loads after script execution
  document.addEventListener('DOMContentLoaded', applySession);
})();
