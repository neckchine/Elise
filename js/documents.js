/* Mise en page des documents imprimables (factures, courriers).
   Les mêmes styles servent à l'impression / PDF et à l'aperçu dans l'application. */
const DOC_CSS = `
.inv { --doc: #22427a; --doc-wash: #eef2f8; --txt: #1f2430; --sub: #5d6575; --line: #d9dce2;
  max-width: 760px; margin: 0 auto; color: var(--txt); background: #ffffff;
  font: 10pt/1.55 'Public Sans', Arial, Helvetica, sans-serif; font-variant-numeric: tabular-nums; }
.inv * { box-sizing: border-box; }
.inv p { margin: 0; }
.inv-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 24px; margin-bottom: 18px; }
.inv-brand-name { font-size: 17pt; font-weight: 700; letter-spacing: -.01em; line-height: 1.2; }
.inv-brand-sub { color: var(--sub); font-size: 8.5pt; margin-top: 4px; }
.inv-brand-link { color: var(--doc); font-size: 8.5pt; margin-top: 2px; }
.inv-kind { text-align: right; }
.inv-kind-title { color: var(--doc); font-size: 19pt; font-weight: 700; letter-spacing: .02em; line-height: 1.1; }
.inv-kind p { font-size: 8.5pt; margin-top: 4px; }
.inv-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
.inv-label { color: var(--doc); font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 8px; }
.inv-parties p { font-size: 8.5pt; line-height: 1.5; }
.inv-parties strong { font-size: 9pt; }
.inv-section { margin-bottom: 15px; break-inside: avoid; }
.inv-h { color: var(--doc); font-size: 10.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .02em;
  padding-bottom: 6px; margin: 0 0 10px; border-bottom: 1px solid var(--txt); }
.inv-object { text-align: justify; }
.inv-table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 8.5pt; border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.inv-table thead th { background: var(--doc); color: #ffffff; font-weight: 700; text-align: left; padding: 9px 10px; }
.inv-table thead th:first-child { border-top-left-radius: 7px; }
.inv-table thead th:last-child { border-top-right-radius: 7px; }
.inv-table th.num, .inv-table td.num { text-align: right; white-space: nowrap; }
.inv-table th.qty, .inv-table td.qty { text-align: center; width: 54px; }
.inv-table td { padding: 8px 10px; vertical-align: top; border-top: 1px solid var(--line); }
.inv-table tbody tr:first-child td { border-top: 0; }
.inv-table td + td, .inv-table th + th { border-left: 1px solid var(--line); }
.inv-table tbody tr { break-inside: avoid; }
.inv-table tbody tr:nth-child(even) td { background: #fafbfc; }
.inv-table .item { font-weight: 700; font-size: 9pt; }
.inv-table td.strong { font-weight: 700; }
.inv-sum { display: flex; justify-content: flex-end; margin-top: 14px; break-inside: avoid; }
.inv-sum table { border-collapse: separate; border-spacing: 0; min-width: 290px; font-size: 9pt; }
.inv-sum td { padding: 6px 12px; }
.inv-sum td:last-child { text-align: right; font-weight: 600; white-space: nowrap; }
.inv-sum .muted td { color: var(--sub); font-size: 8pt; }
.inv-sum .net td { background: var(--doc); color: #ffffff; font-weight: 700; font-size: 11pt; padding: 10px 12px; }
.inv-sum .net td:first-child { border-radius: 8px 0 0 8px; box-shadow: 1px 0 0 var(--doc); }
.inv-sum .net td:last-child { border-radius: 0 8px 8px 0; }
.inv-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.inv-card { background: var(--doc-wash); padding: 12px 16px; border-radius: 8px; }
.inv-card .inv-label { margin-bottom: 4px; }
.inv-card-big { font-size: 13pt; font-weight: 700; }
.inv-card .sub { color: var(--sub); font-size: 7.5pt; margin-top: 4px; }
.inv-card.paid { background: #e9f4ee; }
.inv-card.paid .inv-label, .inv-card.paid .inv-card-big { color: #2f6a47; }
.inv-bank { border: 1px solid var(--doc); border-radius: 8px; padding: 12px 16px; margin-top: 12px; break-inside: avoid; }
.inv-bank p { font-size: 8.5pt; line-height: 1.6; }
.inv-bank b { font-weight: 700; }
.inv-mentions { list-style: none; padding: 0; margin: 0; font-size: 8pt; }
.inv-mentions li { position: relative; padding-left: 12px; margin-bottom: 4px; line-height: 1.55; }
.inv-mentions li::before { content: ''; position: absolute; left: 0; top: .62em; width: 4px; height: 4px; border-radius: 50%; background: var(--doc); }
.inv-sign { display: flex; justify-content: space-between; gap: 24px; margin-top: 20px; font-size: 8.5pt; break-inside: avoid; }
.inv-sign .who { color: var(--sub); margin-top: 6px; }
.inv-foot { margin-top: 18px; padding-top: 8px; border-top: 1px solid var(--line); text-align: center; color: var(--sub); font-size: 7pt; line-height: 1.8; }
.inv-letter-body { font-size: 10pt; line-height: 1.75; margin: 18px 0 36px; text-align: justify; }
.inv-letter-place { text-align: right; font-size: 9pt; margin-bottom: 20px; }
.inv-letter-sign { margin-left: 55%; font-size: 9pt; }
.inv-letter-sign strong { display: block; font-size: 10pt; }
@media screen and (max-width: 640px) {
  .inv { font-size: 9pt; }
  .inv-top, .inv-parties, .inv-cards { display: block; }
  .inv-kind { text-align: left; margin-top: 16px; }
  .inv-parties > div + div, .inv-cards > div + div { margin-top: 16px; }
  .inv-table { font-size: 8pt; }
  .inv-table td, .inv-table thead th { padding: 7px 6px; }
}
@media print {
  .inv-foot { display: none; }
}
`;

const PRINT_PAGE_CSS = `
@page { size: A4; margin: 14mm 15mm 20mm; }
body { margin: 0; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
@media screen { body { padding: 32px 16px; background: #eceef1; } .inv { padding: 48px 52px; box-shadow: 0 2px 16px rgba(0,0,0,.12); } }
`;

const Docs = {
  // Couleur choisie dans les Paramètres + version très claire pour les fonds
  colorStyle() {
    const c = /^#[0-9a-f]{6}$/i.test(Store.settings.docColor || '') ? Store.settings.docColor : '#22427a';
    const n = parseInt(c.slice(1), 16), mix = (v) => Math.round(v + (255 - v) * 0.92);
    const wash = '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => mix(v).toString(16).padStart(2, '0')).join('');
    return `--doc:${c};--doc-wash:${wash}`;
  },

  city() {
    const last = (Store.settings.adresse || '').split('\n').pop() || '';
    return last.replace(/^\d{5}\s*/, '').trim();
  },

  header(kind, rows) {
    const s = Store.settings;
    return `
      <header class="inv-top">
        <div>
          <div class="inv-brand-name">${U.esc(s.nom)}</div>
          <div class="inv-brand-sub">${U.esc(s.profession)}${this.city() ? ' • ' + U.esc(this.city()) : ''}</div>
          ${s.site ? `<div class="inv-brand-link">${U.esc(s.site.replace(/^https?:\/\//, ''))}</div>` : ''}
        </div>
        ${kind ? `<div class="inv-kind"><div class="inv-kind-title">${kind}</div>${rows.map(r => `<p>${r}</p>`).join('')}</div>` : ''}
      </header>`;
  },

  emitter() {
    const s = Store.settings;
    return `<p><strong>${U.esc(s.nom)}</strong><br>${U.esc(s.profession)}<br>${U.nl2br(s.adresse)}
      ${s.tel ? '<br>' + U.esc(s.tel) : ''}${s.email ? '<br>' + U.esc(s.email) : ''}
      ${s.siret ? '<br>SIRET : ' + U.esc(s.siret) : ''}${s.adeli ? '<br>N° ADELI / RPPS : ' + U.esc(s.adeli) : ''}</p>`;
  },

  footerLines(ref) {
    const s = Store.settings;
    return [[s.nom, s.profession, s.site?.replace(/^https?:\/\//, ''), s.email, this.city()].filter(Boolean).join(' • '), ref || ''];
  },

  footer(ref) {
    const [a, b] = this.footerLines(ref);
    return `<footer class="inv-foot" data-foot="${U.esc(a)}" data-ref="${U.esc(b)}">${U.esc(a)}${b ? `<br>${U.esc(b)}` : ''}</footer>`;
  },

  // Pied de page imprimé dans la marge basse de chaque page (comme sur un devis), avec « Page n / N »
  pageFooterCSS(html) {
    const m = html.match(/data-foot="([^"]*)" data-ref="([^"]*)"/);
    if (!m) return '';
    const unesc = (t) => t.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    const css = (t) => '"' + unesc(t).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
    const second = m[2] ? `${css(m[2] + ' • Page ')} counter(page) " / " counter(pages)` : `"Page " counter(page) " / " counter(pages)`;
    return `@page { @bottom-center { content: ${css(m[1])} "\\A" ${second}; white-space: pre; font: 7pt/1.8 'Public Sans', Arial, sans-serif; color: #5d6575; border-top: 0.5pt solid #d9dce2; vertical-align: top; padding-top: 6pt; } }`;
  },

  // Facture : f est une facture enregistrée ou un exemple (aperçu depuis les Paramètres)
  invoice(f) {
    const s = Store.settings;
    const c = Store.get('clients', f.clientId) || f.client || {};
    const total = Store.invoiceTotal(f);
    const paid = f.statut === 'payee';
    const client = `${c.prenom || ''} ${c.nom || ''}`.trim();
    const lignes = f.lignes || [];
    const nb = lignes.reduce((t, l) => t + Number(l.qte || 0), 0);
    const objet = f.objet || (lignes.length === 1
      ? `${lignes[0].desc}, réalisée par ${s.nom} (${s.profession.toLowerCase()}).`
      : `${nb} séances d'accompagnement réalisées par ${s.nom} (${s.profession.toLowerCase()}).`);

    const mentions = [
      s.mentionTVA,
      paid ? `Facture acquittée le ${U.fmtDateShort(f.payeeLe)}${f.moyen ? ' par ' + U.esc(f.moyen).toLowerCase() : ''}.`
           : `Règlement à effectuer avant le ${U.fmtDateShort(f.echeance)}${s.iban ? ', par virement ou selon le moyen convenu' : ''}.`,
      'Cette facture peut être présentée à votre mutuelle en vue d\'un éventuel remboursement, selon votre contrat.',
      s.adeli ? `Praticien enregistré sous le n° ADELI / RPPS ${U.esc(s.adeli)}.` : '',
      ...(s.mentions || '').split('\n').map(x => x.trim()).filter(Boolean).map(U.esc),
    ].filter(Boolean);

    return `
      <article class="inv" style="${this.colorStyle()}">
        ${this.header('FACTURE', [`N° ${U.esc(f.numero || 'brouillon')}`, `Date : ${U.fmtDate(f.date, { day: 'numeric', month: 'long', year: 'numeric' })}`,
          paid ? 'Acquittée' : `Échéance : ${U.fmtDateShort(f.echeance)}`])}

        <div class="inv-parties">
          <div><div class="inv-label">Émetteur</div>${this.emitter()}</div>
          <div><div class="inv-label">Client</div>
            <p><strong>${U.esc(client || '—')}</strong>${c.adresse ? '<br>' + U.nl2br(c.adresse) : ''}${c.email ? '<br>' + U.esc(c.email) : ''}${c.tel ? '<br>' + U.esc(c.tel) : ''}</p>
          </div>
        </div>

        <section class="inv-section">
          <h2 class="inv-h">Objet</h2>
          <p class="inv-object">${U.esc(objet)}</p>
        </section>

        <section class="inv-section">
          <h2 class="inv-h">Détail de la facture</h2>
          <table class="inv-table">
            <thead><tr><th>Désignation</th><th class="qty">Qté</th><th class="num">Prix unitaire</th><th class="num">Total</th></tr></thead>
            <tbody>${lignes.map(l => `<tr>
              <td class="item">${U.esc(l.desc)}</td><td class="qty">${l.qte}</td>
              <td class="num">${U.fmtMoney(l.pu)}</td><td class="num strong">${U.fmtMoney(l.qte * l.pu)}</td></tr>`).join('')}</tbody>
          </table>
          <div class="inv-sum"><table>
            <tr><td>Total</td><td>${U.fmtMoney(total)}</td></tr>
            <tr class="muted"><td>TVA</td><td>non applicable</td></tr>
            <tr class="net"><td>${paid ? 'Montant réglé' : 'Net à payer'}</td><td>${U.fmtMoney(total)}</td></tr>
          </table></div>
        </section>

        <section class="inv-section">
          <h2 class="inv-h">Modalités de règlement</h2>
          <div class="inv-cards">
            ${paid ? `
              <div class="inv-card paid"><div class="inv-label">Réglée</div><div class="inv-card-big">${U.fmtMoney(total)}</div>
                <div class="sub">Le ${U.fmtDateShort(f.payeeLe)}${f.moyen ? ' • ' + U.esc(f.moyen) : ''}</div></div>
              <div class="inv-card"><div class="inv-label">Reste à payer</div><div class="inv-card-big">${U.fmtMoney(0)}</div>
                <div class="sub">Merci pour votre règlement</div></div>`
            : `
              <div class="inv-card"><div class="inv-label">Montant dû</div><div class="inv-card-big">${U.fmtMoney(total)}</div>
                <div class="sub">Carte, virement, chèque ou espèces</div></div>
              <div class="inv-card"><div class="inv-label">À régler avant le</div><div class="inv-card-big">${U.fmtDate(f.echeance, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <div class="sub">Délai de ${s.delaiPaiement} jours</div></div>`}
          </div>
          ${!paid && s.iban ? `
          <div class="inv-bank">
            <div class="inv-label">Coordonnées bancaires</div>
            <p><b>Titulaire du compte :</b> ${U.esc(s.nom)}<br>
              ${s.banque ? `<b>Banque :</b> ${U.esc(s.banque)}<br>` : ''}
              <b>IBAN :</b> ${U.esc(s.iban)}<br>
              ${s.bic ? `<b>BIC :</b> ${U.esc(s.bic)}<br>` : ''}
              <b>Libellé du virement :</b> ${U.esc((client || 'Client').toUpperCase())} – ${U.esc(f.numero || '')}</p>
          </div>` : ''}
        </section>

        <section class="inv-section">
          <h2 class="inv-h">Mentions</h2>
          <ul class="inv-mentions">${mentions.map(m => `<li>${m}</li>`).join('')}</ul>
        </section>

        ${this.footer(`Facture N° ${f.numero || 'brouillon'} • ${client}`)}
      </article>`;
  },

  letter(x) {
    const s = Store.settings;
    return `
      <article class="inv" style="${this.colorStyle()}">
        ${this.header('', [])}
        <div class="inv-parties">
          <div><div class="inv-label">Expéditeur</div>${this.emitter()}</div>
          <div><div class="inv-label">Destinataire</div><p>${U.nl2br(x.destinataire)}</p></div>
        </div>
        <p class="inv-letter-place">${U.esc(this.city() || '')}${this.city() ? ', le' : 'Le'} ${U.fmtDate(x.date, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        <section class="inv-section"><h2 class="inv-h">Objet : ${U.esc(x.objet)}</h2></section>
        <div class="inv-letter-body">${U.nl2br(x.corps)}</div>
        <div class="inv-letter-sign"><strong>${U.esc(s.nom)}</strong>${U.esc(s.profession)}</div>
        ${this.footer('Document confidentiel — couvert par le secret professionnel')}
      </article>`;
  },

  // Exemple de facture pour l'aperçu depuis les Paramètres
  sample() {
    const s = Store.settings;
    const d = new Date();
    return {
      numero: `${d.getFullYear()}-0042`, date: U.isoDate(d), echeance: U.isoDate(U.addDays(d, Number(s.delaiPaiement) || 15)), statut: 'envoyee',
      client: { prenom: 'Claire', nom: 'Martin', adresse: '4 avenue Foch\n75016 Paris', email: 'claire.martin@exemple.fr' },
      lignes: [
        { desc: `Séance individuelle du ${U.fmtDateShort(U.addDays(d, -14))}`, qte: 1, pu: Number(s.tarif) },
        { desc: `Séance individuelle du ${U.fmtDateShort(U.addDays(d, -7))}`, qte: 1, pu: Number(s.tarif) },
        { desc: `Séance en visio du ${U.fmtDateShort(d)}`, qte: 1, pu: Number(s.tarif) },
      ],
    };
  },
};
