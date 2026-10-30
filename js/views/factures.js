/* Liste des factures avec filtres et relances. */
Views.factures = {
  title: 'Factures',
  filter: 'tout',

  render(el) {
    const all = [...Store.list('factures')].sort((a, b) => (b.numero || 'z').localeCompare(a.numero || 'z') || b.date.localeCompare(a.date));
    const count = (st) => all.filter(f => Store.invoiceStatus(f) === st).length;
    const tabs = [
      ['tout', 'Toutes', all.length], ['envoyee', 'En attente', count('envoyee')], ['retard', 'En retard', count('retard')],
      ['payee', 'Payées', count('payee')], ['brouillon', 'Brouillons', count('brouillon')],
    ];
    const list = this.filter === 'tout' ? all : all.filter(f => Store.invoiceStatus(f) === this.filter);
    const sum = (arr) => arr.reduce((t, f) => t + Store.invoiceTotal(f), 0);
    const aFacturer = Store.list('events').filter(e => e.type === 'rdv' && e.statut === 'honore' && !e.factureId);

    el.innerHTML = `
      <div class="page-head">
        <div><h1>Factures</h1>
          <p class="muted">À encaisser : <strong>${U.fmtMoney(sum(all.filter(f => ['envoyee', 'retard'].includes(Store.invoiceStatus(f)))))}</strong>
          · dont en retard : <strong class="red">${U.fmtMoney(sum(all.filter(f => Store.invoiceStatus(f) === 'retard')))}</strong></p></div>
        <div class="head-actions">
          <button class="btn primary" data-new>${icon('plus', 18)} Nouvelle facture</button>
        </div>
      </div>

      ${aFacturer.length ? `<div class="notice">
        ${aFacturer.length} séance(s) honorée(s) pas encore facturée(s).
        <button class="btn small primary" data-batch>Tout facturer</button></div>` : ''}

      <div class="tabs">${tabs.map(([k, l, n]) => `<button class="tab ${this.filter === k ? 'active' : ''}" data-tab="${k}">${l} <span class="count">${n}</span></button>`).join('')}</div>

      <section class="card flush">
        ${list.length ? `<div class="table-wrap"><table class="table">
          <thead><tr><th>N°</th><th>Date</th><th>Client</th><th class="right">Montant</th><th>Statut</th><th class="hide-sm">Échéance</th><th></th></tr></thead>
          <tbody>${list.map(f => {
            const st = Store.invoiceStatus(f);
            return `<tr data-id="${f.id}">
              <td><strong>${U.esc(f.numero || '—')}</strong></td>
              <td>${U.fmtDateShort(f.date)}</td>
              <td>${U.esc(Store.clientName(f.clientId))}</td>
              <td class="right">${U.fmtMoney(Store.invoiceTotal(f))}</td>
              <td>${UI.badge(st)}${f.relances?.length ? ` <span class="muted small">${f.relances.length} relance(s)</span>` : ''}</td>
              <td class="hide-sm">${f.statut === 'payee' ? `<span class="muted">payée le ${U.fmtDateShort(f.payeeLe)}</span>` : (f.echeance ? U.fmtDateShort(f.echeance) : '')}</td>
              <td class="right nowrap">
                ${st === 'retard' || st === 'envoyee' ? `<button class="btn small ghost" data-relance="${f.id}">${icon('bell', 16)} Relancer</button>
                  <button class="btn small ghost" data-paid="${f.id}">${icon('euro', 16)} Payée</button>` : ''}
                ${f.numero ? `<button class="icon-btn" data-print="${f.id}" aria-label="Imprimer">${icon('print', 18)}</button>` : ''}
              </td></tr>`;
          }).join('')}</tbody></table></div>` : UI.empty('Aucune facture dans cette catégorie.')}
      </section>`;

    el.querySelector('[data-new]').onclick = () => Actions.openInvoice();
    el.querySelectorAll('[data-tab]').forEach(t => t.onclick = () => { this.filter = t.dataset.tab; this.render(el); });
    el.querySelector('[data-batch]')?.addEventListener('click', async () => {
      if (!(await UI.confirm(`Créer et valider ${aFacturer.length} facture(s), une par séance ?`, { ok: 'Créer les factures' }))) return;
      aFacturer.sort((a, b) => a.start.localeCompare(b.start)).forEach(e => {
        const f = Store.upsert('factures', {
          clientId: e.clientId, date: U.today(), numero: Store.nextInvoiceNumber(), statut: 'envoyee', emiseLe: new Date().toISOString(),
          echeance: U.isoDate(U.addDays(new Date(), Number(Store.settings.delaiPaiement) || 15)),
          lignes: [{ desc: `Séance ${e.mode === 'visio' ? 'en visio ' : ''}du ${U.fmtDateShort(e.start)}`, qte: 1, pu: e.tarif }],
          relances: [], eventIds: [e.id],
        });
        Store.upsert('events', { id: e.id, factureId: f.id });
      });
      UI.toast(`${aFacturer.length} facture(s) créée(s)`); App.refresh();
    });
    el.querySelector('tbody')?.addEventListener('click', (e) => {
      const b = e.target.closest('[data-relance],[data-paid],[data-print]');
      if (b?.dataset.relance) return Actions.relance(b.dataset.relance);
      if (b?.dataset.paid) return Actions.markPaid(b.dataset.paid);
      if (b?.dataset.print) return Actions.printInvoice(b.dataset.print);
      const tr = e.target.closest('tr[data-id]');
      if (tr) Actions.openInvoice({ id: tr.dataset.id });
    });
  },
};
