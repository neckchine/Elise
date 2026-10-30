/* Connexion Cal.com : importe dans l'agenda les réservations faites sur votre page Cal.com.
   Utilise l'API v2 de Cal.com avec une clé API personnelle (Cal.com → Paramètres → Développeur → Clés API). */
const CALCOM_API = 'https://api.cal.com/v2';
const CALCOM_VERSION = '2024-08-13';

const CalCom = {
  syncing: false,

  conf() {
    return Store.settings.calcom || {};
  },

  connected() {
    return !!this.conf().apiKey;
  },

  async request(path, params = {}) {
    const url = new URL(CALCOM_API + path);
    Object.entries(params).forEach(([k, v]) => v != null && url.searchParams.set(k, v));
    let res;
    try {
      res = await fetch(url, { headers: { Authorization: `Bearer ${this.conf().apiKey}`, 'cal-api-version': CALCOM_VERSION } });
    } catch (e) {
      throw new Error('Impossible de joindre Cal.com depuis cette page. Vérifiez votre connexion internet. Si vous utilisez l\'aperçu en ligne sur claude.ai, ouvrez plutôt l\'application installée (fichier index.html ou site hébergé) : l\'aperçu bloque les connexions vers d\'autres sites.');
    }
    if (res.status === 401 || res.status === 403) throw new Error('Cal.com refuse la clé API. Vérifiez-la dans Cal.com → Paramètres → Développeur → Clés API, puis collez-la à nouveau.');
    if (!res.ok) throw new Error(`Cal.com a répondu avec une erreur (${res.status}). Réessayez dans quelques minutes.`);
    const json = await res.json();
    const data = Array.isArray(json.data) ? json.data : (json.data?.bookings || json.bookings || []);
    return data;
  },

  // Récupère les réservations récentes et à venir, page par page
  async fetchBookings() {
    const afterStart = U.addDays(new Date(), -30).toISOString();
    const all = [];
    for (const status of ['upcoming', 'past', 'cancelled']) {
      for (let page = 0; page < 5; page++) {
        const take = 100;
        const list = await this.request('/bookings', { status, afterStart, take, skip: page * take });
        all.push(...list);
        if (list.length < take) break;
      }
    }
    return all;
  },

  // Trouve le client par e-mail ou téléphone, sinon le crée
  clientFor(b) {
    const a = (b.attendees || [])[0] || {};
    const f = b.bookingFieldsResponses || b.responses || {};
    const email = (a.email || f.email || '').trim();
    const tel = a.phoneNumber || f.attendeePhoneNumber || f.phone || f.phoneNumber || '';
    const existing = Store.list('clients').find(c =>
      (email && c.email && c.email.toLowerCase() === email.toLowerCase()) ||
      (tel && c.tel && U.phoneIntl(c.tel) === U.phoneIntl(tel)));
    if (existing) {
      if (!existing.tel && tel) Store.upsert('clients', { id: existing.id, tel });
      return existing.id;
    }
    const name = (a.name || f.name || 'Client Cal.com').trim();
    const [prenom, ...rest] = name.split(/\s+/);
    return Store.upsert('clients', {
      prenom, nom: rest.join(' '), tel, email, notes: f.notes ? `Motif : ${f.notes}` : '',
      createdAt: new Date().toISOString(), source: 'calcom',
    }).id;
  },

  modeOf(b) {
    const loc = String(b.meetingUrl || b.location || '');
    const url = (loc.match(/https?:\/\/\S+/) || [])[0];
    const visio = !!url || /integrations:|video|visio|meet|zoom|daily|teams/i.test(loc);
    return { mode: visio ? 'visio' : 'cabinet', visioUrl: url || undefined };
  },

  importBookings(bookings) {
    const stats = { nouveaux: 0, modifies: 0, annules: 0, attente: 0 };
    const seen = new Set();
    for (const b of bookings) {
      const uid = b.uid || String(b.id);
      if (!uid || seen.has(uid)) continue;
      seen.add(uid);
      const status = String(b.status || '').toLowerCase();
      const existing = Store.list('events').find(e => e.calUid === uid);
      const start = b.start || b.startTime;
      if (!start) continue;

      if (status === 'cancelled' || status === 'rejected') {
        if (existing && existing.statut !== 'annule') { Store.upsert('events', { id: existing.id, statut: 'annule' }); stats.annules++; }
        continue;
      }
      if (status === 'pending' || status === 'unconfirmed') { stats.attente++; continue; }

      const end = b.end || b.endTime;
      const duree = Number(b.duration) || (end ? Math.round((new Date(end) - new Date(start)) / 60000) : Number(Store.settings.duree));
      const { mode, visioUrl } = this.modeOf(b);
      const startIso = new Date(start).toISOString();
      if (existing) {
        if (existing.start !== startIso || existing.duree !== duree) {
          Store.upsert('events', { id: existing.id, start: startIso, duree });
          stats.modifies++;
        }
        continue;
      }
      Store.upsert('events', {
        type: 'rdv', clientId: this.clientFor(b), start: startIso, duree, mode,
        visioUrl: visioUrl || (mode === 'visio' ? Store.visioLink() : undefined),
        statut: new Date(startIso) < new Date() ? 'honore' : 'prevu', tarif: Number(Store.settings.tarif),
        notes: b.description || '', source: 'calcom', calUid: uid, calTitle: b.title || '',
      });
      stats.nouveaux++;
    }
    return stats;
  },

  async sync({ silent = false } = {}) {
    if (!this.connected() || this.syncing) return null;
    this.syncing = true;
    try {
      const stats = this.importBookings(await this.fetchBookings());
      Store.settings.calcom = { ...this.conf(), lastSync: new Date().toISOString(), lastError: '' };
      Store.save();
      const parts = [];
      if (stats.nouveaux) parts.push(`${stats.nouveaux} nouvelle(s) réservation(s)`);
      if (stats.modifies) parts.push(`${stats.modifies} déplacée(s)`);
      if (stats.annules) parts.push(`${stats.annules} annulée(s)`);
      if (parts.length || !silent) UI.toast(parts.length ? `Cal.com : ${parts.join(', ')}` : 'Cal.com : agenda à jour');
      App.refresh();
      return stats;
    } catch (e) {
      Store.settings.calcom = { ...this.conf(), lastError: e.message };
      Store.save();
      if (!silent) UI.toast('Synchronisation Cal.com impossible', 'warn');
      if (!silent) App.refresh();
      return null;
    } finally {
      this.syncing = false;
    }
  },

  // Ligne d'état affichée dans les Paramètres et l'agenda
  statusText() {
    const c = this.conf();
    if (!c.apiKey) return 'Non connecté';
    if (c.lastError) return c.lastError;
    if (c.lastSync) return `Synchronisé ${U.sameDay(c.lastSync, new Date()) ? 'à ' + U.fmtTime(c.lastSync) : 'le ' + U.fmtDate(c.lastSync) + ' à ' + U.fmtTime(c.lastSync)}`;
    return 'Connecté, pas encore synchronisé';
  },

  start() {
    // Synchronise au démarrage puis toutes les 5 minutes
    if (this.connected() && this.conf().auto !== false) this.sync({ silent: true });
    setInterval(() => { if (this.connected() && this.conf().auto !== false) this.sync({ silent: true }); }, 5 * 60000);
  },
};
