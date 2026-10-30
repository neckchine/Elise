/* Petites fonctions utilitaires partagées par toute l'application. */
const U = {
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  },

  pad(n) { return String(n).padStart(2, '0'); },

  // Date locale au format AAAA-MM-JJ (sans décalage UTC)
  isoDate(d) {
    d = new Date(d);
    return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`;
  },
  isoTime(d) {
    d = new Date(d);
    return `${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`;
  },
  fromDateTime(date, time) {
    const [y, m, j] = date.split('-').map(Number);
    const [h, min] = (time || '00:00').split(':').map(Number);
    return new Date(y, m - 1, j, h, min).toISOString();
  },

  today() { return U.isoDate(new Date()); },
  addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; },
  startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; },
  startOfWeek(d) {
    const x = U.startOfDay(d);
    const day = (x.getDay() + 6) % 7; // lundi = 0
    return U.addDays(x, -day);
  },
  sameDay(a, b) { return U.isoDate(a) === U.isoDate(b); },

  fmtDate(d, opts = { weekday: 'short', day: 'numeric', month: 'short' }) {
    return new Date(d).toLocaleDateString('fr-FR', opts);
  },
  fmtDateLong(d) {
    return new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  },
  fmtDateShort(d) { return new Date(d).toLocaleDateString('fr-FR'); },
  fmtTime(d) { return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }); },
  fmtMoney(n) {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);
  },
  monthName(m) {
    return new Date(2000, m, 1).toLocaleDateString('fr-FR', { month: 'long' });
  },

  // 06 12 34 56 78 -> 33612345678 (format attendu par WhatsApp)
  phoneIntl(tel) {
    let t = String(tel || '').replace(/[^\d+]/g, '');
    if (t.startsWith('+')) return t.slice(1);
    if (t.startsWith('00')) return t.slice(2);
    if (t.startsWith('0')) return '33' + t.slice(1);
    return t;
  },
  waLink(tel, text) {
    return `https://wa.me/${U.phoneIntl(tel)}?text=${encodeURIComponent(text)}`;
  },
  mailto(email, subject, body) {
    return `mailto:${email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },

  // Remplace {{cle}} par les valeurs fournies
  fill(tpl, vars) {
    return String(tpl).replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
  },

  nl2br(s) { return U.esc(s).replace(/\n/g, '<br>'); },

  download(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  csv(rows) {
    return '﻿' + rows.map(r => r.map(v => {
      const s = String(v ?? '');
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(';')).join('\n');
  },

  form(el) {
    const o = {};
    new FormData(el).forEach((v, k) => { o[k] = typeof v === 'string' ? v.trim() : v; });
    return o;
  },
};
