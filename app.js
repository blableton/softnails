/* ============================================================
   SoftNails – app.js
   Łączy się z Google Sheets przez Google Apps Script Web App
   ============================================================ */

// ╔══════════════════════════════════════════════════════╗
// ║  WKLEJ TUTAJ URL SWOJEGO GOOGLE APPS SCRIPT          ║
// ╚══════════════════════════════════════════════════════╝
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby_ri8Xays-jIU-L9E6lGUAyJBKZjDU7BXUMJz6YZeCkV5HVjEkBEmFUgjiL8PI224Y_A/exec';


// ── Aktualny licznik wizyt (zapisany lokalnie) ──────────
let todayCount = 0;

function loadTodayCount() {
  const key = 'softnails_count_' + getTodayKey();
  todayCount = parseInt(localStorage.getItem(key) || '0', 10);
  updateCountDisplay();
}

function incrementTodayCount() {
  const key = 'softnails_count_' + getTodayKey();
  todayCount++;
  localStorage.setItem(key, todayCount);
  updateCountDisplay();
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function updateCountDisplay() {
  const el = document.getElementById('todayCount');
  if (el) el.textContent = todayCount;
}


// ── Wyświetl datę ───────────────────────────────────────
function updateDate() {
  const days   = ['Niedziela','Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota'];
  const months = [
    'stycznia','lutego','marca','kwietnia','maja','czerwca',
    'lipca','sierpnia','września','października','listopada','grudnia'
  ];
  const now = new Date();
  document.getElementById('currentDate').textContent =
    `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}


// ── Walidacja z wizualnym zaznaczeniem błędu ────────────
function setError(wrapperId) {
  const el = document.getElementById(wrapperId);
  if (!el) return;
  el.classList.add('error-field');
  // Wyczyść po animacji
  setTimeout(() => el.classList.remove('error-field'), 700);
}


// ── Powiadomienie ───────────────────────────────────────
let notifTimeout = null;

function showNotification(message, type) {
  const el = document.getElementById('notification');
  el.textContent = message;
  el.className = `notification ${type}`;

  clearTimeout(notifTimeout);
  notifTimeout = setTimeout(() => {
    el.className = 'notification hidden';
  }, 3500);
}


// ── Stan przycisku ──────────────────────────────────────
function setLoading(loading) {
  const btn     = document.getElementById('submitBtn');
  const btnText = btn.querySelector('.btn-text');
  const btnIcon = btn.querySelector('.btn-icon');

  btn.disabled = loading;

  if (loading) {
    btnText.textContent = 'Zapisywanie...';
    btnIcon.textContent = '⟳';
    btn.classList.add('loading');
  } else {
    btnText.textContent = 'Zapisz wizytę';
    btnIcon.textContent = '→';
    btn.classList.remove('loading');
  }
}


// ── Wysyłanie do Google Sheets ──────────────────────────
async function sendToSheets(nazwaIG, kwota, platnosc) {
  const params = new URLSearchParams({ nazwaIG, kwota, platnosc });
  const url    = `${SCRIPT_URL}?${params.toString()}`;

  const response = await fetch(url, {
    method:   'GET',
    redirect: 'follow',
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  // Spróbuj odczytać odpowiedź (nieobowiązkowe)
  try {
    const text = await response.text();
    if (text.includes('"status":"error"')) {
      const json = JSON.parse(text);
      throw new Error(json.message || 'Błąd skryptu');
    }
  } catch (_) {
    // Jeśli nie można odczytać odpowiedzi – i tak OK
  }
}


// ── Obsługa formularza ──────────────────────────────────
document.getElementById('visitForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const nazwaIG = document.getElementById('nazwaIG').value.trim();
  const kwota   = document.getElementById('kwota').value.trim();
  const platnosc = document.getElementById('platnosc').value;

  // Walidacja
  let valid = true;

  if (!nazwaIG) {
    setError('nazwaIG-wrapper');
    showNotification('Podaj nazwę IG! 📸', 'error');
    valid = false;
  } else if (!kwota || isNaN(kwota) || Number(kwota) <= 0) {
    setError('kwota-wrapper');
    showNotification('Podaj prawidłową kwotę! 💰', 'error');
    valid = false;
  } else if (!platnosc) {
    setError('platnosc-wrapper');
    showNotification('Wybierz metodę płatności! 💳', 'error');
    valid = false;
  }

  if (!valid) return;

  // Sprawdź czy URL skryptu jest ustawiony
  if (SCRIPT_URL === 'WKLEJ_TUTAJ_URL_APPS_SCRIPT') {
    showNotification('Najpierw skonfiguruj Apps Script! ⚙️', 'error');
    return;
  }

  setLoading(true);

  try {
    await sendToSheets(nazwaIG, kwota, platnosc);
    showNotification('Wizyta zapisana! ✨', 'success');
    incrementTodayCount();
    document.getElementById('visitForm').reset();
    setTimeout(() => document.getElementById('nazwaIG').focus(), 200);
  } catch (err) {
    console.error('Błąd zapisu:', err);
    showNotification('Błąd połączenia. Sprawdź internet. ❌', 'error');
  } finally {
    setLoading(false);
  }
});


// ── Start ───────────────────────────────────────────────
updateDate();
loadTodayCount();
