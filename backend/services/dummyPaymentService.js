// backend/services/dummyPaymentService.js
export const initiateDummyPayment = async (
	amount,
	transactionUuid,
	orderId,
	customerName,
	customerEmail,
	customerPhone,
) => {
	const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';

	return {
		amount,
		transaction_uuid: transactionUuid,
		order_id: orderId,
		customer_name: customerName,
		customer_email: customerEmail,
		customer_phone: customerPhone,
		form_html: `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Secure Payment - MeroGhar</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet">
                <style>
                    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

                    :root {
                        --gold:        #e4b45a;
                        --gold-light:  #f0c97a;
                        --gold-dim:    #b8893a;
                        --gold-glow:   rgba(228,180,90,0.15);
                        --green-deep:  #070e08;
                        --green-dark:  #0c1710;
                        --green-mid:   #111f14;
                        --green-raised:#16281a;
                        --green-input: #0a1209;
                        --text:        #e2ece3;
                        --text-soft:   rgba(226,236,227,0.6);
                        --text-faint:  rgba(226,236,227,0.28);
                        --border:      rgba(228,180,90,0.10);
                        --border-hi:   rgba(228,180,90,0.40);
                        --error:       #d96b6b;
                        --error-bg:    rgba(217,107,107,0.10);
                        --r:           14px;
                    }

                    html, body {
                        height: 100%;
                        width: 100%;
                    }

                    body {
                        font-family: 'DM Sans', sans-serif;
                        background: var(--green-deep);
                        color: var(--text);
                        display: flex;
                        flex-direction: column;
                        min-height: 100vh;
                    }

                    /* ─── TOP NAV BAR ─────────────────────────────── */
                    .topbar {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 0 48px;
                        height: 60px;
                        border-bottom: 1px solid var(--border);
                        background: var(--green-dark);
                        flex-shrink: 0;
                    }

                    .topbar-brand {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .topbar-icon {
                        width: 32px;
                        height: 32px;
                        background: var(--gold-glow);
                        border: 1px solid var(--border-hi);
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .topbar-icon svg {
                        width: 16px;
                        height: 16px;
                        stroke: var(--gold);
                        stroke-width: 1.8;
                        fill: none;
                    }

                    .topbar-name {
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 20px;
                        font-weight: 700;
                        color: var(--gold);
                        letter-spacing: 0.02em;
                    }

                    .topbar-secure {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 12px;
                        color: var(--text-faint);
                        font-weight: 400;
                        letter-spacing: 0.04em;
                    }

                    .topbar-secure svg {
                        width: 13px;
                        height: 13px;
                        stroke: var(--text-faint);
                        stroke-width: 2;
                        fill: none;
                    }

                    /* ─── MAIN LAYOUT ─────────────────────────────── */
                    .main {
                        flex: 1;
                        display: grid;
                        grid-template-columns: 1fr 1px 1fr;
                        min-height: 0;
                    }

                    /* ─── LEFT PANEL ──────────────────────────────── */
                    .panel-left {
                        background: var(--green-dark);
                        padding: 64px 56px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        position: relative;
                        overflow: hidden;
                    }

                    .panel-left::before {
                        content: '';
                        position: absolute;
                        top: -120px;
                        right: -120px;
                        width: 380px;
                        height: 380px;
                        background: radial-gradient(circle, rgba(228,180,90,0.07) 0%, transparent 65%);
                        pointer-events: none;
                    }

                    .panel-left::after {
                        content: '';
                        position: absolute;
                        bottom: -80px;
                        left: -80px;
                        width: 280px;
                        height: 280px;
                        background: radial-gradient(circle, rgba(22,40,26,0.9) 0%, transparent 70%);
                        pointer-events: none;
                    }

                    .left-inner {
                        position: relative;
                        z-index: 1;
                        max-width: 380px;
                    }

                    .order-eyebrow {
                        font-size: 11px;
                        font-weight: 600;
                        letter-spacing: 0.16em;
                        text-transform: uppercase;
                        color: var(--gold-dim);
                        margin-bottom: 10px;
                    }

                    .order-title {
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 40px;
                        font-weight: 600;
                        color: var(--text);
                        line-height: 1.15;
                        margin-bottom: 40px;
                    }

                    .amount-block {
                        margin-bottom: 44px;
                    }

                    .amount-label {
                        font-size: 12px;
                        font-weight: 500;
                        letter-spacing: 0.10em;
                        text-transform: uppercase;
                        color: var(--text-soft);
                        margin-bottom: 10px;
                    }

                    .amount-row {
                        display: flex;
                        align-items: baseline;
                        gap: 6px;
                    }

                    .amount-currency {
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 26px;
                        font-weight: 500;
                        color: var(--gold);
                        opacity: 0.7;
                        line-height: 1;
                    }

                    .amount-main {
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 64px;
                        font-weight: 600;
                        color: var(--gold);
                        line-height: 1;
                    }

                    .amount-cents {
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 28px;
                        font-weight: 400;
                        color: var(--gold);
                        opacity: 0.45;
                        align-self: flex-end;
                        padding-bottom: 6px;
                    }

                    .order-meta {
                        display: flex;
                        flex-direction: column;
                        gap: 14px;
                        padding: 24px 0;
                        border-top: 1px solid var(--border);
                        border-bottom: 1px solid var(--border);
                        margin-bottom: 44px;
                    }

                    .meta-row {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }

                    .meta-key {
                        font-size: 13px;
                        color: var(--text-faint);
                        font-weight: 400;
                    }

                    .meta-val {
                        font-size: 13px;
                        color: var(--text-soft);
                        font-weight: 500;
                        max-width: 200px;
                        text-align: right;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }

                    .trust-list {
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }

                    .trust-item {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        font-size: 13px;
                        color: var(--text-faint);
                    }

                    .trust-item svg {
                        width: 14px;
                        height: 14px;
                        stroke: var(--gold-dim);
                        stroke-width: 2;
                        fill: none;
                        flex-shrink: 0;
                        opacity: 0.7;
                    }

                    /* ─── DIVIDER ─────────────────────────────────── */
                    .panel-divider {
                        background: var(--border);
                        width: 1px;
                    }

                    /* ─── RIGHT PANEL ─────────────────────────────── */
                    .panel-right {
                        background: var(--green-deep);
                        padding: 64px 56px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                    }

                    .right-inner {
                        max-width: 400px;
                        width: 100%;
                    }

                    .form-heading {
                        font-family: 'Cormorant Garamond', serif;
                        font-size: 30px;
                        font-weight: 600;
                        color: var(--text);
                        margin-bottom: 6px;
                        line-height: 1.2;
                    }

                    .form-subheading {
                        font-size: 14px;
                        color: var(--text-faint);
                        margin-bottom: 40px;
                        font-weight: 300;
                    }

                    .field {
                        margin-bottom: 28px;
                    }

                    .field-label {
                        display: block;
                        font-size: 12px;
                        font-weight: 600;
                        letter-spacing: 0.10em;
                        text-transform: uppercase;
                        color: var(--text-soft);
                        margin-bottom: 10px;
                    }

                    .field-wrap {
                        position: relative;
                    }

                    .field-wrap svg {
                        position: absolute;
                        left: 16px;
                        top: 50%;
                        transform: translateY(-50%);
                        width: 16px;
                        height: 16px;
                        stroke: var(--text-faint);
                        stroke-width: 1.8;
                        fill: none;
                        pointer-events: none;
                        transition: stroke 0.2s;
                    }

                    .field-wrap:focus-within svg {
                        stroke: var(--gold-dim);
                    }

                    .field input {
                        width: 100%;
                        height: 52px;
                        padding: 0 16px 0 46px;
                        background: var(--green-input);
                        border: 1px solid rgba(226,236,227,0.07);
                        border-radius: var(--r);
                        color: var(--text);
                        font-family: 'DM Sans', sans-serif;
                        font-size: 15px;
                        font-weight: 400;
                        transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
                        -webkit-appearance: none;
                    }

                    .field input::placeholder {
                        color: var(--text-faint);
                        font-size: 14px;
                    }

                    .field input:focus {
                        outline: none;
                        border-color: var(--border-hi);
                        background: var(--green-mid);
                        box-shadow: 0 0 0 3px rgba(228,180,90,0.07);
                    }

                    .field-hint {
                        margin-top: 7px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 11.5px;
                        color: var(--text-faint);
                    }

                    .pill {
                        display: inline-block;
                        background: rgba(228,180,90,0.09);
                        border: 1px solid rgba(228,180,90,0.18);
                        border-radius: 20px;
                        padding: 2px 8px;
                        font-size: 10px;
                        font-weight: 600;
                        letter-spacing: 0.07em;
                        text-transform: uppercase;
                        color: var(--gold-dim);
                        flex-shrink: 0;
                    }

                    .error-message {
                        background: var(--error-bg);
                        border: 1px solid rgba(217,107,107,0.22);
                        border-radius: 10px;
                        padding: 12px 16px;
                        color: var(--error);
                        font-size: 13px;
                        font-weight: 500;
                        margin-bottom: 24px;
                        display: none;
                        align-items: center;
                        gap: 8px;
                    }

                    .error-message svg {
                        width: 14px;
                        height: 14px;
                        stroke: var(--error);
                        stroke-width: 2.2;
                        fill: none;
                        flex-shrink: 0;
                    }

                    .pay-btn {
                        width: 100%;
                        height: 54px;
                        background: var(--gold);
                        color: #060b07;
                        border: none;
                        border-radius: var(--r);
                        font-family: 'DM Sans', sans-serif;
                        font-size: 14px;
                        font-weight: 600;
                        letter-spacing: 0.07em;
                        text-transform: uppercase;
                        cursor: pointer;
                        transition: background 0.18s, transform 0.14s, box-shadow 0.18s;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 10px;
                        box-shadow: 0 4px 24px rgba(228,180,90,0.22);
                        position: relative;
                        overflow: hidden;
                    }

                    .pay-btn::before {
                        content: '';
                        position: absolute;
                        inset: 0;
                        background: linear-gradient(160deg, rgba(255,255,255,0.14) 0%, transparent 55%);
                        pointer-events: none;
                    }

                    .pay-btn svg {
                        width: 17px;
                        height: 17px;
                        stroke: #060b07;
                        stroke-width: 2.2;
                        fill: none;
                    }

                    .pay-btn:hover {
                        background: var(--gold-light);
                        transform: translateY(-1px);
                        box-shadow: 0 8px 32px rgba(228,180,90,0.30);
                    }

                    .pay-btn:active {
                        transform: translateY(0);
                        box-shadow: 0 2px 10px rgba(228,180,90,0.14);
                    }

                    .pay-amount-hint {
                        margin-top: 14px;
                        text-align: center;
                        font-size: 12px;
                        color: var(--text-faint);
                    }

                    .pay-amount-hint strong {
                        color: var(--text-soft);
                        font-weight: 500;
                    }

                    /* ─── FOOTER BAR ──────────────────────────────── */
                    .footbar {
                        height: 44px;
                        border-top: 1px solid var(--border);
                        background: var(--green-dark);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        font-size: 11px;
                        color: var(--text-faint);
                        letter-spacing: 0.05em;
                        flex-shrink: 0;
                    }

                    .footbar svg {
                        width: 12px;
                        height: 12px;
                        stroke: currentColor;
                        stroke-width: 2;
                        fill: none;
                        opacity: 0.5;
                    }

                    /* ─── RESPONSIVE ──────────────────────────────── */
                    @media (max-width: 820px) {
                        .main {
                            grid-template-columns: 1fr;
                            grid-template-rows: auto auto;
                        }
                        .panel-divider { display: none; }
                        .panel-left {
                            padding: 40px 28px 32px;
                            border-bottom: 1px solid var(--border);
                        }
                        .panel-right {
                            padding: 40px 28px 48px;
                        }
                        .left-inner, .right-inner {
                            max-width: 100%;
                        }
                        .amount-main { font-size: 48px; }
                        .order-title { font-size: 30px; margin-bottom: 28px; }
                        .topbar { padding: 0 24px; }
                    }

                    @keyframes fadeUp {
                        from { opacity: 0; transform: translateY(16px); }
                        to   { opacity: 1; transform: translateY(0); }
                    }
                    .left-inner  { animation: fadeUp 0.5s 0.05s cubic-bezier(0.22,1,0.36,1) both; }
                    .right-inner { animation: fadeUp 0.5s 0.15s cubic-bezier(0.22,1,0.36,1) both; }
                </style>
            </head>
            <body>

                <!-- Top bar -->
                <header class="topbar">
                    <div class="topbar-brand">
                        <div class="topbar-icon">
                            <svg viewBox="0 0 24 24">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                            </svg>
                        </div>
                        <span class="topbar-name">MeroGhar</span>
                    </div>
                    <div class="topbar-secure">
                        <svg viewBox="0 0 24 24">
                            <rect x="3" y="11" width="18" height="11" rx="2"/>
                            <path d="M7 11V7a5 5 0 0110 0v4"/>
                        </svg>
                        256-bit SSL secured
                    </div>
                </header>

                <!-- Main split layout -->
                <div class="main">

                    <!-- LEFT: Order summary -->
                    <div class="panel-left">
                        <div class="left-inner">
                            <div class="order-eyebrow">Payment Summary</div>
                            <div class="order-title">Complete your<br>purchase</div>

                            <div class="amount-block">
                                <div class="amount-label">Total Amount Due</div>
                                <div class="amount-row">
                                    <span class="amount-currency">रु</span>
                                    <span class="amount-main">${amount.toLocaleString()}</span>
                                    <span class="amount-cents">.00</span>
                                </div>
                            </div>

                            <div class="order-meta">
                                <div class="meta-row">
                                    <span class="meta-key">Order ID</span>
                                    <span class="meta-val">${orderId}</span>
                                </div>
                                <div class="meta-row">
                                    <span class="meta-key">Customer</span>
                                    <span class="meta-val">${customerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                                </div>
                                <div class="meta-row">
                                    <span class="meta-key">Email</span>
                                    <span class="meta-val">${customerEmail.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
                                </div>
                            </div>

                            <div class="trust-list">
                                <div class="trust-item">
                                    <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                                    Encrypted &amp; secure transaction
                                </div>
                                <div class="trust-item">
                                    <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                    Demo mode — no real charge
                                </div>
                                <div class="trust-item">
                                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                    Instant confirmation
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Divider -->
                    <div class="panel-divider"></div>

                    <!-- RIGHT: Payment form -->
                    <div class="panel-right">
                        <form id="payment-form" action="${BACKEND_URL}/api/payment/dummy/process" method="POST">
                            <input type="hidden" name="amount"           value="${amount}" />
                            <input type="hidden" name="transaction_uuid" value="${transactionUuid}" />
                            <input type="hidden" name="order_id"         value="${orderId}" />
                            <input type="hidden" name="customer_name"    value="${customerName.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/'/g, '&#39;')}" />
                            <input type="hidden" name="customer_email"   value="${customerEmail.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" />
                            <input type="hidden" name="customer_phone"   value="${customerPhone.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" />

                            <div class="right-inner">
                                <div class="form-heading">Payment Details</div>
                                <div class="form-subheading">Enter your credentials to confirm payment</div>

                                <div class="field">
                                    <label class="field-label" for="mobile">Mobile Number</label>
                                    <div class="field-wrap">
                                        <svg viewBox="0 0 24 24">
                                            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                                            <line x1="12" y1="18" x2="12.01" y2="18"/>
                                        </svg>
                                        <input
                                            type="text"
                                            name="mobile"
                                            id="mobile"
                                            placeholder="9800000000"
                                            autocomplete="off"
                                            maxlength="10"
                                            required
                                        />
                                    </div>
                                    <div class="field-hint">
                                        <span class="pill">Demo</span>
                                        Any 10-digit number works
                                    </div>
                                </div>

                                <div class="field">
                                    <label class="field-label" for="password">Password</label>
                                    <div class="field-wrap">
                                        <svg viewBox="0 0 24 24">
                                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                            <path d="M7 11V7a5 5 0 0110 0v4"/>
                                        </svg>
                                        <input
                                            type="password"
                                            name="password"
                                            id="password"
                                            placeholder="Enter any password"
                                            autocomplete="off"
                                            required
                                        />
                                    </div>
                                    <div class="field-hint">
                                        <span class="pill">Demo</span>
                                        Any password works
                                    </div>
                                </div>

                                <div id="client-error" class="error-message">
                                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    <span id="error-text"></span>
                                </div>

                                <button type="submit" class="pay-btn">
                                    <svg viewBox="0 0 24 24">
                                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                                        <line x1="1" y1="10" x2="23" y2="10"/>
                                    </svg>
                                    Pay \u0930\u0941 ${amount.toLocaleString()}
                                </button>

                                <div class="pay-amount-hint">
                                    You will be charged <strong>\u0930\u0941 ${amount.toLocaleString()}.00</strong> upon confirmation
                                </div>
                            </div>
                        </form>
                    </div>

                </div>

                <!-- Footer bar -->
                <footer class="footbar">
                    <svg viewBox="0 0 24 24">
                        <rect x="3" y="11" width="18" height="11" rx="2"/>
                        <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                    Demo Payment &middot; No real transaction will be processed &middot; MeroGhar
                </footer>

                <script>
                    document.getElementById('payment-form').addEventListener('submit', function(e) {
                        const mobile   = document.getElementById('mobile').value.trim();
                        const password = document.getElementById('password').value.trim();
                        const errorDiv = document.getElementById('client-error');
                        const errorTxt = document.getElementById('error-text');

                        if (!mobile) {
                            e.preventDefault();
                            errorTxt.textContent = 'Please enter your mobile number.';
                            errorDiv.style.display = 'flex';
                            document.getElementById('mobile').focus();
                            return;
                        }
                        if (!password) {
                            e.preventDefault();
                            errorTxt.textContent = 'Please enter your password.';
                            errorDiv.style.display = 'flex';
                            document.getElementById('password').focus();
                            return;
                        }
                        errorDiv.style.display = 'none';
                        // Allow form to submit normally
                    });
                </script>
            </body>
            </html>
        `,
	};
};

export const processDummyPayment = async (paymentData) => {
	console.log('Dummy payment received:', paymentData);
	const { mobile, password, amount, transaction_uuid, order_id } =
		paymentData;

	if (!mobile || !mobile.trim())
		return { success: false, message: 'Mobile number is required.' };
	if (!password || !password.trim())
		return { success: false, message: 'Password is required.' };

	return {
		success: true,
		message: 'Payment successful!',
		transaction_id: transaction_uuid,
		pidx: `DUMMY_${Date.now()}`,
		order_id: order_id, // ⬅️ ADD THIS LINE
	};
};
