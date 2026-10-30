/* Comptabilité simple : recettes encaissées, dépenses, livre des recettes. */
const CATEGORIES = ['Loyer', 'Formation', 'Supervision', 'Matériel', 'Assurance', 'Cotisations', 'Logiciels', 'Déplacements', 'Autre'];

Views.compta = {
  title: 'Comptabilité',
  year: new Date().getFullYear(),

  render(el) {
    const y = String(this.year);
    const recettes = Store.list('factures').filter(f => f.statut === 'payee' && (f.payeeLe || '').startsWith(y));
    const depenses = Store.list('depenses').filter(d => d.date.startsWith(y)).sort((a, b) => b.date.localeCompare(a.date));
    const months = Array.from({ length: 12 }, (_, m) => {
      const key = `${y}-${U.pad(m + 1)}`;
      const r = recettes.filter(f => f.payeeLe.startsWith(key)).reduce((t, f) => t + Store.invoiceTotal(f), 0);
      const d = depenses.filter(x => x.date.startsWith(key)).reduce((t, x) => t + Number(x.montant), 0);
      return { m, r, d };
    });
    const totR = months.reduce((t, x) => t + x.r, 0), totD = months.reduce((t, x) => t + x.d, 0);
    const max = Math.max(1, ...months.map(x => Math.max(x.r, x.d)));
    const aEnc = Store.list('factures').filter(f => ['envoyee', 'retard'].includes(Store.invoiceStatus(f)))
      .reduce((t, f) => t + Store.invoiceTotal(f), 0);
    const years = [...new Set([new Date().getFullYear(), ...Store.list('factures').map(f => +f.date.slice(0, 4)), ...Store.list('depenses').map(d => +d.date.slice(0, 4))])].sort();

    el.innerHTML = `
      <div class="page-head">
        <div><h1>Comptabilité</h1><p class="muted">Les recettes sont comptées à la date d'encaissement (régime BNC).</p></div>
        <div class="head-actions">
          <select class="year-select" aria-label="Année">${years.map(v => `<option ${v === this.year ? 'selected' : ''}>${v}</option>`).join('')}</select>
          <button class="btn ghost" data-export>${icon('download', 18)} Livre des recettes</button>
          <button class="btn primary" data-dep>${icon('plus', 18)} Dépense</button>
        </div>
      </div>

      <div class="stats">
        <div class="stat"><span class="stat-ico ok">${icon('euro')}</span><span><b>${U.fmtMoney(totR)}</b> recettes ${y}</span></div>
        <div class="stat"><span class="stat-ico warn">${icon('invoice')}</span><span><b>${U.fmtMoney(totD)}</b> dépenses ${y}</span></div>
        <div class="stat"><span class="stat-ico">${icon('chart')}</span><span><b>${U.fmtMoney(totR - totD)}</b> résultat</span></div>
        <div class="stat"><span class="stat-ico">${icon('clock')}</span><span><b>${U.fmtMoney(aEnc)}</b> reste à encaisser</span></div>
      </div>

      <section class="card">
        <h2>${icon('chart')} Mois par mois</h2>
        <div class="bars" role="img" aria-label="Recettes et dépenses par mois">
          ${months.map(x => `<div class="bar-group" title="${U.monthName(x.m)} : ${U.fmtMoney(x.r)} de recettes, ${U.fmtMoney(x.d)} de dépenses">
            <div class="bar-pair">
              <div class="bar r" style="height:${x.r / max * 100}%"></div>
              <div class="bar d" style="height:${x.d / max * 100}%"></div>
            </div>
            <span>${U.monthName(x.m).slice(0, 3)}</span></div>`).join('')}
        </div>
        <div class="legend"><span><i class="dot rdv"></i>Recettes</span><span><i class="dot dep"></i>Dépenses</span></div>
      </section>

      <div class="cols">
        <section class="card flush">
          <h2 class="pad">${icon('euro')} Recettes encaissées</h2>
          ${recettes.length ? `<div class="table-wrap"><table class="table">
            <thead><tr><th>Date</th><th>Client</th><th>Facture</th><th>Mode</th><th class="right">Montant</th></tr></thead>
            <tbody>${[...recettes].sort((a, b) => b.payeeLe.localeCompare(a.payeeLe)).map(f => `<tr data-f="${f.id}">
              <td>${U.fmtDateShort(f.payeeLe)}</td><td>${U.esc(Store.clientName(f.clientId))}</td><td>${U.esc(f.numero)}</td>
              <td>${U.esc(f.moyen || '')}</td><td class="right">${U.fmtMoney(Store.invoiceTotal(f))}</td></tr>`).join('')}</tbody>
          </table></div>` : UI.empty('Aucune recette encaissée cette année.')}
        </section>
        <section class="card flush">
          <h2 class="pad">${icon('invoice')} Dépenses</h2>
          ${depenses.length ? `<div class="table-wrap"><table class="table">
            <thead><tr><th>Date</th><th>Libellé</th><th>Catégorie</th><th class="right">Montant</th><th></th></tr></thead>
            <tbody>${depenses.map(d => `<tr data-d="${d.id}">
              <td>${U.fmtDateShort(d.date)}</td><td>${U.esc(d.libelle)}</td><td>${U.esc(d.categorie)}</td>
              <td class="right">${U.fmtMoney(d.montant)}</td>
              <td><button class="icon-btn" data-del="${d.id}" aria-label="Supprimer">${icon('trash', 16)}</button></td></tr>`).join('')}</tbody>
          </table></div>` : UI.empty('Aucune dépense saisie.')}
          <div class="pad"><button class="btn ghost small" data-export-dep>${icon('download', 16)} Exporter les dépenses</button></div>
        </section>
      </div>`;

    el.querySelector('.year-select').onchange = (e) => { this.year = Number(e.target.value); this.render(el); };
    el.querySelector('[data-dep]').onclick = () => this.openDepense();
    el.querySelectorAll('[data-f]').forEach(r => r.onclick = () => Actions.openInvoice({ id: r.dataset.f }));
    el.querySelectorAll('[data-d]').forEach(r => r.onclick = (e) => {
      if (e.target.closest('[data-del]')) return;
      this.openDepense(r.dataset.d);
    });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
      if (await UI.confirm('Supprimer cette dépense ?', { ok: 'Supprimer', danger: true })) { Store.remove('depenses', b.dataset.del); this.render(el); }
    });
    el.querySelector('[data-export]').onclick = () => {
      const rows = [['Date d\'encaissement', 'N° facture', 'Client', 'Nature', 'Mode de règlement', 'Montant']];
      [...recettes].sort((a, b) => a.payeeLe.localeCompare(b.payeeLe)).forEach(f =>
        rows.push([U.fmtDateShort(f.payeeLe), f.numero, Store.clientName(f.clientId), f.lignes.map(l => l.desc).join(' + '), f.moyen || '', Store.invoiceTotal(f).toFixed(2).replace('.', ',')]));
      U.download(`livre-des-recettes-${y}.csv`, U.csv(rows), 'text/csv');
    };
    el.querySelector('[data-export-dep]').onclick = () => {
      const rows = [['Date', 'Libellé', 'Catégorie', 'Montant']];
      [...depenses].reverse().forEach(d => rows.push([U.fmtDateShort(d.date), d.libelle, d.categorie, Number(d.montant).toFixed(2).replace('.', ',')]));
      U.download(`depenses-${y}.csv`, U.csv(rows), 'text/csv');
    };
  },

  openDepense(id) {
    const d = id ? Store.get('depenses', id) : { date: U.today(), categorie: 'Autre' };
    UI.modal({
      title: id ? 'Modifier la dépense' : 'Nouvelle dépense',
      body: `<form class="form" id="dep-form">
        <label class="field"><span>Libellé</span><input name="libelle" value="${U.esc(d.libelle || '')}" required placeholder="Ex. : Loyer du cabinet"></label>
        <div class="grid3">
          <label class="field"><span>Date</span><input type="date" name="date" value="${d.date}"></label>
          <label class="field"><span>Catégorie</span><select name="categorie">${CATEGORIES.map(c => `<option ${c === d.categorie ? 'selected' : ''}>${c}</option>`).join('')}</select></label>
          <label class="field"><span>Montant (€)</span><input type="number" name="montant" value="${d.montant ?? ''}" min="0" step="0.01" required></label>
        </div></form>`,
      footer: `<button class="btn primary" data-save>${icon('check', 18)} Enregistrer</button>`,
      onMount(el, api) {
        el.querySelector('[data-save]').onclick = () => {
          const v = U.form(el.querySelector('#dep-form'));
          if (!v.libelle || !v.montant) return UI.toast('Libellé et montant requis', 'warn');
          Store.upsert('depenses', { id, ...v, montant: Number(v.montant) });
          api.close(); UI.toast('Dépense enregistrée'); App.refresh();
        };
      },
    });
  },
};
