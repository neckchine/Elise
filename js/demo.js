/* Données d'exemple pour découvrir l'application. */
const Demo = {
  seed(store) {
    const d = store.data;
    const clients = [
      { prenom: 'Claire', nom: 'Martin', tel: '06 12 34 56 78', email: 'claire.martin@exemple.fr', adresse: '4 avenue Foch, 75016 Paris', naissance: '1986-04-12', notes: 'Suivi anxiété, adressée par le Dr Leroy.' },
      { prenom: 'Julien', nom: 'Bernard', tel: '06 98 76 54 32', email: 'julien.b@exemple.fr', adresse: '', naissance: '1979-09-03', notes: '' },
      { prenom: 'Sophie', nom: 'Petit', tel: '07 11 22 33 44', email: 'sophie.petit@exemple.fr', adresse: '22 rue Oberkampf, 75011 Paris', naissance: '1994-01-27', notes: 'Préfère les séances en visio.' },
      { prenom: 'Karim', nom: 'Haddad', tel: '06 55 44 33 22', email: 'karim.h@exemple.fr', adresse: '', naissance: '', notes: '' },
    ].map(c => ({ ...c, id: U.uid(), createdAt: new Date().toISOString() }));
    d.clients.push(...clients);

    // Décale sur un jour de semaine pour rester dans les horaires d'ouverture
    const weekday = (dayOffset) => {
      let x = U.addDays(U.startOfDay(new Date()), dayOffset);
      while (x.getDay() === 0 || x.getDay() === 6) x = U.addDays(x, dayOffset < 0 ? -1 : 1);
      return x;
    };
    const at = (dayOffset, time) => U.fromDateTime(U.isoDate(weekday(dayOffset)), time);
    const tarif = d.settings.tarif;
    const ev = (o) => ({ id: U.uid(), type: 'rdv', duree: 50, mode: 'cabinet', statut: 'prevu', tarif, notes: '', ...o });

    const past1 = ev({ clientId: clients[0].id, start: at(-7, '10:00'), statut: 'honore' });
    const past2 = ev({ clientId: clients[1].id, start: at(-5, '14:00'), statut: 'honore' });
    const past3 = ev({ clientId: clients[2].id, start: at(-30, '11:00'), statut: 'honore', mode: 'visio', visioUrl: store.visioLink() });
    d.events.push(past1, past2, past3,
      ev({ clientId: clients[0].id, start: at(0, '10:00') }),
      ev({ clientId: clients[2].id, start: at(0, '14:00'), mode: 'visio', visioUrl: store.visioLink() }),
      ev({ clientId: clients[3].id, start: at(1, '09:00') }),
      ev({ clientId: clients[1].id, start: at(2, '16:00') }),
      { id: U.uid(), type: 'perso', title: 'Supervision', start: at(1, '12:30'), duree: 90, notes: '' },
      { id: U.uid(), type: 'perso', title: 'Sport', start: at(3, '18:00'), duree: 60, notes: '' },
    );

    const facture = (num, client, evt, statut, dateOffset, extra = {}) => {
      const date = U.isoDate(U.addDays(new Date(), dateOffset));
      const f = {
        id: U.uid(), numero: num, clientId: client.id, date,
        echeance: U.isoDate(U.addDays(new Date(), dateOffset + d.settings.delaiPaiement)),
        lignes: [{ desc: `Séance du ${U.fmtDateShort(evt.start)}`, qte: 1, pu: tarif }],
        statut, relances: [], eventIds: [evt.id], ...extra,
      };
      evt.factureId = f.id;
      return f;
    };
    const y = new Date().getFullYear();
    d.factures.push(
      facture(`${y}-0001`, clients[2], past3, 'envoyee', -30),
      facture(`${y}-0002`, clients[0], past1, 'payee', -7, { payeeLe: U.isoDate(U.addDays(new Date(), -6)), moyen: 'Virement' }),
      facture(`${y}-0003`, clients[1], past2, 'envoyee', -5),
    );

    d.depenses.push(
      { id: U.uid(), date: U.isoDate(U.addDays(new Date(), -10)), libelle: 'Loyer du cabinet', categorie: 'Loyer', montant: 650 },
      { id: U.uid(), date: U.isoDate(U.addDays(new Date(), -3)), libelle: 'Supervision', categorie: 'Formation', montant: 80 },
    );

    const jour = weekday(3);
    d.demandes.push({
      id: U.uid(), prenom: 'Léa', nom: 'Moreau', tel: '06 20 30 40 50', email: 'lea.moreau@exemple.fr',
      start: U.fromDateTime(U.isoDate(jour), '11:00'), mode: 'cabinet',
      motif: 'Premier rendez-vous, difficultés de sommeil.', statut: 'attente', createdAt: new Date().toISOString(),
    });
  },
};
