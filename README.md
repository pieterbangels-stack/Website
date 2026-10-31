# pieterbangels.com

Persoonlijke website van Pieter Bangels, gebouwd om gevonden te worden door Google en door AI-assistenten (ChatGPT, Claude, Perplexity, Gemini).

## Wat zit erin

| Bestand of map | Wat het doet |
| --- | --- |
| `config.json` | Je gegevens: domein, contact, LinkedIn, klanten |
| `content/posts/` | Je blogs, één Markdown-bestand per artikel |
| `assets/clients/` | Logo's van klanten (SVG of PNG) |
| `build.mjs` | Maakt de website aan in `dist/` |
| `.github/workflows/deploy.yml` | Zet de site automatisch online bij elke wijziging |

Bij elke build worden ook deze bestanden aangemaakt, speciaal voor zoekmachines en LLM's: `llms.txt` en `llms-full.txt` (samenvatting en volledige tekst voor AI-modellen), `sitemap.xml`, `robots.txt` (laat alle AI-crawlers expliciet toe), `feed.xml` (RSS) en gestructureerde data (schema.org: Person, FAQ, BlogPosting) in elke pagina.

## Eenmalig online zetten (± 30 minuten)

1. **Domein kopen**, bijvoorbeeld `pieterbangels.com` of `pieterbangels.eu`, bij een registrar zoals Cloudflare, Combell of One.com.
2. **Domein invullen** in `config.json` bij `siteUrl`.
3. **GitHub-account** aanmaken, een nieuwe repository maken en alle bestanden uploaden (knop *Add file → Upload files*).
4. In de repository: **Settings → Pages → Source: GitHub Actions**. De site staat binnen enkele minuten online.
5. Bij **Settings → Pages → Custom domain** je domein invullen en de DNS-records instellen bij je registrar volgens de uitleg van GitHub. Vink *Enforce HTTPS* aan.
6. **Google Search Console** en **Bing Webmaster Tools**: domein toevoegen en `https://jouwdomein/sitemap.xml` indienen. Bing is belangrijk omdat ChatGPT en Copilot er zoekresultaten uit halen.

## Een blog toevoegen (2 minuten)

1. Ga in GitHub naar `content/posts/` en kies *Add file → Create new file*.
2. Noem het bestand `JJJJ-MM-DD-korte-titel.md`, bijvoorbeeld `2026-11-14-mig6-in-sap.md`.
3. Plak bovenaan dit blok en schrijf je tekst eronder:

```
---
title: De titel van je artikel
date: 2026-11-14
summary: Eén of twee zinnen die zeggen waar het artikel over gaat.
tags: Market processes
---

Je eerste alinea.

## Een tussentitel

Meer tekst. **Vet**, *cursief* en [links](https://voorbeeld.com) werken.

- Een opsomming
- Nog een punt
```

4. Klik *Commit changes*. De site wordt automatisch opnieuw gebouwd, met het artikel op de homepage, in het blogoverzicht, de sitemap, de RSS-feed en `llms.txt`.

Tips: gebruik als tags de drie pijlers uit je plan (`Transformation`, `Market processes`, `AI and future`). Een concept kun je verbergen met `draft: true`.

Je kunt ook gewoon de tekst naar Claude sturen met de vraag om er een blog van te maken.

## Klantlogo's toevoegen

1. Zet het logo in `assets/clients/`, bij voorkeur als SVG, anders als PNG met transparante achtergrond.
2. Voeg het toe in `config.json`:

```json
"clients": [
  { "name": "Naam Utility", "logo": "assets/clients/naam-utility.svg", "url": "https://www.naamutility.be" }
]
```

De logo's verschijnen als bewegende strook onder de hero. De klantnamen staan ook als tekst in de pagina, zodat LLM's ze kunnen lezen. Vraag altijd toestemming aan de klant voor je een logo publiceert.

## Lokaal bekijken

```
node build.mjs --preview
```

Open daarna `dist-preview/index.html` in je browser.
