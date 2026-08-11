# Die Landstraße {#road}

Der Wagen ist stehengeblieben, wie Wagen es tun: ohne Vorwarnung, im Regen,
achtzehn Meilen hinter der letzten Ortschaft mit einem Namen. Der Motor gibt
ein Geräusch von sich, das keinerlei Hoffnung ausdrückt.

{&Irgendwo hinter dir bellt etwas.|Das Bellen ist näher als eben.|Jetzt bellt nichts mehr, was du für keine Verbesserung hältst.}

Vor dir ein schmiedeeisernes Tor, dahinter ein Haus, in dem genau ein Fenster
brennt. Auf dem Torbogen steht ein Name, den der Efeu freundlicherweise
verdeckt.

* [Läuten](#gate)
* [An der Mauer entlanggehen](#wall) Man muss ja nicht gleich klingeln.

# Am Tor {#gate}

Die Glocke klingt tiefer, als ein Gegenstand dieser Größe klingen dürfte.
Danach passiert eine Weile nichts, was dir Zeit gibt, über deine
Entscheidungen der letzten Stunde nachzudenken.

{Dann öffnet sich das Tor. Von selbst. Sehr langsam, mit dem Geräusch, das Türen in Geschichten machen, die schlecht ausgehen.|Das Tor steht offen, wie du es verlassen hast. Es hat es nicht eilig, denkst du. Es hat ja dich.}

{ visits(gate) == 1 }
  ~ fear = fear + 1

* [Hindurchgehen](#drive)
+ [Es dir anders überlegen und die Mauer probieren](#wall)

# An der Mauer {#wall}

Mannshoch, oben Glasscherben in Mörtel, eine Bruchstelle vom letzten Frost.
Der Hausherr hält offenbar wenig von unangemeldeten Gästen, was ihn dir
beinahe sympathisch macht.

* [Hinüberklettern]()
  { test("skill") }
    Du kommst sauber über die Bruchstelle und landest im Gras, das nasser ist
    als alles, was du bisher kanntest.
    ~ remember("UEBER-DIE-MAUER")
    -> drive
  { else }
    Eine Scherbe zieht dir den Handrücken auf. Du stellst fest, dass du seit
    Jahren nicht mehr geklettert bist, und dass das gute Gründe hatte.
    ~ stamina = stamina - 2
    ~ fear = fear + 1
* [Zurück zum Tor](#gate)
---
Der Regen wird stärker, als wollte er dich zu etwas drängen.

-> gate

# Die Auffahrt {#drive}

Kies, Pfützen, und ein Kettenhund, der ohne vorheriges Bellen aus dem Dunkeln
kommt. Die Kette, stellst du beim Näherkommen fest, hängt an nichts.

~ fear = fear + 1

* [Stehenbleiben und ihm den Handrücken hinhalten]()
  { test("luck") }
    Er schnuppert, wägt ab und entscheidet sich gegen die Berufsehre. Als du
    weitergehst, geht er mit, als hätte er dich hierher bestellt.
    ~ remember("HUND-FREUND")
    ~ fear = max(fear - 1, 0)
    -> door
  { else }
    Er entscheidet sich für die Berufsehre.
* [Gar nicht erst verhandeln](#dogfight)
---
-> dogfight

# Der Kettenhund {#dogfight}

!combat hound
  win  -> door
  flee [Rennen](#door) Du erreichst die Tür mit dem Atem eines Ertrinkenden und der Würde von jemandem, der vor einem Hund gerannt ist.

# Vor der Tür {#door}

{knows("UEBER-DIE-MAUER"): Von hier siehst du, dass das Tor die ganze Zeit offen stand. Du beschließt, das niemandem zu erzählen.|Hinter dir fällt das Tor ins Schloss, ohne dass jemand es angefasst hätte.}

{knows("HUND-FREUND"): Der Hund setzt sich neben den Türklopfer, als gehöre er zum Personal, und sieht dich an, als wüsste er mehr über dieses Haus, als er bellen kann.}

Der Türklopfer ist ein Messinggesicht mit einem Ausdruck, den man wohlwollend
als abwartend bezeichnen könnte.

* [Klopfen](#hall)
* {has("lantern")} [Vorher durch das Seitenfenster leuchten](#window)

# Das Seitenfenster {#window}

Im Lichtkegel: eine Halle, eine Treppe, und auf der dritten Stufe sitzt
jemand, der sich nicht bewegt, solange du hinsiehst. Du siehst eine Weile hin.
Es bleibt dabei.

Erst als der Lichtkegel zu zittern beginnt, merkst du, dass deine Hand es
tut. Deine ANGST steigt.

~ fear = fear + 1
~ remember("AUF-DER-TREPPE")

* [Trotzdem klopfen](#hall)
+ [Die Laterne löschen und kurz nachdenken](#wait)

# Nachdenken im Regen {#wait}

Du denkst nach. Das Ergebnis lautet, dass du im Regen stehst und nachdenkst.

~ fear = fear + 1

* [Jetzt klopfen](#hall)

# Die Halle {#hall}

Die Tür geht auf, bevor deine Hand den Klopfer erreicht. Dahinter ein Butler,
der aussieht, als hätte er auf genau dich gewartet, und zwar länger, als es
höflich wäre.

{knows("AUF-DER-TREPPE"): Hinter ihm liegt die Treppe, die du durch das Seitenfenster gesehen hast. Die dritte Stufe, auf der eben noch jemand saß, ist leer.}

{knows("HUND-FREUND"): Der Butler sieht den Hund an. Der Hund sieht den Butler an. Dann sieht der Butler wieder dich an, als sei da nie ein Hund gewesen.}

"Der Herr des Hauses", sagt er, "bittet zu Tisch. Das Gedeck steht bereits."
Er sagt es nicht wie eine Einladung, sondern wie eine Wettervorhersage.

* [Ihm folgen](#dinner)
* [Nach dem Weg zum nächsten Telefon fragen](#servant) "Die Leitung", sagt er, "ist seit dem Krieg tot. Es war ein kurzer Krieg, hier draußen."

# Der Butler {#servant}

Du fragst weiter: nach einem Gasthof, einer Werkstatt, dem nächsten Ort mit
Lichtern. Er wartet, bis du fertig bist, und wartet dann noch einen Moment
länger, damit du merkst, dass er gewartet hat.

"Das Haus steht Ihnen offen", sagt er. "Bis auf den Keller. Der Keller steht
niemandem offen."

~ fear = fear + 1
~ remember("KELLER-VERBOTEN")

* [Zu Tisch gehen](#dinner)
+ [Fragen, was im Keller ist]() "Nichts", sagt er, mit einer Betonung auf dem Nichts, die dir noch eine Weile nachgehen wird.
  ~ fear = fear + 1
---
Er hält dir die Tür zum Speisezimmer auf, und zwar so lange, dass Bleiben
keine Möglichkeit mehr ist.

-> dinner

# Das Abendessen {#dinner}

Ein Tisch für zwölf, gedeckt für zwei. Am anderen Ende sitzt der Hausherr,
lächelt und schenkt dir ein, ohne zu fragen. Der Wein ist dunkler, als Wein
sein müsste.

Er stellt Fragen über deine Reise, deine Familie, ob dich jemand erwartet. Bei
der letzten Frage hört er besonders aufmerksam zu.

* [Wahrheitsgemäß antworten, dass dich niemand erwartet]() Er nickt, langsam und zufrieden, und schenkt nach.
  ~ fear = fear + 1
  ~ remember("NIEMAND-WARTET")
* [Einen Bruder erfinden, der um Mitternacht anruft]() Sein Lächeln bleibt, wo es ist, aber es steht nun etwas anders darin.
  ~ remember("DER-BRUDER")
---
Dann hebt er sein Glas und wartet. Es ist die Sorte Warten, bei der einem
auffällt, dass er selbst noch keinen Schluck getrunken hat.

* [Austrinken](#drugged)
* [Beim Anstoßen das Glas kippen und den Wein in die Aspidistra gießen]()
  { test("luck") }
    Die Pflanze nimmt es hin wie eine, die schon anderes geschluckt hat. Der
    Hausherr bemerkt nichts. Der Butler hat nichts gesehen. Da bist du fast
    sicher. Fast.
    ~ remember("NUECHTERN")
    ~ remember("ASPIDISTRA")
  { else }
    Ein Blatt der Aspidistra färbt sich noch am Tisch braun. Der Hausherr
    sieht es, sieht dich an und hebt sein Glas ein zweites Mal, diesmal ohne
    zu lächeln.
    ~ remember("NUECHTERN")
    ~ remember("ASPIDISTRA")
    ~ fear = fear + 1
* [Ablehnen und vom empfindlichen Magen sprechen]() Der Butler räumt dein Glas mit dem Gesicht eines Mannes ab, dessen Abend soeben komplizierter geworden ist.
  ~ remember("NUECHTERN")
  ~ fear = fear + 1
---
Danach zeigt der Butler dir dein Zimmer. Die Kerze, die er dir mitgibt, ist
kürzer als der Weg dorthin.

-> house.room

# Der Wein {#drugged}

Der Wein ist wirklich ausgezeichnet, und das zweite Glas ist besser als das
erste. Das dritte schenkt er ein, ohne dass du dich an das zweite erinnern
kannst. Der Kronleuchter hängt schief. Dann hängt der ganze Raum schief. Das
Letzte, was du siehst, ist der Hausherr, der aufsteht und dabei nicht zu dir
herübersieht. Warum sieht er nicht her, denkst du noch. Man sieht doch nach —
man sieht doch —

~ fear = fear + 1
~ remember("BETAEUBT")

-> house.tower
