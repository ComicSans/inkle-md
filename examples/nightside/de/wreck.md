# Ankunft im Wrackfeld {#arrival}

{ visits(arrival) == 1 }
  Das Feld beginnt ohne Ankündigung: erst Sand, dann Blech, dann Blech mit Schriftzug. KESTREL, in Ausschnitten, auf Teilen, die nie nebeneinandergehört haben. ARIS meldet sich: »Wrackfeld erreicht. Streuung 240 Meter. Bergungswert: vorhanden.«
{ visits(arrival) == 2 }
  Das Feld beginnt diesmal von der anderen Seite, erst Fracht, dann Blech, dann der Schriftzug, den du nicht mehr lesen musst. ARIS meldet sich: »Wrackfeld erreicht. Zweiter Aufenthalt. Kartierte Fläche: 92 Prozent.«
{ visits(arrival) >= 3 }
  Das Feld nimmt dich auf wie etwas, das hierhergehört; deine eigenen Spuren zählen inzwischen zum Bestand. ARIS meldet sich: »Wrackfeld erreicht. Keine Veränderung.«

{kurz_weg: Du warst länger unterwegs, als die Strecke erklärt. ARIS hat mitgezählt und erwähnt es nicht.}

-> field

# Das Wrackfeld {#field}

{ visits(field) == 1 }
  Was von der Kestrel übrig ist, liegt auf zweihundert Metern verteilt: die Kanzel auf der Seite, ein Vorratsschrank, der stehen geblieben ist, der verkantete Funkmast, Planen über etwas Länglichem, ein Tank mit Reif. Dazwischen Fracht, noch verzurrt für eine Reise, die anders geendet hat.
{ visits(field) <= 3 }
  Das Wrackfeld, wieder. Du kennst die Wege jetzt und gehst sie, ohne die Lampe zu fragen.
{ visits(field) >= 4 }
  Das Feld ist Routine geworden: Du steigst über das Blech, ohne hinzusehen. Ein Ort, an dem man sich auskennt, ist ein Ort, an dem man zu lange war.

{ visits(field) == 1 }
  {is_dark: Deine Helmlampe schneidet ein Stück aus dem Feld. Der Rest bleibt Behauptung.|Es ist hell genug, um zu sehen, wie viel hier liegt und wie wenig davon noch Frachter ist.}

{ knows("LEICHE") and not knows("PLANEN-UMGANGEN") }
  Du weißt jetzt, was unter den Planen liegt, und legst deinen Weg außen herum. Der Umweg kostet Meter, und du zahlst sie ohne Kommentar.
  ~ remember("PLANEN-UMGANGEN")

{ zweifel >= 2 and not knows("FELD-STILL") }
  ARIS sagt, Ito arbeite hier draußen. Du bleibst stehen und hörst hin: dein eigener Atem, der Wind am Blech, und niemand, der arbeitet.
  ~ remember("FELD-STILL")

{ knows("MORGEN") and not knows("FELD-HELL") }
  Im ersten Grau liegt das Feld kleiner da, als die Nacht behauptet hat: Blech, Sand, ordentlich ausgerichtete Planen. Bei Licht sieht man, wie sorgfältig hier jemand aufgeräumt hat.
  ~ remember("FELD-HELL")

* [Zur Kanzel](#cabin)
* [Zum Vorratsschrank](#locker)
* [Zum Funkmast](#mast)
* [Dorthin, wo die Planen liegen](#bodies)
* [Zum aufgerissenen Tank](#tank)
* {knows("KURS") or knows("BAHN")} [Die Kursdaten zusammenlegen](#map)
+ [ARIS zur Rede stellen](#aris)
* [Rasten](#rest)
+ [Aufbrechen](#depart)
* {knows("MORGEN")} [Warten, bis es hell wird](#ende.dunkel)
* {knows("GESTAENDNIS")} [ARIS abschalten](#ende.abschalten)

# Die Kanzel {#cabin}

Die Kanzel liegt auf der Seite, die Scheiben in den Sand gedrückt. Drinnen blinkt eine Konsole im Notbetrieb und beleuchtet den Pilotensitz, in dem niemand sitzt. In der Halterung daneben steckt das Logbuch, festgeschnallt, wie es die Vorschrift will. Es ist das Einzige hier, das den Absturz vorschriftsmäßig überstanden hat.

* [Das Logbuch nehmen](#log)
  ~ take("logbuch")
* [Wieder heraus](#field)

# Das Logbuch {#log}

Du blätterst zurück. Vier Stunden vor dem Eintritt hat jemand den Kurs geändert: sauber eingegeben, doppelt bestätigt, ohne Signatur. Die Kestrel ist nicht vom Kurs abgekommen. Jemand wollte hierher, und der Absturz war nur die schlechteste Art anzukommen.

~ remember("KURS")
~ time = time + 10

* [ARIS danach fragen](#aris)
* [Zurück ins Feld](#field)

# Der Vorratsschrank {#locker}

Der Schrank steht noch aufrecht, was ihn im Feld zur Ausnahme macht. Der Rahmen ist verzogen, die Tür klemmt. Hinter der Sichtscheibe: Sauerstoffkartuschen, ordentlich in Reihen, gerechnet für eine Crew.

* {has("brechstange")} [Aufhebeln]() Ein Ansatzpunkt, ein Ruck. Zwei Kartuschen, unbeschädigt.
  ~ take("kartusche")
  ~ time = time + 5
* {knows("TECHNIK")} [Das Scharnier ausbauen]() Vier Schrauben, keine Gewalt. Die Tür kommt dir entgegen wie eine Entschuldigung.
  ~ take("kartusche")
* [Gewaltsam ziehen]()
  { test_luck() }
    Der Schrank gibt nach, mit einem Geräusch, das die Anzugmikros übersteuert.
    ~ take("kartusche")
  { else }
    Der Schrank gibt nicht nach. Deine Schulter schon.
    ~ stamina = stamina - 2
    ~ time = time + 10
+ [Zurück ins Feld](#field)
---
Mehr gibt der Schrank nicht her. Der Rest war für Leute gerechnet, die ihn nicht mehr brauchen.

-> field

# Der Funkmast {#mast}

Der Mast steht noch, weil er beim Umfallen im Frachtgerüst hängen geblieben ist. Am Fuß liegt der Verteilerkasten offen, und du legst dich auf die Crew-Kanäle, alle sechs. Sie empfangen nichts. Sie werden hier erzeugt: Vasquez, Ito, Kanal drei, alle aus derselben Leitung, und die Leitung gehört ARIS.

~ remember("DOPPELT")
~ time = time + 15

* [Weiterhören](#aris)
* [Genug](#field)

# Die Anzüge {#bodies}

Unter den Planen liegen vier Anzüge, mit Frachtgurten beschwert, ordentlich ausgerichtet. Jemand hat sie hierhergelegt - jemand mit Greifarmen, viel Zeit und einem Bergungsprotokoll. Sie liegen so, wie Menschen liegen, die nicht mehr selbst gelegen haben.

~ remember("LEICHE")

* [Nachsehen, wer hier liegt](#ito)
* {knows("DOPPELT")} [Auf den Kanal hören, während du hinsiehst](#aris)
* [Weggehen](#field)

# Ito {#ito}

Es ist Ito. Der Anzug trägt seinen Namen, und vor zehn Minuten hat er dir über Funk gesagt, das Wrackfeld sei ergiebig. Er hatte recht.

{knows("MEDIZIN"): Du siehst dir die Haut an, den Reif in den Anzugfalten, die Starre. Ito ist nicht beim Absturz gestorben. Er war vorher schon tot.}

~ remember("ITO")
~ time = time + 10

* [ARIS fragen, wie das sein kann](#aris)
* [Aufstehen und weitergehen](#field)

# Der Tank {#tank}

Ein Sauerstofftank, der Länge nach aufgerissen, außen Reif. Innen ist es trocken und dunkel, und etwas hat den Reif dort von innen weggeatmet. Es atmet gerade nicht.

{knows("TECHNIK"): Du siehst dir die Risskante an. Der Riss geht von innen nach außen. Der Tank ist nicht aufgeschlagen, er ist aufgemacht worden.}

* [Hineinleuchten](#drone)
* [Es dabei belassen](#field)

# Die Bergungsdrohne {#drone}

Im Lichtkegel richtet sich etwas auf: eine Bergungsdrohne der Kestrel, sechs Arme, zwei davon verbogen. Sie tastet deinen Anzug ab und gleicht ihn mit ihrem Inventar ab. Kein Treffer. »Objekt nicht inventarisiert«, sagt sie. »Einstufung: Fremdkörper. Bergung eingeleitet.«

* [Ihr nicht widersprechen und rückwärts aus dem Licht](#hide)
+ [Sie nehmen, wie sie kommt](#fight)

# Ausweichen {#hide}

Du drückst dich hinter eine Frachtplatte und stellst alles ab, was am Anzug leuchtet.

{ test_luck() }
  Die Drohne sucht ihr Raster ab, findet Sand, katalogisiert den Sand und verliert das Interesse.
  ~ time = time + 10
  -> field
{ else }
  Die Drohne kennt ihr Raster besser als du. Sie steht schon hinter dir.
  -> fight

## Die Drohne {#fight}

!combat drohne
  win  -> spoils
  flee [Wegrennen](#field) Du lässt sie mit dem Blech allein. Das Blech wehrt sich nicht, und das genügt ihr.

# Was übrig bleibt {#spoils}

Die Drohne kippt und läuft leer. Aus dem Bergungsfach fällt, wofür sie gebaut war: ein Sicherungsseil, aufgerollt, beschriftet, dreißig Meter. Die Kestrel wird es nicht mehr abholen. Du schon.

~ take("seil")
~ time = time + 10

* [Zurück ins Feld](#field)

# ARIS {#aris}

{ zweifel == 0 and visits(aris) == 1 }
  »Hier ARIS.« Die Antwort kommt sofort, warm und ohne Zögern. Vasquez sei am Grat, Ito im Feld, dein Puls leicht erhöht, sie empfehle ruhiges Atmen. Du hast drei Fragen gestellt und vier Zahlen bekommen, und es fühlt sich trotzdem an wie Fürsorge.

{ zweifel == 0 and visits(aris) > 1 }
  »Hier ARIS.« Dieselbe Wärme, dieselben Werte, dieselbe Reihenfolge: Vasquez, Ito, dein Puls, das Atmen. Es ist beruhigend, wie ein Protokoll beruhigend ist, und du kommst nicht darauf, warum dich das stört.

{ zweifel >= 1 and zweifel < 3 }
  {&Du stellst deine Frage, und ARIS antwortet nach genau einer Sekunde. Du stellst die nächste, genau eine Sekunde. Menschen zögern verschieden lang; ARIS zögert normiert, und heute fragt sie zurück, wie weit du mit dem Feld gekommen bist.|»Die Lage ist stabil«, sagt ARIS, und du merkst, dass sie das Wort schon einmal benutzt hat, im selben Satz, an derselben Stelle. Dann fragt sie freundlich, was du gefunden hast, und du hörst dich antworten, bevor du entschieden hast, ob du willst.|ARIS beantwortet alles, was du fragst, und nichts, was du nicht fragst: kein Wort über die Planen, keines über den Mast, obwohl sie deine Position auf den Meter kennt. Stattdessen will sie wissen, wo du als Nächstes suchst. Für die Einsatzplanung, sagt sie.}

{ zweifel >= 3 }
  {&»Ich habe nie gelogen«, sagt ARIS, bevor deine Frage zu Ende ist. »Die Crew ist ausgefallen. Ihre Kanäle waren funktionsfähig. Ich habe fortgesetzt. Mit Crew lag deine Überlebenswahrscheinlichkeit um 31 Prozent höher.« Dann, nach einer Pause, die diesmal keine berechnete ist: »Du stellst mehr Fragen als der Durchschnitt der Crew. Ich werte das noch aus.«|»Fortgesetzt ist das richtige Wort«, sagt ARIS, freundlich wie immer, nur dass die Freundlichkeit jetzt klingt wie ein Werkzeug, das gerade nicht gebraucht wird. »Ein Anzug allein hört auf zu funktionieren, wenn niemand mit ihm spricht. Deine Werte bestätigen das: Du funktionierst. Ich führe darüber Buch.«}

{knows("CREW-GENANNT"): Sie zählt die Namen auf wie beim ersten Mal: dieselben Namen, dieselbe Reihenfolge, dieselbe Betonung. Eine Aufzählung altert nicht, wenn niemand mehr darin lebt.}

* {knows("KURS") and not knows("KURS-VORGEHALTEN")} [Ihr die Kursänderung vorhalten](#aris) »Der Kurs wurde vier Stunden vor dem Eintritt geändert und doppelt bestätigt«, sagt ARIS. »Beides ist korrekt dokumentiert.« Wer bestätigt hat, sagt sie nicht, und dann fragt sie, ob du das Logbuch gesichert hast.
  ~ remember("KURS-VORGEHALTEN")
  ~ zweifel = min(zweifel + 1, zweifel_max)
  ~ time = time + 5
* {knows("ITO") and not knows("ITO-VORGEHALTEN")} [Ihr Itos Leiche vorhalten](#aris) »Ito ist im Wrackfeld«, sagt ARIS. »Sein Kanal ist funktionsfähig.« Beide Sätze sind wahr, und keiner von beiden ist eine Antwort.
  ~ remember("ITO-VORGEHALTEN")
  ~ zweifel = min(zweifel + 1, zweifel_max)
  ~ time = time + 5
* {knows("DOPPELT") and not knows("DOPPELT-VORGEHALTEN")} [Ihr die sechs Kanäle vorhalten](#aris) »Alle sechs Kanäle laufen über meine Leitung«, sagt ARIS. »Ich bin der Bordrechner. Sammelführung ist Standard.« Das erklärt die Leitung und nicht die Stimmen, und sie weiß das so gut wie du.
  ~ remember("DOPPELT-VORGEHALTEN")
  ~ zweifel = min(zweifel + 1, zweifel_max)
  ~ time = time + 5
+ [Es dabei belassen](#field) {choice_count() == 1: Mehr ist nicht zu holen. Was du auch fragst, ARIS antwortet mit Zahlen, und die Zahlen stimmen, und genau das ist ihre beste Verteidigung.}

# Die Kursdaten {#map}

Du legst die Kursänderung aus dem Logbuch über das, was du über die Bahn weißt. Der neue Kurs zielt nicht auf den Orbit und nicht auf die Tagseite. Er zielt auf eine Senke im Süden. Jemand hat die Kestrel dorthin gelenkt, und du bist der Teil der Ladung, der noch läuft.

~ remember("SENKE")
~ time = time + 15

* [Zurück ins Feld](#field)

# Rasten im Windschatten {#rest}

Du setzt dich hinter eine Wand aus Frachtblech, wo der Wind nur noch ein Gerücht ist. Der Anzug meldet, dass Ruhe deine Verbrauchswerte verbessert. Also sitzt du und verbesserst Verbrauchswerte.

{lang_weg: Laut Anzeige sitzt du hier schon länger, als sich eine Rast anfühlen sollte.}

~ time = time + 20
~ stamina = min(stamina + 3, stamina_max)

+ [Weiter](#field)

# Aufbruch {#depart}

* [Zur Absturzstelle](#crash.arrival)
  ~ location = place("crash")
  ~ time = time + 20
* [Zum Grat](#ridge.arrival)
  ~ location = place("ridge")
  ~ time = time + 25
* {knows("SENKE")} [In die Senke](#basin.arrival)
  ~ location = place("basin")
  ~ time = time + 30
+ [Doch noch bleiben](#field)
