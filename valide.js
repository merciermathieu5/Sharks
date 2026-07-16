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

/* Constantes propres à l'équipe (recote ushl.ca du 8 juillet 2026).
   masseSousContrat = somme des salaires CT>0 de l'alignement PRO — recoupée
   avec la ligne «Year: 20» (moins le club-école) de USHL22Finance.html. */
const ATTENDU = {
  equipe: 'SANJOSE',
  taille: 25,
  echantillon: {nom: 'Jesperi Kotkaniemi', salaire: 9075000, ct: 2, ov: 81},
  masseSousContrat: 63800000,
  nbSousContrat: 10
};

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
  egal(S.SECOURS_ROSTER.length, ATTENDU.taille, ATTENDU.taille + ' joueurs dans la formation de secours');
  const echantillon = S.SECOURS_ROSTER.find(j => j.nom === ATTENDU.echantillon.nom);
  ok(!!echantillon, 'Joueur témoin présent (' + ATTENDU.echantillon.nom + ')');
  egal(echantillon.salaire, ATTENDU.echantillon.salaire, 'Salaire du joueur témoin');
  egal(echantillon.ct, ATTENDU.echantillon.ct, 'Contrat du joueur témoin');
  egal(echantillon.ov, ATTENDU.echantillon.ov, 'OV du joueur témoin');
  egal(S.SECOURS_Y21, undefined, 'Aucun jeu de données de la saison précédente (retiré)');
  ok(new Set(S.SECOURS_ROSTER.map(j=>j.nom)).size === S.SECOURS_ROSTER.length, 'Aucun nom en double');

  console.log('— Moteur de profils (tableaux 10-11-12) et matrices associées — fixtures vérifiées à la main (recote SANJOSE du 28 juin)');
  const FIXTURES_PROFILS = {
   'Jesperi Kotkaniemi': {nom:'Jesperi Kotkaniemi', po:'C', hd:'G', it:70,sp:83,st:77,en:89,du:86,di:83,sk:83,pa:83,pc:79,df:62,sc:79,ex:61,ld:51,ov:82,age:25},
   'Brad Lambert':       {nom:'Brad Lambert',       po:'C', hd:'D', it:68,sp:85,st:69,en:77,du:79,di:75,sk:83,pa:71,pc:74,df:56,sc:74,ex:49,ld:37,ov:76,age:22},
   'Jaden Schwartz':     {nom:'Jaden Schwartz',     po:'C', hd:'G', it:62,sp:81,st:64,en:89,du:83,di:98,sk:89,pa:85,pc:83,df:66,sc:68,ex:99,ld:99,ov:81,age:33},
   'Travis Konecny':     {nom:'Travis Konecny',     po:'AG',hd:'D', it:86,sp:78,st:74,en:81,du:75,di:70,sk:80,pa:79,pc:73,df:66,sc:80,ex:78,ld:68,ov:81,age:28},
   'Nathan Legare':      {nom:'Nathan Legare',      po:'AG',hd:'D', it:82,sp:69,st:92,en:83,du:95,di:77,sk:69,pa:72,pc:69,df:65,sc:87,ex:57,ld:66,ov:81,age:24},
   'Adam Fox':           {nom:'Adam Fox',           po:'D', hd:'D', it:64,sp:84,st:70,en:86,du:83,di:81,sk:85,pa:86,pc:76,df:79,sc:70,ex:60,ld:62,ov:83,age:27},
   'Haydn Fleury':       {nom:'Haydn Fleury',       po:'D', hd:'G', it:80,sp:70,st:91,en:88,du:86,di:76,sk:85,pa:75,pc:70,df:82,sc:67,ex:69,ld:57,ov:84,age:29},
   'Tyler Myers':        {nom:'Tyler Myers',        po:'D', hd:'D', it:73,sp:74,st:84,en:94,du:78,di:89,sk:81,pa:70,pc:70,df:80,sc:57,ex:99,ld:78,ov:81,age:35},
   'Alexandar Georgiev': {nom:'Alexandar Georgiev', po:'G', hd:'G', it:83,sp:87,st:81,en:85,du:87,di:85,sk:88,pa:73,pc:80,df:null,sc:null,ex:83,ld:74,ov:80,age:29},
   'Cal Petersen':       {nom:'Cal Petersen',       po:'G', hd:'D', it:84,sp:83,st:82,en:80,du:73,di:82,sk:83,pa:75,pc:85,df:null,sc:null,ex:60,ld:50,ov:78,age:31}
  };
  const joueurDe = nom => FIXTURES_PROFILS[nom];
  const profilDe = nom => S.determinerProfil(joueurDe(nom));
  egal(profilDe('Jesperi Kotkaniemi').profil, 'Elite', 'Kotkaniemi (fixture) → Elite');
  egal(profilDe('Jesperi Kotkaniemi').mat, 'ELITE', 'Kotkaniemi (fixture) → matrice ELITE');
  tableauEgal(profilDe('Jesperi Kotkaniemi').stats, ['shotpct','gwg','ppg','pts','pmrang'],
    'Stats évaluées Elite = tableau 20 (PCTG, GWG, PP, P, +/-)');
  egal(profilDe('Jaden Schwartz').profil, 'Playmaker', 'Schwartz (fixture) → Playmaker');
  tableauEgal(profilDe('Jaden Schwartz').stats, ['assists','pts'], 'Stats Playmaker = A, P');
  egal(profilDe('Travis Konecny').profil, 'Power Forward', 'Konecny (fixture) → Power Forward');
  egal(profilDe('Nathan Legare').profil, 'Prospect Power Forward', 'Legare 24 ans (fixture) → Prospect Power Forward');
  egal(profilDe('Nathan Legare').mat, 'POWERFWD', 'Prospect Power Forward → même matrice POWERFWD');
  egal(profilDe('Adam Fox').profil, 'DEliteQB', 'Fox (fixture) → DEliteQB');
  egal(profilDe('Haydn Fleury').profil, 'DEliteShutdown', 'Fleury (fixture) → DEliteShutdown');
  egal(profilDe('Tyler Myers').profil, 'DEliteShutdown', 'Myers (fixture) → DEliteShutdown');
  egal(profilDe('Alexandar Georgiev').profil, 'Starter Goalie', 'Georgiev OV 80 (fixture) → Starter Goalie');
  tableauEgal(profilDe('Alexandar Georgiev').stats, ['hs','svpct','qggp','ming'], 'Stats Starter = HS, SV%, QG/GP, MIN');
  egal(profilDe('Cal Petersen').profil, 'Backup Goalie', 'Petersen OV 78 (fixture) → Backup Goalie');
  tableauEgal(profilDe('Cal Petersen').stats, ['mp','qggp','psv'], 'Stats Backup = MP, QG/GP, Psv');
  egal(profilDe('Brad Lambert').profil, 'Prospect Sniper', 'Lambert (fixture) → Prospect Sniper');

  console.log('— Profils sur l\'alignement actuel (dynamique)');
  for (const j of S.SECOURS_ROSTER.filter(x => !x.backup)){
    const p = S.determinerProfil(j);
    ok(!!(p && p.profil && p.mat), j.nom + ' reçoit un profil (' + (p && p.profil) + ')');
    ok(!!(p && S.STATS_PAR_MATRICE[p.mat]), j.nom + ' : matrice reconnue (' + (p && p.mat) + ')');
    if (j.po === 'G') ok(/goalie/i.test(p.profil), j.nom + ' : profil de gardien');
    else ok(!/goalie/i.test(p.profil), j.nom + ' : profil de patineur');
  }

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

  console.log('— Évaluation des totaux tels quels (aucune projection : facteur karma)');
  let ev = S.evaluerStat('pts', 98, sE82);
  egal(ev.valeur, 98, 'La valeur évaluée est le total courant, sans mise à l\'échelle');
  egal(ev.statut, 'memorable', '98 pts → Mémorable');
  egal(ev.mods, 60, 'ModS +60 pour un Mémorable');
  ev = S.evaluerStat('pts', 40, sE82);
  egal(ev.statut, 'decevante', '40 pts → Décevante');
  egal(ev.mods, -20, 'ModS -20 pour une Décevante');
  ev = S.evaluerStat('shotpct', 15.2, S.seuilsMatrice('ELITE','shotpct',82));
  egal(ev.statut, 'excellente', 'PCTG 15,2 sur seuils OV 82 → Excellente');
  ev = S.evaluerStat('pts', null, sE82);
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
  const ctx = {limites: new Map([[S.normaliserNom('Test Joueur'), 62]])};
  proche(S.valeurStat(jTest, {gp:15}, 'ming', ctx), 15/62, 1e-9, 'MIN gardien = parties jouées / limite (ratio brut)');
  egal(S.valeurStat(jTest, {gp:15}, 'ming', {limites:new Map()}), null, 'Sans limite connue → à définir');

  console.log('— Rang du différentiel dans le club (tableau 20)');
  const rangs = S.calculerPmRangs([
    {nom:'Aa', gp:5, plusminus:5},
    {nom:'Bb', gp:5, plusminus:0},
    {nom:'Cc', gp:5, plusminus:-3},
    {nom:'Dd', gp:0, plusminus:9}   // exclu : aucun match
  ]);
  proche(rangs.get(S.normaliserNom('Aa'))?.prop, 1, 1e-9, 'Meilleur +/- → proportion 1,00');
  egal(rangs.get(S.normaliserNom('Aa'))?.rang, 1, 'Meilleur +/- → 1er rang');
  proche(rangs.get(S.normaliserNom('Bb'))?.prop, 0.5, 1e-9, 'Milieu → 0,50');
  egal(rangs.get(S.normaliserNom('Bb'))?.rang, 2, 'Milieu → 2e rang');
  proche(rangs.get(S.normaliserNom('Cc'))?.prop, 0, 1e-9, 'Dernier → 0,00');
  egal(rangs.get(S.normaliserNom('Cc'))?.total, 3, 'Classement sur 3 patineurs qualifiés');
  ok(!rangs.has(S.normaliserNom('Dd')), 'Joueur sans match exclu du classement');


  console.log('— Automatisation du rang +/- à l\'arrivée des statistiques (bout en bout)');
  {
    const ETAT2 = S.ETAT;
    const avantScoring2 = ETAT2.scoring, avantArchive2 = ETAT2.xtraArchive;
    // dès que TeamScoring fournit des patineurs avec un différentiel, le rang se calcule seul
    const patineursRoster = S.SECOURS_ROSTER.filter(x9=>x9.po!=='G' && !x9.backup);
    const scoringFictif = patineursRoster.map((x9,i9)=>({
      nom:x9.nom, gp:10, goals:i9%4, assists:i9%5, pts:(i9%4)+(i9%5), shots:20+i9,
      pim:2, plusminus:(patineursRoster.length-1)/2 - i9, ppg:1, gwg:1
    }));
    ETAT2.scoring = {patineurs:scoringFictif, gardiens:[]};
    ETAT2.xtraArchive = true;
    const rangsAuto = S.calculerPmRangs(ETAT2.scoring.patineurs);
    egal(rangsAuto.size, patineursRoster.length, 'Tous les patineurs qualifiés sont classés automatiquement');
    const meilleur = patineursRoster[0];
    const rMeilleur = rangsAuto.get(S.normaliserNom(meilleur.nom));
    egal(rMeilleur?.rang, 1, 'Le meilleur différentiel du club obtient le 1er rang');
    proche(S.valeurStat(meilleur, {gp:10}, 'pmrang', {pmRangs:rangsAuto}), 1, 1e-9,
      'valeurStat lit la proportion de rang sans intervention');
    // un joueur évalué sur le rang +/- reçoit un statut réel dans l'interface re-rendue
    const jPm = ETAT2.roster.find(x9=>x9._profil?.stats?.includes('pmrang') && !x9.backup);
    ok(!!jPm, 'Au moins un joueur du club est évalué sur le rang +/-');
    if (jPm){
      W.document.querySelector('#progFiltres button[data-f="tous"]').click(); // force le re-rendu
      const carte = [...W.document.querySelectorAll('#progGrille .joueur-carte')]
        .find(c=>c.querySelector('.jc-nom').textContent===jPm.nom);
      ok(!!carte, 'Carte du joueur rendue avec la production fictive');
      const lignePm = [...(carte?.querySelectorAll('.stat-ligne')||[])]
        .find(l=>l.querySelector('.nom-stat').textContent.includes('Rang +/-'));
      ok(!!lignePm, 'Ligne «Rang +/- au club» présente');
      ok(lignePm && !lignePm.querySelector('.badge-etat.indef'), 'Le rang +/- reçoit un statut (plus «à définir»)');
      ok(lignePm && /ᵉ\/\d+/.test(lignePm.textContent), 'Rang ordinal affiché (ex. 4ᵉ/18)');
    }
    ETAT2.scoring = avantScoring2; ETAT2.xtraArchive = avantArchive2;
    W.document.querySelector('#progFiltres button[data-f="tous"]').click(); // retour à l'état initial
  }


  console.log('— Validation de l\'équipe des pages téléchargées (session des relais)');
  {
    const bonne = 'menu de la ligue… ' + S.CONFIG.equipe + ' 3-2-0 … table des joueurs';
    ok(S.validerPageEquipe(bonne), 'Page de la bonne équipe acceptée (sa fiche s\'y trouve)');
    ok(!S.validerPageEquipe('menu de la ligue… ZZAUTRE 11-8-0 … table des joueurs'),
       'Page d\'une autre équipe rejetée (fiche du club absente) — sera réessayée, jamais mise en cache');
    egal(S.extraireFiche(bonne), S.CONFIG.equipe + ' 3-2-0', 'Fiche extraite de la page validée');
  }

  console.log('— Modificateurs (tableaux 17 et 19) et fourchette de recote');
  egal(S.modA({po:'C', age:25}), 5, 'Patineur 25 ans → ModA +5');
  egal(S.modA({po:'C', age:35}), -25, 'Patineur 35 ans → ModA -25');
  egal(S.modA({po:'G', age:29}), 5, 'Gardien 29 ans → ModA +5');
  egal(S.modA({po:'G', age:33}), -10, 'Gardien 33 ans → ModA -10');
  egal(S.convertirJet(146), 3, 'Jet 146 → +3 (recote plafonnée à +3)');
  egal(S.convertirJet(200), 3, 'Aucun jet ne dépasse +3');
  egal(S.convertirJet(121), 2, 'Jet 121 → +2');
  egal(S.convertirJet(100), 0, 'Jet 100 → 0');
  egal(S.convertirJet(51), -1, 'Jet 51 → -1');
  egal(S.convertirJet(10), -4, 'Jet 10 → -4');
  egal(S.convertirJet(-25), -5, 'Jet -25 → -5');
  const four = S.fourchetteRecote(joueurDe('Jesperi Kotkaniemi'), 10); // fixture 25 ans → ModA+5 → base 75
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

  console.log('— Parseur multi-tables : les joueurs sans contrat / club-école ne sont plus perdus');
  {
    const lg = (nom,ct)=>`<tr><td>${nom}</td><td>D</td><td>D</td><td>OK</td><td></td><td>64</td><td>84</td><td>70</td><td>86</td><td>83</td><td>81</td><td>85</td><td>86</td><td>76</td><td>79</td><td>70</td><td>60</td><td>62</td><td>82</td><td>27</td><td>9 075 000 $</td><td>${ct}</td><td>6 ' 0</td><td>195 lbs</td><td>Lien</td></tr>`;
    const en = '<tr><th>Nom</th><th>PO</th><th>HD</th><th>CD</th><th>IJ</th><th>IN</th><th>SP</th><th>ST</th><th>EN</th><th>DU</th><th>DI</th><th>SK</th><th>PA</th><th>PC</th><th>DF</th><th>OF</th><th>EX</th><th>LD</th><th>OV</th><th>Age</th><th>Salary</th><th>CT</th><th>HT</th><th>WT</th><th>Lien</th></tr>';
    const fx = '<html><body><table>' + en + lg('Joueur Aligne',2) + '</table>'
      + '<table>' + en + lg('Joueur Echu',0) + '</table>'
      + '<table>' + en + lg('Joueur Retenu',2) + '</table></body></html>';
    const docM = new W.DOMParser().parseFromString(fx, 'text/html');
    const js2 = S.parseRoster(null, docM);
    egal(js2.length, 3, 'Les trois tables sont lues (plus d\'arrêt à la première)');
    egal(js2.find(x=>x.nom==='Joueur Aligne').horsAlignement, false, 'Première table = alignement PRO');
    egal(js2.find(x=>x.nom==='Joueur Echu').horsAlignement, true, 'Table suivante → hors alignement (sans contrat)');
    egal(js2.find(x=>x.nom==='Joueur Retenu').horsAlignement, true, 'Club-école → hors alignement');
    // rendu et masse
    const rosterAvant = S.ETAT.roster;
    S.ETAT.roster = js2.map(x=>({...x, _profil:S.determinerProfil(x)}));
    W.localStorage.removeItem(S.CLES_LS.resign);
    W.document.querySelector('[data-vue="alignement"]')?.click();
    W.document.querySelector('#tableAlignement thead th[data-col="ov"]')?.click();
    egal(W.document.querySelectorAll('#tableAlignement tbody tr').length, 1, 'Table principale : alignement seulement');
    ok(W.document.getElementById('horsAlignement').style.display !== 'none', 'Section «Hors alignement» affichée');
    egal(W.document.querySelectorAll('#tableHorsAlign tbody tr').length, 2, 'Deux joueurs hors alignement visibles (plus disparus!)');
    const btnEchu = [...W.document.querySelectorAll('#tableHorsAlign button.btn-prolong')].find(b=>b.dataset.nom==='Joueur Echu');
    ok(!!btnEchu, 'Le joueur à contrat échu (0 an) hors alignement a son bouton «Prolonger»');
    ok(![...W.document.querySelectorAll('#tableHorsAlign button.btn-prolong')].find(b=>b.dataset.nom==='Joueur Retenu'),
      'Le joueur retenu (CT 2) hors alignement n\'est pas prolongeable');
    egal(S.calculerMasse({}).masse, 9075000, 'Masse = alignement seul (hors alignement jamais compté)');
    btnEchu.click();
    W.document.getElementById('mpOk').click();
    const masseP = S.calculerMasse(S.litResignatures()).masse;
    ok(masseP > 9075000, 'Le hors-alignement prolongé rentre au plafond');
    ok(W.document.querySelector('#alignSommaire .det').textContent.includes('prolongé'), 'Sommaire compte le prolongé hors alignement');
    W.localStorage.removeItem(S.CLES_LS.resign);
    S.ETAT.roster = rosterAvant;
    W.document.querySelector('#tableAlignement thead th[data-col="ov"]')?.click();
  }


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
  egal(rangees.length, S.SECOURS_ROSTER.length, S.SECOURS_ROSTER.length + ' rangées dans la table d\'alignement');
  ok(doc.querySelector('#alignSommaire').textContent.includes('Masse salariale'), 'Sommaire de masse salariale rendu');
  ok(doc.querySelector('#ficheEquipe').textContent.includes(ATTENDU.equipe), 'Fiche d\'équipe affichée');
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
  const comptabilises = actifs.filter(x2 => x2.ct > 0);
  const masse = comptabilises.reduce((s2, x2) => s2 + x2.salaire, 0);
  egal(comptabilises.length, ATTENDU.nbSousContrat, ATTENDU.nbSousContrat + ' joueurs sous contrat (CT > 0)');
  egal(masse, ATTENDU.masseSousContrat, 'Masse des salaires sous contrat = «Year: 20» de USHL22Finance.html (pro seulement)');
  ok(!doc.querySelector('#alignSommaire .stat-carte').classList.contains('alerte'), 'Sous le plafond de 104 M$ : aucune alerte');
  ok(doc.querySelector('#alignSommaire .stat-carte .det').textContent.replace(/\s/g,'').includes('104000000'), 'Plafond affiché = 104 000 000 $');

  console.log('— Charte salariale des re-signatures (Y22, cap 104 M)');
  // Salaires minimums transcrits de la charte (en dollars)
  egal(S.salaireMinimum(74, 'RFA', 25), 700000, 'RFA OV74- = 700 000 $');
  egal(S.salaireMinimum(82, 'RFA', 25), 8750000, 'RFA OV82 = 8 750 000 $');
  egal(S.salaireMinimum(90, 'RFA', 22), 17500000, 'RFA OV87+ = 17 500 000 $ (clamp haut)');
  egal(S.salaireMinimum(80, 'UFA', 30), 5000000, 'UFA OV80 34- = 5 000 000 $');
  egal(S.salaireMinimum(80, 'UFA', 36), 3250000, 'UFA OV80 35+ = 3 250 000 $ (tranche d\'âge)');
  egal(S.salaireMinimum(83, 'UFAR2', 32), 7500000, 'UFA Ronde 2 OV83 34- = 7 500 000 $');
  egal(S.salaireMinimum(85, 'SANS', 37), 6000000, 'Sans contrat OV85 35+ = 6 000 000 $');
  egal(S.salaireMinimum(70, 'RFA', 25), 700000, 'OV sous 74 → clamp au plancher (700 000 $)');
  // Statut déduit de l'âge (règle retenue : 28- = RFA, sinon UFA)
  egal(S.statutResignature({age:28}), 'RFA', '28 ans → RFA');
  egal(S.statutResignature({age:29}), 'UFA', '29 ans → UFA');
  egal(S.statutResignature({age:22}), 'RFA', '22 ans → RFA');
  // Durées maximales par statut (charte)
  egal(S.dureeMaxCharte('RFA'), 7, 'RFA : durée max 7 ans');
  egal(S.dureeMaxCharte('UFA'), 4, 'UFA : durée max 4 ans');
  egal(S.dureeMaxCharte('UFAR2'), 2, 'UFA Ronde 2 : durée max 2 ans');
  egal(S.dureeMaxCharte('SANS'), 1, 'Sans contrat : durée 1 an');
  // Clé de charte avec tranche d'âge
  egal(S.cleCharte('UFA', 34), 'UFA_34', 'UFA 34 ans → colonne 34-');
  egal(S.cleCharte('UFA', 35), 'UFA_35', 'UFA 35 ans → colonne 35+');
  // Règle RFA : 1 à 7 saisons à la discrétion du DG, +1 échelon par année après 3
  egal(S.echelonEffectif(80, 'RFA', 3), 80, 'RFA 3 ans → échelon de base (OV 80)');
  egal(S.echelonEffectif(80, 'RFA', 4), 81, 'RFA 4 ans → échelon +1 (OV 81)');
  egal(S.echelonEffectif(80, 'RFA', 7), 84, 'RFA 7 ans → échelon +4 (OV 84)');
  egal(S.echelonEffectif(80, 'UFA', 4), 80, 'La règle d\'échelon ne touche pas les UFA');
  egal(S.salaireMinimum(80, 'RFA', 25, 1), 5750000, 'RFA OV80, 1 an = 5 750 000 $');
  egal(S.salaireMinimum(80, 'RFA', 25, 3), 5750000, 'RFA OV80, 3 ans = même minimum (5 750 000 $)');
  egal(S.salaireMinimum(80, 'RFA', 25, 4), 7500000, 'RFA OV80, 4 ans = échelon 81 (7 500 000 $)');
  egal(S.salaireMinimum(80, 'RFA', 25, 7), 12250000, 'RFA OV80, 7 ans = échelon 84 (12 250 000 $)');
  egal(S.salaireMinimum(86, 'RFA', 24, 7), 17500000, 'RFA OV86, 7 ans → échelon 90, clampé à 87+ (17 500 000 $)');
  egal(S.salaireMinimum(80, 'UFA', 30, 4), 5000000, 'UFA OV80, 4 ans = minimum inchangé (5 000 000 $)');
  // Règle des gardiens : un échelon plus bas à la prolongation
  egal(S.echelonEffectif(83, 'UFA', 2, 'G'), 82, 'Gardien OV83 → échelon 82 (un échelon plus bas)');
  egal(S.echelonEffectif(83, 'UFA', 2, 'C'), 83, 'Patineur OV83 → échelon inchangé');
  egal(S.echelonEffectif(80, 'RFA', 5, 'G'), 81, 'Gardien RFA 5 ans : +2 (durée) −1 (gardien) = OV81');
  egal(S.salaireMinimum(83, 'UFA', 32, 2, 'G'), 7500000, 'Gardien UFA OV83 34- → minimum de l\'échelon 82 (7 500 000 $)');
  egal(S.salaireMinimum(83, 'UFA', 32, 2, 'C'), 8750000, 'Patineur UFA OV83 34- → minimum de son échelon (8 750 000 $)');
  egal(S.salaireMinimum(74, 'UFA', 30, 1, 'G'), 900000, 'Gardien OV74 → clamp au plancher de la charte');
  // Éligibilité : seuls les contrats échus (0 an) se prolongent
  egal(S.peutProlonger({ct:0, backup:false}), true, 'Contrat échu (0 an) → prolongeable');
  egal(S.peutProlonger({ct:1, backup:false}), false, 'Sous contrat (1 an) → NON prolongeable');
  egal(S.peutProlonger({ct:0, backup:true}), false, 'Backup → jamais prolongeable');
  // Format et parsing des montants
  egal(S.parseArgent('8,5 M'), 8500000, 'parseArgent «8,5 M» = 8 500 000');
  egal(S.parseArgent('900 k'), 900000, 'parseArgent «900 k» = 900 000');
  egal(S.parseArgent('7500000'), 7500000, 'parseArgent «7500000» = 7 500 000');
  egal(S.fmtArgentCourt(8500000), '8,5 M', 'fmtArgentCourt 8,5 M');
  egal(S.fmtArgentCourt(900000), '900 k', 'fmtArgentCourt 900 k');

  console.log('— Fenêtre «Prolongation de contrat» : éligibilité, ouverture, bornage, impact, retrait');
  W.localStorage.removeItem(S.CLES_LS.resign);
  doc.querySelector('[data-vue="alignement"]')?.click();
  // Aucun joueur sous contrat n'offre de bouton : seuls les contrats échus (0 an) se prolongent
  const jSous = S.ETAT.roster.find(x=>!x.backup && x.ct > 0);
  ok(!!jSous, 'Au moins un joueur sous contrat dans le club');
  ok(![...doc.querySelectorAll('button.btn-prolong[data-nom]')].find(b=>b.dataset.nom===jSous.nom),
    'Joueur sous contrat : pas de bouton «Prolonger» (règle de la ligue)');
  S.ouvrirProlongation(jSous.nom);
  ok(!doc.getElementById('modalProlong') || doc.getElementById('modalProlong').hidden,
    'ouvrirProlongation refuse un joueur sous contrat (défense en profondeur)');
  // Muter un patineur à contrat échu pour tester la mécanique complète, puis restaurer
  const jMut = S.ETAT.roster.find(x=>!x.backup && x.po!=='G');
  const ctAvant = jMut.ct;
  jMut.ct = 0;
  doc.querySelector('#tableAlignement thead th[data-col="ov"]')?.click(); // re-rendu
  const btnP = [...doc.querySelectorAll('button.btn-prolong[data-nom]')].find(b=>b.dataset.nom===jMut.nom);
  ok(!!btnP, 'Contrat échu (0 an) : bouton «Prolonger» présent');
  egal(btnP.textContent.trim(), 'Prolonger', 'Libellé initial du bouton');
  const nomP = jMut.nom, cleP = S.normaliserNom(nomP);
  const statutP = S.statutResignature(jMut);
  btnP.click();                                   // ouvre la fenêtre
  const modal = doc.getElementById('modalProlong');
  ok(!!modal && !modal.hidden, 'La fenêtre de prolongation s\'ouvre au clic');
  egal(doc.getElementById('mpNom').textContent, nomP, 'Nom du joueur affiché dans la fenêtre');
  egal(doc.getElementById('mpStatut').value, statutP, 'Statut proposé = statut déduit de l\'âge');
  const dureeInitP = statutP === 'RFA' ? 3 : S.dureeMaxCharte(statutP);
  const minPD = S.salaireMinimum(jMut.ov, statutP, jMut.age, dureeInitP, jMut.po);
  egal(+doc.getElementById('mpDuree').value, dureeInitP, 'Durée proposée : 3 ans pour un RFA (dernier palier sans hausse), durée max sinon');
  egal(S.parseArgent(doc.getElementById('mpSalaire').value), minPD, 'Salaire pré-rempli au minimum de la charte pour cette durée');
  egal(doc.getElementById('mpDuree').options.length, S.dureeMaxCharte(statutP),
    'Durées offertes = 1 à la durée max du statut');
  ok(doc.getElementById('mpImpact').textContent.includes('Masse projetée'), 'Aperçu d\'impact sur la masse affiché');
  ok(doc.getElementById('mpRetirer').style.display === 'none', 'Bouton «Retirer» masqué pour un joueur non prolongé');
  // un salaire sous le minimum est ramené au minimum à la confirmation
  doc.getElementById('mpSalaire').value = '1';
  doc.getElementById('mpOk').click();
  ok(modal.hidden, 'La fenêtre se ferme après confirmation');
  const rP = S.litResignatures();
  ok(!!rP[cleP], 'Prolongation persistée');
  egal(rP[cleP].salaire, minPD, 'Salaire sous le minimum ramené au minimum de la charte');
  egal(rP[cleP].statut, statutP, 'Statut enregistré');
  ok(rP[cleP].duree >= 1 && rP[cleP].duree <= S.dureeMaxCharte(statutP), 'Durée enregistrée dans les bornes de la charte');
  ok(doc.querySelector('#alignSommaire .det').textContent.includes('prolongé'), 'Mention «prolongé» dans le sommaire de masse');
  const btnP2 = [...doc.querySelectorAll('button.btn-prolong[data-nom]')].find(b=>b.dataset.nom===nomP);
  ok(btnP2.classList.contains('actif') && btnP2.textContent.includes('Prolongé'), 'Bouton passe à l\'état «Prolongé»');
  // la masse inclut le salaire de prolongation (le joueur ct=0 rentre au plafond)
  const masseAvecP = S.calculerMasse(S.litResignatures()).masse;
  const masseSansP = S.calculerMasse({}).masse;
  egal(masseAvecP - masseSansP, minPD, 'Le prolongé (contrat échu) rentre au plafond avec son salaire de prolongation');
  // hausse volontaire au-dessus du minimum
  btnP2.click();
  ok(doc.getElementById('mpRetirer').style.display !== 'none', 'Bouton «Retirer» visible pour un joueur prolongé');
  egal(doc.getElementById('mpOk').textContent, 'Mettre à jour', 'Bouton de confirmation devient «Mettre à jour»');
  const hausseP = minPD + 3000000;
  doc.getElementById('mpSalaire').value = String(hausseP);
  doc.getElementById('mpOk').click();
  egal(S.litResignatures()[cleP].salaire, hausseP, 'Hausse volontaire au-dessus du minimum conservée');
  // changement de statut : les durées se recalculent
  const btnP3 = [...doc.querySelectorAll('button.btn-prolong[data-nom]')].find(b=>b.dataset.nom===nomP);
  btnP3.click();
  const selSt = doc.getElementById('mpStatut');
  selSt.value = 'SANS';
  selSt.dispatchEvent(new W.Event('change'));
  egal(doc.getElementById('mpDuree').options.length, 1, 'Statut «Sans contrat» → une seule durée offerte (1 an)');
  doc.getElementById('mpAnnuler').click();
  ok(doc.getElementById('modalProlong').hidden, 'Annuler ferme la fenêtre');
  egal(S.litResignatures()[cleP].salaire, hausseP, 'Annuler ne modifie pas la prolongation enregistrée');
  // retrait
  const btnP4 = [...doc.querySelectorAll('button.btn-prolong[data-nom]')].find(b=>b.dataset.nom===nomP);
  btnP4.click();
  doc.getElementById('mpRetirer').click();
  ok(!S.litResignatures()[cleP], '«Retirer la prolongation» supprime l\'entrée');
  jMut.ct = ctAvant;
  // Gardien à contrat échu : le minimum descend d'un échelon
  const gMut = S.ETAT.roster.find(x=>!x.backup && x.po==='G');
  ok(!!gMut, 'Au moins un gardien dans le club');
  const ctG = gMut.ct;
  gMut.ct = 0;
  doc.querySelector('#tableAlignement thead th[data-col="ov"]')?.click(); // re-rendu
  const btnG = [...doc.querySelectorAll('button.btn-prolong[data-nom]')].find(b=>b.dataset.nom===gMut.nom);
  ok(!!btnG, 'Gardien à contrat échu : bouton présent');
  btnG.click();
  const stG = doc.getElementById('mpStatut').value;
  const dG = +doc.getElementById('mpDuree').value;
  const minG = S.salaireMinimum(gMut.ov, stG, gMut.age, dG, 'G');
  const minGPat = S.salaireMinimum(gMut.ov, stG, gMut.age, dG, 'C');
  egal(S.parseArgent(doc.getElementById('mpSalaire').value), minG, 'Salaire du gardien pré-rempli à l\'échelon INFÉRIEUR (règle des gardiens)');
  ok(minG < minGPat || gMut.ov - 1 < 74, 'Minimum gardien plus bas que celui d\'un patineur de même OV (sauf clamp au plancher)');
  ok(doc.getElementById('mpMin').textContent.includes('gardien'), 'La note d\'échelon explique la règle du gardien');
  doc.getElementById('mpAnnuler').click();
  gMut.ct = ctG;
  doc.querySelector('#tableAlignement thead th[data-col="ov"]')?.click(); // retour à l'état initial
  W.localStorage.removeItem(S.CLES_LS.resign);

  console.log('— Composition d\'équipe : signés + prolongés, retraits, ajouts, décomptes');
  {
    W.localStorage.removeItem(S.CLES_LS.compo);
    W.localStorage.removeItem(S.CLES_LS.resign);
    W.document.querySelector('[data-vue="composition"]')?.click();
    const base = S.joueursComposition();
    egal(base.length, S.SECOURS_ROSTER.filter(x=>!x.backup && x.ct>0).length,
      'La composition démarre avec tous les joueurs signés (contrat en cours)');
    ok(base.every(j=>j.prov==='signe'), 'Provenance «signé» pour les contrats en cours');
    const somme = base.reduce((a,j)=>a+j.salaire,0);
    const attendu = S.SECOURS_ROSTER.filter(x=>!x.backup && x.ct>0).reduce((a,j)=>a+j.salaire,0);
    egal(somme, attendu, 'Masse de la composition = somme des salaires des signés');
    ok(W.document.querySelector('#compoSommaire').textContent.includes('Attaquants'), 'Sommaire rendu (attaquants/défenseurs/gardiens)');
    // décomptes par position
    const nbA = base.filter(j=>j.po==='C'||j.po==='AG'||j.po==='AD').length;
    const nbD = base.filter(j=>j.po==='D').length;
    const nbG = base.filter(j=>j.po==='G').length;
    egal(nbA + nbD + nbG, base.length, 'Chaque joueur compté dans exactement un groupe de position');
    // retrait (transigé) puis restauration
    const cible = base[0].nom;
    const btnRet = [...W.document.querySelectorAll('#tableCompo .btn-retirer')].find(b=>b.dataset.nom===cible);
    ok(!!btnRet, 'Bouton «Retirer» sur chaque rangée');
    btnRet.click();
    egal(S.joueursComposition().length, base.length-1, 'Le joueur transigé quitte la composition');
    ok(W.document.querySelector('#compoRetiresListe').textContent.includes(cible), 'Le retiré apparaît dans la liste restaurable');
    W.document.querySelector('#compoRetiresListe button')?.click();
    egal(S.joueursComposition().length, base.length, 'Restauration : le joueur revient');
    // ajout manuel valide
    W.document.getElementById('caNom').value = 'Acquisition Test';
    W.document.getElementById('caPo').value = 'D';
    W.document.getElementById('caOv').value = '81';
    W.document.getElementById('caSal').value = '4,25 M';
    W.document.getElementById('caAjouter').click();
    const ajout = S.joueursComposition().find(j=>j.nom==='Acquisition Test');
    ok(!!ajout, 'Ajout manuel présent dans la composition');
    egal(ajout.prov, 'ajout', 'Provenance «ajout»');
    egal(ajout.salaire, 4250000, 'Salaire de l\'ajout parsé («4,25 M»)');
    egal(ajout.po, 'D', 'Position de l\'ajout');
    // validations du formulaire
    W.document.getElementById('caNom').value = '';
    W.document.getElementById('caAjouter').click();
    ok(W.document.getElementById('caErreur').style.display !== 'none', 'Nom manquant → erreur affichée');
    W.document.getElementById('caNom').value = 'Acquisition Test';
    W.document.getElementById('caOv').value = '81';
    W.document.getElementById('caSal').value = '1 M';
    W.document.getElementById('caAjouter').click();
    ok(W.document.getElementById('caErreur').textContent.includes('déjà'), 'Doublon refusé');
    // un ajout retiré est supprimé (pas mis en liste des retirés)
    const btnRet2 = [...W.document.querySelectorAll('#tableCompo .btn-retirer')].find(b=>b.dataset.nom==='Acquisition Test');
    btnRet2.click();
    ok(!S.joueursComposition().find(j=>j.nom==='Acquisition Test'), 'Ajout manuel retiré = supprimé');
    ok(!S.litCompo().retires.includes(S.normaliserNom('Acquisition Test')), 'Un ajout supprimé ne va pas dans les retirés');
    // un prolongé (contrat échu re-signé) entre dans la composition avec son salaire de charte
    const jc = S.ETAT.roster.find(x=>!x.backup && x.po!=='G');
    const ctAv = jc.ct; jc.ct = 0;
    W.document.querySelector('[data-vue="alignement"]')?.click();
    W.document.querySelector('#tableAlignement thead th[data-col="ov"]')?.click();
    const bpj = [...W.document.querySelectorAll('button.btn-prolong[data-nom]')].find(b=>b.dataset.nom===jc.nom);
    bpj.click(); W.document.getElementById('mpOk').click();
    W.document.querySelector('[data-vue="composition"]')?.click();
    const jpro = S.joueursComposition().find(j=>j.nom===jc.nom);
    ok(!!jpro && jpro.prov==='prolonge', 'Le prolongé entre dans la composition (provenance «prolongé»)');
    egal(jpro.salaire, S.litResignatures()[S.normaliserNom(jc.nom)].salaire, 'Avec son salaire de prolongation');
    // manquants : sous 22 joueurs, le sommaire l'affiche
    const c22 = S.litCompo();
    const nbARetirer = Math.max(1, S.joueursComposition().length - 21);
    c22.retires = S.joueursComposition().slice(0, nbARetirer).map(j=>S.normaliserNom(j.nom));
    S.ecritCompo(c22); S.rendreComposition();
    ok(W.document.querySelector('#compoSommaire').textContent.includes('manquant'), 'Sous 22 joueurs → «manquants» affiché');
    jc.ct = ctAv;
    W.localStorage.removeItem(S.CLES_LS.compo);
    W.localStorage.removeItem(S.CLES_LS.resign);
  }

  console.log('— Parseur de la page «Finances» (contrats à jour, dont les 0 an)');
  {
    const fxFin = `<html><body>
      <p>SANJOSE 0-0-0 (12e Western)</p>
      <table><tr><th>JOUEUR</th><th>A</th><th>CONTRAT</th></tr>
        <tr><td>Jesperi Kotkaniemi</td><td>3</td><td>7 250 000 $</td></tr>
        <tr><td>Adam Fox</td><td>0</td><td>9 075 000 $</td></tr>
      </table>
      <table><tr><th>JOUEUR</th><th>A</th><th>CONTRAT</th></tr>
        <tr><td>Jeune Espoir</td><td>2</td><td>900 000 $</td></tr>
      </table></body></html>`;
    const docF = new W.DOMParser().parseFromString(fxFin, 'text/html');
    const contrats = S.parseFinance(null, docF);
    egal(contrats.size, 3, 'Trois contrats lus (pros + club-école)');
    egal(contrats.get(S.normaliserNom('Adam Fox')).ct, 0, 'Fox : 0 année de contrat (la donnée qui manquait!)');
    egal(contrats.get(S.normaliserNom('Adam Fox')).salaire, 9075000, 'Salaire de Fox lu');
    egal(contrats.get(S.normaliserNom('Adam Fox')).clubEcole, false, 'Première table = pros');
    egal(contrats.get(S.normaliserNom('Jeune Espoir')).clubEcole, true, 'Table suivante = club-école');
    egal(contrats.get(S.normaliserNom('Jesperi Kotkaniemi')).ct, 3, 'CT de Kotkaniemi synchronisé à 3');
  }

  console.log('— Divers');
  egal(S.matchsEquipe(), 0, 'Fiche 0-0-0 → 0 match d\'équipe');

  console.log('— XtraStats en repli de TeamScoring (archive ou saison courante)');
  const xtraArchiveFixture = [{nom:'Aa', gp:82}, {nom:'Bb', gp:75}];
  const xtraCourantFixture = [{nom:'Aa', gp:9}, {nom:'Bb', gp:10}];
  egal(S.xtraEstArchive(xtraArchiveFixture, 0), true, 'Club à 0 match → archive de la saison précédente');
  egal(S.xtraEstArchive(xtraArchiveFixture, 10), true, 'GP max 82 pour un club à 10 matchs → archive');
  egal(S.xtraEstArchive(xtraCourantFixture, 10), false, 'GP max 10 pour un club à 10 matchs → saison courante');
  egal(S.xtraEstArchive(xtraCourantFixture, 82), false, 'Fin de saison : GP max ≈ matchs du club → saison courante');
  // repli effectif : sans TeamScoring, XtraStats (saison courante) devient la source de production
  const ETAT = S.ETAT;
  ok(!!ETAT, 'État global accessible pour la simulation du repli');
  egal(ETAT.xtra.length, 0, 'Aucune production intégrée à l\'ouverture (cotes seulement)');
  if (ETAT){
    const avantArchive = ETAT.xtraArchive, avantScoring = ETAT.scoring, avantXtra = ETAT.xtra;
    ETAT.xtraArchive = false;           // XtraStats jugé «saison courante»
    ETAT.scoring = {patineurs:[], gardiens:[]}; // TeamScoring indisponible
    const jRepli = S.SECOURS_ROSTER.find(x2 => !x2.backup && x2.po !== 'G');
    ETAT.xtra = [{nom:jRepli.nom, gp:12, goals:4, assists:10, pts:14, shots:28, pim:2, mp:250, hits:11}];
    const prodRepli = S.productionDe(jRepli);
    ok(!!prodRepli && prodRepli._xtraSource===true, 'Production servie par XtraStats (drapeau _xtraSource)');
    egal(prodRepli?.pts, 14, 'Points lus depuis XtraStats en repli');
    // archive détectée : XtraStats est ignoré, aucune production affichée
    ETAT.xtraArchive = true;
    egal(S.productionDe(jRepli), null, 'Archive de la saison précédente ignorée (aucune production)');
    ETAT.xtraArchive = avantArchive; ETAT.scoring = avantScoring; ETAT.xtra = avantXtra;
  }

  console.log('— Bouton Effacer la cache');
  const btnCache = doc.querySelector('#btnEffacerCache');
  ok(!!btnCache, 'Bouton présent dans l\'en-tête');
  W.localStorage.setItem(S.CLES_LS.cache, '{"roster":{"t":1,"v":"x"}}');
  W.localStorage.setItem(S.CLES_LS.proxy, '2');
  btnCache.click();
  egal(W.localStorage.getItem(S.CLES_LS.cache), null, 'Cache de données effacée');
  egal(W.localStorage.getItem(S.CLES_LS.proxy), null, 'Relais préféré réinitialisé');
  await new Promise(r=>setTimeout(r,100)); // laisser l'actualisation (hors ligne) se terminer proprement

  console.log('— Retrait complet du mode vérification Y21');
  ok(!doc.querySelector('#btnModeY21'), 'Bouton de bascule retiré de l\'entête');
  ok(!doc.querySelector('#bandeauY21'), 'Bandeau de vérification retiré');
  egal(S.ETAT.modeY21, undefined, 'Aucun drapeau de mode dans l\'état global');
  ok(!html.includes('Y21'), 'Plus aucune mention «Y21» dans le monofichier');
  ok(doc.querySelector('#prodSous').textContent.includes('Aucun match disputé'),
     'Sous-titre Production neutre en attente des premiers matchs');

  console.log('— Calculateur OV détaillé : moteur');
  ok(typeof S.ovDetaille === 'function', 'ovDetaille exposée');
  tableauEgal(S.OV_ORDRE, ['it','sp','st','en','du','di','sk','pa','pc','df','sc','ex','ld'],
    'Ordre des cotes IN SP ST EN DU DI SK PA PC DF OF EX LD');
  // 17 OV détaillés de référence produits par la fonction overall() du classeur Excel
  const refsOvd = [
    ['F',[68,85,69,77,79,75,83,71,74,56,75,49,37],76.37,'Lambert'],
    ['F',[77,71,82,79,79,77,74,78,74,73,78,77,64],80.81,'ErikssonEk'],
    ['F',[86,78,74,81,75,70,80,79,73,66,80,78,68],81.39,'Konecny'],
    ['F',[68,81,74,77,75,80,77,72,72,69,75,51,41],77.40,'Olausson'],
    ['F',[69,79,67,76,70,76,78,77,74,67,74,45,40],76.99,'Tuomaala'],
    ['F',[64,85,73,87,77,85,86,78,71,69,79,58,58],80.53,'Thomas'],
    ['F',[66,77,72,76,76,79,77,77,81,63,76,56,41],78.15,'Johnson'],
    ['F',[65,86,79,87,81,85,89,70,75,61,84,67,58],81.18,'Nylander'],
    ['F',[62,76,75,77,78,80,78,71,75,62,78,90,75],77.97,'Saad'],
    ['F',[82,70,94,84,98,79,70,72,69,65,88,60,69],81.96,'Legare'],
    ['D',[68,70,78,84,68,82,72,73,74,84,62,85,80],79.55,'Brodin'],
    ['D',[81,73,85,92,89,80,76,66,71,79,58,52,53],80.09,'Schneider'],
    ['D',[64,84,70,86,83,81,85,86,76,79,70,60,62],82.54,'Fox'],
    ['D',[73,74,84,94,78,89,81,70,70,80,57,99,78],81.14,'Myers'],
    ['D',[65,72,82,78,75,79,75,71,72,78,60,70,65],77.84,'Graves'],
    ['D',[80,70,91,88,86,76,85,75,70,82,67,69,57],83.67,'Fleury'],
    ['D',[68,74,76,76,74,80,76,71,72,78,61,80,75],77.83,'Schmidt']
  ];
  const versCotes = t => Object.fromEntries(S.OV_ORDRE.map((k,i)=>[k,t[i]]));
  refsOvd.forEach(([g,t,attendu,nom]) => {
    proche(S.ovDetaille(versCotes(t), g).valeur, attendu, 0.005,
      `Référence Excel : ${nom} → ${attendu}`);
  });
  egal(S.ovDetaille(versCotes([82,70,94,84,98,79,70,72,69,65,88,60,69]),'F').arrondi, 82,
    'Legare : arrondi 82 (OV affiché sur ushl.ca)');
  // classement des défenseurs : offensif si PA + OF >= DF + ST
  ok(S.ovDetaille(versCotes([64,84,70,86,83,81,85,86,76,79,70,60,62]),'D').formule.includes('offensif'),
    'Fox (PA 86 + OF 70 = 156 ≥ DF 79 + ST 70 = 149) → formule offensive');
  ok(S.ovDetaille(versCotes([68,70,78,84,68,82,72,73,74,84,62,85,80]),'D').formule.includes('défensif'),
    'Brodin (PA 73 + OF 62 = 135 < DF 84 + ST 78 = 162) → formule défensive');
  // cohérence avec l'alignement de secours (hors échantillon de calibration) :
  // la formule calibrée reproduit l'OV affiché pour la quasi-totalité des patineurs,
  // avec au plus 1 point d'écart pour les rares exceptions
  {
    const pat = S.SECOURS_ROSTER.filter(j => j.po !== 'G');
    const res = pat.map(j => ({j, r: S.ovDetaille(j, j.po === 'D' ? 'D' : 'F')}));
    ok(res.every(x => !!x.r), 'Formule calculable pour tous les patineurs');
    const exacts = res.filter(x => x.r.arrondi === x.j.ov).length;
    ok(exacts >= Math.ceil(pat.length * 0.85),
      `Arrondi = OV affiché pour la quasi-totalité (${exacts}/${pat.length})`);
    ok(res.every(x => Math.abs(x.r.arrondi - x.j.ov) <= 1),
      'Aucun écart de plus de 1 point entre arrondi et OV affiché');
  }
  // ancre 50 partout et gardiens
  proche(S.ovDetaille(versCotes(Array(13).fill(50)),'F').arrondi, 55, 0,
    'Patineur 50 partout → OV 55');
  egal(S.ovDetaille(S.SECOURS_ROSTER.find(j=>j.po==='G'),'F'), null,
    'Gardien (df et sc nuls) → null : formule non couverte');

  console.log('— Calculateur OV détaillé : interface');
  ok(!!doc.querySelector('nav button[data-vue="ovdetail"]'), 'Onglet OV détaillé présent');
  const selOvd = doc.getElementById('ovdJoueur');
  const nbPatineurs = S.SECOURS_ROSTER.filter(j => j.po !== 'G').length;
  egal(selOvd.querySelectorAll('option').length, nbPatineurs + 1,
    'Sélecteur : ' + nbPatineurs + ' patineurs + saisie manuelle (gardiens exclus)');
  egal(doc.querySelectorAll('#ovdGrille input').length, 13, '13 champs de cotes');
  const jOvd = S.SECOURS_ROSTER.find(j => !j.backup && j.po !== 'G' && j.po !== 'D');
  selOvd.value = jOvd.nom;
  selOvd.dispatchEvent(new W.Event('change'));
  egal(doc.getElementById('ovdGroupe').value, 'F', jOvd.nom + ' chargé comme attaquant');
  egal(doc.getElementById('ovd_st').value, String(jOvd.st), 'Cote ST de ' + jOvd.nom + ' chargée');
  const rOvd = S.ovDetaille(jOvd, 'F');
  egal(doc.getElementById('ovdArrondi').textContent, String(rOvd.arrondi), 'OV arrondi affiché = calcul de la formule');
  egal(rOvd.arrondi, jOvd.ov, 'Arrondi = OV publié sur ushl.ca pour ' + jOvd.nom);
  egal(doc.getElementById('ovdValeur').textContent, rOvd.valeur.toFixed(2).replace('.', ','), 'OV détaillé affiché avec deux décimales');
  // saisie manuelle : recopier les cotes de la capture Excel de Legare
  const capLegare = versCotes([82,70,94,84,98,79,70,72,69,65,88,60,69]);
  S.OV_ORDRE.forEach(k => { doc.getElementById('ovd_'+k).value = capLegare[k]; });
  doc.getElementById('ovd_it').dispatchEvent(new W.Event('input'));
  egal(doc.getElementById('ovdValeur').textContent, '81,96', 'Saisie manuelle : Legare du classeur → 81,96');
  egal(doc.getElementById('ovdArrondi').textContent, '82', 'Saisie manuelle : arrondi 82');
  // bascule défenseur : la note reflète la formule retenue (offensive ou défensive
  // selon PA + OF vs DF + ST, testée sur un défenseur réel du club)
  {
    const jD = S.SECOURS_ROSTER.find(j=>!j.backup && j.po==='D');
    selOvd.value = jD.nom;
    selOvd.dispatchEvent(new W.Event('change'));
    egal(doc.getElementById('ovdGroupe').value, 'D', jD.nom + ' chargé comme défenseur');
    const attenteNote = (jD.pa + jD.sc) >= (jD.df + jD.st) ? 'offensif' : 'défensif';
    ok(doc.getElementById('ovdNote').textContent.includes(attenteNote),
      `Note : formule ${attenteNote}e appliquée selon les cotes (PA+OF ${jD.pa+jD.sc} vs DF+ST ${jD.df+jD.st})`);
  }
  // champ vidé → résultat neutre
  doc.getElementById('ovd_pa').value = '';
  doc.getElementById('ovd_pa').dispatchEvent(new W.Event('input'));
  egal(doc.getElementById('ovdValeur').textContent, '—', 'Cote manquante → aucun résultat');

  console.log('— Alignement des trios (règlements 1.1.1 et 1.1.2)');
  // bassin de test : signés du club + ajouts (6 attaquants, 2 défenseurs, 2 gardiens)
  W.localStorage.setItem(S.CLES_LS.trios, JSON.stringify(S.TRIOS_VIDES()));
  W.localStorage.setItem(S.CLES_LS.compo, JSON.stringify({retires: [], ajouts: [
    {nom:'Attaquant Un',   po:'AG', ov:79, salaire:1000000},
    {nom:'Attaquant Deux', po:'AD', ov:78, salaire:1000000},
    {nom:'Attaquant Trois',po:'C',  ov:77, salaire:1000000},
    {nom:'Attaquant Quatre',po:'AG',ov:76, salaire:1000000},
    {nom:'Attaquant Cinq', po:'AD', ov:75, salaire:1000000},
    {nom:'Attaquant Six',  po:'C',  ov:74, salaire:1000000},
    {nom:'Defenseur Un',   po:'D',  ov:78, salaire:1000000},
    {nom:'Defenseur Deux', po:'D',  ov:77, salaire:1000000},
    {nom:'Gardien Un',     po:'G',  ov:80, salaire:1000000},
    {nom:'Gardien Deux',   po:'G',  ov:78, salaire:900000}
  ]}));
  const poolTrios = S.joueursComposition();
  egal(poolTrios.filter(j=>j.po==='G').length, 2, 'Bassin de la Composition : 2 gardiens ajoutés');
  egal(poolTrios.filter(j=>j.po!=='G').length, 18, 'Bassin de la Composition : 18 patineurs (10 signés + 8 ajouts)');
  ok(!!doc.querySelector('nav button[data-vue="trios"]'), 'Onglet Trios présent dans la navigation');
  S.rendreTrios();
  const selsF = [...doc.querySelectorAll('#vue-trios select[data-zone="trio"]')];
  const selsD = [...doc.querySelectorAll('#vue-trios select[data-zone="duo"]')];
  const selsG = [...doc.querySelectorAll('#vue-trios select[data-zone="g"]')];
  egal(selsF.length, 12, '12 cases d\'attaquants (4 trios)');
  egal(selsD.length, 6, '6 cases de défenseurs (3 duos)');
  egal(selsG.length, 2, 'Cases du partant et du substitut');
  const poDe = nom => poolTrios.find(p=>p.nom===nom)?.po;
  ok(selsG.every(s=>[...s.options].slice(1).every(o=>!o.value || poDe(o.value)==='G')),
     'Cases de gardiens : seuls des gardiens offerts (art. 1.1.1)');
  ok([...selsF[0].options].slice(1).every(o=>!o.value || poDe(o.value)!=='G'),
     'Cases de patineurs : aucun gardien offert (art. 1.1.1)');
  ok([...selsF[0].options].some(o=>poDe(o.value)==='D'),
     'Un défenseur peut être placé à l\'attaque (position libre, art. 1.1.1)');

  // validation pure : construire un alignement complet légal
  const attq = poolTrios.filter(j=>S.EST_ATTAQUANT ? S.EST_ATTAQUANT(j.po) : (j.po==='C'||j.po==='AG'||j.po==='AD')).map(j=>j.nom);
  const defs = poolTrios.filter(j=>j.po==='D').map(j=>j.nom);
  const pats = poolTrios.filter(j=>j.po!=='G').map(j=>j.nom);
  const gars = poolTrios.filter(j=>j.po==='G').sort((a,b)=>b.ov-a.ov).map(j=>j.nom);
  const patsRestants = pats.filter(n=>!attq.slice(0,12).includes(n));
  const legal = {
    trios: [attq.slice(0,3), attq.slice(3,6), attq.slice(6,9), attq.slice(9,12)],
    duos: [patsRestants.slice(0,2), patsRestants.slice(2,4), patsRestants.slice(4,6)],
    gardiens: [gars[0], gars[1]]
  };
  let v = S.validerAlignementTrios(legal, poolTrios);
  egal(v.erreurs.length, 0, 'Alignement complet de 20 cases : aucune infraction');
  egal(v.nbRemplis, 20, '20 cases remplies');
  egal(v.nbDistincts, 20, '20 joueurs distincts');
  ok(v.horsPosition >= 1, 'Patineurs hors position naturelle comptés à titre indicatif (permis)');

  // double quart légal : trio 1 et trio 4 (art. 1.1.2)
  const dq = JSON.parse(JSON.stringify(legal));
  dq.trios[3][2] = dq.trios[0][0];
  v = S.validerAlignementTrios(dq, poolTrios);
  egal(v.erreurs.length, 0, 'Double quart 1-4 : permis (art. 1.1.2)');
  ok(v.avertissements.some(a=>a.includes('20 habillés')), 'Rappel des 20 habillés quand le double quart est utilisé');

  // double quart illégal : trios 2 et 3
  const dq23 = JSON.parse(JSON.stringify(legal));
  dq23.trios[2][2] = dq23.trios[1][0];
  v = S.validerAlignementTrios(dq23, poolTrios);
  ok(v.erreurs.length===1 && v.erreurs[0].includes('1-4, 2-4 et 3-4'), 'Double quart 2-3 : infraction (art. 1.1.2)');

  // trois trios pour un même joueur
  const dq3 = JSON.parse(JSON.stringify(legal));
  dq3.trios[1][1] = dq3.trios[0][0]; dq3.trios[3][1] = dq3.trios[0][0];
  v = S.validerAlignementTrios(dq3, poolTrios);
  ok(v.erreurs.some(e=>e.includes('se limite à deux lignes')), 'Trois trios pour un même joueur : infraction');

  // même joueur deux fois dans le même trio
  const memeTrio = JSON.parse(JSON.stringify(legal));
  memeTrio.trios[0][1] = memeTrio.trios[0][0];
  v = S.validerAlignementTrios(memeTrio, poolTrios);
  ok(v.erreurs.some(e=>e.includes('Trio 1')), 'Même joueur deux fois dans un trio : infraction');

  // défenseur dans deux duos
  const duoDouble = JSON.parse(JSON.stringify(legal));
  duoDouble.duos[1][0] = duoDouble.duos[0][0];
  v = S.validerAlignementTrios(duoDouble, poolTrios);
  ok(v.erreurs.some(e=>e.includes('duos')), 'Défenseur dans deux duos : infraction (aucune 4e paire, art. 1.1.2)');

  // gardiens : identiques, ou hors du filet
  const gDouble = JSON.parse(JSON.stringify(legal));
  gDouble.gardiens = [gars[0], gars[0]];
  v = S.validerAlignementTrios(gDouble, poolTrios);
  ok(v.erreurs.some(e=>e.includes('différents')), 'Partant = substitut : infraction');
  const gAttaque = JSON.parse(JSON.stringify(legal));
  gAttaque.trios[3][2] = gars[1];
  v = S.validerAlignementTrios(gAttaque, poolTrios);
  ok(v.erreurs.some(e=>e.includes('case de patineur')), 'Gardien placé à l\'attaque : infraction (art. 1.1.1)');

  // patineur en attaque ET en défense : avertissement, pas d'infraction
  const mixte = JSON.parse(JSON.stringify(legal));
  mixte.duos[0][0] = mixte.trios[0][0];
  v = S.validerAlignementTrios(mixte, poolTrios);
  ok(v.avertissements.some(a=>a.includes('attaque ET en défense')) , 'Attaque et défense à la fois : avertissement');

  // joueur disparu de la composition
  const fantome = JSON.parse(JSON.stringify(legal));
  fantome.trios[0][0] = 'Joueur Fantome';
  v = S.validerAlignementTrios(fantome, poolTrios);
  ok(v.avertissements.some(a=>a.includes('plus dans la composition')), 'Joueur retiré de la composition : avertissement');

  // persistance : un changement dans l'interface est sauvegardé
  selsG[0].value = gars[0];
  selsG[0].dispatchEvent(new W.Event('change'));
  ok((W.localStorage.getItem(S.CLES_LS.trios)||'').includes(gars[0]), 'Choix sauvegardé dans la mémoire locale');

  // proposition automatique par OV
  doc.getElementById('btnTriosProposer').click();
  const propose = S.litTrios();
  v = S.validerAlignementTrios(propose, poolTrios);
  egal(v.nbRemplis, 20, 'Proposition automatique : 20 cases remplies');
  egal(v.erreurs.length, 0, 'Proposition automatique : aucune infraction');
  egal(propose.gardiens[0], gars[0], 'Partant proposé = meilleur OV des gardiens');
  ok(propose.trios.flat().every(n=>poDe(n)!=='G'), 'Aucun gardien dans les trios proposés');

  // vider
  doc.getElementById('btnTriosVider').click();
  ok(S.litTrios().trios.flat().every(n=>!n), 'Bouton Vider : toutes les cases libérées');

  // ---- Unités spéciales ----
  console.log('— Unités spéciales (2 vagues par groupe, positions libres)');
  egal(doc.querySelectorAll('#vue-trios select[data-zone="an5"]').length, 10, 'AN à 5 : 2 vagues de 5 cases');
  egal(doc.querySelectorAll('#vue-trios select[data-zone="an4"]').length, 8, 'AN à 4 : 2 vagues de 4 cases');
  egal(doc.querySelectorAll('#vue-trios select[data-zone="in4"]').length, 8, 'IN à 4 : 2 vagues de 4 cases');
  egal(doc.querySelectorAll('#vue-trios select[data-zone="in3"]').length, 6, 'IN à 3 : 2 vagues de 3 cases');
  egal(doc.querySelectorAll('#vue-trios select.trio-sel').length, 52, '52 cases au total (20 à 5c5 + 32 spéciales)');
  ok([...doc.querySelector('#vue-trios select[data-zone="an5"]').options].slice(1)
      .every(o=>!o.value || poDe(o.value)!=='G'), 'Aucun gardien offert sur les unités spéciales');

  // 5 attaquants sur une vague d'AN : permis (positions sans importance)
  const cinqAv = JSON.parse(JSON.stringify(legal));
  cinqAv.an5 = [attq.slice(0,5), attq.slice(5,10)];
  v = S.validerAlignementTrios(cinqAv, poolTrios);
  egal(v.erreurs.length, 0, 'Cinq attaquants sur une vague d\'AN à 5 : aucune infraction (positions libres)');
  egal(v.specRemplis, 10, 'Cases spéciales remplies comptées (10/32)');

  // même joueur sur les 2 vagues d'un même groupe : interdit
  const deuxVagues = JSON.parse(JSON.stringify(cinqAv));
  deuxVagues.an5[1][0] = deuxVagues.an5[0][0];
  v = S.validerAlignementTrios(deuxVagues, poolTrios);
  ok(v.erreurs.some(e=>e.includes('2 vagues')), 'Joueur sur les 2 vagues de l\'AN à 5 : infraction (art. 1.1.2)');
  const deuxVaguesIn = JSON.parse(JSON.stringify(legal));
  deuxVaguesIn.in3 = [[defs[0], defs[1], attq[0]], [defs[0], attq[1], attq[2]]];
  v = S.validerAlignementTrios(deuxVaguesIn, poolTrios);
  ok(v.erreurs.some(e=>e.includes('2 vagues') && e.includes('infériorité')), 'Joueur sur les 2 vagues de l\'IN à 3 : infraction');

  // même joueur deux fois dans la même vague
  const dupVague = JSON.parse(JSON.stringify(legal));
  dupVague.an4 = [[attq[0], attq[0], attq[1], attq[2]], ['','','','']];
  v = S.validerAlignementTrios(dupVague, poolTrios);
  ok(v.erreurs.some(e=>e.includes('vague 1')), 'Même joueur deux fois dans une vague : infraction');

  // gardien sur une unité spéciale : infraction
  const gSpec = JSON.parse(JSON.stringify(legal));
  gSpec.in4 = [[gars[1], defs[0], defs[1], attq[0]], ['','','','']];
  v = S.validerAlignementTrios(gSpec, poolTrios);
  ok(v.erreurs.some(e=>e.includes('case de patineur')), 'Gardien sur une unité spéciale : infraction (art. 1.1.1)');

  // joueur des unités spéciales absent des 20 habillés : avertissement
  const nonHabille = JSON.parse(JSON.stringify(legal));
  nonHabille.trios[3][2] = '';
  const excluReel = pats.find(n=>!nonHabille.trios.flat().includes(n) && !nonHabille.duos.flat().includes(n));
  ok(!!excluReel, 'Un patineur non habillé disponible pour le scénario');
  nonHabille.an5 = [[excluReel, '', '', '', ''], ['','','','','']];
  v = S.validerAlignementTrios(nonHabille, poolTrios);
  ok(v.avertissements.some(a=>a.includes('sans être parmi les habillés')), 'Unité spéciale avec un joueur non habillé : avertissement');

  // proposition automatique : la feuille complète, unités spéciales incluses
  doc.getElementById('btnTriosProposer').click();
  const feuille = S.litTrios();
  v = S.validerAlignementTrios(feuille, poolTrios);
  egal(v.specRemplis, 32, 'Proposition automatique : 32 cases spéciales remplies');
  egal(v.erreurs.length, 0, 'Proposition automatique : aucune infraction, spéciales incluses');
  ok(!v.avertissements.some(a=>a.includes('sans être parmi les habillés')),
     'Unités spéciales proposées à même les 20 habillés');
  for (const z of ['an5','an4','in4','in3']){
    const v1 = new Set(feuille[z][0].filter(Boolean));
    ok(feuille[z][1].filter(Boolean).every(n=>!v1.has(n)), `Proposition ${z.toUpperCase()} : aucun joueur sur les 2 vagues`);
  }
  doc.getElementById('btnTriosVider').click();
  ok(['an5','an4','in4','in3'].every(z=>S.litTrios()[z].flat().every(n=>!n)), 'Vider libère aussi les unités spéciales');

  W.localStorage.removeItem(S.CLES_LS.compo);
  W.localStorage.removeItem(S.CLES_LS.trios);

  console.log(`\n${total - echecs}/${total} vérifications réussies`);
  process.exit(echecs ? 1 : 0);
})().catch(e => { console.error('ERREUR FATALE', e); process.exit(1); });
