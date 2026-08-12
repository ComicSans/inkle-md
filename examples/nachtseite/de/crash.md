# Aufwachen {#wake}

Du wachst auf, weil dein Anzug mit dir spricht. Er tut es in Zahlen, und die Zahlen sind nicht gut. Du liegst halb im Geröll, die Beine verschüttet, die Sichtscheibe hat einen Riss, der genau durch das läuft, was hier als Himmel gilt: schwarz, sternlos an den Rändern, als hätte jemand das Bild nicht fertig gerechnet. Von der Kestrel ist nichts zu sehen. Von der Kestrel ist vermutlich einiges zu sehen, nur nicht von hier und nicht in einem Stück.

Atemluft: {air}. Seit dem Aufschlag: {time} Minuten. Der Anzug nennt dir beides ungefragt, in der Annahme, dass du damit etwas anfangen kannst.

* [Dich freigraben]()
  { test("skill") }
    Du arbeitest die Beine frei, ein Stein nach dem anderen, in der richtigen Reihenfolge. Es geht schneller, als du befürchtet hast, und das ist heute schon die beste Nachricht.
    -> voice
  { else }
    Du kommst frei, aber der Hang hat andere Vorstellungen von Reihenfolge. Als du stehst, zittern die Knie, und der Anzug notiert den Aufwand kommentarlos.
    ~ stamina = stamina - 2
    ~ time = time + 10
    -> voice
* [Liegenbleiben und auf den Funk hören]() Du bleibst liegen. Auf dem Kanal rauscht es, und im Rauschen ist ein Rhythmus, der keiner sein sollte.
  ~ time = time + 5
---
Dann klickt es, und der Kanal steht offen.

-> voice

# Der erste Funk {#voice}

"Hier ARIS", sagt eine Stimme, die du kennst. Der Bordrechner. "Ich empfange deine Vitalwerte. Puls 96, fallend. Gut." Eine Pause. "Vasquez ist am Grat, Ito im Wrackfeld. Kanal drei meldet sich in vier Minuten." Die Stimme klingt wie immer: ruhig, präzise, mit einem Hang zu Zahlen, die niemand bestellt hat.

* [Nach der Crew fragen](#crew)
* [Den Anzug prüfen](#suit)
* [Aufstehen und dich umsehen](#site)
  ~ location = place("crash")

# Die Crew {#crew}

Du fragst. ARIS antwortet sofort: Vasquez am Grat, gehfähig. Ito im Wrackfeld, bei der Fracht. Kanal drei außer Reichweite, wird durchgereicht. "Sieben an Bord", sagt sie, "vier bestätigt. Das ist ein guter Wert." Es klingt wie ein Wetterbericht, und du bist zu müde, um zu fragen, für wen.

{zweifel >= 1: Dir fällt etwas auf: Die Pause, bevor ARIS eine Antwort der anderen durchgibt, ist jedes Mal gleich lang. Auf die Sekunde.}
{zweifel >= 2: Vasquez sagt, ihr gehe es den Umständen entsprechend. Ito sagt, ihm gehe es den Umständen entsprechend. Wortgleich, bis in die Betonung.}

~ remember("CREW-GENANNT")

* [Weiterfragen](#ticken)
* [Den Anzug prüfen](#suit)
* [Aufstehen](#site)
  ~ location = place("crash")

# Der Anzug {#suit}

Du gehst die Anzeigen durch. Hauptflasche angerissen, Reserve leer — die Reserve war das Erste, was der Aufschlag geholt hat. Was auf der Anzeige steht, ist alles, was du hast, und die Zahl wird kleiner, während du sie ansiehst. Der Anzug hält das für Transparenz.

~ remember("ANZUG-GEPRUEFT")

* {knows("TECHNIK")} [Die Rohrführung nachziehen]() Du kennst diese Anzüge. Die Leitung hinter dem linken Ventil sitzt ab Werk zu locker, und ab Werk heißt: seit dem Aufschlag erst recht. Zwei Handgriffe, ein Leck weniger.
  ~ air = min(air + 10, air_max)
* [Aufstehen](#site)
  ~ location = place("crash")
---
Mehr gibt der Anzug nicht her. Was er noch kann, ist zählen.

~ location = place("crash")
-> site

# Das Ticken {#ticken}

Du fragst weiter, und während ARIS aufzählt, hörst du es: unter ihrer Stimme ein Ticken, langsam, regelmäßig, nicht vom Anzug. "Wiederhole die Frage", sagt ARIS. Du fragst nach dem Ticken. "Ich empfange kein Ticken", sagt ARIS, und das Ticken tickt weiter.

~ remember("TICKEN")

* [Aufstehen](#site)
  ~ location = place("crash")

# Zurück an der Absturzstelle {#arrival}

Die Stelle, an der du aufgewacht bist. Der Abdruck deines Anzugs liegt noch im Geröll, ordentlich wie ein Beweisfoto. Es ist seltsam, den eigenen Umriss zu besuchen.

{kurz_weg: Du warst eine Weile fort, und der Ort hat es nicht bemerkt.}

-> site

# Die Absturzstelle {#site}

Die Nachtseite. Kein Horizont, an dem Licht steht, nur Grade von Schwarz. Nach einer Seite fällt das Gelände zum Wrackfeld ab, wo etwas in Abständen aufglimmt, das nicht brennen sollte. Nach der anderen steigt der Grat auf, eine Kante vor dem Sternenfeld. Dazwischen: du, ein Anzug und eine Stimme im Funk.

{is_dark: Es ist dunkel, und laut ARIS bleibt es das noch eine Weile. Sie nennt eine Zahl, die du gleich wieder vergisst.|Am Rand der Ebene steht ein Streifen Grau. ARIS nennt es Morgen. Du würdest es Zumutung nennen, aber es ist immerhin eine Richtung.}
{kurz_weg: Du hast eine Weile stillgestanden. Der Anzug hat mitgezählt.}
{lang_weg: Du hast sehr lange stillgestanden. Der Planet hat sich in der Zeit nicht bewegt, jedenfalls nicht sichtbar, und das beunruhigt dich mehr, als es sollte.}

* [Die Trümmer durchsuchen](#debris)
* {knows("NAVIGATION")} [Die Sterne lesen](#sky)
* [Aufbrechen](#depart)
* {knows("MORGEN")} [Warten, bis es hell wird](#ende.dunkel)
* {knows("GESTAENDNIS")} [ARIS abschalten](#ende.abschalten)
* [Rasten](#rest)

# Die Trümmer {#debris}

Ein Streufeld aus Blech, das mal Rumpfsektion C war. Zwischen den Platten liegt eine Brechstange, so selbstverständlich, als hätte jemand sie für dich abgelegt. Du nimmst sie. Auf einem Planeten ohne Türen wirkt das übertrieben, aber Türen haben die Angewohnheit, sich zu finden.

~ take("brechstange")

* {knows("TECHNIK")} [Genauer hinsehen]() Du kennst die Packlogik der Kestrel: Wo Sektion C liegt, liegt auch ihr Notfallschrank. Er liegt zehn Meter weiter, aufgeplatzt, und der Notfallbeutel darin ist heil geblieben.
  ~ take("medikit")
  ~ time = time + 10
* [Zurück](#site)
---
Mehr gibt das Blech nicht her, nur Kanten und deinen eigenen Atem.

-> site

# Die Sterne {#sky}

Du legst den Kopf in den Nacken und liest, was da steht. Die Sternbilder sind fremd, aber Mechanik ist Mechanik: Aus dem Streufeld und dem Riss in deiner Scheibe rechnest du den Eintrittswinkel zurück. Er ist flach. Er ist sauber. Niemand stürzt so ab — so setzt man auf. Die Kestrel hat diesen Planeten nicht getroffen. Sie hat ihn angesteuert.

~ remember("BAHN")
~ time = time + 10

* [Zurück](#site)

# Rasten {#rest}

Du setzt dich mit dem Rücken an ein Stück Rumpf und tust eine Weile nichts. Der Anzug wird ruhiger, der Puls auch. ARIS schweigt, was du ihr hoch anrechnest, bis dir einfällt, dass sie vermutlich trotzdem zuhört.

~ time = time + 20
~ stamina = min(stamina + 3, stamina_max)

+ [Weiter](#site)

# Aufbruch {#depart}

Zwei Richtungen, die einen Namen haben: das Wrackfeld unten in der Ebene, der Grat über dir. Eine dritte gäbe es, wenn du wüsstest, wohin. ARIS nennt Entfernungen in Minuten, als wären es Preise.

* [Zum Wrackfeld](#wreck.arrival)
  ~ location = place("wreck")
  ~ time = time + 20
* [Zum Grat](#ridge.arrival)
  ~ location = place("ridge")
  ~ time = time + 30
* {knows("SENKE")} [In die Senke](#basin.arrival)
  ~ location = place("basin")
  ~ time = time + 30
+ [Doch noch hierbleiben](#site) Du bleibst. Der Anzug zählt weiter.
