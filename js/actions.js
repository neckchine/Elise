/* Actions partagées entre les écrans : rendez-vous, factures, messages, clients. */
const Actions = {

  /* ---------- Messages WhatsApp / e-mail ---------- */

  vars({ client, event, facture, lien } = {}) {
    const s = Store.settings;
    const v = { praticien: s.nom, prenom: client?.prenom || '', nom: client?.nom || '' };
    if (event) {
      v.quand = `le ${U.fmtDate(event.start, { weekday: 'long', day: 'numeric', month: 'long' })} à ${U.fmtTime(event.start)}`;
      v.lieu = event.mode === 'visio' ? ' en visio' : ` au cabinet (${s.adresse.replace(/\n/g, ', ')})`;
      v.lien = event.visioUrl || lien || '';
      v.heure = U.fmtTime(event.start);
      v.acces = event.mode === 'visio' && v.lien ? ` Lien de connexion : ${v.lien}` : '';
    }
    if (facture) {
      v.numero = facture.numero || '';
      v.montant = U.fmtMoney(Store.invoiceTotal(facture));
      v.echeance = facture.echeance ? U.fmtDateShort(facture.echeance) : '';
    }
    return v;
  },

  whatsapp(clientId, text, type = 'libre') {
    const c = Store.get('clients', clientId);
    if (!c || !c.tel) { UI.toast('Ce client n\'a pas de numéro de téléphone', 'warn'); return false; }
    U.openLink(U.waLink(c.tel, text));
    Store.upsert('messages', { clientId, texte: text, type, canal: 'whatsapp', date: new Date().toISOString() });
    return true;
  },

  // Ouvre une fenêtre de prévisualisation du message avant envoi
  composeMessage({ clientId, text, type = 'libre', title = 'Envoyer un message', email, onSent }) {
    const c = Store.get('clients', clientId);
    UI.modal({
      title,
      body: `
        <p class="muted">À : <strong>${U.esc(Store.clientName(clientId))}</strong> ${c?.tel ? '· ' + U.esc(c.tel) : ''}</p>
        <label class="field"><span>Message</span><textarea name="texte" rows="7">${U.esc(text)}</textarea></label>
        <p class="hint">WhatsApp s'ouvre avec le message déjà rédigé : il ne reste qu'à appuyer sur « Envoyer ».</p>`,
      footer: `
        ${email ? `<button class="btn ghost" data-mail>${icon('letter', 18)} Par e-mail</button>` : ''}
        <button class="btn whatsapp" data-wa>${icon('whatsapp', 18)} Envoyer sur WhatsApp</button>`,
      onMount(el, api) {
        const txt = () => el.querySelector('textarea').value;
        el.querySelector('[data-wa]').onclick = () => {
          if (Actions.whatsapp(clientId, txt(), type)) { api.close(); onSent?.('whatsapp'); App.refresh(); }
        };
        el.querySelector('[data-mail]')?.addEventListener('click', () => {
          if (!c?.email) { UI.toast('Ce client n\'a pas d\'adresse e-mail', 'warn'); return; }
          location.href = U.mailto(c.email, email, txt());
          Store.upsert('messages', { clientId, texte: txt(), type, canal: 'email', date: new Date().toISOString() });
          api.close(); onSent?.('email'); App.refresh();
        });
      },
    });
  },

  sendReminder(eventId) {
    const ev = Store.get('events', eventId);
    const client = Store.get('clients', ev.clientId);
    const tpl = ev.mode === 'visio' ? Store.settings.modeles.visio : Store.settings.modeles.rappel;
    Actions.composeMessage({
      clientId: ev.clientId, type: 'rappel', title: 'Rappel de rendez-vous',
      text: U.fill(tpl, Actions.vars({ client, event: ev })),
      email: 'Rappel de votre rendez-vous',
      onSent: () => Store.upsert('events', { id: ev.id, rappels: { ...(Store.get('events', ev.id).rappels || {}), veille: new Date().toISOString() } }),
    });
  },

  sendVisio(eventId) {
    const ev = Store.get('events', eventId);
    if (!ev.visioUrl) Store.upsert('events', { id: ev.id, visioUrl: Store.visioLink() });
    const e2 = Store.get('events', eventId);
    const client = Store.get('clients', e2.clientId);
    Actions.composeMessage({
      clientId: e2.clientId, type: 'visio', title: 'Envoyer le lien de visio',
      text: U.fill(Store.settings.modeles.visio, Actions.vars({ client, event: e2 })),
      email: 'Lien de notre séance en visio',
    });
  },

  /* ---------- Rendez-vous ---------- */

  openEvent(input = {}) {
    const s = Store.settings;
    const existing = input.id ? Store.get('events', input.id) : null;
    const ev = existing || {
      type: 'rdv', duree: Number(s.duree), mode: 'cabinet', statut: 'prevu', tarif: Number(s.tarif),
      start: input.start || U.fromDateTime(U.today(), '10:00'), ...input,
    };
    const isNew = !existing;

    const body = `
      <form class="form" id="ev-form">
        ${ev.source === 'calcom' ? `<p class="notice">Réservé via Cal.com${ev.calTitle ? ` (${U.esc(ev.calTitle)})` : ''}. Pour déplacer ou annuler ce rendez-vous, faites-le sur Cal.com : le client sera prévenu et l'agenda se mettra à jour.</p>` : ''}
        <div class="segmented" role="radiogroup">
          <label><input type="radio" name="type" value="rdv" ${ev.type === 'rdv' ? 'checked' : ''}><span>${icon('user', 16)} Rendez-vous client</span></label>
          <label><input type="radio" name="type" value="perso" ${ev.type === 'perso' ? 'checked' : ''}><span>${icon('calendar', 16)} Personnel</span></label>
        </div>

        <div data-show="rdv">
          <label class="field"><span>Client</span>
            <select name="clientId">${UI.clientOptions(ev.clientId)}<option value="__new">+ Nouveau client…</option></select>
          </label>
          <div class="grid3 new-client" hidden>
            <label class="field"><span>Prénom</span><input name="np"></label>
            <label class="field"><span>Nom</span><input name="nn"></label>
            <label class="field"><span>Téléphone</span><input name="nt" type="tel"></label>
          </div>
        </div>
        <div data-show="perso">
          <label class="field"><span>Intitulé</span><input name="title" value="${U.esc(ev.title || '')}" placeholder="Ex. : Supervision, dentiste, sport…"></label>
        </div>

        <div class="grid3">
          <label class="field"><span>Date</span><input type="date" name="date" value="${U.isoDate(ev.start)}" required></label>
          <label class="field"><span>Heure</span><input type="time" name="time" value="${U.isoTime(ev.start)}" step="300" required></label>
          <label class="field"><span>Durée (min)</span><input type="number" name="duree" value="${ev.duree}" min="5" step="5"></label>
        </div>

        <div data-show="rdv">
          <div class="grid3">
            <label class="field"><span>Lieu</span>
              <select name="mode">
                <option value="cabinet" ${ev.mode === 'cabinet' ? 'selected' : ''}>Au cabinet</option>
                <option value="visio" ${ev.mode === 'visio' ? 'selected' : ''}>En visio</option>
              </select></label>
            <label class="field"><span>Tarif (€)</span><input type="number" name="tarif" value="${ev.tarif ?? s.tarif}" min="0" step="1"></label>
            <label class="field"><span>Statut</span>
              <select name="statut">${['prevu', 'honore', 'absent', 'annule'].map(x =>
                `<option value="${x}" ${ev.statut === x ? 'selected' : ''}>${{ prevu: 'Prévu', honore: 'Honoré', absent: 'Absent (non excusé)', annule: 'Annulé' }[x]}</option>`).join('')}
              </select></label>
          </div>
          ${isNew ? `<label class="check"><input type="checkbox" name="repeat"> Répéter chaque semaine pendant
            <input type="number" name="repeatN" value="4" min="2" max="52" class="inline-num"> semaines</label>` : ''}
          ${!isNew && ev.type === 'rdv' && ev.statut === 'prevu' ? `<p class="reminder-line"><span class="lbl">Rappels</span> ${Reminders.chips(ev) || '<span class="muted">désactivés (Paramètres)</span>'}</p>` : ''}
        </div>

        <label class="field"><span>Notes ${ev.type === 'rdv' ? '(privées, jamais envoyées)' : ''}</span><textarea name="notes" rows="2">${U.esc(ev.notes || '')}</textarea></label>
      </form>`;

    const footer = `
      ${!isNew ? `<button class="btn ghost danger-text" data-del>${icon('trash', 18)} Supprimer</button>` : ''}
      <span class="spacer"></span>
      ${!isNew && ev.type === 'rdv' ? `
        <button class="btn ghost" data-remind>${icon('whatsapp', 18)} Rappel</button>
        ${ev.mode === 'visio' ? `<button class="btn ghost" data-visio>${icon('video', 18)} Visio</button>` : ''}
        ${ev.factureId ? `<button class="btn ghost" data-showinv>${icon('invoice', 18)} Voir facture</button>`
                       : `<button class="btn ghost" data-inv>${icon('invoice', 18)} Facturer</button>`}` : ''}
      <button class="btn primary" data-save>${icon('check', 18)} Enregistrer</button>`;

    UI.modal({
      title: isNew ? 'Nouveau rendez-vous' : (ev.type === 'rdv' ? 'Rendez-vous' : 'Événement personnel'),
      body, footer, wide: true,
      onMount(el, api) {
        const form = el.querySelector('#ev-form');
        const sync = () => {
          const t = form.type.value;
          el.querySelectorAll('[data-show]').forEach(n => { n.hidden = n.dataset.show !== t; });
          el.querySelector('.new-client').hidden = !(t === 'rdv' && form.clientId.value === '__new');
        };
        form.addEventListener('change', sync); sync();

        const save = async () => {
          const f = U.form(form);
          const data = {
            id: ev.id, type: f.type, start: U.fromDateTime(f.date, f.time),
            duree: Number(f.duree) || 50, notes: f.notes,
          };
          if (f.type === 'rdv') {
            let clientId = f.clientId;
            if (clientId === '__new') {
              if (!f.np && !f.nn) { UI.toast('Indiquez au moins le nom du nouveau client', 'warn'); return null; }
              clientId = Store.upsert('clients', { prenom: f.np, nom: f.nn, tel: f.nt, email: '', createdAt: new Date().toISOString() }).id;
            }
            if (!clientId) { UI.toast('Choisissez un client', 'warn'); return null; }
            Object.assign(data, { clientId, mode: f.mode, tarif: Number(f.tarif) || 0, statut: f.statut, title: '' });
            if (data.mode === 'visio' && !ev.visioUrl) data.visioUrl = Store.visioLink();
          } else {
            data.title = f.title || 'Personnel';
          }
          const start = new Date(data.start).getTime(), end = start + data.duree * 60000;
          const clash = Store.list('events').find(o => o.id !== ev.id && o.statut !== 'annule' &&
            new Date(o.start).getTime() < end && new Date(o.start).getTime() + o.duree * 60000 > start);
          if (clash && !(await UI.confirm(`Ce créneau chevauche « ${clash.type === 'rdv' ? Store.clientName(clash.clientId) : clash.title} » à ${U.fmtTime(clash.start)}. Enregistrer quand même ?`, { ok: 'Oui, enregistrer' }))) return null;

          const saved = Store.upsert('events', data);
          if (isNew && f.repeat && data.type === 'rdv') {
            const n = Math.min(52, Math.max(2, Number(f.repeatN) || 4));
            for (let i = 1; i < n; i++) {
              const copy = { ...data, id: undefined, start: U.addDays(data.start, 7 * i).toISOString() };
              if (copy.mode === 'visio') copy.visioUrl = Store.visioLink();
              Store.upsert('events', copy);
            }
          }
          return saved;
        };

        el.querySelector('[data-save]').onclick = async () => {
          if (await save()) { api.close(); UI.toast('Rendez-vous enregistré'); App.refresh(); }
        };
        el.querySelector('[data-del]')?.addEventListener('click', async () => {
          if (await UI.confirm('Supprimer ce rendez-vous ?', { ok: 'Supprimer', danger: true })) {
            Store.remove('events', ev.id); api.close(); UI.toast('Supprimé'); App.refresh();
          }
        });
        el.querySelector('[data-remind]')?.addEventListener('click', async () => { if (await save()) { api.close(); Actions.sendReminder(ev.id); } });
        el.querySelector('[data-visio]')?.addEventListener('click', async () => { if (await save()) { api.close(); Actions.sendVisio(ev.id); } });
        el.querySelector('[data-inv]')?.addEventListener('click', async () => { if (await save()) { api.close(); Actions.invoiceFromEvent(ev.id); } });
        el.querySelector('[data-showinv]')?.addEventListener('click', () => { api.close(); Actions.openInvoice({ id: ev.factureId }); });
      },
    });
  },

  setEventStatus(id, statut) {
    Store.upsert('events', { id, statut });
    App.refresh();
  },

  /* ---------- Factures ---------- */

  invoiceFromEvent(eventId) {
    const ev = Store.get('events', eventId);
    if (ev.factureId && Store.get('factures', ev.factureId)) return Actions.openInvoice({ id: ev.factureId });
    Actions.openInvoice({
      clientId: ev.clientId, eventIds: [ev.id],
      lignes: [{ desc: `Séance ${ev.mode === 'visio' ? 'en visio ' : ''}du ${U.fmtDateShort(ev.start)}`, qte: 1, pu: ev.tarif }],
    });
  },

  openInvoice(input = {}) {
    const s = Store.settings;
    const existing = input.id ? Store.get('factures', input.id) : null;
    const f = existing ? structuredClone(existing) : {
      date: U.today(), echeance: U.isoDate(U.addDays(new Date(), Number(s.delaiPaiement) || 15)),
      lignes: [{ desc: 'Séance', qte: 1, pu: Number(s.tarif) }], statut: 'brouillon', relances: [], eventIds: [], ...input,
    };
    const locked = existing && existing.statut !== 'brouillon';

    const lineRow = (l, i) => `
      <tr>
        <td><input name="desc" value="${U.esc(l.desc)}" ${locked ? 'disabled' : ''}></td>
        <td><input name="qte" type="number" value="${l.qte}" min="0" step="1" ${locked ? 'disabled' : ''}></td>
        <td><input name="pu" type="number" value="${l.pu}" min="0" step="0.01" ${locked ? 'disabled' : ''}></td>
        <td class="right line-total">${U.fmtMoney(l.qte * l.pu)}</td>
        <td>${locked ? '' : `<button type="button" class="icon-btn" data-rm="${i}" aria-label="Retirer la ligne">${icon('close', 16)}</button>`}</td>
      </tr>`;

    const status = existing ? Store.invoiceStatus(existing) : 'brouillon';
    const body = `
      <form class="form" id="inv-form">
        ${locked ? `<p class="notice">Facture n° <strong>${U.esc(f.numero)}</strong> émise : elle ne peut plus être modifiée (obligation légale). ${UI.badge(status)}</p>` : ''}
        <div class="grid3">
          <label class="field"><span>Client</span><select name="clientId" ${locked ? 'disabled' : ''}>${UI.clientOptions(f.clientId)}</select></label>
          <label class="field"><span>Date</span><input type="date" name="date" value="${f.date}" ${locked ? 'disabled' : ''}></label>
          <label class="field"><span>À régler avant le</span><input type="date" name="echeance" value="${f.echeance || ''}" ${locked ? 'disabled' : ''}></label>
        </div>
        <table class="lines">
          <thead><tr><th>Désignation</th><th style="width:70px">Qté</th><th style="width:100px">Prix unit.</th><th style="width:100px" class="right">Total</th><th style="width:36px"></th></tr></thead>
          <tbody>${f.lignes.map(lineRow).join('')}</tbody>
        </table>
        ${locked ? '' : `<button type="button" class="btn ghost small" data-addline>${icon('plus', 16)} Ajouter une ligne</button>`}
        <div class="total-row">Total : <strong data-total>${U.fmtMoney(Store.invoiceTotal(f))}</strong></div>
        ${f.statut === 'payee' ? `<p class="notice ok">Payée le ${U.fmtDateShort(f.payeeLe)} (${U.esc(f.moyen || '')})</p>` : ''}
        ${f.relances?.length ? `<p class="muted">Relances envoyées : ${f.relances.map(r => U.fmtDateShort(r)).join(', ')}</p>` : ''}
      </form>`;

    const footer = `
      ${!existing || existing.statut === 'brouillon' ? (existing ? `<button class="btn ghost danger-text" data-del>${icon('trash', 18)} Supprimer</button>` : '') : ''}
      <span class="spacer"></span>
      ${locked ? `<button class="btn ghost" data-print>${icon('print', 18)} Imprimer / PDF</button>
                  <button class="btn ghost" data-send>${icon('letter', 18)} Envoyer</button>
                  ${f.statut !== 'payee' ? `<button class="btn ghost" data-relance>${icon('bell', 18)} Relancer</button>
                  <button class="btn primary" data-paid>${icon('euro', 18)} Marquer payée</button>` : ''}`
               : `<button class="btn ghost" data-draft>Enregistrer le brouillon</button>
                  <button class="btn primary" data-emit>${icon('check', 18)} Valider la facture</button>`}`;

    UI.modal({
      title: existing?.numero ? `Facture ${existing.numero}` : 'Nouvelle facture', body, footer, wide: true,
      onMount(el, api) {
        const form = el.querySelector('#inv-form');
        const tbody = form.querySelector('tbody');
        const readLines = () => [...tbody.querySelectorAll('tr')].map(tr => ({
          desc: tr.querySelector('[name=desc]').value,
          qte: Number(tr.querySelector('[name=qte]').value) || 0,
          pu: Number(tr.querySelector('[name=pu]').value) || 0,
        }));
        const recalc = () => {
          const lignes = readLines();
          tbody.querySelectorAll('tr').forEach((tr, i) => { tr.querySelector('.line-total').textContent = U.fmtMoney(lignes[i].qte * lignes[i].pu); });
          form.querySelector('[data-total]').textContent = U.fmtMoney(Store.invoiceTotal({ lignes }));
        };
        const redraw = (lignes) => { tbody.innerHTML = lignes.map(lineRow).join(''); recalc(); };
        tbody.addEventListener('input', recalc);
        tbody.addEventListener('click', (e) => {
          const b = e.target.closest('[data-rm]');
          if (b) { const l = readLines(); l.splice(Number(b.dataset.rm), 1); redraw(l); }
        });
        el.querySelector('[data-addline]')?.addEventListener('click', () => redraw([...readLines(), { desc: 'Séance', qte: 1, pu: Number(s.tarif) }]));

        const persist = (emit) => {
          const v = U.form(form);
          if (!v.clientId) { UI.toast('Choisissez un client', 'warn'); return null; }
          const lignes = readLines().filter(l => l.desc || l.pu);
          if (!lignes.length) { UI.toast('Ajoutez au moins une ligne', 'warn'); return null; }
          const data = { ...f, clientId: v.clientId, date: v.date, echeance: v.echeance, lignes };
          if (emit) { data.statut = 'envoyee'; data.numero = Store.nextInvoiceNumber(v.date); data.emiseLe = new Date().toISOString(); }
          const saved = Store.upsert('factures', data);
          (saved.eventIds || []).forEach(id => Store.get('events', id) && Store.upsert('events', { id, factureId: saved.id }));
          return saved;
        };

        el.querySelector('[data-draft]')?.addEventListener('click', () => { if (persist(false)) { api.close(); UI.toast('Brouillon enregistré'); App.refresh(); } });
        el.querySelector('[data-emit]')?.addEventListener('click', async () => {
          if (!(await UI.confirm('Une fois validée, la facture reçoit un numéro définitif et ne peut plus être modifiée. Continuer ?', { ok: 'Valider' }))) return;
          const saved = persist(true);
          if (saved) { api.close(); UI.toast(`Facture ${saved.numero} créée`); App.refresh(); Actions.openInvoice({ id: saved.id }); }
        });
        el.querySelector('[data-del]')?.addEventListener('click', async () => {
          if (await UI.confirm('Supprimer ce brouillon ?', { ok: 'Supprimer', danger: true })) {
            (existing.eventIds || []).forEach(id => Store.get('events', id) && Store.upsert('events', { id, factureId: null }));
            Store.remove('factures', existing.id); api.close(); App.refresh();
          }
        });
        el.querySelector('[data-print]')?.addEventListener('click', () => Actions.printInvoice(existing.id));
        el.querySelector('[data-send]')?.addEventListener('click', () => { api.close(); Actions.sendInvoice(existing.id); });
        el.querySelector('[data-relance]')?.addEventListener('click', () => { api.close(); Actions.relance(existing.id); });
        el.querySelector('[data-paid]')?.addEventListener('click', () => { api.close(); Actions.markPaid(existing.id); });
      },
    });
  },

  invoiceHTML(id) {
    const f = Store.get('factures', id);
    const s = Store.settings;
    const c = Store.get('clients', f.clientId) || {};
    return `
      <div class="doc">
        <div class="doc-head">
          <div>
            <div class="doc-name">${U.esc(s.nom)}</div>
            <div>${U.esc(s.profession)}</div>
            <div>${U.nl2br(s.adresse)}</div>
            <div>${U.esc(s.tel)} · ${U.esc(s.email)}</div>
            ${s.siret ? `<div>SIRET : ${U.esc(s.siret)}</div>` : ''}
            ${s.adeli ? `<div>N° ADELI / RPPS : ${U.esc(s.adeli)}</div>` : ''}
          </div>
          <div class="doc-to">
            <div class="doc-title">FACTURE</div>
            <div>N° <strong>${U.esc(f.numero)}</strong></div>
            <div>Date : ${U.fmtDateShort(f.date)}</div>
            <br>
            <div><strong>${U.esc(c.prenom)} ${U.esc(c.nom)}</strong></div>
            <div>${U.nl2br(c.adresse || '')}</div>
          </div>
        </div>
        <table class="doc-table">
          <thead><tr><th>Désignation</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr></thead>
          <tbody>${f.lignes.map(l => `<tr><td>${U.esc(l.desc)}</td><td>${l.qte}</td><td>${U.fmtMoney(l.pu)}</td><td>${U.fmtMoney(l.qte * l.pu)}</td></tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="3">Total à payer</td><td>${U.fmtMoney(Store.invoiceTotal(f))}</td></tr></tfoot>
        </table>
        <p class="doc-small">${U.esc(s.mentionTVA)}</p>
        ${f.statut === 'payee'
          ? `<p class="doc-paid">Facture acquittée le ${U.fmtDateShort(f.payeeLe)} — ${U.esc(f.moyen || '')}</p>`
          : `<p>À régler avant le <strong>${U.fmtDateShort(f.echeance)}</strong>${s.iban ? ` par virement : IBAN ${U.esc(s.iban)}` : ''}.</p>`}
      </div>`;
  },

  printInvoice(id) {
    const f = Store.get('factures', id);
    UI.printDoc(`Facture ${f.numero}`, Actions.invoiceHTML(id));
  },

  sendInvoice(id) {
    const f = Store.get('factures', id);
    const c = Store.get('clients', f.clientId);
    const text = `Bonjour ${c?.prenom || ''}, veuillez trouver ci-joint la facture n°${f.numero} d'un montant de ${U.fmtMoney(Store.invoiceTotal(f))}, à régler avant le ${U.fmtDateShort(f.echeance)}.${Store.settings.iban ? ' IBAN : ' + Store.settings.iban : ''} Merci, ${Store.settings.nom}`;
    UI.modal({
      title: `Envoyer la facture ${f.numero}`,
      body: `<ol class="steps">
          <li><strong>Téléchargez le PDF</strong> : cliquez sur « Imprimer / PDF » puis choisissez « Enregistrer au format PDF ».</li>
          <li><strong>Envoyez-le</strong> par e-mail ou WhatsApp : le message est déjà rédigé, il suffit de joindre le PDF.</li>
        </ol>
        <label class="field"><span>Message</span><textarea rows="5">${U.esc(text)}</textarea></label>`,
      footer: `<button class="btn ghost" data-print>${icon('print', 18)} Imprimer / PDF</button>
        <span class="spacer"></span>
        <button class="btn ghost" data-mail>${icon('letter', 18)} E-mail</button>
        <button class="btn whatsapp" data-wa>${icon('whatsapp', 18)} WhatsApp</button>`,
      onMount(el, api) {
        const txt = () => el.querySelector('textarea').value;
        el.querySelector('[data-print]').onclick = () => Actions.printInvoice(id);
        el.querySelector('[data-mail]').onclick = () => {
          if (!c?.email) return UI.toast('Ce client n\'a pas d\'adresse e-mail', 'warn');
          location.href = U.mailto(c.email, `Facture ${f.numero}`, txt());
          Store.upsert('messages', { clientId: f.clientId, texte: txt(), type: 'facture', canal: 'email', date: new Date().toISOString() });
          api.close();
        };
        el.querySelector('[data-wa]').onclick = () => { if (Actions.whatsapp(f.clientId, txt(), 'facture')) api.close(); };
      },
    });
  },

  relance(id) {
    const f = Store.get('factures', id);
    const client = Store.get('clients', f.clientId);
    Actions.composeMessage({
      clientId: f.clientId, type: 'relance', title: `Relance — facture ${f.numero}`,
      text: U.fill(Store.settings.modeles.relance, Actions.vars({ client, facture: f })),
      email: `Relance facture ${f.numero}`,
      onSent: () => {
        const cur = Store.get('factures', id);
        Store.upsert('factures', { id, relances: [...(cur.relances || []), new Date().toISOString()] });
        UI.toast('Relance enregistrée');
      },
    });
  },

  markPaid(id) {
    const f = Store.get('factures', id);
    UI.modal({
      title: `Paiement — facture ${f.numero}`,
      body: `<form class="form" id="pay-form">
        <p>Montant : <strong>${U.fmtMoney(Store.invoiceTotal(f))}</strong> — ${U.esc(Store.clientName(f.clientId))}</p>
        <div class="grid2">
          <label class="field"><span>Payée le</span><input type="date" name="payeeLe" value="${U.today()}"></label>
          <label class="field"><span>Moyen de paiement</span>
            <select name="moyen">${['Carte bancaire', 'Virement', 'Espèces', 'Chèque'].map(m => `<option>${m}</option>`).join('')}</select></label>
        </div></form>`,
      footer: `<button class="btn primary" data-ok>${icon('check', 18)} Confirmer le paiement</button>`,
      onMount(el, api) {
        el.querySelector('[data-ok]').onclick = () => {
          const v = U.form(el.querySelector('#pay-form'));
          Store.upsert('factures', { id, statut: 'payee', payeeLe: v.payeeLe, moyen: v.moyen });
          api.close(); UI.toast('Paiement enregistré'); App.refresh();
        };
      },
    });
  },

  /* ---------- Clients ---------- */

  openClient(id) {
    const c = id ? Store.get('clients', id) : {};
    UI.modal({
      title: id ? 'Modifier le client' : 'Nouveau client', wide: true,
      body: `<form class="form" id="cl-form">
        <div class="grid2">
          <label class="field"><span>Prénom</span><input name="prenom" value="${U.esc(c.prenom || '')}" required></label>
          <label class="field"><span>Nom</span><input name="nom" value="${U.esc(c.nom || '')}" required></label>
          <label class="field"><span>Téléphone (WhatsApp)</span><input name="tel" type="tel" value="${U.esc(c.tel || '')}" placeholder="06 12 34 56 78"></label>
          <label class="field"><span>E-mail</span><input name="email" type="email" value="${U.esc(c.email || '')}"></label>
          <label class="field"><span>Date de naissance</span><input name="naissance" type="date" value="${c.naissance || ''}"></label>
          <label class="field"><span>Adressé(e) par</span><input name="adressePar" value="${U.esc(c.adressePar || '')}" placeholder="Ex. : Dr Leroy, médecin traitant"></label>
        </div>
        <label class="field"><span>Adresse postale</span><textarea name="adresse" rows="2">${U.esc(c.adresse || '')}</textarea></label>
        <label class="field"><span>Notes privées</span><textarea name="notes" rows="3">${U.esc(c.notes || '')}</textarea></label>
      </form>`,
      footer: `${id ? `<button class="btn ghost danger-text" data-del>${icon('trash', 18)} Supprimer</button>` : ''}<span class="spacer"></span>
               <button class="btn primary" data-save>${icon('check', 18)} Enregistrer</button>`,
      onMount(el, api) {
        el.querySelector('[data-save]').onclick = () => {
          const v = U.form(el.querySelector('#cl-form'));
          if (!v.prenom && !v.nom) return UI.toast('Indiquez un nom', 'warn');
          const saved = Store.upsert('clients', { ...c, ...v, createdAt: c.createdAt || new Date().toISOString() });
          api.close(); UI.toast('Client enregistré');
          if (!id) location.hash = `#/clients/${saved.id}`; else App.refresh();
        };
        el.querySelector('[data-del]')?.addEventListener('click', async () => {
          const hasInv = Store.list('factures').some(f => f.clientId === id && f.statut !== 'brouillon');
          if (hasInv) return UI.toast('Impossible : ce client a des factures émises (à conserver 10 ans)', 'warn');
          if (await UI.confirm(`Supprimer ${c.prenom} ${c.nom} et tous ses rendez-vous ?`, { ok: 'Supprimer', danger: true })) {
            Store.data.events = Store.data.events.filter(e => e.clientId !== id);
            Store.remove('clients', id); api.close(); location.hash = '#/clients';
          }
        });
      },
    });
  },

  /* ---------- Demandes de rendez-vous en ligne ---------- */

  acceptDemande(id) {
    const d = Store.get('demandes', id);
    let client = Store.list('clients').find(c =>
      (d.email && c.email && c.email.toLowerCase() === d.email.toLowerCase()) ||
      (d.tel && c.tel && U.phoneIntl(c.tel) === U.phoneIntl(d.tel)));
    if (!client) client = Store.upsert('clients', { prenom: d.prenom, nom: d.nom, tel: d.tel, email: d.email, notes: d.motif ? `Motif : ${d.motif}` : '', createdAt: new Date().toISOString() });
    const ev = Store.upsert('events', {
      type: 'rdv', clientId: client.id, start: d.start, duree: Number(Store.settings.duree), mode: d.mode || 'cabinet',
      statut: 'prevu', tarif: Number(Store.settings.tarif), notes: d.motif || '',
      visioUrl: d.mode === 'visio' ? Store.visioLink() : undefined,
    });
    Store.upsert('demandes', { id, statut: 'acceptee' });
    App.refresh();
    Actions.composeMessage({
      clientId: client.id, type: 'confirmation', title: 'Confirmer au client',
      text: U.fill(ev.mode === 'visio' ? Store.settings.modeles.visio : Store.settings.modeles.confirmation, Actions.vars({ client, event: ev })),
      email: 'Confirmation de votre rendez-vous',
    });
  },

  async refuseDemande(id) {
    if (await UI.confirm('Refuser cette demande de rendez-vous ?', { ok: 'Refuser', danger: true })) {
      Store.upsert('demandes', { id, statut: 'refusee' });
      App.refresh();
    }
  },
};
