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
function proche(a, b, tol, msg){ ok(a!==null && a!==undefined && Math.abs(a-b)<=tol, msg + ` (obtenu: ${a}, attendu: ~${b})`); }
function tableauEgal(a, b, msg){ ok(JSON.stringify(a)===JSON.stringify(b), msg + ` (obtenu: ${JSON.stringify(a)}, attendu: ${JSON.stringify(b)})`); }

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

  console.log('— Moteur de profils (tableaux 10-11-12) et matrices associées');
  const joueurDe = nom => S.SECOURS_ROSTER.find(j => j.nom === nom);
  const profilDe = nom => S.determinerProfil(joueurDe(nom));
  egal(profilDe('Jesperi Kotkaniemi').profil, 'Elite', 'Kotkaniemi → Elite');
  egal(profilDe('Jesperi Kotkaniemi').mat, 'ELITE', 'Kotkaniemi → matrice ELITE');
  tableauEgal(profilDe('Jesperi Kotkaniemi').stats, ['shotpct','gwg','ppg','pts','pmrang'],
    'Stats évaluées Elite = tableau 20 (PCTG, GWG, PP, P, +/-)');
  egal(profilDe('Jaden Schwartz').profil, 'Playmaker', 'Schwartz → Playmaker');
  tableauEgal(profilDe('Jaden Schwartz').stats, ['assists','pts'], 'Stats Playmaker = A, P');
  egal(profilDe('Travis Konecny').profil, 'Power Forward', 'Konecny → Power Forward');
  egal(profilDe('Nathan Legare').profil, 'Prospect Power Forward', 'Legare (24 ans) → Prospect Power Forward');
  egal(profilDe('Nathan Legare').mat, 'POWERFWD', 'Prospect Power Forward → même matrice POWERFWD');
  egal(profilDe('Adam Fox').profil, 'DEliteQB', 'Fox → DEliteQB');
  egal(profilDe('Haydn Fleury').profil, 'DEliteShutdown', 'Fleury → DEliteShutdown');
  egal(profilDe('Tyler Myers').profil, 'DEliteShutdown', 'Myers → DEliteShutdown');
  egal(profilDe('Alexandar Georgiev').profil, 'Starter Goalie', 'Georgiev (OV 80) → Starter Goalie');
  tableauEgal(profilDe('Alexandar Georgiev').stats, ['hs','svpct','qggp','ming'], 'Stats Starter = HS, SV%, QG/GP, MIN');
  egal(profilDe('Cal Petersen').profil, 'Backup Goalie', 'Petersen (OV 78) → Backup Goalie');
  tableauEgal(profilDe('Cal Petersen').stats, ['mp','qggp','psv'], 'Stats Backup = MP, QG/GP, Psv');
  egal(profilDe('Brad Lambert').profil, 'Prospect Sniper', 'Lambert → Prospect Sniper');

  console.log('— Matrices Y17 (article 6.2.6) : consultation par overall');
  egal(Object.keys(S.MATRICES).length, 15, '15 matrices de profils');
  const nbStats = Object.values(S.MATRICES).reduce((a,m)=>a+Object.keys(m).length,0);
  egal(nbStats, 40, '40 tableaux de seuils au total');
  tableauEgal(S.seuilsMatrice('ELITE','pts',82), [97,86,74,63,37,-1], 'Elite points OV 82');
  tableauEgal(S.seuilsMatrice('ELITE','pts',70), [23,20,17,15,9,-1], 'OV 70 ramené au rang 73');
  tableauEgal(S.seuilsMatrice('ELITE','pts',95), [117,104,90,77,45,-1], 'OV 95 ramené au rang 90');
  tableauEgal(S.seuilsMatrice('DELITEQB','ppg',80), [3,2,1,0,-1,-5], 'DElite QB buts en PP OV 80');
  tableauEgal(S.seuilsMatrice('STARTER','ming',85), [0.98,0.91,0.84,0.77,0.64,-1], 'Starter MIN (ratio) constant');
  tableauEgal(S.seuilsMatrice('BACKUP','psv',78), [908,899,890,881,872,-1], 'Backup Psv OV 78');
  tableauEgal(S.seuilsMatrice('GRINDER','hits20',77), [2.55,2.35,2.15,1.95,1.75,-1], 'Grinder MEÉ/20 OV 77');
  egal(S.seuilsMatrice('ELITE','inexistante',80), null, 'Statistique inconnue → null');

  console.log('— Statuts (tableau 18) : un degré exige de DÉPASSER STRICTEMENT son seuil');
  const sE82 = S.seuilsMatrice('ELITE','pts',82); // [97,86,74,63,37,-1]
  egal(S.statutSelonSeuils(97.5, sE82), 'memorable', '97,5 pts > 97 → Mémorable');
  egal(S.statutSelonSeuils(97,   sE82), 'excellente', '97 pts = seuil Mémorable → Excellente (pas de Mémorable sans dépasser)');
  egal(S.statutSelonSeuils(87,   sE82), 'excellente', '87 pts → Excellente');
  egal(S.statutSelonSeuils(75,   sE82), 'satisfaisante', '75 pts → Satisfaisante');
  egal(S.statutSelonSeuils(74,   sE82), 'correcte', '74 pts = seuil Satisfaisante → Correcte');
  egal(S.statutSelonSeuils(64,   sE82), 'correcte', '64 pts → Correcte');
  egal(S.statutSelonSeuils(38,   sE82), 'decevante', '38 pts → Décevante');
  egal(S.statutSelonSeuils(37,   sE82), 'oublier', '37 pts = seuil Décevante → À oublier');
  egal(S.statutSelonSeuils(null, sE82), 'indef', 'Valeur absente → à définir');
  egal(S.statutSelonSeuils(50, [60,null,null,null,null,null]), 'sousmemo', 'Seule cible Mémorable connue, non dépassée → sous le Mémorable');

  console.log('— Évaluation avec projection sur 82 matchs');
  let ev = S.evaluerStat('pts', 30, 20, sE82); // proj 123 > 97
  proche(ev.projection, 123, 0.01, 'Projection 30 pts en 20 matchs');
  egal(ev.statut, 'memorable', 'Projection au-delà du seuil Mémorable');
  egal(ev.mods, 60, 'ModS +60 pour un Mémorable');
  ev = S.evaluerStat('pts', 20, 41, sE82); // proj 40 → decevante
  egal(ev.statut, 'decevante', 'Projection 40 pts → Décevante');
  egal(ev.mods, -20, 'ModS -20 pour une Décevante');
  ev = S.evaluerStat('shotpct', 15.2, 40, S.seuilsMatrice('ELITE','shotpct',82));
  proche(ev.projection, 15.2, 1e-9, 'Aucune mise à l\'échelle pour un taux');
  egal(ev.statut, 'excellente', 'PCTG 15,2 sur seuils OV 82 → Excellente');
  ev = S.evaluerStat('pts', null, 0, sE82);
  egal(ev.statut, 'indef', 'Sans valeur → à définir');

  console.log('— Statistiques dérivées');
  const prod = {gp:20, goals:10, shots:80, hits:60, mp:400, qs:8, svpct:0.905, pts:25};
  const jTest = {nom:'Test Joueur', po:'C'};
  proche(S.valeurStat(jTest, prod, 'shotpct'), 12.5, 1e-9, '%T = 10/80 = 12,5');
  proche(S.valeurStat(jTest, prod, 'hits20'), 3, 1e-9, 'MEÉ/20 = 60/(400/20) = 3');
  proche(S.valeurStat(jTest, prod, 'shots20'), 4, 1e-9, 'T/20 = 80/(400/20) = 4');
  proche(S.valeurStat(jTest, prod, 'mg'), 20, 1e-9, 'MIN/M = 400/20');
  proche(S.valeurStat(jTest, prod, 'qggp'), 0.4, 1e-9, 'DQ/M = 8/20');
  proche(S.valeurStat(jTest, prod, 'psv'), 905, 1e-9, 'Psv = %A × 1000');
  egal(S.valeurStat(jTest, prod, 'pts'), 25, 'Stat directe inchangée');
  const ctx = {limites: new Map([[S.normaliserNom('Test Joueur'), 62]]), matchsEquipe: 20};
  proche(S.valeurStat(jTest, {gp:15}, 'ming', ctx), (15/20*82)/62, 1e-9, 'MIN gardien = parties projetées / limite');
  egal(S.valeurStat(jTest, {gp:15}, 'ming', {limites:new Map(), matchsEquipe:20}), null, 'Sans limite connue → à définir');

  console.log('— Rang du différentiel dans le club (tableau 20)');
  const rangs = S.calculerPmRangs([
    {nom:'Aa', gp:5, plusminus:5},
    {nom:'Bb', gp:5, plusminus:0},
    {nom:'Cc', gp:5, plusminus:-3},
    {nom:'Dd', gp:0, plusminus:9}   // exclu : aucun match
  ]);
  proche(rangs.get(S.normaliserNom('Aa')), 1, 1e-9, 'Meilleur +/- → 1,00');
  proche(rangs.get(S.normaliserNom('Bb')), 0.5, 1e-9, 'Milieu → 0,50');
  proche(rangs.get(S.normaliserNom('Cc')), 0, 1e-9, 'Dernier → 0,00');
  ok(!rangs.has(S.normaliserNom('Dd')), 'Joueur sans match exclu du classement');

  console.log('— Modificateurs (tableaux 17 et 19) et fourchette de recote');
  egal(S.modA({po:'C', age:25}), 5, 'Patineur 25 ans → ModA +5');
  egal(S.modA({po:'C', age:35}), -25, 'Patineur 35 ans → ModA -25');
  egal(S.modA({po:'G', age:29}), 5, 'Gardien 29 ans → ModA +5');
  egal(S.modA({po:'G', age:33}), -10, 'Gardien 33 ans → ModA -10');
  egal(S.convertirJet(146), 4, 'Jet 146 → +4');
  egal(S.convertirJet(121), 2, 'Jet 121 → +2');
  egal(S.convertirJet(100), 0, 'Jet 100 → 0');
  egal(S.convertirJet(51), -1, 'Jet 51 → -1');
  egal(S.convertirJet(10), -4, 'Jet 10 → -4');
  egal(S.convertirJet(-25), -5, 'Jet -25 → -5');
  const four = S.fourchetteRecote(kotka, 10); // 25 ans → ModA+5 → base 75
  egal(four.base, 75, 'Base = 60 + ModA(5) + ModS(10)');
  egal(four.min, 0, 'Pire jet (76) → 0');
  egal(four.max, 1, 'Meilleur jet (115) → +1');

  console.log('— Priorité des seuils : rangée personnalisée > Y17 ; surcharge = Mémorable seul');
  const jk = joueurDe('Jesperi Kotkaniemi');
  jk._profil = S.determinerProfil(jk);
  let s = S.seuilsPour(jk, 'pts', {}, {});
  tableauEgal(s.seuils, [97,86,74,63,37,-1], 'Seuils Y17 par défaut (OV 82)');
  egal(s.source, 'Y17', 'Source = Y17');
  const perso = {ELITE: {pts: {82: [100,90,80,70,40,-1]}}};
  s = S.seuilsPour(jk, 'pts', perso, {});
  tableauEgal(s.seuils, [100,90,80,70,40,-1], 'La rangée personnalisée remplace Y17');
  egal(s.source, 'personnalisée', 'Source = personnalisée');
  s = S.seuilsPour(jk, 'pts', {}, {[S.normaliserNom(jk.nom)]: {pts: 120}});
  egal(s.seuils[0], 120, 'La surcharge fixe le seuil Mémorable');
  egal(s.seuils[2], 74, 'Les autres degrés restent ceux de la matrice');

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
    <tr><th>Name</th><th>GP</th><th>W</th><th>L</th><th>T</th><th>AVG</th><th>SV%</th><th>SO</th><th>HS</th></tr>
    <tr><td>Alexandar Georgiev</td><td>6</td><td>4</td><td>2</td><td>0</td><td>2.31</td><td>0.915</td><td>1</td><td>2</td></tr>
  </table></body></html>`;
  const docS = new W.DOMParser().parseFromString(fixtureScoring, 'text/html');
  const sc = S.parseScoring(null, docS);
  egal(sc.patineurs.length, 1, 'Un patineur extrait');
  egal(sc.patineurs[0].pts, 12, 'Points de Schwartz');
  egal(sc.patineurs[0].plusminus, 5, 'Différentiel de Schwartz');
  egal(sc.gardiens.length, 1, 'Un gardien extrait');
  egal(sc.gardiens[0].w, 4, 'Victoires de Georgiev');
  ok(Math.abs(sc.gardiens[0].avg - 2.31) < 1e-9, 'Moyenne de Georgiev');
  egal(sc.gardiens[0].hs, 2, 'Colonne HS lue');

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

  console.log('— Rendu de l\'interface');
  const doc = W.document;
  const rangees = doc.querySelectorAll('#tableAlignement tbody tr');
  egal(rangees.length, 25, '25 rangées dans la table d\'alignement');
  ok(doc.querySelector('#alignSommaire').textContent.includes('Masse salariale'), 'Sommaire de masse salariale rendu');
  ok(doc.querySelector('#ficheEquipe').textContent.includes('SANJOSE'), 'Fiche d\'équipe affichée');
  const cartes = doc.querySelectorAll('#progGrille .joueur-carte');
  ok(cartes.length >= 20, 'Cartes de progression rendues (' + cartes.length + ')');
  ok(doc.querySelector('#progGrille').textContent.includes('ModS estimé'), 'ModA / ModS affichés sur les cartes');
  ok(doc.querySelectorAll('#progGrille .att-input').length > 0, 'Champs de cible Mémorable présents');
  const selMatrice = doc.querySelector('#selMatrice');
  egal(selMatrice.options.length, 15, 'Sélecteur des 15 matrices peuplé');
  ok(doc.querySelector('#selStat').options.length >= 1, 'Sélecteur de statistique peuplé');
  const rangeesMat = doc.querySelectorAll('#tableMatrice tbody tr');
  egal(rangeesMat.length, 18, 'Éditeur : rangées OV 73 à 90');
  egal(doc.querySelectorAll('#tableMatrice tbody input').length, 108, 'Éditeur : 18 rangées × 6 degrés');
  ok(doc.querySelector('#tableMatrice thead').textContent.includes('Mémorable'), 'Colonnes des degrés de satisfaction');
  ok(doc.querySelector('#sourcesTexte').textContent.includes('limites.json'), 'Source limites.json documentée');
  const boutonDiff = doc.querySelector('#progFiltres button[data-f="difficulte"]');
  ok(!!boutonDiff, 'Filtre «En difficulté» présent');

  console.log('— Masse salariale (cohérence)');
  const actifs = S.SECOURS_ROSTER.filter(x2 => !x2.backup);
  const masse = actifs.reduce((s2, x2) => s2 + x2.salaire, 0);
  egal(masse, 84250000, 'Masse salariale des 23 actifs = 84 250 000 $');
  ok(doc.querySelector('#alignSommaire .stat-carte').classList.contains('alerte'), 'Dépassement du plafond signalé en alerte');

  console.log('— Divers');
  egal(S.matchsEquipe(), 0, 'Fiche 0-0-0 → 0 match d\'équipe');

  console.log('— XtraStats en repli de TeamScoring (archive ou saison courante)');
  const xtraY21 = [{nom:'Aa', gp:82}, {nom:'Bb', gp:75}];
  const xtraY22 = [{nom:'Aa', gp:9}, {nom:'Bb', gp:10}];
  egal(S.xtraEstArchive(xtraY21, 0), true, 'Club à 0 match → archive Y21');
  egal(S.xtraEstArchive(xtraY21, 10), true, 'GP max 82 pour un club à 10 matchs → archive');
  egal(S.xtraEstArchive(xtraY22, 10), false, 'GP max 10 pour un club à 10 matchs → saison courante');
  egal(S.xtraEstArchive(xtraY22, 82), false, 'Fin de saison : GP max ≈ matchs du club → saison courante');
  // repli effectif : sans TeamScoring, XtraStats devient la source de production
  const ETAT = S.ETAT;
  ok(!!ETAT, 'État global accessible pour la simulation du repli');
  if (ETAT){
    const avantY21 = ETAT.xtraEstY21, avantScoring = ETAT.scoring;
    ETAT.xtraEstY21 = false;            // XtraStats jugé «saison courante»
    ETAT.scoring = {patineurs:[], gardiens:[]}; // TeamScoring indisponible
    const jSchwartz = S.SECOURS_ROSTER.find(x2=>x2.nom==='Jaden Schwartz');
    const prodRepli = S.productionDe(jSchwartz);
    ok(!!prodRepli && prodRepli._xtraSource===true, 'Production servie par XtraStats (drapeau _xtraSource)');
    egal(prodRepli?.pts, 94, 'Points lus depuis XtraStats en repli');
    egal(prodRepli?._reference, false, 'Pas traitée comme simple référence Y21');
    ETAT.xtraEstY21 = avantY21; ETAT.scoring = avantScoring;
  }

  console.log(`\n${total - echecs}/${total} vérifications réussies`);
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error('ERREUR FATALE', e); process.exit(1); });
