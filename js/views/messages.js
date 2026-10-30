/* Messagerie WhatsApp : modèles de messages et historique des envois. */
const MESSAGE_TYPES = {
  libre: 'Message libre', rappel: 'Rappel de RDV', confirmation: 'Confirmation de RDV',
  visio: 'Lien de visio', relance: 'Relance de facture', facture: 'Envoi de facture',
};

Views.messages = {
  title: 'WhatsApp',

  render(el) {
    const history = [...Store.list('messages')].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 50);
    el.innerHTML = `
      <div class="page-head">
        <div><h1>Messages WhatsApp</h1>
          <p class="muted">Rédigez en un clic : WhatsApp s'ouvre avec le message prêt, vous n'avez plus qu'à appuyer sur Envoyer.</p></div>
      </div>
      <div class="cols">
        <section class="card">
          <h2>${icon('whatsapp')} Nouveau message</h2>
          <form class="form" id="msg-form">
            <label class="field"><span>Destinataire</span><select name="clientId" required>${UI.clientOptions('')}</select></label>
            <label class="field"><span>Type de message</span>
              <select name="type">${Object.entries(MESSAGE_TYPES).filter(([k]) => k !== 'facture').map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
            <label class="field" data-ctx hidden><span data-ctx-label>Rendez-vous</span><select name="ref"></select></label>
            <label class="field"><span>Message</span><textarea name="texte" rows="7"></textarea></label>
            <button class="btn whatsapp big" type="submit">${icon('whatsapp', 18)} Ouvrir dans WhatsApp</button>
          </form>
        </section>
        <section class="card">
          <h2>${icon('clock')} Historique</h2>
          ${history.length ? `<ul class="list">${history.map(m => `
            <li class="row"><span class="grow">
              <strong>${U.esc(Store.clientName(m.clientId))}</strong> <span class="badge badge-grey">${MESSAGE_TYPES[m.type] || m.type}</span>
              <span class="muted small">· ${m.canal === 'email' ? 'E-mail' : 'WhatsApp'} · ${U.fmtDate(m.date)} ${U.fmtTime(m.date)}</span><br>
              <span class="small">${U.esc(m.texte)}</span></span></li>`).join('')}</ul>` : UI.empty('Aucun message envoyé pour le moment.')}
        </section>
      </div>
      <section class="card">
        <h2>${icon('settings')} Modèles de messages</h2>
        <p class="muted">Variables disponibles : {{prenom}}, {{nom}}, {{quand}}, {{lieu}}, {{lien}}, {{numero}}, {{montant}}, {{echeance}}, {{praticien}}</p>
        <form class="form" id="tpl-form">
          ${Object.entries(Store.settings.modeles).map(([k, v]) => `
            <label class="field"><span>${MESSAGE_TYPES[k]}</span><textarea name="${k}" rows="3">${U.esc(v)}</textarea></label>`).join('')}
          <button class="btn ghost" type="submit">${icon('check', 18)} Enregistrer les modèles</button>
        </form>
      </section>`;

    const form = el.querySelector('#msg-form');
    const ctx = el.querySelector('[data-ctx]');
    const update = (rebuildRefs) => {
      const clientId = form.clientId.value, type = form.type.value;
      const client = Store.get('clients', clientId);
      const needsEvent = ['rappel', 'confirmation', 'visio'].includes(type);
      const needsInvoice = type === 'relance';
      ctx.hidden = !clientId || !(needsEvent || needsInvoice);
      if (rebuildRefs) {
        let opts = [];
        if (needsEvent) {
          opts = Store.list('events').filter(e => e.clientId === clientId && e.start >= new Date().toISOString() && e.statut === 'prevu')
            .sort((a, b) => a.start.localeCompare(b.start))
            .map(e => [e.id, `${U.fmtDate(e.start)} à ${U.fmtTime(e.start)} (${e.mode === 'visio' ? 'visio' : 'cabinet'})`]);
          el.querySelector('[data-ctx-label]').textContent = 'Rendez-vous';
        } else if (needsInvoice) {
          opts = Store.list('factures').filter(f => f.clientId === clientId && ['envoyee', 'retard'].includes(Store.invoiceStatus(f)))
            .map(f => [f.id, `${f.numero} · ${U.fmtMoney(Store.invoiceTotal(f))}`]);
          el.querySelector('[data-ctx-label]').textContent = 'Facture';
        }
        form.ref.innerHTML = opts.length ? opts.map(([v, l]) => `<option value="${v}">${U.esc(l)}</option>`).join('') : '<option value="">Aucun élément</option>';
      }
      let event = needsEvent ? Store.get('events', form.ref.value) : null;
      if (event && type === 'visio' && !event.visioUrl) event = Store.upsert('events', { id: event.id, visioUrl: Store.visioLink() });
      const facture = needsInvoice ? Store.get('factures', form.ref.value) : null;
      const tpl = type === 'libre' ? 'Bonjour {{prenom}}, ' : Store.settings.modeles[type];
      form.texte.value = client ? U.fill(tpl, Actions.vars({ client, event, facture })) : '';
    };
    form.clientId.onchange = () => update(true);
    form.type.onchange = () => update(true);
    form.ref.onchange = () => update(false);
    form.onsubmit = (e) => {
      e.preventDefault();
      if (!form.clientId.value) return UI.toast('Choisissez un destinataire', 'warn');
      const type = form.type.value;
      if (Actions.whatsapp(form.clientId.value, form.texte.value, type)) {
        if (type === 'relance' && form.ref.value) {
          const f = Store.get('factures', form.ref.value);
          Store.upsert('factures', { id: f.id, relances: [...(f.relances || []), new Date().toISOString()] });
        }
        if (type === 'rappel' && form.ref.value) Store.upsert('events', { id: form.ref.value, rappelEnvoye: new Date().toISOString() });
        App.refresh();
      }
    };
    el.querySelector('#tpl-form').onsubmit = (e) => {
      e.preventDefault();
      Store.settings.modeles = { ...Store.settings.modeles, ...U.form(e.target) };
      Store.save(); UI.toast('Modèles enregistrés');
    };
  },
};
