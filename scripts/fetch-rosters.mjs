#!/usr/bin/env node
/**
 * Relève les alignements PRO des 32 clubs sur ushl.ca et écrit data/rosters.json.
 *
 * Tourne côté serveur (GitHub Actions) : pas de CORS, donc aucun relais public.
 * L'interface lit ensuite le fichier en même origine, ce qui fonctionne aussi
 * sur mobile et hors réseau capricieux.
 *
 * Le parseur n'est pas réécrit ici : on charge index.html dans jsdom et on
 * réutilise parseRoster tel quel. Le serveur et le navigateur interprètent
 * donc les pages exactement de la même façon, aujourd'hui et après refonte.
 *
 * Usage : node scripts/fetch-rosters.mjs [--sortie data/rosters.json] [--equipe CODE]
 * Sortie : code 0 si le fichier est écrit, 1 si la relève est jugée non fiable.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';

/* Surchargeable par USHL_BASE : sert aux tests hors ligne (serveur local). */
const BASE = (process.env.USHL_BASE || 'https://ushl.ca/ushl/menu_sim/USHL-pro/jamesishot/TeamRosters.php') + '?team=';

const EQUIPES = [
  'ANAHEIM', 'BOSTON', 'BUFFALO', 'CALGARY', 'CAROLINA', 'CHICAGO', 'COLORADO',
  'COLUMBUS', 'DALLAS', 'DETROIT', 'EDMONTON', 'FLORIDE', 'ISLANDERS',
  'LOSANGELES', 'MINNESOTA', 'MONTREAL', 'NASHVILLE', 'NEWJERSEY', 'NYRANGERS',
  'OTTAWA', 'PHILLY', 'PITTSBURGH', 'SANJOSE', 'SEATTLE', 'ST.LOUIS', 'TAMPABAY',
  'TORONTO', 'UTAH', 'VANCOUVER', 'VEGAS', 'WASHINGTON', 'WINNIPEG'
];

/* Une relève partielle est pire que pas de relève : elle ferait disparaître des
   joueurs de l'interface. En deçà de ce seuil, on n'écrit rien du tout. */
const MIN_EQUIPES = 28;
const MIN_JOUEURS = 10;
const DELAI_MS = 20000;
const ESSAIS = 3;
const PAUSE_MS = 400;

const args = process.argv.slice(2);
const lireArg = (nom, defaut) => {
  const i = args.indexOf(nom);
  return i >= 0 && args[i + 1] ? args[i + 1] : defaut;
};
const SORTIE = lireArg('--sortie', 'data/rosters.json');
const FILTRE = lireArg('--equipe', null);

const dodo = ms => new Promise(r => setTimeout(r, ms));

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
  if (!S || typeof S.parseRoster !== 'function') {
    throw new Error('index.html n\'expose pas parseRoster (window.__SJS__)');
  }
  return { S, window: dom.window };
}

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
      if (txt.length < 500) throw new Error('réponse anormalement courte');
      return txt;
    } catch (e) {
      derniere = e;
      if (essai < ESSAIS) await dodo(PAUSE_MS * essai);
    }
  }
  throw derniere;
}

/** «Dernière mise à jour le vendredi, sept 4 2026» → «sept 4 2026» */
function dateDePage(html) {
  const m = html.match(/Derni[eè]re mise à jour le\s+[^,<]+,?\s+([A-Za-zûéà.]+\s+\d{1,2}\s+\d{4})/i);
  return m ? m[1].replace(/\s+/g, ' ').trim() : null;
}

/** «SANJOSE 3-1-0 (7e Western)» → «SANJOSE 3-1-0» */
function ficheDePage(html, code) {
  const m = html.match(new RegExp(code.replace('.', '\\.') + '\\s+(\\d+)-(\\d+)-(\\d+)'));
  return m ? `${code} ${m[1]}-${m[2]}-${m[3]}` : null;
}

async function main() {
  const racine = process.cwd();
  const { S, window } = await outilsDepuisInterface(path.join(racine, 'index.html'));

  const cibles = FILTRE ? [FILTRE] : EQUIPES;
  const equipes = {};
  const echecs = [];
  let dateMaj = null;

  for (const code of cibles) {
    try {
      const html = await chercher(BASE + encodeURIComponent(code));
      const doc = new window.DOMParser().parseFromString(html, 'text/html');
      const joueurs = S.parseRoster(html, doc);
      if (joueurs.length < MIN_JOUEURS) {
        throw new Error(`${joueurs.length} joueurs analysés (< ${MIN_JOUEURS})`);
      }
      equipes[code] = {
        fiche: ficheDePage(html, code),
        maj: dateDePage(html),
        joueurs
      };
      dateMaj = dateMaj || equipes[code].maj;
      console.log(`  ${code.padEnd(11)} ${String(joueurs.length).padStart(2)} joueurs`);
    } catch (e) {
      echecs.push(`${code} (${e.message})`);
      console.log(`  ${code.padEnd(11)} ✗ ${e.message}`);
    }
    await dodo(PAUSE_MS);
  }

  const n = Object.keys(equipes).length;
  console.log(`\n${n}/${cibles.length} équipes relevées` + (echecs.length ? ` · échecs : ${echecs.join(', ')}` : ''));

  const seuil = FILTRE ? 1 : MIN_EQUIPES;
  if (n < seuil) {
    console.error(`Relève incomplète (${n} < ${seuil}) : le fichier existant est laissé intact.`);
    process.exit(1);
  }

  /* Doublons entre clubs : symptôme d'une page servie en cache pendant un échange.
     On le signale sans bloquer, l'interface reste utilisable. */
  const vus = new Map();
  for (const [code, e] of Object.entries(equipes)) {
    for (const j of e.joueurs) {
      if (j.horsAlignement || j.backup) continue;
      if (vus.has(j.nom)) console.warn(`  ! ${j.nom} apparaît dans ${vus.get(j.nom)} et ${code}`);
      else vus.set(j.nom, code);
    }
  }

  const charge = {
    genere: new Date().toISOString(),
    maj: dateMaj,
    source: 'ushl.ca — TeamRosters.php (PRO)',
    nbEquipes: n,
    equipes
  };

  await fs.mkdir(path.dirname(path.join(racine, SORTIE)), { recursive: true });
  await fs.writeFile(path.join(racine, SORTIE), JSON.stringify(charge, null, 1) + '\n', 'utf8');
  console.log(`Écrit : ${SORTIE} (relevé du ${dateMaj || '?'}, ${vus.size} joueurs uniques)`);
}

main().catch(e => {
  console.error('Échec :', e.message);
  process.exit(1);
});
