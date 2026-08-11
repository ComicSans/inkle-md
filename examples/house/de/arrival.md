# Die Landstraße {#road}

{visits(road) == 1: Der Wagen ist liegengeblieben, wie Wagen es tun: ohne Vorwarnung, im Regen, achtzehn Meilen hinter der letzten Ortschaft mit einem Namen. Der Motor gibt ein Geräusch von sich, das keinerlei Hoffnung ausdrückt.|Der Regen trommelt aufs Wagendach und ist ausdauernder, als deine Geduld.}

{&Irgendwo hinter dir bellt etwas.|Das Bellen ist näher als eben.|Jetzt bellt nichts mehr, was du für keine Verbesserung hältst.}

Vor dir ein schmiedeeisernes Tor, dahinter ein Haus, in dem hinter genau einem Fenster Licht
brennt. Auf dem Torbogen steht ein Name, den der Efeu verdeckt.

* {knows("MECHANIKER")} [Noch einmal unter die Haube sehen](#road) Du siehst nach, mit der Routine von tausend Pannen. Verteiler trocken, Zündung tot — aber tot auf eine Art, die dir neu ist. Ein Wagen, der nicht anspringen will, klingt anders als einer, der nicht anspringen kann.
  ~ fear = fear + 1
* [Läuten](#gate)
* [An der Mauer entlanggehen](#wall) Man muss ja nicht gleich klingeln.

# Am Tor {#gate}

Die Glocke klingt tiefer, als du erwartet hast.

Danach passiert eine Weile nichts, was dir Zeit gibt, über deine
Situation der letzten Stunde nachzudenken. Du bist mit der Lage nicht zufrieden.

{Dann öffnet sich das Tor. Von selbst. Sehr langsam, mit dem Geräusch, das Türen in Geschichten machen, die schlecht ausgehen.|Das Tor steht offen, wie du es verlassen hast. }

* [Hindurchgehen](#drive)
+ [Es dir anders überlegen und die Mauer probieren](#wall)

# An der Mauer {#wall}

Mannshoch, Risse in Mörtel, eine Bruchstelle vom letzten Frost. Abweisend.
Der Hausherr hält offenbar wenig von unangemeldeten Gästen, was ihn dir
beinahe sympathisch macht.

+ [Hinüberklettern]()
  { test("skill") }
    Du kommst sauber über die Mauer und landest im Gras.
    ~ remember("UEBER-DIE-MAUER")
    -> drive
  { else }
    Eine Scherbe schneidet dir den Handrücken auf. Du stellst fest, dass du seit
    Jahren nicht mehr geklettert bist und dass das gute Gründe hatte.
    ~ stamina = stamina - 2
    ~ fear = fear + 1
+ [Zurück zum Tor](#gate)
---
Der Regen wird stärker, als wollte er dich zur Tür drängen.

-> gate

# Die Auffahrt {#drive}

Kies, Pfützen, und ein Kettenhund, der ohne vorheriges Bellen aus dem Dunkeln
kommt, einfach auftauchte und dich nun begutachtet. 
Die Kette, stellst du beim Näherkommen fest, hängt an nichts.

~ fear = fear + 1

* [Stehenbleiben und ihm den Handrücken hinhalten]()
  { test_luck() }
    Er schnuppert, wägt ab und entscheidet sich gegen die Berufsehre. Als du
    weitergehst, geht er mit, als würde er zu dir gehören.
    ~ remember("HUND-FREUND")
    ~ calm(1)
    -> door
  { else }
    Er entscheidet sich für die Berufsehre.
* [Gar nicht erst verhandeln](#dogfight)
---
-> dogfight

## Der Kettenhund {#dogfight}

!combat hound
  win  -> door
  flee [Rennen](#door) Du erreichst die Tür mit dem Atem eines Ertrinkenden und der Würde von jemandem, der eben um sein Leben gerannt ist.

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

Du denkst nach. Das Ergebnis lautet, dass du im Regen stehst, nachdenkst und keine Optionen hast.

* [Jetzt klopfen](#hall)

# Die Halle {#hall}

Die Tür geht auf, bevor deine Hand den Klopfer erreicht. Dahinter ein Butler,
der aussieht, als hätte er auf genau dich gewartet, und zwar länger, als es
höflich wäre.

{knows("AUF-DER-TREPPE"): Hinter ihm liegt die Treppe, die du durch das Seitenfenster gesehen hast. Die dritte Stufe, auf der eben noch jemand saß, ist leer.}

{knows("HUND-FREUND"): Der Butler sieht den Hund an. Der Hund sieht den Butler an. Dann sieht der Butler wieder dich an, als sei da nie ein Hund gewesen.}

"Der Herr des Hauses", sagt er schnarrend, "bittet zu Tisch. Treten Sie ein."
Er sagt es nicht wie eine Einladung, sondern wie ein Nachrichtensprecher.

* [Ihm folgen](#dinner)
* [Nach dem Weg zum nächsten Telefon fragen](#servant) "Die Leitung", sagt er, "ist seit dem Krieg tot."

# Der Butler {#servant}

Du fragst weiter: nach einem Gasthof, einer Werkstatt, dem nächsten Ort mit
Lichtern. Er wartet, bis du fertig bist, und wartet dann noch einen Moment
länger, damit du merkst, dass er gewartet hat.

"Das Haus steht Ihnen offen", sagt er. "Bis auf den Keller. Der Keller steht
niemandem offen."

Ansonsten ignoriert er deine Fragen.

~ remember("KELLER-VERBOTEN")

* [Zu Tisch gehen](#dinner)
+ [Fragen, was im Keller ist]() "Nichts", sagt er, mit einer Betonung auf dem Nichts, die dir noch eine Weile nachgehen wird.
  ~ fear = fear + 1
+ [Kehrtmachen, zur Haustür]() Du drehst dich um. Der Butler steht bereits zwischen dir und der Tür, ohne dass du Schritte gehört hättest. "Dort entlang", sagt er und deutet von der Tür weg. Es klingt nicht unfreundlich. Es klingt endgültig.
  ~ fear = fear + 1
---
Er hält dir die Tür zum Speisezimmer auf, und zwar so lange, dass Abwarten
keine Möglichkeit mehr ist.

-> dinner

# Das Abendessen {#dinner}

Ein Tisch für zwölf, gedeckt für zwei. Am anderen Ende sitzt der Hausherr,
lächelt und schenkt dir ein, ohne zu fragen. Der Wein ist dunkler, als Wein
sein müsste.

Er stellt Fragen über deine Reise, deine Familie, ob dich jemand erwartet. Bei
der letzten Frage hört er besonders aufmerksam zu.

* [Wahrheitsgemäß antworten, dass dich niemand erwartet]() Er nickt, langsam und zufrieden, und schenkt nach.
  ~ remember("NIEMAND-WARTET")
* [Einen Bruder erfinden, der um Mitternacht anruft]() Sein Lächeln bleibt, wo es ist, aber es steht nun etwas anders darin.
  ~ remember("DER-BRUDER")
---
Dann hebt er sein Glas und wartet. Es ist die Sorte Warten, bei der einem
auffällt, dass er selbst noch keinen Schluck getrunken hat.

* [Austrinken](#drugged)
* {knows("VERTRETER")} [Loben, anstoßen, abstellen — und dabei keinen Schluck nehmen]() Zwanzig Jahre Kundschaft: Du lobst die Farbe, das Bukett, den Abgang, und stellst das Glas dabei so oft ab und wieder hin, dass am Ende niemand mehr weiß, wie voll es je gewesen ist. Der älteste Trick im Koffer.
  ~ remember("NUECHTERN")
* [Beim Anstoßen das Glas kippen und den Wein in die Aspidistra gießen]()
  { test_luck() }
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

## Der Wein {#drugged}

Der Wein ist wirklich ausgezeichnet, und das zweite Glas ist besser als das
erste. Das dritte schenkt er ein, ohne dass du dich an das zweite erinnern
kannst. Der Kronleuchter hängt schief. Dann der ganze Raum. Das
Letzte, was du siehst, ist der Hausherr, der aufsteht und dabei nicht zu dir
herübersieht. Warum sieht er nicht her, denkst du noch. Man sieht doch nach —
man sieht doch —

~ fear = fear + 1
~ remember("BETAEUBT")

-> house.tower

# fn calm(n)

~ fear = max(fear - n, 0)
~ return fear
