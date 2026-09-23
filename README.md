# Website FD Anwaltskanzlei AG

Neue, eigenständige Website für die FD Anwaltskanzlei AG in Bülach. Sie ersetzt die bisherige WordPress-Seite und braucht **kein WordPress, keine Datenbank und keine Plugins**. Es sind reine HTML-Dateien, die auf jedem Webhosting laufen.

## Was ist drin?

| Seite | Adresse |
|---|---|
| Startseite | `/` |
| Dienstleistungen (mit Sprungmarken je Rechtsgebiet) | `/dienstleistungen/` → `#familienrecht`, `#erbrecht`, `#arbeitsrecht`, `#mietrecht`, `#schkg`, `#vertragsrecht` |
| Konditionen | `/konditionen/` |
| Über mich | `/ueber-mich/` |
| Kontakt mit Formular | `/kontakt/` |
| Impressum | `/impressum/` |
| Datenschutz | `/datenschutz/` |
| Fehlerseite | `/404.html` |

Alte Adressen wie `/ueber-mich-anwaeltin/` oder `/datenschutzerklaerung/` werden automatisch auf die neuen weitergeleitet.

**Technik und SEO:** `lang="de-CH"`, `og:locale=de_CH`, strukturierte Daten (JSON-LD `LegalService`/`Attorney` mit Adresse, Rechtsgebieten und Einzugsgebiet), genau eine H1 pro Seite, Sitemap, robots.txt. Die Schriften liegen auf dem eigenen Server (kein Google), es gibt keine Cookies und kein Tracking, deshalb ist auch kein Cookie-Banner nötig. Die ganze Seite lädt weniger als 200 KB.

## 1. Fehlende Angaben eintragen (wichtig!)

Alles, was noch fehlt, ist auf der Website **gelb markiert**. Die meisten Angaben stehen zentral in **`site.config.json`**:

```json
"phone": "044 123 45 67",          ← Telefonnummer der Kanzlei
"email": "info@fd-anwaltskanzlei.ch",
"formEndpoint": "https://formspree.io/f/xxxxxxx",  ← siehe Punkt 3
"uid": "CHE-123.456.789",
"hourlyRate": "CHF … pro Stunde zzgl. MWST",
"firstConsultation": "Erstgespräch (ca. 30 Min.): CHF …",
"openingHours": "Mo–Fr, 08.00–12.00 und 13.30–17.30 Uhr"
```

(Die Werte oben sind nur Beispiele.) Danach im Projektordner einmal ausführen:

```bash
node build.mjs
```

Das Script baut alle Seiten neu in den Ordner `public/` und zeigt an, was noch offen ist. Es prüft ausserdem automatisch auf tote Links, leere Links, fehlende Alt-Texte und die Zahl der H1-Überschriften.

Texte ändern: Die Seiteninhalte liegen in `src/pages/*.html`, Kopf- und Fussbereich in `src/partials/`. Danach wieder `node build.mjs` ausführen.

## 2. Texte prüfen

Die Texte wurden **neu verfasst**, weil die alte Website nicht zugänglich war. Bitte von Frau Dudler gegenlesen lassen, vor allem:

- **Dienstleistungen**: Stimmen die aufgeführten Themen je Rechtsgebiet?
- **Über mich**: Werdegang ergänzen (gelb markiert). Porträtfoto einsetzen, siehe Kommentar in `src/pages/ueber-mich.html` und `src/pages/index.html`.
- **Impressum und Datenschutz**: Das sind Entwürfe. Bitte Handelsregister, UID, Anwaltsregister und Aufsichtsbehörde prüfen und Hosting-Anbieter sowie Formulardienst eintragen.
- Aussagen wie „Antwort in der Regel innerhalb eines Arbeitstages“ (Kontaktseite) nur stehen lassen, wenn sie zutreffen.

**Logo:** Aktuell ist ein Platzhalter-Logo („FD“ in Petrol/Messing) eingesetzt. Liegt das Original-Logo vor, als `public/assets/img/logo.svg` (oder .png) ablegen und in `src/partials/logo.html` einbinden. Die Farben stehen oben in `public/assets/css/style.css` (`--c-primary`, `--c-accent`) und lassen sich dort ans Logo anpassen.

## 3. Kontaktformular einrichten

Eine statische Website kann selbst keine E-Mails versenden. Empfohlen wird **Formspree** (Gratis-Stufe genügt):

1. Auf https://formspree.io mit der Kanzlei-E-Mail registrieren und ein Formular anlegen.
2. Die angezeigte Adresse (`https://formspree.io/f/…`) in `site.config.json` bei `formEndpoint` eintragen und `node build.mjs` ausführen.
3. Eine Testanfrage senden und die Bestätigungs-E-Mail von Formspree einmalig bestätigen.

Solange kein `formEndpoint` eingetragen ist, öffnet das Formular das E-Mail-Programm der Besucherin oder des Besuchers mit einer vorausgefüllten Nachricht an die `email`-Adresse.

## 4. Online stellen

Hochgeladen wird **nur der Inhalt des Ordners `public/`**.

- **Bisheriges Webhosting (FTP):** Den Inhalt von `public/` in das Web-Verzeichnis hochladen, nachdem die alte WordPress-Installation gesichert wurde. Die Datei `.htaccess` richtet Weiterleitungen und Caching ein (Apache).
- **Netlify (gratis):** Auf https://app.netlify.com/drop den Ordner `public/` hineinziehen. Danach unter „Domain settings“ die Domain `fd-anwaltskanzlei.ch` verbinden. Die Datei `_redirects` wird automatisch berücksichtigt.
- Wer Zugriff auf Hosting und Domain hat, ist vermutlich die bisherige Webagentur oder der Hosting-Anbieter.

Nach dem Livegang: Die Seite in der Google Search Console anmelden, `https://fd-anwaltskanzlei.ch/sitemap.xml` einreichen und das Google-Unternehmensprofil (Adresse, Telefon, Website) prüfen.

## Lokal ansehen

```bash
node build.mjs
cd public && python3 -m http.server 8080
# → http://localhost:8080
```

## Lizenzen

Schriften: Inter und Source Serif 4 (SIL Open Font License, siehe `public/assets/fonts/`). Icons: nach Vorbild von Lucide (ISC-Lizenz).
