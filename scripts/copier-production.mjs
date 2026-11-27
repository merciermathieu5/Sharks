#!/usr/bin/env node
/**
 * Copie la production de ce club depuis le relevé central (data/production.json
 * de ushl-releve) dans data/production.json de cette interface, après
 * vérification.
 *
 * Depuis le 27 novembre 2026, la production des 22 clubs est relevée une
 * seule fois par le dépôt ushl-releve, au lieu de 22 fois (une par interface),
 * ce qui déclenchait la page anti-robot de ushl.ca et des échecs en série. Ce
 * script ne fait aucune requête vers ushl.ca.
 *
 * Le club est celui de CONFIG.equipe dans index.html. Sa part du fichier
 * central a exactement la forme de l'ancien data/production.json. Le fichier
 * local n'est remplacé que si cette part :
 *  - existe et porte bien le code du club;
 *  - contient un pointage ou un XtraStats exploitable;
 *  - n'est pas plus ancienne que le fichier local;
 *  - diffère du fichier local (horodatages exclus).
 *
 * Usage : node scripts/copier-production.mjs <fichier central>
 *           [--sortie data/production.json] [--interface index.html]
 * Sortie : code 0 si copié ou déjà à jour, 1 si la part centrale est refusée.
 */

import fs from 'node:fs/promises';

const args = process.argv.slice(2);
const lireArg = (nom, defaut) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const SORTIE = lireArg('--sortie', 'data/production.json');
const INTERFACE = lireArg('--interface', 'index.html');
const SOURCE = args.find((a, i) => !a.startsWith('--') && !['--sortie', '--interface'].includes(args[i - 1]));

function refuser(motif) {
  console.error(`Relevé central refusé : ${motif}. Le fichier local est laissé intact.`);
  process.exit(1);
}

/** Ce qui décide d'une réécriture : le contenu, pas les horodatages. */
function empreinte(d) {
  if (!d) return null;
  return JSON.stringify({
    equipe: d.equipe,
    fiche: d.fiche,
    pointage: d.pointage ? { patineurs: d.pointage.patineurs, gardiens: d.pointage.gardiens } : null,
    xtra: d.xtra ? { date: d.xtra.date, joueurs: d.xtra.joueurs } : null
  });
}

async function main() {
  if (!SOURCE) refuser('aucun fichier central indiqué');

  let code;
  try {
    const html = await fs.readFile(INTERFACE, 'utf8');
    code = html.match(/const\s+CONFIG\s*=\s*\{\s*equipe\s*:\s*'([^']+)'/)?.[1];
  } catch (e) {
    refuser(`${INTERFACE} illisible (${e.message})`);
  }
  if (!code) refuser(`code du club introuvable dans ${INTERFACE} (CONFIG.equipe)`);

  let central;
  try {
    central = JSON.parse(await fs.readFile(SOURCE, 'utf8'));
  } catch (e) {
    refuser(`illisible (${e.message})`);
  }
  if (!central || typeof central !== 'object' || !central.equipes) refuser('format inattendu (equipes absent)');

  const part = central.equipes[code];
  if (!part) refuser(`aucune part pour ${code}`);
  if (part.equipe !== code) refuser(`la part de ${code} porte le code ${part.equipe}`);
  const pointageOk = Array.isArray(part.pointage?.patineurs) && Array.isArray(part.pointage?.gardiens);
  const xtraOk = Array.isArray(part.xtra?.joueurs) && part.xtra.joueurs.length > 0;
  if (!pointageOk && !xtraOk) refuser(`ni pointage ni XtraStats exploitable pour ${code}`);

  let local = null;
  try { local = JSON.parse(await fs.readFile(SORTIE, 'utf8')); } catch { /* absent ou illisible : on remplace */ }

  if (local && empreinte(local) === empreinte(part)) {
    console.log(`Production de ${code} déjà à jour (relevé du ${part.genere}).`);
    return;
  }
  if (local?.equipe === code && local?.genere && part.genere && new Date(part.genere) < new Date(local.genere)) {
    console.log(`Fichier local plus récent (${local.genere}) que la part centrale (${part.genere}) : rien à faire.`);
    return;
  }

  await fs.writeFile(SORTIE, JSON.stringify(part, null, 1) + '\n', 'utf8');
  console.log(`Copié : ${SORTIE} (${code}, relevé du ${part.genere}` +
    (part.fiche ? `, ${part.fiche}` : '') +
    (part.reprises?.length ? `, reprises : ${part.reprises.join(', ')}` : '') + ')');
}

main().catch(e => refuser(e.message));
