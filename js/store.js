/* Stockage des données dans le navigateur (localStorage). */
const STORAGE_KEY = 'cabinet-elise-v1';

const DEFAULT_SETTINGS = {
  nom: 'Votre nom',
  profession: 'Psychologue',
  adresse: '12 rue des Lilas\n75011 Paris',
  tel: '06 00 00 00 00',
  email: 'contact@exemple.fr',
  siret: '',
  adeli: '',
  iban: '',
  tarif: 60,
  duree: 50,
  delaiPaiement: 15,
  mentionTVA: 'TVA non applicable, article 261-4-1° du CGI',
  visioBase: 'https://meet.jit.si/',
  // 0 = dimanche ... 6 = samedi
  horaires: {
    1: { ouvert: true, debut: '09:00', fin: '19:00' },
    2: { ouvert: true, debut: '09:00', fin: '19:00' },
    3: { ouvert: true, debut: '09:00', fin: '19:00' },
    4: { ouvert: true, debut: '09:00', fin: '19:00' },
    5: { ouvert: true, debut: '09:00', fin: '17:00' },
    6: { ouvert: false, debut: '09:00', fin: '12:00' },
    0: { ouvert: false, debut: '09:00', fin: '12:00' },
  },
  modeles: {
    rappel: 'Bonjour {{prenom}}, je vous rappelle notre rendez-vous {{quand}}{{lieu}}. En cas d\'empêchement, merci de me prévenir 24h à l\'avance. {{praticien}}',
    confirmation: 'Bonjour {{prenom}}, votre rendez-vous du {{quand}} est bien confirmé. À bientôt, {{praticien}}',
    visio: 'Bonjour {{prenom}}, voici le lien pour notre séance en visio {{quand}} : {{lien}} — Il suffit de cliquer, aucune installation n\'est nécessaire. {{praticien}}',
    relance: 'Bonjour {{prenom}}, sauf erreur de ma part, la facture n°{{numero}} d\'un montant de {{montant}} (échéance le {{echeance}}) reste à régler. Merci d\'avance. {{praticien}}',
  },
};

const Store = {
  data: null,

  empty() {
    return {
      settings: structuredClone(DEFAULT_SETTINGS),
      clients: [], events: [], factures: [], depenses: [],
      courriers: [], messages: [], demandes: [],
    };
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.data = raw ? JSON.parse(raw) : null;
    } catch (e) { this.data = null; }
    if (!this.data) {
      this.data = this.empty();
      Demo.seed(this);
      this.save();
    }
    // Complète les réglages ajoutés dans une version ultérieure
    const base = this.empty();
    this.data.settings = { ...base.settings, ...this.data.settings,
      modeles: { ...base.settings.modeles, ...(this.data.settings.modeles || {}) } };
    for (const k of Object.keys(base)) if (!this.data[k]) this.data[k] = base[k];
  },

  save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data)); } catch (e) { /* stockage indisponible : données gardées en mémoire */ }
  },

  get settings() { return this.data.settings; },

  list(coll) { return this.data[coll]; },
  get(coll, id) { return this.data[coll].find(x => x.id === id); },
  upsert(coll, obj) {
    if (!obj.id) obj.id = U.uid();
    const i = this.data[coll].findIndex(x => x.id === obj.id);
    if (i >= 0) this.data[coll][i] = { ...this.data[coll][i], ...obj };
    else this.data[coll].push(obj);
    this.save();
    return this.get(coll, obj.id);
  },
  remove(coll, id) {
    this.data[coll] = this.data[coll].filter(x => x.id !== id);
    this.save();
  },

  clientName(id) {
    const c = this.get('clients', id);
    return c ? `${c.prenom} ${c.nom}` : '—';
  },
  clientsSorted() {
    return [...this.data.clients].sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, 'fr'));
  },

  // Numérotation continue et chronologique, obligatoire pour les factures
  nextInvoiceNumber(date = new Date()) {
    const year = new Date(date).getFullYear();
    const nums = this.data.factures
      .filter(f => f.numero && f.numero.startsWith(year + '-'))
      .map(f => parseInt(f.numero.split('-')[1], 10));
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    return `${year}-${String(n).padStart(4, '0')}`;
  },

  invoiceTotal(f) {
    return (f.lignes || []).reduce((s, l) => s + (Number(l.qte) || 0) * (Number(l.pu) || 0), 0);
  },

  // brouillon | envoyee | retard | payee
  invoiceStatus(f) {
    if (f.statut === 'payee') return 'payee';
    if (f.statut === 'brouillon') return 'brouillon';
    if (f.echeance && f.echeance < U.today()) return 'retard';
    return 'envoyee';
  },

  eventsBetween(start, end) {
    const s = new Date(start).getTime(), e = new Date(end).getTime();
    return this.data.events
      .filter(ev => { const t = new Date(ev.start).getTime(); return t >= s && t < e; })
      .sort((a, b) => a.start.localeCompare(b.start));
  },

  // Créneaux libres pour la prise de rendez-vous en ligne
  freeSlots(dateStr) {
    const d = new Date(dateStr + 'T00:00');
    const h = this.settings.horaires[d.getDay()];
    if (!h || !h.ouvert) return [];
    const duree = Number(this.settings.duree) || 50;
    const pas = Math.max(duree, 30) + 10; // séance + pause
    const dayEvents = this.eventsBetween(d, U.addDays(d, 1)).filter(e => e.statut !== 'annule');
    const pending = this.data.demandes.filter(x => x.statut === 'attente' && x.start.startsWith(dateStr));
    const busy = [...dayEvents.map(e => [new Date(e.start).getTime(), new Date(e.start).getTime() + e.duree * 60000]),
                  ...pending.map(p => [new Date(p.start).getTime(), new Date(p.start).getTime() + duree * 60000])];
    const slots = [];
    let t = new Date(U.fromDateTime(dateStr, h.debut)).getTime();
    const end = new Date(U.fromDateTime(dateStr, h.fin)).getTime();
    const now = Date.now();
    while (t + duree * 60000 <= end) {
      const tEnd = t + duree * 60000;
      if (t > now && !busy.some(([bs, be]) => t < be && tEnd > bs)) slots.push(new Date(t));
      t += pas * 60000;
    }
    return slots;
  },

  visioLink() {
    const words = ['seance', 'cabinet', 'rdv'];
    const room = `${words[Math.floor(Math.random() * words.length)]}-${U.uid()}${U.uid().slice(-4)}`;
    return (this.settings.visioBase || 'https://meet.jit.si/') + room;
  },
};
