const API_BASE_URL = (() => {
  // ── Production (deployed backend on Railway) ──
  const PROD_URL = 'https://backend-production-d51a3.up.railway.app';

  // ── Android auto-detect ──
  if (typeof window.Capacitor !== 'undefined') {
    const platform = window.Capacitor.getPlatform();
    if (platform === 'android') return PROD_URL;
    if (platform === 'ios') return PROD_URL;
  }

  // ── Web browser ──
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }

  // Not localhost → use production URL
  return PROD_URL;
})();

// ── In-App Update Check & Download ──
const APP_VERSION = '1.5.0';
const GITHUB_REPO = 'SubodhShah-Dev/Mero-Ghar-Logistics-Website';

function compareVersions(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

function blobToBase64(blob) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onloadend = function () { resolve(reader.result.split(',')[1]); };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function updateDialogHtml(content) {
  return (
    '<div style="background:#111d16;border:1px solid rgba(248,192,106,0.18);border-radius:16px;padding:28px 24px 22px;max-width:340px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.5);text-align:center">' +
    content +
    '</div>'
  );
}

async function downloadUpdate(downloadUrl, version) {
  var isNative = typeof window.Capacitor !== 'undefined' && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem;
  if (!isNative) {
    window.open(downloadUrl, '_blank');
    return;
  }

  var Filesystem = window.Capacitor.Plugins.Filesystem;
  var Share = window.Capacitor.Plugins.Share;
  var dialog = document.getElementById('update-dialog');
  if (!dialog) return;

  // ── Show progress ──
  if (!document.getElementById('spin-style')) {
    var s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  var inner = dialog.firstElementChild;
  inner.innerHTML = updateDialogHtml(
    '<div style="width:44px;height:44px;border:3px solid rgba(248,192,106,0.15);border-top-color:#f8c06a;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 14px"></div>' +
    '<p style="color:#eef2ee;font-size:15px;font-weight:600;margin:0 0 4px">Downloading Update</p>' +
    '<p id="dl-progress" style="color:rgba(238,242,238,0.5);font-size:13px;margin:0">0%</p>'
  );

  try {
    var response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Download failed (HTTP ' + response.status + ')');

    var total = parseInt(response.headers.get('content-length') || '0', 10);
    var reader = response.body.getReader();
    var chunks = [];
    var received = 0;

    while (true) {
      var result = await reader.read();
      if (result.done) break;
      chunks.push(result.value);
      received += result.value.length;
      if (total > 0) {
        document.getElementById('dl-progress').textContent = Math.round((received / total) * 100) + '%';
      } else {
        document.getElementById('dl-progress').textContent = (received / 1048576).toFixed(1) + ' MB';
      }
    }

    var blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });
    var base64 = await blobToBase64(blob);

    await Filesystem.writeFile({
      path: 'meroghar-update.apk',
      data: base64,
      directory: 'CACHE'
    });

    var uriResult = await Filesystem.getUri({
      path: 'meroghar-update.apk',
      directory: 'CACHE'
    });

    // ── Show install prompt ──
    inner.innerHTML = updateDialogHtml(
      '<div style="width:52px;height:52px;border-radius:50%;background:rgba(76,175,125,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">' +
      '<svg width="26" height="26" fill="none" stroke="#4caf7d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">' +
      '<path d="M5 13l4 4L19 7"/></svg></div>' +
      '<p style="color:#eef2ee;font-size:15px;font-weight:600;margin:0 0 4px">Download Complete</p>' +
      '<p style="color:rgba(238,242,238,0.55);font-size:13px;margin:0 0 18px">Tap below to install version ' +
      version +
      '</p>' +
      '<div style="display:flex;gap:10px">' +
      '<button id="update-later" style="flex:1;padding:11px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);background:transparent;color:rgba(238,242,238,0.55);font-size:13px;font-weight:500;cursor:pointer">Later</button>' +
      '<button id="install-btn" style="flex:1;padding:11px 16px;border-radius:10px;background:#f8c06a;color:#0b1510;font-size:13px;font-weight:700;cursor:pointer">Install Now</button>' +
      '</div>'
    );

    document.getElementById('update-later').onclick = function () { dialog.remove(); };
    document.getElementById('install-btn').onclick = async function () {
      try {
        await Share.share({
          url: uriResult.uri,
          title: 'Install MeroGhar ' + version,
          dialogTitle: 'Install MeroGhar Update'
        });
      } catch (e) { /* user cancelled */ }
      dialog.remove();
    };

  } catch (e) {
    inner.innerHTML = updateDialogHtml(
      '<div style="width:52px;height:52px;border-radius:50%;background:rgba(224,94,94,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">' +
      '<svg width="26" height="26" fill="none" stroke="#e05e5e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">' +
      '<path d="M6 18L18 6M6 6l12 12"/></svg></div>' +
      '<p style="color:#eef2ee;font-size:15px;font-weight:600;margin:0 0 4px">Download Failed</p>' +
      '<p style="color:rgba(238,242,238,0.55);font-size:13px;margin:0 0 18px">' +
      e.message +
      '</p>' +
      '<div style="display:flex;gap:10px">' +
      '<button id="update-later" style="flex:1;padding:11px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);background:transparent;color:rgba(238,242,238,0.55);font-size:13px;font-weight:500;cursor:pointer">Close</button>' +
      '<button id="retry-btn" style="flex:1;padding:11px 16px;border-radius:10px;background:#f8c06a;color:#0b1510;font-size:13px;font-weight:700;cursor:pointer">Retry</button>' +
      '</div>'
    );
    document.getElementById('update-later').onclick = function () { dialog.remove(); };
    document.getElementById('retry-btn').onclick = function () { downloadUpdate(downloadUrl, version); };
  }
}

async function checkForUpdates() {
  if (!navigator.onLine) return;
  try {
    var res = await fetch(
      'https://api.github.com/repos/' + GITHUB_REPO + '/releases/latest',
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!res.ok) return;
    var data = await res.json();
    var latestTag = data.tag_name.replace(/^v/i, '');
    if (compareVersions(latestTag, APP_VERSION) <= 0) return;

    var existing = document.getElementById('update-dialog');
    if (existing) return;

    var apkAsset = data.assets && data.assets.find(function (a) {
      return a.name.indexOf('.apk') > -1;
    });
    var downloadUrl = apkAsset ? apkAsset.browser_download_url : data.html_url;

    var overlay = document.createElement('div');
    overlay.id = 'update-dialog';
    overlay.setAttribute(
      'style',
      'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.72);display:flex;align-items:center;justify-content:center;padding:24px;'
    );

    overlay.innerHTML = updateDialogHtml(
      '<div style="width:52px;height:52px;border-radius:50%;background:rgba(248,192,106,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 14px">' +
      '<svg width="26" height="26" fill="none" stroke="#f8c06a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">' +
      '<path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg></div>' +
      '<p style="color:#eef2ee;font-size:17px;font-weight:700;margin:0 0 4px">Update Available</p>' +
      '<p style="color:rgba(238,242,238,0.55);font-size:13px;margin:0 0 18px">Version ' +
      data.tag_name +
      '</p>' +
      '<div style="display:flex;gap:10px">' +
      '<button id="update-later" style="flex:1;padding:11px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.07);background:transparent;color:rgba(238,242,238,0.55);font-size:13px;font-weight:500;cursor:pointer">Skip This</button>' +
      '<button id="update-download" style="flex:1;padding:11px 16px;border-radius:10px;background:#f8c06a;color:#0b1510;font-size:13px;font-weight:700;cursor:pointer">Download Update</button>' +
      '</div>'
    );

    document.body.appendChild(overlay);
    document.getElementById('update-later').onclick = function () { overlay.remove(); };
    document.getElementById('update-download').onclick = function () {
      downloadUpdate(downloadUrl, data.tag_name);
    };
  } catch (e) {
    // Silently fail
  }
}

// Run check after page settles (don't block rendering)
if (typeof document !== 'undefined') {
  if (document.readyState === 'complete') {
    setTimeout(checkForUpdates, 3000);
  } else {
    window.addEventListener('load', function () { setTimeout(checkForUpdates, 3000); });
  }
}
