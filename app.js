// ===== CONFIG FIREBASE =====
const firebaseConfig = {
  apiKey: "AIzaSyCuFWrXl7A2PfoXiMSezgmnO-Ia_qR5z9o",
  authDomain: "betsaleel-docs.firebaseapp.com",
  projectId: "betsaleel-docs",
  storageBucket: "betsaleel-docs.firebasestorage.app",
  messagingSenderId: "553632456671",
  appId: "1:553632456671:web:3f38ccee6474b63f996e6a"
};

const EMAILJS_PUBLIC_KEY = "AUJu3pIpQ9VoyIKr6";
const EMAILJS_SERVICE_ID = "service_d72fojp";
const EMAILJS_TEMPLATE_ID = "template_7nnau28";
const ADMIN_PASS = "Betsaleel2026@";
const ADMIN_WHATSAPP = "22606625715";
const OM_NUMBER = "22606625715";
const WAVE_NUMBER = "22606625715";

// ===== INIT =====
let app, db, auth;
try {
  if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
  } else {
    app = firebase.apps[0];
  }
  db = firebase.firestore();
  auth = firebase.auth();
  if (typeof emailjs !== 'undefined') emailjs.init(EMAILJS_PUBLIC_KEY);
} catch(e) { console.error('Firebase init error:', e); }

// ===== UTILS =====
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const money = n => new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';

const toast = (msg, type = 'success') => {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
};

// ===== CART =====
let cart = JSON.parse(localStorage.getItem('edudocs_cart') || '[]');
let allDocs = [];
let selectedPayMethod = 'orange';

// ===== HEADER SCROLL =====
window.addEventListener('scroll', () => {
  const h = $('#header');
  if (h) h.classList.toggle('scrolled', window.scrollY > 20);
});

// ===== PAGE DETECT =====
const page = window.location.pathname.split('/').pop() || 'index.html';

// ===========================
// === INDEX.HTML LOGIC ===
// ===========================
if (page === 'index.html' || page === '') {
  document.addEventListener('DOMContentLoaded', () => {
    renderDocs();
    updateCartUI();
    initIndexEvents();
  });

  async function renderDocs() {
    try {
      const snap = await db.collection('documents').orderBy('createdAt', 'desc').get();
      allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const statsEl = $('#statsDocsCount');
      if (statsEl) statsEl.textContent = allDocs.length;
      displayDocs(allDocs);
      const loading = $('#loadingDocs');
      const grid = $('#docsGrid');
      if (loading) loading.style.display = 'none';
      if (grid) grid.style.display = 'flex';
    } catch(err) {
      const loading = $('#loadingDocs');
      if (loading) loading.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Erreur de chargement</div><div class="empty-sub">${err.message}</div></div>`;
    }
  }

  function displayDocs(docs) {
    const grid = $('#docsGrid');
    if (!grid) return;
    if (!docs.length) {
      grid.innerHTML = `<div class="empty"><div class="empty-icon">📭</div><div class="empty-title">Aucun document trouvé</div><div class="empty-sub">Essaie une autre recherche</div></div>`;
      return;
    }
    grid.innerHTML = docs.map((d, i) => `
      <div class="doc-card" style="animation-delay:${i * 0.08}s">
        <div class="card-img-wrap">
          <img class="card-img" src="${d.imageUrl || 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600'}" alt="${d.title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600'">
          <div class="card-img-overlay"></div>
          <span class="card-badge">${d.niveau}</span>
        </div>
        <div class="card-body">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px">${d.matiere}</div>
          <div class="card-title">${d.title}</div>
          <div class="card-desc">${d.description || 'Document pédagogique de qualité premium.'}</div>
          <div class="card-footer">
            <div class="card-price">${money(d.price)}</div>
            <button class="btn-add" onclick="addToCart('${d.id}')">+ Ajouter</button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function initIndexEvents() {
    // Recherche
    $('#searchInput')?.addEventListener('input', e => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = !q ? allDocs : allDocs.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.matiere.toLowerCase().includes(q) ||
        d.niveau.toLowerCase().includes(q)
      );
      displayDocs(filtered);
    });

    // Filtres
    $$('.filter-btn').forEach(btn => {
      btn.onclick = () => {
        $$('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const f = btn.dataset.filter;
        const filtered = f === 'all' ? allDocs : allDocs.filter(d => d.niveau === f || d.matiere === f);
        displayDocs(filtered);
      };
    });

    // Panier modal
    $('#cartBtn')?.addEventListener('click', () => $('#cartModal')?.classList.add('show'));
    $('#closeCart')?.addEventListener('click', () => $('#cartModal')?.classList.remove('show'));
    $('#cartBg')?.addEventListener('click', () => $('#cartModal')?.classList.remove('show'));

    // Checkout modal
    $('#checkoutBtn')?.addEventListener('click', () => {
      if (!cart.length) return toast('Ton panier est vide', 'error');
      $('#cartModal')?.classList.remove('show');
      $('#checkoutModal')?.classList.add('show');
    });
    $('#closeCheckout')?.addEventListener('click', () => $('#checkoutModal')?.classList.remove('show'));
    $('#checkoutBg')?.addEventListener('click', () => $('#checkoutModal')?.classList.remove('show'));

    // Success modal
    $('#closeSuccess')?.addEventListener('click', () => $('#successModal')?.classList.remove('show'));
    $('#successBg')?.addEventListener('click', () => $('#successModal')?.classList.remove('show'));

    // Checkout form
    $('#checkoutForm')?.addEventListener('submit', submitOrder);
  }

  async function submitOrder(e) {
    e.preventDefault();
    const btn = $('#submitOrder');
    btn.disabled = true;
    btn.innerHTML = 'Envoi... <div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-left:8px"></div>';

    try {
      const user = auth.currentUser;
      const orderData = {
        nom: $('#clientName').value.trim(),
        email: $('#clientEmail').value.trim(),
        telephone: $('#clientPhone').value.trim(),
        transactionId: $('#transactionId').value.trim(),
        payMethod: selectedPayMethod,
        items: cart.map(i => ({ id: i.id, title: i.title, niveau: i.niveau, matiere: i.matiere, price: i.price, driveId: i.driveId || '' })),
        total: cart.reduce((s, i) => s + i.price, 0),
        status: 'pending',
        userId: user ? user.uid : null,
        userEmail: user ? user.email : $('#clientEmail').value.trim(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection('orders').add(orderData);

      const methodName = selectedPayMethod === 'orange' ? 'Orange Money' : 'Wave Money';
      const adminMsg = `🔔 NOUVELLE COMMANDE EDU DOCS\n\n👤 ${orderData.nom}\n📧 ${orderData.email}\n📱 ${orderData.telephone}\n💳 ID: ${orderData.transactionId}\n💰 ${money(orderData.total)} via ${methodName}\n\n📚 ${cart.length} document(s)\n\n✅ Valider sur: ${window.location.origin}/admin.html`;
      window.open(`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(adminMsg)}`, '_blank');

      $('#checkoutModal')?.classList.remove('show');
      $('#successModal')?.classList.add('show');
      cart = [];
      localStorage.removeItem('edudocs_cart');
      updateCartUI();
      e.target.reset();
    } catch(err) {
      toast('Erreur: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✅ Confirmer la commande';
    }
  }

  window.addToCart = async (id) => {
    if (cart.find(c => c.id === id)) return toast('Déjà dans le panier', 'error');
    try {
      const doc = await db.collection('documents').doc(id).get();
      if (!doc.exists) return toast('Document introuvable', 'error');
      cart.push({ id, ...doc.data() });
      localStorage.setItem('edudocs_cart', JSON.stringify(cart));
      updateCartUI();
      toast('✅ Ajouté au panier !');
    } catch(err) { toast('Erreur: ' + err.message, 'error'); }
  };

  window.removeFromCart = (id) => {
    cart = cart.filter(c => c.id !== id);
    localStorage.setItem('edudocs_cart', JSON.stringify(cart));
    updateCartUI();
    toast('Retiré du panier');
  };

  function updateCartUI() {
    const count = $('#cartCount');
    if (count) {
      count.textContent = cart.length;
      count.style.display = cart.length ? 'flex' : 'none';
      count.style.animation = 'none';
      setTimeout(() => count.style.animation = 'badge-pop 0.3s ease', 10);
    }
    const total = cart.reduce((s, i) => s + i.price, 0);
    const cartTotal = $('#cartTotal');
    const cartTotal2 = $('#cartTotal2');
    if (cartTotal) cartTotal.textContent = money(total);
    if (cartTotal2) cartTotal2.textContent = money(total);

    const cartItems = $('#cartItems');
    if (cartItems) {
      cartItems.innerHTML = cart.length ? cart.map(i => `
        <div class="cart-item">
          <div class="cart-item-info">
            <div class="cart-item-title">${i.title}</div>
            <div class="cart-item-sub">${i.niveau} • ${i.matiere}</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="cart-item-price">${money(i.price)}</span>
            <button class="icon-btn" style="width:34px;height:34px;font-size:14px" onclick="removeFromCart('${i.id}')">🗑️</button>
          </div>
        </div>
      `).join('') : '<div class="empty"><div class="empty-icon">🛒</div><div class="empty-title">Panier vide</div></div>';
    }
  }

  window.selectPayMethod = (el) => {
    $$('.pay-method').forEach(m => m.classList.remove('selected'));
    el.classList.add('selected');
    selectedPayMethod = el.dataset.method;
  };
}

// ===========================
// === AUTH.HTML LOGIC ===
// ===========================
if (page === 'auth.html') {
  auth.onAuthStateChanged(user => {
    if (user) showProfile(user);
    else showAuthForms();
  });

  function showAuthForms() {
    const authPage = $('#authPage');
    const profilePage = $('#profilePage');
    if (authPage) authPage.style.display = 'block';
    if (profilePage) profilePage.style.display = 'none';
  }

  async function showProfile(user) {
    const authPage = $('#authPage');
    const profilePage = $('#profilePage');
    if (authPage) authPage.style.display = 'none';
    if (profilePage) profilePage.style.display = 'block';

    // Charger les infos Firestore
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      const data = userDoc.exists ? userDoc.data() : {};
      const name = data.name || user.displayName || user.email.split('@')[0];
      const initials = name.charAt(0).toUpperCase();

      const avatar = $('#profileAvatar');
      const pName = $('#profileName');
      const pEmail = $('#profileEmail');
      const infoEmail = $('#infoEmail');
      const infoPhone = $('#infoPhone');
      const infoDate = $('#infoDate');

      if (avatar) avatar.textContent = initials;
      if (pName) pName.textContent = name;
      if (pEmail) pEmail.textContent = user.email;
      if (infoEmail) infoEmail.textContent = user.email;
      if (infoPhone) infoPhone.textContent = data.phone || '—';
      if (infoDate) {
        const date = user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('fr-FR') : '—';
        infoDate.textContent = date;
      }
    } catch(e) { console.error(e); }

    $('#logoutBtn')?.addEventListener('click', () => {
      auth.signOut().then(() => {
        toast('Déconnecté');
        showAuthForms();
      });
    });
  }

  // Login
  $('#loginFormEl')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#loginBtn');
    btn.disabled = true;
    btn.innerHTML = 'Connexion... <div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-left:8px"></div>';
    try {
      await auth.signInWithEmailAndPassword($('#loginEmail').value.trim(), $('#loginPass').value);
      toast('✅ Connecté !');
    } catch(err) {
      const msgs = {
        'auth/user-not-found': 'Compte introuvable',
        'auth/wrong-password': 'Mot de passe incorrect',
        'auth/invalid-email': 'Email invalide',
        'auth/too-many-requests': 'Trop de tentatives, réessaie plus tard'
      };
      toast(msgs[err.code] || err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔐 Se connecter';
    }
  });

  // Register
  $('#registerFormEl')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#registerBtn');
    btn.disabled = true;
    btn.innerHTML = 'Création... <div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-left:8px"></div>';
    try {
      const name = $('#regName').value.trim();
      const email = $('#regEmail').value.trim();
      const phone = $('#regPhone').value.trim();
      const pass = $('#regPass').value;
      const cred = await auth.createUserWithEmailAndPassword(email, pass);
      await db.collection('users').doc(cred.user.uid).set({
        name, email, phone,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await cred.user.updateProfile({ displayName: name });
      toast('🎉 Compte créé !');
    } catch(err) {
      const msgs = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé',
        'auth/invalid-email': 'Email invalide',
        'auth/weak-password': 'Mot de passe trop faible (min. 6 caractères)'
      };
      toast(msgs[err.code] || err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🚀 Créer mon compte';
    }
  });
}

// ===========================
// === MES-DOCS.HTML LOGIC ===
// ===========================
if (page === 'mes-docs.html') {
  auth.onAuthStateChanged(user => {
    const notLoggedIn = $('#notLoggedIn');
    const docsPage = $('#docsPage');
    if (!user) {
      if (notLoggedIn) notLoggedIn.style.display = 'block';
      if (docsPage) docsPage.style.display = 'none';
    } else {
      if (notLoggedIn) notLoggedIn.style.display = 'none';
      if (docsPage) docsPage.style.display = 'block';
      loadMyDocs(user);
    }
  });

  async function loadMyDocs(user) {
    const loading = $('#myDocsLoading');
    const list = $('#myDocsList');
    try {
      // Cherche les commandes par userId OU par email
      const snap = await db.collection('orders')
        .where('userEmail', '==', user.email)
        .orderBy('createdAt', 'desc')
        .get();

      if (loading) loading.style.display = 'none';

      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const total = orders.length;
      const validated = orders.filter(o => o.status === 'validated').length;
      const pending = orders.filter(o => o.status === 'pending').length;

      const countV = $('#countValidated');
      const countP = $('#countPending');
      const countT = $('#countTotal');
      if (countV) countV.textContent = validated;
      if (countP) countP.textContent = pending;
      if (countT) countT.textContent = total;

      if (!total) {
        if (list) list.innerHTML = `
          <div class="empty">
            <div class="empty-icon">📭</div>
            <div class="empty-title">Aucune commande</div>
            <div class="empty-sub" style="margin-bottom:20px">Tu n'as pas encore acheté de documents</div>
            <button class="btn btn-primary" onclick="window.location.href='index.html'">Parcourir les docs</button>
          </div>`;
        return;
      }

      if (list) {
        list.innerHTML = orders.map(order => {
          const date = order.createdAt?.toDate().toLocaleDateString('fr-FR', {day:'2-digit',month:'short',year:'numeric'}) || '—';
          const statusClass = order.status === 'validated' ? 'status-validated' : order.status === 'pending' ? 'status-pending' : 'status-rejected';
          const statusText = order.status === 'validated' ? '✅ Validée' : order.status === 'pending' ? '⏳ En attente' : '❌ Refusée';

          const docsHTML = order.items.map(item => `
            <div style="background:var(--card2);border-radius:var(--radius-sm);padding:14px;margin-bottom:10px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:44px;height:44px;background:linear-gradient(135deg,var(--primary),var(--primary-light));border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">📄</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-size:13px;font-weight:700;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${item.title}</div>
                  <div style="font-size:11px;color:var(--muted);">${item.niveau} • ${item.matiere} • ${money(item.price)}</div>
                </div>
              </div>
              ${order.status === 'validated' && item.driveId ? `
                <a href="https://drive.google.com/uc?export=download&id=${item.driveId}" target="_blank" class="btn btn-success btn-full btn-sm" style="margin-top:10px;display:flex;text-decoration:none;">
                  📥 Télécharger le PDF
                </a>
              ` : order.status === 'pending' ? `
                <div style="margin-top:10px;font-size:12px;color:var(--accent);text-align:center;padding:8px;background:rgba(245,158,11,0.1);border-radius:8px;">
                  ⏳ En attente de validation du paiement
                </div>
              ` : `
                <div style="margin-top:10px;font-size:12px;color:var(--danger);text-align:center;padding:8px;background:rgba(239,68,68,0.1);border-radius:8px;">
                  ❌ Commande refusée
                </div>
              `}
            </div>
          `).join('');

          return `
            <div class="my-doc-card">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div>
                  <div style="font-size:12px;color:var(--muted);">Commande du ${date}</div>
                  <div style="font-size:15px;font-weight:700;">${money(order.total)}</div>
                </div>
                <span class="my-doc-status ${statusClass}">${statusText}</span>
              </div>
              ${docsHTML}
            </div>
          `;
        }).join('');
      }
    } catch(err) {
      if (loading) loading.style.display = 'none';
      const list = $('#myDocsList');
      if (list) list.innerHTML = `<div class="empty"><div class="empty-icon">⚠️</div><div class="empty-title">Erreur</div><div class="empty-sub">${err.message}</div></div>`;
    }
  }
}

// ===========================
// === ADMIN.HTML LOGIC ===
// ===========================
if (page === 'admin.html') {
  document.addEventListener('DOMContentLoaded', () => {
    // Login admin
    $('#adminLoginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const pass = $('#adminPass').value;
      if (pass === ADMIN_PASS) {
        $('#loginScreen').style.display = 'none';
        $('#adminDashboard').style.display = 'block';
        loadAdminDocs();
        loadAdminOrders();
        toast('👋 Bienvenue Admin !');
      } else {
        toast('❌ Mot de passe incorrect', 'error');
        $('#adminPass').value = '';
      }
    });

    $('#logoutBtn')?.addEventListener('click', () => {
      $('#loginScreen').style.display = 'flex';
      $('#adminDashboard').style.display = 'none';
      $('#adminPass').value = '';
    });

    $('#docForm')?.addEventListener('submit', publishDoc);
  });

  async function publishDoc(e) {
    e.preventDefault();
    const btn = $('#publishBtn');
    btn.disabled = true;
    btn.innerHTML = 'Publication... <div class="spinner" style="width:16px;height:16px;border-width:2px;display:inline-block;vertical-align:middle;margin-left:8px"></div>';
    try {
      await db.collection('documents').add({
        title: $('#docTitle').value.trim(),
        niveau: $('#docNiveau').value,
        matiere: $('#docMatiere').value,
        price: parseInt($('#docPrice').value),
        driveId: $('#docDriveId').value.trim(),
        description: $('#docDesc').value.trim(),
        imageUrl: $('#docImage').value.trim() || '',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      e.target.reset();
      loadAdminDocs();
      toast('✅ Document publié !');
    } catch(err) {
      toast('Erreur: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🚀 Publier le document';
    }
  }

  async function loadAdminDocs() {
    try {
      const snap = await db.collection('documents').orderBy('createdAt', 'desc').get();
      const statDocs = $('#statDocs');
      const docsCount = $('#docsCount');
      if (statDocs) statDocs.textContent = snap.size;
      if (docsCount) docsCount.textContent = snap.size;

      const list = $('#docsList');
      if (list) {
        list.innerHTML = snap.size ? snap.docs.map(d => {
          const doc = d.data();
          return `
            <div class="item-row">
              <div class="item-row-info">
                <div class="item-row-title">${doc.title}</div>
                <div class="item-row-sub">${doc.niveau} • ${doc.matiere} • ${money(doc.price)}</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="deleteDoc('${d.id}')">🗑️</button>
            </div>
          `;
        }).join('') : '<div class="empty"><div class="empty-icon">📭</div><div class="empty-sub">Aucun document</div></div>';
      }
    } catch(err) { toast('Erreur: ' + err.message, 'error'); }
  }

  async function loadAdminOrders() {
    try {
      const snap = await db.collection('orders').orderBy('createdAt', 'desc').limit(30).get();
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const pending = orders.filter(o => o.status === 'pending').length;
      const validated = orders.filter(o => o.status === 'validated').length;

      const statP = $('#statPending');
      const statV = $('#statValidated');
      if (statP) statP.textContent = pending;
      if (statV) statV.textContent = validated;

      const list = $('#ordersList');
      if (list) {
        list.innerHTML = orders.length ? orders.map(o => {
          const date = o.createdAt?.toDate().toLocaleString('fr-FR', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}) || '';
          const statusClass = o.status === 'validated' ? 'status-validated' : o.status === 'pending' ? 'status-pending' : 'status-rejected';
          const statusText = o.status === 'validated' ? '✅ Validée' : o.status === 'pending' ? '⏳ En attente' : '❌ Refusée';
          const methodIcon = o.payMethod === 'wave' ? '🔵 Wave' : '🟠 Orange Money';

          return `
            <div class="order-card">
              <div class="order-header">
                <div class="order-name">${o.nom}</div>
                <span class="my-doc-status ${statusClass}" style="font-size:11px;padding:4px 10px;">${statusText}</span>
              </div>
              <div class="order-detail">📧 ${o.email}</div>
              <div class="order-detail">📱 ${o.telephone}</div>
              <div class="order-detail">💳 ID: ${o.transactionId}</div>
              <div class="order-detail">💰 ${money(o.total)} via ${methodIcon}</div>
              <div class="order-detail">🕐 ${date}</div>
              <div style="margin-top:10px;font-size:12px;">
                <strong>Documents:</strong><br>
                ${(o.items || []).map(i => `• ${i.title}`).join('<br>')}
              </div>
              ${o.status === 'pending' ? `
                <div class="order-actions">
                  <button class="btn btn-success" style="flex:1;font-size:13px" onclick="validateOrder('${o.id}')">✅ Valider & Envoyer</button>
                  <button class="btn btn-danger btn-sm" onclick="rejectOrder('${o.id}')">❌</button>
                </div>
              ` : ''}
            </div>
          `;
        }).join('') : '<div class="empty"><div class="empty-icon">📭</div><div class="empty-sub">Aucune commande</div></div>';
      }
    } catch(err) { toast('Erreur: ' + err.message, 'error'); }
  }

  window.validateOrder = async (orderId) => {
    if (!confirm('Paiement reçu ? Confirmer la validation ?')) return;
    try {
      const orderDoc = await db.collection('orders').doc(orderId).get();
      const order = orderDoc.data();

      await db.collection('orders').doc(orderId).update({
        status: 'validated',
        validatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // Envoi email
      const listeHtml = (order.items || []).map(i => `
        <div style="margin-bottom:16px;padding:16px;background:#f8fafc;border-radius:12px;border-left:4px solid #6C3CE1">
          <strong>${i.title}</strong><br>
          <span style="color:#64748b;font-size:14px">${i.niveau} • ${i.matiere}</span><br>
          <a href="https://drive.google.com/uc?export=download&id=${i.driveId}" style="color:#6C3CE1;font-weight:600;text-decoration:none;display:inline-block;margin-top:8px">📥 Télécharger le PDF</a>
        </div>
      `).join('');

      try {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          to_email: order.email,
          nom_client: order.nom,
          email_client: order.email,
          id_transaction: order.transactionId,
          total: money(order.total),
          liste_documents: listeHtml,
          om_number: OM_NUMBER
        });
      } catch(emailErr) { console.warn('Email non envoyé:', emailErr); }

      // WhatsApp client
      const waLinks = (order.items || []).map(i =>
        `📄 *${i.title}*\n🔗 https://drive.google.com/uc?export=download&id=${i.driveId}`
      ).join('\n\n');
      const waMsg = `🎉 Bonjour *${order.nom}* !\n\nTon paiement de *${money(order.total)}* est confirmé ✅\n\nVoici tes documents :\n\n${waLinks}\n\n*Merci pour ta confiance !* 💪\nEdu Docs Premium`;
      const phone = order.telephone.replace(/\D/g, '');
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(waMsg)}`, '_blank');

      toast('✅ Commande validée !');
      loadAdminOrders();
    } catch(err) { toast('Erreur: ' + err.message, 'error'); }
  };

  window.rejectOrder = async (orderId) => {
    if (!confirm('Refuser cette commande ?')) return;
    try {
      await db.collection('orders').doc(orderId).update({ status: 'rejected' });
      toast('Commande refusée');
      loadAdminOrders();
    } catch(err) { toast('Erreur: ' + err.message, 'error'); }
  };

  window.deleteDoc = async (id) => {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await db.collection('documents').doc(id).delete();
      loadAdminDocs();
      toast('Document supprimé');
    } catch(err) { toast('Erreur: ' + err.message, 'error'); }
  };
}
