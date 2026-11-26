#!/usr/bin/env node
/**
 * Copie le relevé central des alignements (data/rosters.json de ushl-releve)
 * dans data/rosters.json de cette interface, après vérification.
 *
 * Depuis le 26 novembre 2026, les 32 alignements sont relevés une seule fois
 * pour toute la ligue par le dépôt ushl-releve, au lieu de 22 fois (une par
 * interface), ce qui déclenchait la page anti-robot de ushl.ca. Ce script ne
 * fait aucune requête vers ushl.ca.
 *
 * Le fichier local n'est remplacé que si le fichier central :
 *  - est un JSON lisible au format attendu (genere, equipes);
 *  - couvre au moins MIN_EQUIPES clubs, chacun avec au moins MIN_JOUEURS joueurs;
 *  - n'est pas plus ancien que le fichier local;
 *  - diffère du fichier local.
 *
 * Usage : node scripts/copier-rosters.mjs <fichier central> [--sortie data/rosters.json]
 * Sortie : code 0 si copié ou déjà à jour, 1 si le fichier central est refusé.
 */

import fs from 'node:fs/promises';

const MIN_EQUIPES = 28;
const MIN_JOUEURS = 10;

const args = process.argv.slice(2);
const iSortie = args.indexOf('--sortie');
const SORTIE = iSortie >= 0 && args[iSortie + 1] ? args[iSortie + 1] : 'data/rosters.json';
const SOURCE = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--sortie');

function refuser(motif) {
  console.error(`Relevé central refusé : ${motif}. Le fichier local est laissé intact.`);
  process.exit(1);
}

async function main() {
  if (!SOURCE) refuser('aucun fichier central indiqué');

  let brut, central;
  try {
    brut = await fs.readFile(SOURCE, 'utf8');
    central = JSON.parse(brut);
  } catch (e) {
    refuser(`illisible (${e.message})`);
  }
  if (!central || typeof central !== 'object' || !central.equipes || !central.genere) {
    refuser('format inattendu (genere ou equipes absent)');
  }

  const codes = Object.keys(central.equipes);
  const minces = codes.filter(c => !Array.isArray(central.equipes[c]?.joueurs) || central.equipes[c].joueurs.length < MIN_JOUEURS);
  if (codes.length - minces.length < MIN_EQUIPES) {
    refuser(`${codes.length - minces.length} équipe(s) complète(s) (< ${MIN_EQUIPES})${minces.length ? ` · incomplètes : ${minces.join(', ')}` : ''}`);
  }

  let local = null;
  try { local = JSON.parse(await fs.readFile(SORTIE, 'utf8')); } catch { /* absent ou illisible : on remplace */ }

  if (local?.genere && new Date(central.genere) < new Date(local.genere)) {
    console.log(`Fichier local plus récent (${local.genere}) que le relevé central (${central.genere}) : rien à faire.`);
    return;
  }
  if (local && JSON.stringify(local.equipes) === JSON.stringify(central.equipes)) {
    console.log(`Alignements déjà à jour (relevé du ${central.maj || '?'}).`);
    return;
  }

  await fs.writeFile(SORTIE, brut.endsWith('\n') ? brut : brut + '\n', 'utf8');
  console.log(`Copié : ${SORTIE} (relevé du ${central.maj || '?'}, ${codes.length} équipes` +
    (central.reprises?.length ? `, ${central.reprises.length} reprise(s)` : '') + ')');
}

main().catch(e => refuser(e.message));
