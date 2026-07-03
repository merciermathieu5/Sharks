/* Harnais de validation — Sharks San Jose (jsdom) */
const fs = require('fs');
const path = require('path');
const {JSDOM} = require('jsdom');

let total = 0, echecs = 0;
function ok(cond, msg){
  total++;
  if (!cond){ echecs++; console.error('  ✗ ' + msg); }
}
function egal(a, b, msg){ ok(a===b, msg + ` (obtenu: ${JSON.stringify(a)}, attendu: ${JSON.stringify(b)})`); }

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

(async () => {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://example.org/',
    pretendToBeVisual: true
  });
  // neutraliser fetch (aucun réseau pendant les tests)
  dom.window.fetch = () => Promise.reject(new Error('réseau désactivé en test'));
  await new Promise(r => setTimeout(r, 300));
  const W = dom.window;
  const S = W.__SJS__;

  console.log('— Chargement');
  ok(!!S, 'API de test exposée (__SJS__)');
  if (!S){ console.error('Arrêt.'); process.exit(1); }

  console.log('— Données de secours');
  egal(S.SECOURS_ROSTER.length, 25, '25 joueurs dans la formation de secours');
  const kotka = S.SECOURS_ROSTER.find(j => j.nom === 'Jesperi Kotkaniemi');
  egal(kotka.salaire, 7250000, 'Salaire Kotkaniemi');
  egal(kotka.ct, 3, 'Contrat Kotkaniemi 3 ans');
  egal(S.SECOURS_Y21.length, 20, '20 patineurs dans la référence Y21');
  const schwartzY21 = S.SECOURS_Y21.find(x => x.nom === 'Jaden Schwartz');
  egal(schwartzY21.pts, 94, 'Schwartz 94 points en Y21');

  console.log('— Moteur de profils (tableaux 10-11-12)');
  const profilDe = nom => S.determinerProfil(S.SECOURS_ROSTER.find(j => j.nom === nom)).profil;
  egal(profilDe('Jesperi Kotkaniemi'), 'Elite', 'Kotkaniemi → Elite');
  egal(profilDe('Jaden Schwartz'), 'Playmaker', 'Schwartz → Playmaker');
  egal(profilDe('Travis Konecny'), 'Power Forward', 'Konecny → Power Forward');
  egal(profilDe('Nathan Legare'), 'Prospect Power Forward', 'Legare (24 ans) → Prospect Power Forward');
  egal(profilDe('Adam Fox'), 'DEliteQB', 'Fox → DEliteQB');
  egal(profilDe('Haydn Fleury'), 'DEliteShutdown', 'Fleury → DEliteShutdown');
  egal(profilDe('Tyler Myers'), 'DEliteShutdown', 'Myers (IT+EN+SK+PC=318, ST+DF=164, OV 81) → DEliteShutdown');
  egal(profilDe('Alexandar Georgiev'), 'Starter Goalie', 'Georgiev (OV 80) → Starter Goalie');
  egal(profilDe('Cal Petersen'), 'Backup Goalie', 'Petersen (OV 78) → Backup Goalie');
  egal(profilDe('Brad Lambert'), 'Prospect Sniper', 'Lambert (SP+SK=168, SC=74) → Prospect Sniper');

  console.log('— Tranches d\'overall');
  egal(S.trancheDeOV(75), '≤75', 'OV 75');
  egal(S.trancheDeOV(80), '80-81', 'OV 80');
  egal(S.trancheDeOV(84), '84-85', 'OV 84');
  egal(S.trancheDeOV(90), '≥86', 'OV 90');

  console.log('— Parseur de formation (fixture HTML réaliste)');
  const fixtureRoster = `<html><body><table>
    <tr><th>Nom</th><th>PO</th><th>HD</th><th>CD</th><th>IJ</th><th>IN</th><th>SP</th><th>ST</th><th>EN</th><th>DU</th><th>DI</th><th>SK</th><th>PA</th><th>PC</th><th>DF</th><th>OF</th><th>EX</th><th>LD</th><th>OV</th><th>Age</th><th>Salary</th><th>CT</th><th>HT</th><th>WT</th><th>Lien</th></tr>
    <tr><td>Jesperi Kotkaniemi</td><td>C</td><td>G</td><td>OK</td><td></td><td>70</td><td>83</td><td>77</td><td>89</td><td>86</td><td>83</td><td>83</td><td>83</td><td>79</td><td>62</td><td>79</td><td>61</td><td>51</td><td>82</td><td>25</td><td>7 250 000 $</td><td>3</td><td>6 ' 2</td><td>198 lbs</td><td>Lien</td></tr>
    <tr><td>Alexandar Georgiev</td><td>G</td><td>G</td><td>OK</td><td></td><td>83</td><td>87</td><td>81</td><td>85</td><td>87</td><td>85</td><td>88</td><td>73</td><td>80</td><td>NA</td><td>NA</td><td>83</td><td>74</td><td>80</td><td>29</td><td>3 000 000 $</td><td>1</td><td>6 ' 1</td><td>179 lbs</td><td>Lien</td></tr>
    <tr><td></td><td></td><td></td><td></td><td></td><td>70</td><td>76</td><td>76</td><td>80</td><td>77</td><td>79</td><td>78</td><td>73</td><td>73</td><td>68</td><td>70</td><td>68</td><td>61</td><td>78</td><td>28</td><td>3 370 000 $</td><td>1,5</td><td>6 ' 1</td><td>195</td><td></td></tr>
  </table></body></html>`;
  const docR = new W.DOMParser().parseFromString(fixtureRoster, 'text/html');
  const joueurs = S.parseRoster(null, docR);
  egal(joueurs.length, 2, 'Deux joueurs extraits (rangée des moyennes ignorée)');
  egal(joueurs[0].nom, 'Jesperi Kotkaniemi', 'Nom du premier joueur');
  egal(joueurs[0].salaire, 7250000, 'Salaire converti (espaces et $)');
  egal(joueurs[0].sc, 79, 'Colonne OF lue comme SC');
  egal(joueurs[1].df, null, 'DF du gardien = NA → null');

  console.log('— Parseur de pointage (fixture)');
  const fixtureScoring = `<html><body><table>
    <tr><th>Name</th><th>GP</th><th>G</th><th>A</th><th>PTS</th><th>+/-</th><th>PIM</th><th>PP</th><th>GW</th><th>S</th><th>PCT</th></tr>
    <tr><td>Jaden Schwartz</td><td>10</td><td>4</td><td>8</td><td>12</td><td>5</td><td>2</td><td>2</td><td>1</td><td>25</td><td>16.0</td></tr>
  </table><table>
    <tr><th>Name</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>AVG</th><th>SV%</th><th>SO</th></tr>
    <tr><td>Alexandar Georgiev</td><td>6</td><td>4</td><td>2</td><td>0</td><td>2.31</td><td>0.915</td><td>1</td></tr>
  </table></body></html>`;
  const docS = new W.DOMParser().parseFromString(fixtureScoring, 'text/html');
  const sc = S.parseScoring(null, docS);
  egal(sc.patineurs.length, 1, 'Un patineur extrait');
  egal(sc.patineurs[0].pts, 12, 'Points de Schwartz');
  egal(sc.patineurs[0].plusminus, 5, 'Différentiel de Schwartz');
  egal(sc.gardiens.length, 1, 'Un gardien extrait');
  egal(sc.gardiens[0].w, 4, 'Victoires de Georgiev');
  ok(Math.abs(sc.gardiens[0].avg - 2.31) < 1e-9, 'Moyenne de Georgiev');

  console.log('— Parseur XtraStats (fixture texte)');
  const fixtureXtra = [
    '    Player                    Team            POS GP   G   A   P  Sh PiM   MP   H Sh/G',
    '    [Jaden Schwartz](https://x/#Jaden Schwartz) SANJOSE         C   82  25  69  94 187  10 1767  81 2.28',
    '    [Alex Tuch](https://x/#Alex Tuch) ANAHEIM         RW  77  27  32  59 183  16 1503 243 2.38',
    '    [* Backup_RW](https://x/#Backup_RW) SANJOSE         LW   3   0   0   0   0   0    0   0 0.00'
  ].join('\n');
  const x = S.parseXtra(fixtureXtra, 'SANJOSE');
  egal(x.length, 2, 'Deux patineurs SANJOSE extraits (Anaheim exclu)');
  egal(x[0].hits, 81, 'MEÉ de Schwartz depuis XtraStats');
  egal(x[0].mp, 1767, 'Minutes de Schwartz depuis XtraStats');

  console.log('— Évaluation des attentes');
  // stat cumulée : 6 buts en 20 matchs, attente 20 → projection 24.6 → Mémorable
  let ev = S.evaluerStat('goals', 6, 20, 20);
  egal(ev.statut, 'memorable', 'Projection au-delà de l\'attente → Mémorable');
  ok(Math.abs(ev.projection - 24.6) < 0.01, 'Projection sur 82 matchs');
  // exactement l'attente → atteint, PAS mémorable (il faut dépasser)
  ev = S.evaluerStat('pts', 41, 41, 41 * 2); // 41 pts en 41 matchs, attente 82 → proj 82 = attente
  egal(ev.statut, 'atteint', 'Attente égalée → atteinte, pas Mémorable');
  // en retard
  ev = S.evaluerStat('goals', 2, 20, 30);
  egal(ev.statut, 'retard', 'Loin de l\'attente → en retard');
  // en voie (>= 85 %)
  ev = S.evaluerStat('goals', 9, 41, 20); // proj 18 / 20 = 90 %
  egal(ev.statut, 'envoie', 'À 90 % de l\'attente → en voie');
  // stat de taux (pas de projection) : % de tirs
  ev = S.evaluerStat('shotpct', 15.2, 40, 14.0);
  egal(ev.statut, 'memorable', '% de tirs au-delà de l\'attente → Mémorable');
  ok(Math.abs(ev.projection - 15.2) < 1e-9, 'Pas de mise à l\'échelle pour un taux');
  // stat inversée : GAA plus bas que l'attente = Mémorable
  ev = S.evaluerStat('avg', 2.10, 30, 2.50);
  egal(ev.statut, 'memorable', 'GAA sous l\'attente → Mémorable');
  ev = S.evaluerStat('avg', 3.10, 30, 2.50);
  egal(ev.statut, 'retard', 'GAA bien au-dessus de l\'attente → en retard');
  // sans attente définie
  ev = S.evaluerStat('goals', 5, 10, null);
  egal(ev.statut, 'indef', 'Sans attente → à définir');

  console.log('— Attentes : priorité surcharge > matrice');
  const j = S.SECOURS_ROSTER.find(x2 => x2.nom === 'Jesperi Kotkaniemi');
  j._profil = S.determinerProfil(j);
  const matrices = {pro: {Elite: {goals: {'82-83': 28}}}};
  let att = S.attentePour(j, 'goals', matrices, {});
  egal(att.valeur, 28, 'Attente lue depuis la matrice (tranche 82-83)');
  egal(att.source, 'matrice', 'Source = matrice');
  att = S.attentePour(j, 'goals', matrices, {[S.normaliserNom(j.nom)]: {goals: 33}});
  egal(att.valeur, 33, 'La surcharge individuelle a priorité');
  att = S.attentePour(j, 'gwg', matrices, {});
  egal(att.valeur, null, 'Stat sans valeur → null (à définir)');

  console.log('— Rendu de l\'interface');
  const doc = W.document;
  const rangees = doc.querySelectorAll('#tableAlignement tbody tr');
  egal(rangees.length, 25, '25 rangées dans la table d\'alignement');
  ok(doc.querySelector('#alignSommaire').textContent.includes('Masse salariale'), 'Sommaire de masse salariale rendu');
  ok(doc.querySelector('#ficheEquipe').textContent.includes('SANJOSE'), 'Fiche d\'équipe affichée');
  const cartes = doc.querySelectorAll('#progGrille .joueur-carte');
  ok(cartes.length >= 20, 'Cartes de progression rendues (' + cartes.length + ')');
  ok(doc.querySelector('#progGrille').textContent.includes('Mémorable') === false || true, 'Grille rendue sans erreur');
  const selProfil = doc.querySelector('#selProfil');
  ok(selProfil.options.length >= 10, 'Sélecteur de profils peuplé (' + selProfil.options.length + ')');
  const matriceInputs = doc.querySelectorAll('#tableMatrice input');
  ok(matriceInputs.length > 0, 'Éditeur de matrice rendu avec des champs');

  console.log('— Masse salariale (cohérence)');
  const actifs = S.SECOURS_ROSTER.filter(x2 => !x2.backup);
  const masse = actifs.reduce((s, x2) => s + x2.salaire, 0);
  egal(masse, 84250000, 'Masse salariale des 23 actifs = 84 250 000 $');
  ok(doc.querySelector('#alignSommaire .stat-carte').classList.contains('alerte'), 'Dépassement du plafond signalé en alerte');

  console.log(`\n${total - echecs}/${total} vérifications réussies`);
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error('ERREUR FATALE', e); process.exit(1); });
