# StatLab progress

Status values: **ej påbörjad**, **klar**, **klar och verifierad**. A feature may only be marked verified after its focused tests pass and, for statistical analyses, its result matches a reference fixture with a stated tolerance. All items start as not started; work in progress is described separately at the end.

## Fas 0: Grund

- [x] Projektgrund: React 18, strict TypeScript 5.9, Vite, Tailwind 4, Vitest, ESLint, Prettier, Husky och lint-staged med typecheck/test-hook. Status: klar.
- [x] Svensk standard, engelska resurser och ljust/mörkt tema. Status: klar för grundvyn; fullständig lokalisering återstår.
- [x] Web Worker/Comlink-infrastruktur med beskrivande statistik som worker-uppgift. Status: klar för denna analys.
- [x] Ångra/gör om för cellredigering och rektangulär inklistring. Status: klar och verifierad med tester.
- [x] CSV/XLSX-import, CSV-export, `.statlab` JSON öppna/spara samt IndexedDB-autospar. Status: klar i grundflödet; bredare import/exporttester återstår.
- [ ] Komplett datablad: flera arbetsblad, fullständig cellmarkering, Excel-kopiering, rader/kolumners borttagning/infogning, sortering/filter, typning och 500 000-raders benchmark. Status: ej påbörjad som full funktion; en virtuell redigerbar grund finns.
- [ ] Komplett sessionsfönster, sökning/export till HTML/DOCX och full projektnavigator för grafer/makron. Status: ej påbörjad som full funktion; grundpaneler finns.
- [ ] Full funktionalitet för menyrad, dialoger, tangentbordsflöden och hjälp. Status: ej påbörjad; tillgängliga grundåtgärder är kopplade och övrigt är markerat som kommande.

## Fas 1: Data, beräkning och beskrivande statistik

- [ ] Data: sortera, stapla/avstapla, dela datablad, sammanfoga, subset, kodning numerisk/text/datum/tid, omvandla typ, rangordna, ta bort/ersätta saknade värden, slumpmässigt urval. Status: ej påbörjad.
- [x] Data-delmodul: stigande/fallande typed sortering med saknade värden sist, infoga/ta bort aktiv rad, ta bort aktiv kolumn med skydd för sista kolumnen, ersätt saknade värden samt icke-destruktivt textsökfilter över synliga rader. Status: klar och verifierad med tester och browserflöde. Avancerade filtervillkor, stapla/dela/sammanfoga/subset/konvertering/rangordning/slumpurval återstår.
- [ ] Beräkna: kalkylator med matematiska/statistiska/logiska funktioner radvis och kolumnvis; beskrivande kolumnstatistik; standardisering; slumpdata från normal, uniform, binomial, Poisson, exponential, gamma, beta, t, chi-två, F, Weibull, lognormal och andra vanliga fördelningar; pdf, cdf och invers cdf. Status: ej påbörjad.
- [x] Beräkna-delmodul: sample z-score-standardisering via worker, lagras som ny undo-bar numerisk kolumn; saknade värden bevaras och konstant/för liten/tom kolumn ger begripliga fel. Status: klar; 5 tester med handberäknat fixture `[1, 2, 3]`, extern referensverifiering återstår.
- [ ] Statistik > Grundläggande: grafisk sammanfattning; beskrivande statistik; 1-urvals Z/t; 2-urvals t; parat t; 1/2 proportioner; 1/2-urvals Poisson-hastighet; jämförelse av två varianser, Bartlett, Levene; korrelation; kovarians; Anderson-Darling, Ryan-Joiner och Kolmogorov-Smirnov normalitetstest; Poisson goodness-of-fit. Status: ej påbörjad.
- [x] Statistik-delmodul: tvåsidigt 1-urvals t-test med valbart μ₀/α och konfidensintervall, via worker; visar slutsats och antaganden som ej testade. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: tvåsidigt 1-urvals Z-test med känd populationsstandardavvikelse, valbart μ₀/α och konfidensintervall. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: tvåsidigt 2-urvals Z-test för oberoende medelvärden med kända separata σ₁/σ₂, valbar μ₁−μ₂ och konfidensintervall. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: tvåsidigt Welch 2-urvals t-test med valbar medelskillnad/α och konfidensintervall; hanterar olika varianser utan poolning. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: parat tvåsidigt t-test på radvisa differenser, med parvis bortfallshantering och KI. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: tvåsidigt 1-proportion Z-test för binär 0/1-kolumn med p₀, normalapproximation, förväntade antal och Wilson-KI. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: tvåsidigt 2-proportion Z-test med pooled null-standardfel, förväntade antal och Newcombe-Wilson-KI för två oberoende binära grupper. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: Pearson-korrelation, sample-kovarians, tvåsidigt t-test och Fisher-z-KI med complete-case-par. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: tvågrupps F-test, Bartlett och medianbaserat Levene-test. Status: klar med fixture- och browserflödestester; F/Bartletts normalitetsantagande exponeras och oberoende referensverifiering återstår.
- [x] Statistik-delmodul: Pearson chi-två-test för samband mellan två kategoriska kolumner med observerade/förväntade frekvenser, Cramér’s V och små-cell-diagnostik. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: chi-två goodness-of-fit för uniforma kategorisannolikheter med observerade/förväntade frekvenser och små-cell-diagnostik. Status: klar med fixture- och browserflödestester; godtyckliga förväntade sannolikheter och oberoende referensverifiering återstår.
- [x] Statistik-delmodul: tvåsidigt Fishers exakt test för 2×2-tabeller med fasta marginaler och oddskvot. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: tvåsidigt Kolmogorov-Smirnov mot fullt specificerad normalfördelning. Status: klar med fixture- och browserflödestester; μ/σ måste anges i förväg, Lilliefors-korrigering för skattade parametrar återstår; extern referensverifiering återstår.
- [x] Statistik-delmodul: 1-urvals Poisson-hastighetstest med exponering, score-Z och Garwood-KI. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [x] Statistik-delmodul: tvåsidigt 2-urvals Poisson-hastighetstest för oberoende grupper med separata exponeringar, poolad H₀-varians och KI för hastighetsskillnaden. Status: klar med fixture- och browserflödestester; oberoende referensverifiering återstår.
- [ ] Tabeller: korstabell och chi-två; chi-två goodness-of-fit; beskrivande statistik för tabeller; Fisher exakt test. Status: ej påbörjad.
- [ ] Grafik: histogram (enkelt, anpassad fördelning, flera grupper); boxplot; individuellt värdediagram; punkt-, linje-, stapel- och cirkeldiagram; sannolikhetsdiagram; empirisk CDF; matris- och marginaldiagram; bubbeldiagram; 3D-spridning och yta; kontur-, intervall-, tidsserie- och områdesdiagram; dot plot; violin. Status: ej påbörjad.
- [x] Delmängd av beskrivande statistik: antal, medelvärde, median, stickprovsstandardavvikelse, varians, standardfel, R-7-kvartiler, variationsbredd, minimum och maximum. Status: klar; handberäknat fixture `[1, 2, 3, 4]` testas med tolerans, men oberoende NIST/R/SciPy-verifiering återstår. Övriga beskrivande mått/analyser återstår.

## Fas 2: Hypotesprövning och icke-parametriskt

- [ ] Konfidensintervall och intervall för analyser i Fas 1. Status: ej påbörjad.
- [ ] Ekvivalenstest: 1-urval, 2-urval och parat. Status: ej påbörjad.
- [ ] Icke-parametriska test: 1-urvals tecken, 1-urvals Wilcoxon, Mann-Whitney, Kruskal-Wallis, Mood median, Friedman, Runs-test och Walsh parvisa medelvärden. Status: ej påbörjad.
- [ ] Effektstorlek och urvalsstorlek för relevanta Z/t-test, proportioner, ANOVA, korrelation m.fl.; effektkurvor. Status: ej påbörjad.
- [ ] Bootstrap och permutationstest. Status: ej påbörjad.

## Fas 3: Regression och ANOVA

- [ ] Regression: enkel/multipel/polynom/interaktionsmodell och kodning; residualdiagram 4-i-1; anpassad linje; VIF; Durbin-Watson; Cook, leverage och DFITS; prediktion med intervall; stegvis och bästa delmängd; icke-linjär och ortogonal regression; PLS; binär/ordinal/nominell logistisk regression med klassificeringstabell och ROC; Poisson-regression; Box-Cox- och Johnson-transformation. Status: ej påbörjad.
- [ ] ANOVA: envägs staplad/ostaplad, tvåvägs, balanserad, generell linjär modell med fasta/slumpmässiga faktorer, nästlad ANOVA, MANOVA, ANCOVA; Tukey, Fisher, Dunnett, Hsu MCB och Games-Howell; lika varians; intervall-, huvudeffekt-, interaktions- och residualdiagram. Status: ej påbörjad.

## Fas 4: Kvalitetsverktyg

- [ ] Styrdiagram: Xbar, R, S, Xbar-R, Xbar-S, I, MR, I-MR, Z-MR, Zone; P, NP, C, U, Laney P'/U'; CUSUM, EWMA; T² och generaliserad varians; Box-Cox; Nelson- och Westgard-regler; faser och ändrade gränser. Status: delmodul klar: I-MR individdiagram med MR̄/1,128- och 3,267×MR̄-gränser, interaktiva individ-/MR-grafer, 3σ-signaler och åtta-på-en-sida-regel; övriga diagram/regler återstår.
- [ ] Processduglighet: normal/icke-normal Cp, Cpk, Pp, Ppk, Cpm, Z-bench, PPM; Sixpack; binomial/Poisson; mellan/inom. Status: delmodul klar för normalfördelade individmätningar med Cp/Cpk, Pp/Ppk, valfri Cpm, observerade/förväntade PPM och within Z-bench utan 1,5σ-skift; subgroup-/mellan-inom-modeller, icke-normal, Sixpack och attributdata återstår.
- [ ] Mätsystem: crossed/nested/expanderad Gage R&R; Gage Run Chart; Linearity and Bias; Type 1; Attribute Agreement/Attribute Gage; destruktiv Gage R&R. Status: ej påbörjad.
- [ ] Pareto, orsak-verkan, kapabilitetsdiagram och multi-variabilitetsdiagram. Status: ej påbörjad.
- [ ] Acceptansprovtagning för attribut/variabler och OC-kurvor. Status: ej påbörjad.
- [ ] Riskbedömning och FMEA-tabell som tillägg. Status: ej påbörjad.

## Fas 5: Försöksplanering (DOE)

- [ ] Skapa: fullständiga faktorförsök (2-nivå/flernivå), fraktionella (upplösning/alias), Plackett-Burman, response surface CCD/Box-Behnken, blandningsdesign simplex lattice/extreme vertices, Taguchi ortogonala fält, D/A/I-optimala, generaliserade faktor- och split-plot-designer. Status: ej påbörjad.
- [ ] Analysera: faktoreffekters Pareto/normalplot, huvud-/interaktions-/kubdiagram och aliasstruktur; response-surface kontur/yta och önskvärdhetsoptimerare; blandningsdesign; Taguchi S/N. Status: ej påbörjad.
- [ ] Prediktion, optimering och multi-respons-optimizer. Status: ej påbörjad.

## Fas 6: Multivariat, tidsserier, överlevnad och övrigt

- [ ] Multivariat: PCA, faktoranalys, hierarkisk/K-medel/variabelklustring, diskriminantanalys, enkel/multipel korrespondensanalys, itemanalys och Cronbachs alfa. Status: ej påbörjad.
- [ ] Tidsserier: diagram, trend, dekomponering, glidande medelvärde, enkel/dubbel exponentiell utjämning, Winters, differens, lagg, ACF/PACF, korskorrelation och ARIMA-prognos. Status: ej påbörjad.
- [ ] Tillförlitlighet/överlevnad: distributionsidentifiering; parametrisk/icke-parametrisk analys; Kaplan-Meier, Weibull, lognormal, exponential, loglogistic; regression med livsdata; accelererade livslängdstester; Cox-regression som tillägg. Status: ej påbörjad.
- [ ] Makron: spela in, spara/kör JSON eller TypeScript och batchkörning. Status: ej påbörjad.
- [ ] Rapportbyggare med analyser/grafer och DOCX/PDF-export. Status: ej påbörjad.
- [ ] Beslutsguide för analysval och resultattolkning. Status: ej påbörjad.

## Fas 7: Finish

- [ ] Prestandaoptimering; tillgänglighetsgranskning; full dokumentation i `/docs`; minst 20 exempeldatamängder; onboarding; installerbar/offline PWA; slutlig regressionstestkörning. Status: ej påbörjad.

## Kvalitetskrav

- [ ] Verifiera analyser mot NIST StRD, läroboksexempel och/eller R/SciPy-fixtures med angiven tolerans. Status: ej påbörjad.
- [ ] Numerisk stabilitet: QR/SVD i stället för normalekvationer, Kahan-summering och Welford där relevant. Status: ej påbörjad.
- [ ] Varje analys visar modellsammanfattning, tabeller, alfa/p-värden, kontrollerade antaganden och svensk slutsats. Status: ej påbörjad.
- [ ] Begripliga fel för saknade/tomma/konstanta/kollineära data och för små urval; inga krascher eller tysta fel. Status: ej påbörjad.
- [ ] Ej verifierade analyser märks i UI och session. Status: ej påbörjad.
- [ ] Minst 90 % testtäckning för `src/stats`. Status: ej påbörjad.
- [ ] README med installation, funktionslista och verifieringsstatus, arkitektur och begränsningar. Status: ej påbörjad.
- [ ] Fasvisa tydliga commits och taggad release först när respektive fas är klar. Status: ej påbörjad.

## Aktuell session

- Startläge: tom arbetsyta.
- Delvis levererat: användbar grundvy med virtuellt datablad, redigering, inklistring, import/export, autospar, session och testade analysdelmängder. Oberoende statistisk referensverifiering återstår.
- Senaste kontroller: `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm test` (82 tester) och `npm run build` passerar.
- Webbläsarkontroll: I-MR-grafer och signaler kontrollerades med numerisk testkolumn; tidigare analysflöden är också kontrollerade. Oberoende statistisk referensverifiering återstår.
- Nästa steg: fortsätt med Xbar-R/Xbar-S för subgroupdata och grundläggande histogram/boxplot; därefter fler styrdiagram, Sixpack och mätsystemanalys. Resterande Fas 0–7 återstår. Ingen fasrelease eller tagg skapad.
