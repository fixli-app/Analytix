# Designbeslut

- **Produktidentitet:** StatLab är ett arbetsnamn för en fristående app. Inga externa produktvarumärken, logotyper, ikoner eller texter återanvänds.
- **Startpunkt:** Arbetsytan var tom. Vite + React + TypeScript väljs för den efterfrågade klientappen.
- **Omfattning:** Den önskade funktionsmängden motsvarar ett stort statistiskt skrivbordsprogram och kan inte sanningsenligt levereras eller verifieras i en enda arbetsinsats. Arbetet ska därför vara inkrementellt, i angiven fasordning, med fungerande vertikala delar och en ärlig status i `PROGRESS.md`.
- **Verifieringspolicy:** Inga statistiska resultat märks verifierade utan reproducerbara tester mot referensvärden, dokumenterad tolerans och tydlig hantering av indatafel.
- **Fasreleaser:** Skapa inte commits eller taggar som antyder att en fas är klar innan dess omfattning, tester och verifieringskrav faktiskt är uppfyllda. Partial implementation ska beskrivas som sådan.
- **Klientlagring:** Ingen backend. Projekt- och autosparningslagring ska använda IndexedDB när den delen implementeras; exportformat ska vara explicit.
- **Prestanda:** Målet 500 000 rader kräver virtualisering och mätning. Det får inte påstås uppnått utan benchmark i relevant webbläsare/hårdvara.
- **Initial prioritet:** Bygg Fas 0-grund och sedan vertikalt fungerande, testbar statistik hellre än att skapa tomma UI-punkter för alla analyser.
- **Processkapabilitet, första delmodul:** För individmätningar i radordning skattas within-s som MR̄/1,128 och overall-s som stickprovsstandardavvikelse. Förväntad PPM antar normalfördelning; Z-bench within är 3 × Cpk utan 1,5σ-skift. Stabilitet, normalitet och tidsordning verifieras inte automatiskt, så resultatet ska tydligt visa dessa begränsningar. Subgroupdata får inte blandas in förrän val av inom-/mellanvariation är explicit.
