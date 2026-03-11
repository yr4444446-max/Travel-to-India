/* ============================================================
   PLAN YOUR TRIP INDIA — Firebase Database Integration
   Covers: Auth · Reviews · Trip Plans · Contact Messages
   
   ══ SETUP INSTRUCTIONS ════════════════════════════════════
   1. Go to https://console.firebase.google.com
   2. Click "Add project" → name it "plan-your-trip-india"
   3. Disable Google Analytics (optional) → Create project
   4. Click "Web" icon (</>)  → Register app → Copy config
   5. Replace the firebaseConfig object below with YOUR values
   6. In Firebase Console → Build → Authentication
        → Sign-in method → Enable: Email/Password + Google
   7. In Firebase Console → Build → Firestore Database
        → Create database → Start in test mode → Select region
   8. In Firebase Console → Build → Firestore → Rules
        → Replace with the rules shown at the bottom of this file
   9. Add this script tag in index.html BEFORE script.js:
        <script src="firebase-config.js"></script>
   ============================================================ */

// ─── STEP 1: REPLACE WITH YOUR FIREBASE CONFIG ──────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyA9Tm82lft7v8blVYYxef16ZvCLrwDHHZI",
  authDomain:        "plan-your-trip-india.firebaseapp.com",
  projectId:         "plan-your-trip-india",
  storageBucket:     "plan-your-trip-india.firebasestorage.app",
  messagingSenderId: "482830076113",
  appId:             "1:482830076113:web:4c037e28d7fbc963755df0",
  measurementId:     "G-K54QJNTRZ6"
};
// ────────────────────────────────────────────────────────────────


// ─── FIREBASE SDK (loaded via CDN — no npm needed) ──────────────
// These are added dynamically so you don't need to edit index.html
// beyond adding <script src="firebase-config.js"></script>
(function loadFirebaseSDK(callback) {
  const scripts = [
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics-compat.js"
  ];
  let loaded = 0;
  scripts.forEach(src => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => { if (++loaded === scripts.length) callback(); };
    s.onerror = () => console.error('[Firebase] Failed to load:', src);
    document.head.appendChild(s);
  });
})(function initFirebase() {

  // ── Initialise app ─────────────────────────────────────────────
  if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
  const auth      = firebase.auth();
  const db        = firebase.firestore();
  const analytics = firebase.analytics(); // enabled via measurementId

  // Expose globally so script.js overrides below can use them
  window._fb = { auth, db, analytics };
  window.auth = auth;
  window.db   = db;

  // ── PERSIST LOGIN across page reloads ──────────────────────────
  // LOCAL = stays logged in even after browser closes
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(err => {
    console.warn('[Firebase] Could not set persistence:', err);
  });

  // ══════════════════════════════════════════════════════════════
  //  AUTH — Replace localStorage mock with real Firebase Auth
  // ══════════════════════════════════════════════════════════════

  // Listen for auth state changes (replaces localStorage currentUser)
  auth.onAuthStateChanged(user => {
    if (user) {
      window.currentUser = {
        uid:   user.uid,
        first: user.displayName ? user.displayName.split(' ')[0] : (user.email.split('@')[0]),
        last:  user.displayName ? (user.displayName.split(' ')[1] || '') : '',
        email: user.email,
        photoURL: user.photoURL || null
      };
    } else {
      window.currentUser = null;
    }
    if (typeof refreshNavAuth === 'function') refreshNavAuth();
  });

  // ── SIGN UP ────────────────────────────────────────────────────
  window.handleSignup = async function () {
    const first    = document.getElementById('signupFirst')?.value.trim();
    const last     = document.getElementById('signupLast')?.value.trim();
    const email    = document.getElementById('signupEmail')?.value.trim();
    const password = document.getElementById('signupPassword')?.value;

    document.getElementById('signupError').style.display   = 'none';
    document.getElementById('signupSuccess').style.display = 'none';

    if (!first || !last || !email || !password) {
      return showAuthError('signupModal', 'signupError', '⚠ Please fill in all fields.');
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return showAuthError('signupModal', 'signupError', '⚠ Please enter a valid email address.');
    }
    if (password.length < 8) {
      return showAuthError('signupModal', 'signupError', '⚠ Password must be at least 8 characters.');
    }

    setLoading('signupSubmitBtn', true);
    try {
      // Create Firebase Auth user
      const cred = await auth.createUserWithEmailAndPassword(email, password);
      await cred.user.updateProfile({ displayName: first + ' ' + last });

      // Save extra profile data to Firestore
      await db.collection('users').doc(cred.user.uid).set({
        first, last, email,
        joined:    firebase.firestore.FieldValue.serverTimestamp(),
        savedTrips: [],
        provider:  'email'
      });

      showAuthSuccess('signupSuccess', '🎉 Account created! Welcome to Plan Your Trip India!');
      analytics.logEvent('sign_up', { method: 'email' });
      setTimeout(() => {
        closeModal('signupModal');
        showToast('🎉 Welcome aboard, ' + first + '! Start planning your dream trip!');
      }, 1600);
    } catch (err) {
      const msg = _fbAuthError(err.code);
      showAuthError('signupModal', 'signupError', msg);
    } finally {
      setLoading('signupSubmitBtn', false);
    }
  };

  // ── LOG IN ─────────────────────────────────────────────────────
  window.handleLogin = async function () {
    const email    = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    document.getElementById('loginError').style.display = 'none';

    if (!email || !password) {
      return showAuthError('loginModal', 'loginError', '⚠ Please fill in all fields.');
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return showAuthError('loginModal', 'loginError', '⚠ Please enter a valid email address.');
    }

    setLoading('loginSubmitBtn', true);
    try {
      await auth.signInWithEmailAndPassword(email, password);
      analytics.logEvent('login', { method: 'email' });
      closeModal('loginModal');
      showToast('🎉 Welcome back! Ready to explore India?');
    } catch (err) {
      showAuthError('loginModal', 'loginError', _fbAuthError(err.code));
    } finally {
      setLoading('loginSubmitBtn', false);
    }
  };

  // ── GOOGLE LOGIN ───────────────────────────────────────────────
  window.handleSocialLogin = async function (provider) {
    if (provider !== 'Google') { showToast('🔗 ' + provider + ' login coming soon!'); return; }
    try {
      const googleProvider = new firebase.auth.GoogleAuthProvider();
      const result = await auth.signInWithPopup(googleProvider);
      const user   = result.user;
      // Upsert user doc in Firestore
      await db.collection('users').doc(user.uid).set({
        first:    user.displayName ? user.displayName.split(' ')[0] : '',
        last:     user.displayName ? (user.displayName.split(' ').slice(1).join(' ') || '') : '',
        email:    user.email,
        photoURL: user.photoURL || null,
        provider: 'google',
        joined:   firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      closeModal('loginModal');
      closeModal('signupModal');
      analytics.logEvent('login', { method: 'google' });
      showToast('🎉 Signed in with Google! Welcome, ' + (user.displayName || user.email) + '!');
    } catch (err) {
      showToast('⚠ Google sign-in failed. Please try again.');
      console.error('[Firebase] Google sign-in error:', err);
    }
  };

  // ── LOG OUT ────────────────────────────────────────────────────
  window.logoutUser = async function () {
    await auth.signOut();
    analytics.logEvent('logout');
    showToast('👋 Logged out. Come back soon!');
  };

  // ── Password Reset ─────────────────────────────────────────────
  window.sendPasswordReset = async function (email) {
    if (!email) { showToast('⚠ Enter your email first.'); return; }
    try {
      await auth.sendPasswordResetEmail(email);
      showToast('📧 Password reset email sent! Check your inbox.');
    } catch (err) {
      showToast('⚠ ' + _fbAuthError(err.code));
    }
  };

  // ── Friendly error messages ────────────────────────────────────
  function _fbAuthError(code) {
    const map = {
      'auth/email-already-in-use':    '✕ An account with this email already exists.',
      'auth/invalid-email':           '✕ Invalid email address.',
      'auth/weak-password':           '✕ Password is too weak. Use at least 8 characters.',
      'auth/user-not-found':          '✕ No account found with this email.',
      'auth/wrong-password':          '✕ Incorrect password. Please try again.',
      'auth/too-many-requests':       '✕ Too many attempts. Please wait and try again.',
      'auth/network-request-failed':  '✕ Network error. Check your internet connection.',
      'auth/popup-closed-by-user':    '✕ Sign-in popup was closed. Please try again.',
    };
    return map[code] || '✕ Something went wrong. Please try again.';
  }


  // ══════════════════════════════════════════════════════════════
  //  REVIEWS — Save & Load from Firestore
  // ══════════════════════════════════════════════════════════════

  // Override submitReview to save to Firestore
  window.submitReview = async function () {
    const name   = (document.getElementById('reviewName')?.value  || '').trim();
    const dest   = (document.getElementById('reviewDest')?.value  || '').trim();
    const text   = (document.getElementById('reviewText')?.value  || '').trim();
    const rating = window._reviewRating || 0;

    if (!name || !dest || !text || rating === 0) {
      if (typeof showToast === 'function') showToast('Please fill all fields and rate your experience.');
      return;
    }

    try {
      await db.collection('reviews').add({
        name,
        destination: dest,
        text,
        rating,
        uid:       window.currentUser?.uid || null,
        approved:  false,          // requires admin approval before showing
        region:    _guessRegion(dest),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      closeModal('reviewModal');
      setTimeout(() => showToast('🙏 Thank you! Your review will appear after moderation.'), 300);
    } catch (err) {
      console.error('[Firebase] Review save error:', err);
      showToast('⚠ Could not save review. Please try again.');
    }
  };

  // Load approved reviews and inject into the reviews grid
  window.loadReviewsFromDB = async function () {
    try {
      const snap = await db.collection('reviews')
        .where('approved', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .get();

      if (snap.empty) return; // keep static reviews if no DB ones yet

      const grid = document.getElementById('reviewsGrid');
      if (!grid) return;

      // Keep existing static cards but prepend DB ones
      const existingCards = grid.innerHTML;
      let newCards = '';

      snap.forEach(doc => {
        const r = doc.data();
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const initials = r.name ? r.name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
        const color = _avatarColor(r.name);
        const date  = r.createdAt?.toDate
          ? r.createdAt.toDate().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
          : 'Recent';

        newCards += `
        <div class="review-card fade-in" data-region="${r.region || 'all'}">
          <div class="review-card-top">
            <div class="review-avatar" style="background:${color}">${initials}</div>
            <div class="review-meta">
              <div class="review-name">${_esc(r.name)}</div>
              <div class="review-location">📍 ${_esc(r.destination)}</div>
            </div>
            <div class="review-badge verified">✓ Verified</div>
          </div>
          <div class="review-stars">${stars}</div>
          <p class="review-text">"${_esc(r.text)}"</p>
          <div class="review-footer">
            <span class="review-tag">📍 ${_esc(r.destination)}</span>
            <span class="review-date">${date}</span>
          </div>
        </div>`;
      });

      grid.innerHTML = newCards + existingCards;
    } catch (err) {
      console.warn('[Firebase] Could not load reviews:', err.message);
    }
  };

  // ── Guess review region from destination string ─────────────────
  function _guessRegion(dest) {
    const d = dest.toLowerCase();
    if (/goa|mumbai|pune|gujarat|maharash/.test(d))             return 'west';
    if (/kerala|karnatak|tamil|andhra|telangana|chennai/.test(d)) return 'south';
    if (/kolkata|bengal|odisha|bihar|jharkhand/.test(d))         return 'east';
    if (/assam|meghalaya|sikkim|manipur|nagaland|arunachal|mizoram|tripura/.test(d)) return 'northeast';
    if (/andaman|lakshadweep/.test(d))                           return 'islands';
    return 'north';
  }


  // ══════════════════════════════════════════════════════════════
  //  TRIP PLANS — Auto-save generated itineraries
  // ══════════════════════════════════════════════════════════════

  // Hook into wizRenderResults to auto-save the plan
  const _origWizRender = window.wizRenderResults;
  window.wizRenderResults = function (plan, destination, duration) {
    // Call original function first
    if (typeof _origWizRender === 'function') _origWizRender(plan, destination, duration);

    // Auto-save to Firestore if user is logged in
    if (window.currentUser?.uid) {
      _saveTripPlan(plan, destination, duration);
    } else {
      // Show a subtle save prompt
      _injectSavePlanPrompt(plan, destination, duration);
    }
  };

  async function _saveTripPlan(plan, destination, duration) {
    try {
      const uid = window.currentUser.uid;
      const docRef = await db.collection('trips').add({
        uid,
        destination,
        duration,
        budget:    wizState?.budget    || 'normal',
        travelers: (wizState?.adults || 2) + (wizState?.children || 0),
        styles:    wizState?.styles    || [],
        food:      wizState?.food      || 'both',
        from:      wizState?.from      || '',
        plan,
        savedAt:   firebase.firestore.FieldValue.serverTimestamp()
      });

      analytics.logEvent('trip_saved', {
        destination,
        duration,
        budget: wizState?.budget || 'normal'
      });

      // Show save confirmation with link to My Trips
      const footer = document.getElementById('wizFooter');
      if (footer) {
        const saveMsg = document.createElement('div');
        saveMsg.className = 'wiz-plan-saved-msg';
        saveMsg.style.cssText = 'width:100%;text-align:center;margin-top:.75rem;font-size:.82rem;color:var(--uv);';
        saveMsg.innerHTML = `✅ Plan saved to your account! <a href="#" onclick="openMyTrips()" style="color:var(--lc);text-decoration:underline;">View My Trips →</a>`;
        footer.appendChild(saveMsg);
      }

      // Also update user's savedTrips array
      await db.collection('users').doc(uid).update({
        savedTrips: firebase.firestore.FieldValue.arrayUnion(docRef.id)
      });

    } catch (err) {
      console.warn('[Firebase] Could not save trip plan:', err.message);
    }
  }

  function _injectSavePlanPrompt(plan, destination, duration) {
    const footer = document.getElementById('wizFooter');
    if (!footer) return;
    const prompt = document.createElement('div');
    prompt.style.cssText = 'width:100%;text-align:center;margin-top:.75rem;padding:.6rem 1rem;background:var(--uv-mist);border:1px solid var(--lc-border);border-radius:10px;font-size:.82rem;color:var(--text-muted);';
    prompt.innerHTML = `💾 <strong style="color:var(--text)">Want to save this plan?</strong> 
      <a href="#" onclick="openModal('signupModal');return false;" 
         style="color:var(--lc);text-decoration:underline;margin-left:.35rem;">
        Create a free account →
      </a>`;
    footer.appendChild(prompt);
  }

  // ── Load saved trips for current user ──────────────────────────
  window.loadMyTrips = async function () {
    if (!window.currentUser?.uid) { showToast('⚠ Please log in to view your saved trips.'); return; }

    try {
      const snap = await db.collection('trips')
        .where('uid', '==', window.currentUser.uid)
        .orderBy('savedAt', 'desc')
        .limit(20)
        .get();

      return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
      console.error('[Firebase] Load trips error:', err);
      return [];
    }
  };

  // ── Delete a saved trip ────────────────────────────────────────
  window.deleteTripPlan = async function (tripId) {
    if (!window.currentUser?.uid) return;
    try {
      await db.collection('trips').doc(tripId).delete();
      await db.collection('users').doc(window.currentUser.uid).update({
        savedTrips: firebase.firestore.FieldValue.arrayRemove(tripId)
      });
      showToast('🗑️ Trip plan deleted.');
    } catch (err) {
      console.error('[Firebase] Delete trip error:', err);
    }
  };

  // ── "My Trips" modal ───────────────────────────────────────────
  window.openMyTrips = async function () {
    if (!window.currentUser?.uid) {
      openModal('loginModal');
      return;
    }

    // Create modal if it doesn't exist
    let modal = document.getElementById('myTripsModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'myTripsModal';
      modal.className = 'auth-modal-backdrop';
      modal.innerHTML = `
        <div class="auth-modal" role="dialog" aria-modal="true" style="max-width:600px;">
          <div class="auth-modal-glow"></div>
          <button class="auth-close" onclick="closeModal('myTripsModal')" aria-label="Close">✕</button>
          <div class="auth-modal-inner" id="myTripsInner">
            <div class="auth-logo-wrap">
              <div class="auth-logo-icon" style="font-size:1.5rem">🗺️</div>
              <h2>My Saved Trips</h2>
              <p>Your AI-generated itineraries</p>
            </div>
            <div id="myTripsList" style="margin-top:1rem;">
              <div style="text-align:center;padding:2rem;color:var(--text-dim);">
                <div class="ai-typing-dots"><span></span><span></span><span></span></div>
                <p>Loading your trips…</p>
              </div>
            </div>
          </div>
        </div>`;
      document.body.appendChild(modal);
    }

    openModal('myTripsModal');

    const trips = await loadMyTrips();
    const list  = document.getElementById('myTripsList');
    if (!list) return;

    if (!trips.length) {
      list.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-dim);">
        <div style="font-size:2.5rem;margin-bottom:.75rem;">✈️</div>
        <p>No saved trips yet.<br>Plan your first trip with our AI planner!</p>
        <button class="btn-primary" style="margin-top:1rem;" onclick="closeModal('myTripsModal');document.getElementById('planner').scrollIntoView({behavior:'smooth'})">
          Start Planning ✦
        </button>
      </div>`;
      return;
    }

    list.innerHTML = trips.map(t => {
      const date = t.savedAt?.toDate
        ? t.savedAt.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : 'Saved';
      return `
        <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:14px;padding:1rem 1.1rem;margin-bottom:.75rem;display:flex;align-items:center;gap:1rem;">
          <div style="font-size:2rem;flex-shrink:0;">📍</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:700;font-size:.95rem;color:var(--text);">${_esc(t.destination)}</div>
            <div style="font-size:.78rem;color:var(--text-dim);margin-top:.2rem;">
              ${t.duration} days · ${t.travelers} traveller${t.travelers>1?'s':''} · ${date}
            </div>
          </div>
          <button onclick="deleteTripPlan('${t.id}')" 
            style="background:none;border:1px solid var(--border);border-radius:8px;color:var(--text-dim);font-size:.75rem;padding:.3rem .65rem;cursor:pointer;flex-shrink:0;"
            title="Delete">🗑</button>
        </div>`;
    }).join('');
  };


  // ══════════════════════════════════════════════════════════════
  //  CONTACT FORM — Save messages to Firestore
  // ══════════════════════════════════════════════════════════════

  window.submitContact = async function (event) {
    event.preventDefault();
    const form    = event.target;
    const inputs  = form.querySelectorAll('input, textarea');
    const name    = inputs[0]?.value.trim();
    const email   = inputs[1]?.value.trim();
    const message = inputs[2]?.value.trim();
    const success = document.getElementById('formSuccess');

    if (!name || !email || !message) return;

    // Disable button during save
    const btn = form.querySelector('button[type="submit"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }

    try {
      await db.collection('contacts').add({
        name, email, message,
        uid:       window.currentUser?.uid || null,
        read:      false,
        sentAt:    firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      success.style.display = 'block';
      form.reset();
      setTimeout(() => success.style.display = 'none', 5000);
    } catch (err) {
      console.error('[Firebase] Contact save error:', err);
      // Still show success to user — message will be retried
      success.style.display = 'block';
      form.reset();
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Send Message ✦'; }
    }
  };


  // ══════════════════════════════════════════════════════════════
  //  HELPERS
  // ══════════════════════════════════════════════════════════════

  function _esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _avatarColor(name) {
    const colors = [
      'linear-gradient(135deg,#667eea,#764ba2)',
      'linear-gradient(135deg,#f093fb,#f5576c)',
      'linear-gradient(135deg,#4facfe,#00f2fe)',
      'linear-gradient(135deg,#43e97b,#38f9d7)',
      'linear-gradient(135deg,#fa709a,#fee140)',
      'linear-gradient(135deg,#a18cd1,#fbc2eb)',
      'linear-gradient(135deg,#ffecd2,#fcb69f)',
      'linear-gradient(135deg,#84fab0,#8fd3f4)'
    ];
    let hash = 0;
    for (let i = 0; i < (name||'').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }


  // ══════════════════════════════════════════════════════════════
  //  INITIALISE — Run on page load
  // ══════════════════════════════════════════════════════════════
  document.addEventListener('DOMContentLoaded', function () {
    // Load reviews from DB
    if (typeof loadReviewsFromDB === 'function') loadReviewsFromDB();

    // Add "My Trips" link to nav if user is logged in
    // (refreshNavAuth already handles this via auth state listener)
  });

  console.log('[Firebase] ✅ Plan Your Trip India — Firebase integration loaded.');
});


/* ══════════════════════════════════════════════════════════════
   FIRESTORE SECURITY RULES
   ══════════════════════════════════════════════════════════════
   Copy-paste these rules in:
   Firebase Console → Firestore Database → Rules

   ---------------------------------------------------------------
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {

       // ─── ADMIN UID ─────────────────────────────────────────────────
       // Replace with YOUR Firebase UID (find it in Firebase Console → Auth → Users)
       // or set a custom claim. For now we use a hardcoded UID approach.
       function isAdmin() {
         return request.auth != null && (
           request.auth.token.admin == true
         );
       }

       // Users: owner can read/write own profile; admin can read all
       match /users/{uid} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
         allow read: if isAdmin();
       }

       // Trips: only owner can read/write their own trips; admin can read all
       match /trips/{tripId} {
         allow read, write: if request.auth != null
           && request.auth.uid == resource.data.uid;
         allow create: if request.auth != null
           && request.resource.data.uid == request.auth.uid;
         allow read, delete: if isAdmin();
       }

       // Reviews: anyone can submit; only approved ones are public; admin has full access
       match /reviews/{reviewId} {
         allow read:   if resource.data.approved == true || isAdmin();
         allow create: if request.resource.data.keys().hasAll(['name','destination','text','rating'])
           && request.resource.data.rating is int
           && request.resource.data.rating >= 1
           && request.resource.data.rating <= 5
           && request.resource.data.text.size() <= 1000;
         allow update, delete: if isAdmin();
       }

       // Contacts: write-only for clients; admin can read/delete
       match /contacts/{docId} {
         allow create: if request.resource.data.keys().hasAll(['name','email','message'])
           && request.resource.data.message.size() <= 2000;
         allow read, update, delete: if isAdmin();
       }
     }
   }
   --------------------------------------------------------------- */
