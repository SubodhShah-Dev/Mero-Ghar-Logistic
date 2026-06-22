(function () {
  var container = document.getElementById('bookings-list');
  var loadingMsg = document.getElementById('loading-msg');

  function getSession() {
    try {
      var s = JSON.parse(localStorage.getItem('meroGharUser'));
      return s && s.loggedIn ? s : null;
    } catch (e) { return null; }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  }

  function statusPill(status, vendorName) {
    var s = (status || '').toLowerCase();
    if (s === 'approved') {
      var label = vendorName ? 'Approved \u2014 ' + escapeHtml(vendorName) : 'Approved';
      return '<span class="pill pd">' + label + '</span>';
    }
    if (s === 'rejected') return '<span class="pill pc">Rejected</span>';
    if (s === 'completed' || s === 'delivered') return '<span class="pill pCo">' + escapeHtml(status) + '</span>';
    if (s === 'in_transit') return '<span class="pill pt">In Transit</span>';
    return '<span class="pill pNw">' + escapeHtml(status || 'Pending') + '</span>';
  }

  function renderBookings(shipments) {
    if (!shipments || shipments.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:64px 20px;color:var(--dim);font-size:14px">No bookings yet. <a href="/src/pages/user.html" style="color:var(--gold);text-decoration:none">Create your first move</a></div>';
      return;
    }

    container.innerHTML = shipments.map(function (s) {
      var pickup = s.pickup_district || s.pickup_city || 'Pickup';
      var drop = s.drop_district || s.drop_city || 'Drop';
      var date = s.move_date ? s.move_date.split('T')[0] : '\u2014';
      return '<div style="background:var(--dark2);border:1px solid var(--bdim);border-radius:12px;padding:16px;margin-bottom:12px">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">' +
          '<div style="font-weight:700;font-size:13px;color:var(--gold);font-family:var(--mono)">' + escapeHtml(s.booking_id || '#MG-' + s.id) + '</div>' +
          '<div>' + statusPill(s.approval_status, s.vendor_name) + '</div>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:center;margin-bottom:10px">' +
          '<div style="text-align:right">' +
            '<div style="font-size:13px;font-weight:600;color:var(--text)">' + escapeHtml(pickup) + '</div>' +
          '</div>' +
          '<div style="color:var(--dim);font-size:11px">\u2192</div>' +
          '<div>' +
            '<div style="font-size:13px;font-weight:600;color:var(--text)">' + escapeHtml(drop) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;justify-content:space-between;color:var(--dim);font-size:12px;border-top:1px solid var(--bdim);padding-top:10px">' +
          '<span>' + date + '</span>' +
          '<span style="font-weight:600;color:var(--gold)">Rs ' + (s.final_quote || 0).toLocaleString() + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
  }

  function loadBookings() {
    var session = getSession();
    if (!session || !session.email) {
      if (loadingMsg) loadingMsg.textContent = 'Please log in to view your bookings.';
      return;
    }

    fetch(window.API_BASE_URL + '/api/shipment/email/' + encodeURIComponent(session.email), {
      headers: { 'Content-Type': 'application/json' }
    })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.success && data.shipments) {
          renderBookings(data.shipments);
        } else {
          container.innerHTML = '<div style="text-align:center;padding:64px 20px;color:var(--dim);font-size:14px">Could not load bookings.</div>';
        }
      })
      .catch(function () {
        container.innerHTML = '<div style="text-align:center;padding:64px 20px;color:var(--dim);font-size:14px">Network error. Please try again.</div>';
      });
  }

  loadBookings();
})();
