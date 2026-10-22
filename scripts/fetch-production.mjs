#!/usr/bin/env node
/**
 * Relève la production du club sur ushl.ca et écrit data/production.json.
 *
 * Même principe que fetch-rosters.mjs : le relevé tourne côté serveur (GitHub
 * Actions), donc sans CORS ni relais public, et l'interface lit le fichier en
 * même origine dès l'ouverture, sur mobile aussi.
 *
 * Les parseurs ne sont pas réécrits : index.html est chargé dans jsdom et ses
 * fonctions (parseScoring, parseXtra, validerPointage, extraireFiche) sont
 * réutilisées telles quelles, comme les adresses de son CONFIG. Le serveur et
 * le navigateur lisent donc les pages exactement de la même façon.
 *
 * Trois sources, une requête chacune :
 *  - TeamScoringTemplate.php : les tableaux de pointage du club. La page
 *    TeamScoring.php ne les contient plus, elle les charge après coup depuis
 *    ce gabarit (constaté en octobre 2026).
 *  - TeamScoring.php : seulement pour la fiche du club (V-D-N), absente du gabarit.
 *  - USHLxtrastats.html : minutes et mises en échec, et chez les gardiens QG et HS.
 *
 * Une source en échec reprend sa part du fichier existant. Le fichier n'est
 * réécrit que si son contenu change, pour ne pas committer à vide.
 *
 * Usage : node scripts/fetch-production.mjs [--sortie data/production.json] [--rosters data/rosters.json]
 * Sortie : code 0 si le pointage a été relevé, 1 sinon (le workflow réessaie
 * alors sur un runner neuf). Les parts fraîches sont écrites dans les deux cas.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';

/* Surchargeable par USHL_RACINE (ex. http://127.0.0.1:8080) : sert aux tests
   hors ligne avec un serveur local qui imite ushl.ca. */
const RACINE = process.env.USHL_RACINE || null;
const DELAI_MS = 20000;
const ESSAIS = 3;
const PAUSE_MS = 400;
const MIN_XTRA = 5;

const args = process.argv.slice(2);
const lireArg = (nom, defaut) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const SORTIE = lireArg('--sortie', 'data/production.json');
const ROSTERS = lireArg('--rosters', 'data/rosters.json');

const dodo = ms => new Promise(r => setTimeout(r, ms));
const adresse = url => (RACINE ? url.replace(/^https:\/\/ushl\.ca/, RACINE) : url);

/** Charge index.html dans jsdom et renvoie les fonctions d'analyse de l'interface. */
async function outilsDepuisInterface(cheminHtml) {
  const html = await fs.readFile(cheminHtml, 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'https://example.org/',
    beforeParse(w) {
      // aucune requête pendant le chargement : on ne veut que les fonctions
      w.fetch = () => Promise.reject(new Error('réseau désactivé au chargement'));
    }
  });
  await dodo(400);
  const S = dom.window.__SJS__;
  for (const f of ['parseScoring', 'parseXtra', 'validerPointage', 'extraireFiche', 'appliquerRosters']) {
    if (!S || typeof S[f] !== 'function') {
      throw new Error(`index.html n'expose pas ${f} (window.__SJS__)`);
    }
  }
  return { S, window: dom.window };
}

/* Renvoie {texte, statut, longueur}. Les diagnostics servent à distinguer une
   page bloquée (200 mais vide) d'un changement de structure ou d'une panne. */
async function chercher(url) {
  let derniere = null;
  for (let essai = 1; essai <= ESSAIS; essai++) {
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), DELAI_MS);
      const rep = await fetch(url, {
        signal: ctl.signal,
        headers: { 'User-Agent': 'usc-dashboard-bot/1.0 (+github actions)' }
      });
      clearTimeout(t);
      if (!rep.ok) throw new Error('HTTP ' + rep.status);
      const txt = await rep.text();
      if (txt.length < 500) throw new Error(`réponse anormalement courte (HTTP ${rep.status}, ${txt.length} car.)`);
      return { texte: txt, statut: rep.status, longueur: txt.length };
    } catch (e) {
      derniere = e;
      if (essai < ESSAIS) await dodo(PAUSE_MS * essai);
    }
  }
  throw derniere;
}

/** Extrait lisible d'une page suspecte, pour le journal du workflow. */
function extraitDePage(html) {
  const corps = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return corps ? corps.slice(0, 160) : '(page sans texte visible)';
}

async function lireJson(chemin) {
  try {
    return JSON.parse(await fs.readFile(chemin, 'utf8'));
  } catch {
    return null;
  }
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
  const racine = process.cwd();
  const { S, window } = await outilsDepuisInterface(path.join(racine, 'index.html'));
  const code = S.CONFIG.equipe;
  const urls = S.CONFIG.urls || {};
  for (const cle of ['pointage', 'scoring', 'xtra']) {
    if (!urls[cle]) throw new Error(`index.html ne déclare pas CONFIG.urls.${cle}`);
  }

  /* Alignement courant : validerPointage reconnaît la bonne équipe en recoupant
     les joueurs du gabarit avec ETAT.roster. Sans fichier, le bloc intégré sert. */
  const rosters = await lireJson(path.join(racine, ROSTERS));
  if (rosters) S.appliquerRosters(rosters);

  const existant = await lireJson(path.join(racine, SORTIE));
  const precedent = existant && existant.equipe === code ? existant : null;
  const maintenant = new Date().toISOString();
  const charge = { genere: maintenant, equipe: code, fiche: null, pointage: null, xtra: null, reprises: [] };
  let pointageFrais = false;
  let frais = 0;

  console.log(`Production de ${code}`);

  // 1) Pointage : le gabarit
  try {
    const { texte, statut, longueur } = await chercher(adresse(urls.pointage));
    if (!S.validerPointage(texte)) {
      throw new Error(`gabarit illisible ou d'une autre équipe · HTTP ${statut}, ${longueur} car. · « ${extraitDePage(texte)} »`);
    }
    const doc = new window.DOMParser().parseFromString(texte, 'text/html');
    const s = S.parseScoring(texte, doc);
    charge.pointage = { releve: maintenant, patineurs: s.patineurs, gardiens: s.gardiens };
    pointageFrais = true;
    frais++;
    console.log(`  pointage   ${s.patineurs.length} patineurs, ${s.gardiens.length} gardien(s)`);
  } catch (e) {
    if (precedent?.pointage) {
      charge.pointage = precedent.pointage;
      charge.reprises.push('pointage');
    }
    console.log(`  pointage   ✗ ${e.message}${precedent?.pointage ? ' · reprise du relevé précédent' : ''}`);
  }
  await dodo(PAUSE_MS);

  // 2) Fiche du club, sur la page TeamScoring.php
  try {
    const { texte } = await chercher(adresse(urls.scoring));
    const f = S.extraireFiche(texte);
    if (!f) throw new Error(`fiche du club introuvable · « ${extraitDePage(texte)} »`);
    charge.fiche = f;
    frais++;
    console.log(`  fiche      ${f}`);
  } catch (e) {
    charge.fiche = precedent?.fiche || rosters?.equipes?.[code]?.fiche || null;
    console.log(`  fiche      ✗ ${e.message}${charge.fiche ? ` · ${charge.fiche} conservée` : ''}`);
  }
  await dodo(PAUSE_MS);

  // 3) XtraStats
  try {
    const { texte } = await chercher(adresse(urls.xtra));
    const x = S.parseXtra(texte, code);
    if (x.length < MIN_XTRA) {
      throw new Error(`${x.length} joueurs ${code} lus (< ${MIN_XTRA}) · « ${extraitDePage(texte)} »`);
    }
    const m = texte.match(/As of\s+([0-9/]+)/i);
    charge.xtra = { releve: maintenant, date: m ? m[1] : null, joueurs: x };
    frais++;
    console.log(`  XtraStats  ${x.length} joueurs (en date du ${charge.xtra.date || '?'})`);
  } catch (e) {
    if (precedent?.xtra) {
      charge.xtra = precedent.xtra;
      charge.reprises.push('xtra');
    }
    console.log(`  XtraStats  ✗ ${e.message}${precedent?.xtra ? ' · reprise du relevé précédent' : ''}`);
  }

  if (!frais) {
    console.error('Aucune source relevée : le fichier existant est laissé intact.');
    process.exit(1);
  }

  if (empreinte(charge) === empreinte(precedent)) {
    console.log('Aucun changement dans la production : fichier laissé tel quel.');
  } else {
    const sortie = path.join(racine, SORTIE);
    await fs.mkdir(path.dirname(sortie), { recursive: true });
    await fs.writeFile(sortie, JSON.stringify(charge, null, 1) + '\n', 'utf8');
    console.log(`Écrit : ${SORTIE}${charge.reprises.length ? ` (reprises : ${charge.reprises.join(', ')})` : ''}`);
  }

  if (!pointageFrais) {
    console.error('Pointage non relevé : le workflow réessaiera sur un runner neuf.');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Échec :', e.message);
  process.exit(1);
});
