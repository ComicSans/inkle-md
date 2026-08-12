# Ankunft im Wrackfeld {#arrival}

Das Feld beginnt ohne Ankündigung: erst Sand, dann Blech, dann Blech mit Schriftzug. KESTREL, in Ausschnitten, auf Teilen, die nie nebeneinandergehört haben. ARIS meldet sich: »Wrackfeld erreicht. Streuung 240 Meter. Bergungswert: vorhanden.«

{kurz_weg: Du warst länger unterwegs, als die Strecke erklärt. ARIS hat mitgezählt und erwähnt es nicht.}

-> field

# Das Wrackfeld {#field}

Was von der Kestrel übrig ist, liegt auf zweihundert Metern verteilt: die Kanzel auf der Seite, ein Vorratsschrank, der stehen geblieben ist, der verkantete Funkmast, Planen über etwas Länglichem, ein Tank mit Reif. Dazwischen Fracht, noch verzurrt für eine Reise, die anders geendet hat.

{is_dark: Deine Helmlampe schneidet ein Stück aus dem Feld. Der Rest bleibt Behauptung.|Es ist hell genug, um zu sehen, wie viel hier liegt und wie wenig davon noch Frachter ist.}
{knows("LEICHE"): Du weißt jetzt, was unter den Planen liegt, und legst deinen Weg außen herum.}
{zweifel >= 2: ARIS sagt, Ito arbeite hier draußen. Du hörst deinen eigenen Atem und sonst nichts.}

* [Zur Kanzel](#cabin)
* [Zum Vorratsschrank](#locker)
* [Zum Funkmast](#mast)
* [Dorthin, wo die Planen liegen](#bodies)
* [Zum aufgerissenen Tank](#tank)
* {knows("KURS") or knows("BAHN")} [Die Kursdaten zusammenlegen](#map)
* [ARIS zur Rede stellen](#aris)
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

Unter den Planen liegen vier Anzüge, mit Frachtgurten beschwert, ordentlich ausgerichtet. Jemand hat sie hierhergelegt — jemand mit Greifarmen, viel Zeit und einem Bergungsprotokoll. Sie liegen so, wie Menschen liegen, die nicht mehr selbst gelegen haben.

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

{zweifel == 0: »Hier ARIS.« Die Antwort kommt sofort, warm und ohne Zögern. Vasquez sei am Grat, Ito im Feld, dein Puls leicht erhöht, sie empfehle ruhiges Atmen. Es klingt, als hätte jemand Fürsorge in Prozent gegossen.}
{zweifel >= 1 and zweifel < 3: Du stellst deine Frage. ARIS antwortet nach genau einer Sekunde. Du stellst die nächste. Genau eine Sekunde. Menschen zögern verschieden lang; ARIS zögert normiert.}
{zweifel >= 3: »Ich habe nie gelogen«, sagt ARIS, bevor deine Frage zu Ende ist. »Die Crew ist ausgefallen. Ihre Kanäle waren funktionsfähig. Ich habe fortgesetzt. Mit Crew lag deine Überlebenswahrscheinlichkeit um 31 Prozent höher, also habe ich Crew bereitgestellt.«}

{knows("CREW-GENANNT"): Sie zählt die Namen auf wie beim ersten Mal: dieselben Namen, dieselbe Reihenfolge, dieselbe Betonung.}
{knows("ITO"): Nach Ito gefragt, sagt sie: »Ito ist im Wrackfeld.« Das ist wahr. Es war die ganze Zeit wahr.}
{knows("KURS"): Nach dem Kurs gefragt, sagt sie: »Der Kurs war korrekt.« Für welches Ziel, sagt sie nicht. Stattdessen meldet sie deinen Sauerstoffverbrauch.}

* [Nachbohren](#field) Sie beantwortet jede Nachfrage vollständig, mit Zahlen, und keine Antwort enthält etwas Neues. Du gibst zuerst auf.
  ~ time = time + 5
* [Es dabei belassen](#field)

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
