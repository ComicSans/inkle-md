# Auf der Sandbank {#ankunft}

~ im_keller = 0

{!Das Boot dreht ab, kaum dass dein Seesack im Sand liegt. "Morgen früh",
kommt es vom Ruder herüber, "wenn die See uns lässt!" Dann ist nur noch
der Motor zu hören, und dann auch der nicht mehr.|Die kleine vorgelagerte Insel mit der Sandbank, kaum größer
als ein Hof, steinig, felsig abfallende Seiten hin zum Meer, die Wellen branden gegen Stein. In der Mitte der Turm und daneben, geduckt, das Maschinenhaus.
Ringsum arbeitet die See.}

![Ein gedrungener Leuchtturm auf einer Sandbank, das Wasser bis an die Tür.](turm.png)

{ anzug >= 3 }
  Der Orkan steht. Die Gischt geht waagerecht über die Insel, und du gehst
  gebückt, oder du gehst gar nicht. Was hier draußen keinen Halt hat,
  gehört jetzt der See: Es gibt nur noch Wege, keine Orte mehr.
{ anzug >= 2 or wetter >= 3 }
  Die Wolkenbank hat den halben Himmel, die See läuft in langen Reihen
  gegen die Bank. Der Wind lehnt sich gegen dich, wenn du stehen bleibst.
{ anzug >= 1 or wetter >= 2 }
  Das Licht geht, und die Wolkenbank ist gewachsen. Der Wind hat gedreht
  und zupft an deiner Jacke.
{ else }
  Der Abend ist still, die See liegt flach um die Bank. Im Westen steht
  die Wolkenbank, noch weit, noch niedrig. Wer hier arbeitet, arbeitet
  gegen sie.

{lampe: Über dir läuft der Strahl seine Runden. Die Nacht scheint sicher.|
Oben siehst du die große Lampe: dunkel. Sie ist dein Auftrag: Wenn der Sturm kommt, muss sie brennen.}

+ [Durch die Tür in den Arbeitsraum](#arbeitsraum)
  ~ zeit += 5
+ [Hinüber zum Maschinenhaus](#zum_keller)
+ [Zum Anleger hinunter](#anleger)
  ~ zeit += 5
+ [Zu den Kiefern an der Nordkante](#windbruch)
  ~ zeit += 5
* {not sturm} [Einmal um die ganze Bank gehen](#ankunft)
  Einmal außen herum, den Spülsaum entlang, ein kurzer Spaziergang. In weniger 
  als einer halben Stunde hast du alles gesehen. Die Bank hat vier Seiten und auf 
  dreien davon ist die See dabei, ihre Grenzen zu testen.
  ~ zeit += 25

# Der Arbeitsraum {#arbeitsraum}

~ im_keller = 0

Ein Tisch, ein Bett, das Radio auf dem Bord, ein Fenster zur Wetterseite.
Im Dienstbuch auf dem Tisch endet der letzte Eintrag vor drei Wochen,
mitten im Satz. Am Haken neben der Tür {has("laterne"): hängt nur noch
der leere Nagel der Öl-Laterne|hängt eine Öl-Laterne}.

{ anzug >= 3 }
  Das Haus ist voller Lärm, das Mauerwerk dröhnt, die Scheibe steht unter
  Wasser. Du hörst das Radio nicht mehr, auch wenn es liefe.
{ anzug >= 2 }
  Der Ton im Mauerwerk ist gestiegen, der Rahmen schlägt jetzt bei jeder
  Bö an. Regen kommt in Schauern gegen die Scheibe, wie geworfen.
{ anzug >= 1 }
  Der Wind hat einen Ton im Mauerwerk gefunden, tief und gleichmäßig. Der
  Fensterrahmen zur Wetterseite arbeitet leise.
{ else }
  Es ist still genug, dass du unter allem die See hörst, gleichmäßig wie
  ein Atem.

{netz == 1: Unter der Decke brennt die Funzel, als wäre nichts. Das
Seekabel vom Festland tut seine Arbeit noch.}
{netz == 0 and generator == 0: Die Deckenlampe ist tot, das Seekabel
gibt nichts mehr her.}
{generator == 1: Unter dem Boden des Maschinenhauses brummt der
Generator und die Funzel an der Decke leuchtet wieder.}

{schalter == 1 and (netz == 1 or generator == 1): Vor dem Fenster
wandert alle paar Sekunden ein Schein über die Bank. Die große Lampe tut
ihre Arbeit.}
{schalter == 1 and netz == 0 and generator == 0: Vor dem Fenster fehlt
der Schein. Oben liegt der Hebel auf EIN - nur das bedeutet nichts,
solange kein Strom kommt.}

{ knows("FUNK") and zeit >= 90 and wasser >= 6 and lampe == 0 }
  Das Radio läuft auf Batterie und gibt Sturmwarnungen für die See aus.
{ knows("FUNK") and zeit >= 90 }
  Das Radio, neue Warnungen: Orkanböen bis in den Morgen.
{ knows("FUNK") and zeit >= 60 }
  Die Funkuhr sagt halb elf. Gleich der Orkan auf voller Stärke.
{ knows("FUNK") and zeit >= 30 }
  Abend. Bis elf bleibt Zeit, sich auf den Sturm vorzubereiten.
{ knows("FUNK") }
  Die Funkuhr sagt halb zehn.

* {not knows("FUNK")} [Das Radio einschalten](#arbeitsraum)
  Der Seewetterdienst, mitten im Satz: schweres Sturmtief, Orkanböen
  gegen elf, abziehend erst gegen Morgen.
  ~ zeit += 5
  ~ remember("FUNK")
* {not has("laterne") and traglast() <= 1} [Die Öl-Laterne vom Haken nehmen](#arbeitsraum)
  Die Lampe wirkt robust, der Docht ist sauber geschnitten - nur schwappt
  nichts, wenn man sie kippt.
  ~ zeit += 5
  ~ take("laterne")
+ [Die Wendeltreppe hinauf zur Lampenkammer](#kammer)
  {dunkel and not handlicht(): Sechsundachtzig Stufen im Finstern, die
  Hand am Geländer, langsam, eine Stufe nach der nächsten.|
  Sechsundachtzig Stufen. Du zählst sie, während du hinaufsteigst.}
  ~ zeit += 10 + (dunkel and not handlicht()) * 10
+ [Hinüber zum Keller des Maschinenhauses](#zum_keller)
+ [Vor die Tür treten](#vortreten)
+ [Sich aufs Bett legen, nur einen Augenblick](#schlaf)
* [Im Dienstbuch die alten Einträge lesen](#arbeitsraum)
  Drei Wärterjahre in einer Handschrift, die mit den Wintern krakeliger
  wird: Pegelstände, Schiffe, einmal ein Seehund auf der Bank. Man
  liest sich fest, wie man sich festliest, wenn der Abend lang ist und
  das Haus einem noch fremd. Der letzte Satz hört mitten im Wort auf,
  niemand schrieb ihn zu Ende.
  ~ zeit += 20
+ [Eine Weile am Fenster stehen](#arbeitsraum)
  { anzug >= 3 }
    Am Fenster ist nichts mehr zu sehen als Wasser auf Glas. Was du
    erfährst, erfährst du mit den Ohren, und es ist genug.
  { anzug >= 2 }
    Eine Viertelstunde am Fenster, und du siehst die Brandung wachsen.
    Die Wolkenbank ist keine Bank mehr, sie ist der Himmel.
  { anzug >= 1 }
    Du siehst dem Licht beim Gehen zu. Die Wolkenbank ist näher, und auf
    der See stehen die ersten weißen Kämme.
  { else }
    Die See ist ruhig, die Wolkenbank im Westen liegt da, wo sie vorhin
    lag - fast.
  ~ zeit += 15

# Vor der Tür {#vortreten}

~ zeit += 5

{ not sturm }
  Der Abend steht noch vor der Tür, er hat Zeit. Du trittst
  hinaus auf die Insel.
  -> ankunft
{ else }
  Du bekommst die Tür einen Spalt weit auf, und die Nacht schlägt sie 
  dir wieder zu. Da draußen ist kein Ort mehr, an dem man verweilen möchte;
  es gibt nur noch die zwanzig Schritte an der Mauer entlang zur Wettertür, für
  den, der dort etwas Dringendes zu erledigen hat. Du drückst die Tür wieder ins
  Schloss.
  -> arbeitsraum

# Die Lampenkammer {#kammer}

~ im_keller = 0

Rundum Glas, in der Mitte das Leuchtwerk: die große Lampe in ihrem
Rund, das Getriebe, der Hebel an der grauen Schaltkiste.

{lampe: Die Lampe brennt. Der Strahl geht hinaus über die See und kommt
im Takt zurück, und das Rundglas gibt Wärme in den Raum.}
{schalter == 0 and (netz == 1 or generator == 1): Die Lampe ist kalt,
aber die Schiene hat Spannung.}
{schalter == 1 and netz == 0 and generator == 0: Die Lampe ist kalt.
Der Hebel liegt auf EIN, und nichts geschieht, sooft du auch hinsiehst.}
{schalter == 0 and netz == 0 and generator == 0: Die Lampe ist kalt,
und der Hebel ist im Augenblick nur ein Stück Eisen: Die Schiene ist
tot.}

{ anzug >= 3 }
  Das Glas ist blind von Gischt, der Turm arbeitet unter dir wie ein
  Schiff. Von der Insel siehst du nichts mehr - der Orkan hat sie sich
  genommen.
{ anzug >= 2 }
  Der Turm nimmt die Böen auf, du spürst sie hier oben als Zittern im
  Boden. Unten liegt die Bank schon halb unter Weiß.
{ anzug >= 1 }
  Rundum wird es grau, unten frisst sich die erste Brandung an der Bank
  fest. Die Wolkenbank im Westen hat Höhe bekommen.
{ else }
  Hinter dem Glas liegt die Insel klein und ordentlich unter dir: der
  Anleger, die drei Kiefern auf der Düne, geduckt das Maschinenhaus, die
  stille See. Nur im Westen steht die Wolkenbank und wartet.

+ {schalter == 0} [Den Hebel auf EIN legen](#kammer)
  {netz == 1 or generator == 1: Ein Schlag, ein Summen, dann steht der
  Strahl auf und läuft hinaus über die See. Die einfachste Arbeit des
  ganzen Abends.|Der Hebel fällt ins Leere. Kein Funke, kein Summen. 
  Der Strom fehlt.}
  ~ zeit += 5
  ~ schalter = 1
+ [Die Wendeltreppe hinab](#arbeitsraum)
  {dunkel and not handlicht(): Hinab dauert im Finstern doppelt so lang wie
  hinauf, wenn man sicher unten ankommen will.}
  ~ zeit += 10 + (dunkel and not handlicht()) * 10
+ [Über die Galerie zur Außenleiter](#leiter)
+ {generator == 1 and lampe == 1} [Bei der Lampe wachen, bis der Morgen kommt](#morgen)

# Der Weg zum Keller {#zum_keller}

{ wasser >= 6 }
  ~ zeit += 10
  Die Wettertür steht einen Fingerbreit offen und bewegt sich nicht
  mehr, wie du dich ihr auch entgegenstemmst. Dahinter steht das Wasser und
  hält dagegen. Was noch dort unten liegt, liegt jetzt bei ihr. Zurück
  bleibt nur der Turm.
  -> arbeitsraum
{ not sturm }
  ~ zeit += 5
  Zwanzig Schritte hinüber zum Maschinenhaus, durch die schmale Wettertür
  auf der Leeseite, die kurze Stiege hinab in den Keller. {netz == 1:
  Unten brennt Licht; das Seekabel reicht bis in den Keller.}
  -> keller
{ else }
  ~ zeit += 5 + (not handlicht()) * 5
  Das große Tor auf der Seeseite hat die See längst verkeilt, also die
  zwanzig Schritte auf der Leeseite, die Gischt im Rücken. Die Wettertür
  gibt nach, und du fällst mehr in das Maschinenhaus, als dass du es
  betrittst. {handlicht(): Der Schein der Öl-Laterne reicht gerade für
  die eigenen Füße, und das genügt.|Du tastest die Strecke im Finstern
  ab, eine Hand an der Mauer, bis die Klinke kommt.}
  -> keller

# Der Maschinenkeller {#keller}

~ im_keller = 1

{ netz == 1 or generator == 1 }
  Unter der Decke brennt eine Birne hinter Drahtglas und macht aus dem
  Keller einen Arbeits- und Lagerraum: Auf dem Podest in der Mitte steht
  der Generator, daneben die Werkbank, das Ölfass an der Wand, im Regal
  der Benzinkanister. Seeseitig sitzen zwei schwere Schotttüren
  hintereinander, mit einem kurzen Gang dazwischen - dadurch kommen bei
  Hochwasser die Vorratskisten vom Boot herein, statt über die Stiege.
{ handlicht() }
  Der Schein der Öl-Laterne holt die Dinge einzeln aus dem Dunkel: das
  Podest mit dem Generator, die Werkbank, das Ölfass, im Regal den
  Kanister. Zuletzt, seeseitig, die beiden Schotttüren der Kistenschleuse,
  eine hinter der anderen.
{ else }
  Hier unten ist die Nacht vollständig. Was der Keller hat, zeigt er deinen
  Händen, nicht deinen Augen: das Podest, die Werkbank, irgendwo das Regal.

Was die See vom Keller hält, steht am Boden:

{ wasser >= 5 }
  Das Wasser steht dir über die Knie, und oben an der Stiege drückt die
  Wettertür schon schwer gegen seinen Stand. Viel fehlt nicht, dann geht
  sie nicht mehr auf - nach keiner Seite.
{ wasser >= 3 }
  Kniehoch steht die See im Keller und zerrt bei jedem Schritt. Das
  Unterste der Regale ist schon nass.
{ wasser >= 1 }
  Über den Schuhen steht das Wasser, lautlos, ohne Eile. Es hat die See
  hinter sich.
{ else }
  Trocken. Sicher. Der Raum wirkt wie ein Bunker auf dich.

* {has("laterne") and laterne_voll == 0 and wasser <= 2} [Die Laterne am Ölfass füllen](#keller)
  Der Hahn sitzt tief am Fass. Du füllst den Tank der Öl-Laterne,
  drehst den Docht nach, ein Streichholz: ein kleiner, tragbarer Kreis
  aus Licht, und die Nacht im Haus hat ihren Gegner.
  ~ zeit += 5 + (dunkel and not handlicht()) * 5
  ~ laterne_voll = 1
* {bereit == 0 and wasser <= 2} [Schlüssel, Dichtband und Kanister aufs Podest legen](#keller)
  Du sammelst zusammen, was der Generator brauchen wird, ehe eine Suche
  daraus wird: den Werkzeugschlüssel, das Dichtband, den vollen
  Benzinkanister. Alles hinauf aufs Podest, eine Handbreit höher als
  jede Pfütze, die hier je gestanden hat. Wer den Kanister unten stehen
  lässt, sucht ihn später im Dunkeln unter Wasser.
  ~ zeit += 10 + (dunkel and not handlicht()) * 5
  ~ drop("schluessel")
  ~ drop("band")
  ~ bereit = 1
* {schott == 0} [Die Schotttüren seeseitig zudrehen](#keller)
  Du gehst durch den kurzen Gang, stemmst dich in das Rad der äußeren Tür
  und drehst sie zu, dann die innere. Dicht waren sie nie - aber die See
  muss sich jetzt durch zwei schlechte Dichtungen arbeiten statt durch
  eine offene Tür. Das hält sie nicht auf. Es kauft dir Zeit.
  ~ zeit += 10 + (dunkel and not handlicht()) * 5
  ~ schott = 1
* {bereit == 0 and gerichtet == 0 and wasser <= 2 and traglast() == 0} [Werkzeugschlüssel und Dichtband einstecken](#keller)
  Beides ist klein, der Schlüssel erstaunlich schwer. Deine beide Hände sind vergeben 
  - für die Öl-Laterne bleibt keine frei.
  ~ zeit += 5
  ~ take("schluessel")
  ~ take("band")
+ {gerichtet == 0 and (handlicht() or not dunkel) and (bereit == 1 or (has("schluessel") and has("band")))} [Die Leitung dichten, die Verschraubung nachziehen](#keller)
  Die Benzinleitung ist mürbe bis auf den Faden, die Verschraubung am
  Vergaser sitzt lose. Das alte Band herunter, das neue dreimal stramm
  herum, mit dem Daumen angerieben; dann der Schlüssel, eine halbe
  Umdrehung, bis es steht. Das ist Arbeit für Augen: das Band muss
  liegen, wo es liegen soll. {wasser >= 1: Du arbeitest mit Händen, die
  zwischendurch untertauchen müssen, und jeder Griff dauert doppelt.}
  ~ zeit += 15 + (wasser >= 1) * 5 + (wasser >= 3) * 5
  ~ gerichtet = 1
  ~ drop("schluessel")
  ~ drop("band")
+ {tank == 0 and bereit == 1 and netz == 0 and (handlicht() or not dunkel)} [Den Kanister in den Tank leeren](#keller)
  Der Kanister ist schwer, der Stutzen eng; das Benzin nimmt sich die
  Zeit, die es braucht, und will gesehen werden, wo es hinläuft. Dann
  ist der Tank voll bis an den Deckel.
  ~ zeit += 5 + (wasser >= 3) * 5 + (dunkel and not handlicht()) * 5
  ~ tank = 1
+ {generator == 0} [Den Generator anwerfen](#anwerfen)
+ [Den Keller verlassen](#aus_dem_keller)

# Der Anlasser {#anwerfen}

~ zeit += 5 + (dunkel and not handlicht()) * 5

Du legst den Dekompressionshebel um, fasst die Kurbel und wirfst sie
herum, einmal, zweimal.

{ netz == 1 }
  Er springt an, läuft ein paar Takte und bekommt dann wieder Ruhe,
  weil du ihn abstellst: Solange das Seekabel liefert, gibt es keinen
  Grund, das Benzin anzubrechen. Ein Probelauf war es trotzdem wert.
  {gerichtet == 0: Die Leitung hat dabei hörbar Luft gezogen, und an
  der Verschraubung ist Öl ausgetreten. So läuft er keine Stunde am
  Stück.|Die Leitung hält dicht; da wackelt nichts mehr.} {tank == 0:
  Und der Tank klingt hohl, wenn man ihn klopft - was drin ist, trägt
  keine Nacht.|Der Tank ist voll; darin liegt eine ganze Nacht.}
  -> keller
{ gerichtet == 1 and tank == 1 }
  ~ generator = 1
  Er springt an, hustet einmal und findet dann seinen Takt, rund und
  breitbeinig, ein Arbeitstier. Über dem Podest zittert die Birne und
  wird hell. {schalter == 1: Und oben, das weißt du, liegt ein Hebel
  auf EIN.|Der Turm hat wieder Strom.}
  -> keller
{ gerichtet == 0 and tank == 0 }
  Er springt an - und stirbt nach wenigen Takten. Die Leitung zieht
  hörbar Luft, die lose Verschraubung sabbert Öl aufs Podest, und der
  Tank klingt hohl, wenn man ihn klopft. Erst richten, dann füllen,
  dann noch einmal von vorn.
  -> keller
{ tank == 0 }
  Er springt an, nimmt kurz Fahrt auf und säuft dann ab. Der Tank
  klingt hohl bis an den Boden: Das war der letzte Schluck, und eine
  Nacht ist damit nicht bezahlt.
  -> keller
{ else }
  Er springt an und stirbt nach wenigen Takten: Die Leitung zieht Luft,
  die lose Verschraubung sabbert Öl aufs Podest. So hält er keine
  Viertelstunde durch, und die Nacht ist länger.
  -> keller

# Hinaus aus dem Keller {#aus_dem_keller}

~ zeit += 5

{ not sturm }
  Die Stiege hinauf, durch die Wettertür, über die Bank. Der Turm nimmt
  dich wieder auf.
  -> arbeitsraum
{ else }
  Durch die Wettertür in den Lärm, zwanzig Schritte an der Mauer
  entlang, die Klinke, das Schloss. Dann steht der Turm wieder um dich.
  -> arbeitsraum

# Die Außenleiter {#leiter}

Eisen, außen am Schaft, vom Salz rund gefressen. Sie spart den halben
Turm, und sie gehört dem Wind.

~ proben = sturm
~ proben += (nacht and lampe == 0 and not handlicht())
~ proben += (traglast() >= 2)
~ zeit += 10 + proben * 5

{ proben == 0 }
  Sprosse um Sprosse, mit Licht und freien Händen. Unten nimmst du dir
  vor, das bei Wind nicht noch einmal zu machen.
  -> leiterfuss
{ proben == 1 and test("geschick") }
  {sturm: Auf halber Höhe nimmt dir eine Bö das Gewicht von den Füßen.
  Du hältst dich, bis sie es zurückgibt.|Einmal greift die Hand ins
  Leere, aber der Fuß findet, was die Augen nicht sehen.}
  -> leiterfuss
{ proben == 2 and test("geschick") and test("geschick") }
  Zweimal hängt alles an einer Hand: einmal, als die Bö kommt, und
  einmal, als der Absatz von der nassen Sprosse kippt. Zweimal reicht
  es, eben noch. Unten musst du erst wieder zu Atem kommen.
  -> leiterfuss
{ proben >= 3 and test("geschick") and test("geschick") and test("geschick") }
  Der Wind, das Dunkel und keine Hand frei: Die Leiter testet dich
  dreimal, und dreimal ist die Antwort gerade gut genug. So etwas
  verzeiht sie kein zweites Mal.
  -> leiterfuss
{ else }
  -> sturz

# Am Fuß der Leiter {#leiterfuss}

{ sturm }
  Unten duckst du dich aus dem Wind, und die Wettertür des Kellers ist
  die nächste Klinke, die deine Hand findet.
  -> keller
{ else }
  Der Sand nimmt den letzten Schritt. Du stehst wieder auf der Bank.
  -> ankunft

# Der Anleger {#anleger}

~ im_keller = 0

{ sturm }
  Vom Anleger stehen noch die Pfähle. Du siehst die Welle nicht kommen,
  du hörst sie nur, und dann ist zwischen dir und dem Turm auf einmal
  See.
  -> weggespuelt

Vier Pfähle, ein Bohlensteg, zwei Ringe für die Leinen. Die See davor
ist leer bis zum Horizont. Das Boot kommt am Morgen, so war es
ausgemacht, und der Steg hat bis dahin nichts zu bieten.

{anzug >= 1 or wetter >= 2: Die Böen greifen nach allem, was absteht, und
der Steg zittert unter jedem Schlag der See.|Der Abend liegt glatt auf
dem Wasser, als hätte er Zeit.}

* [Warten, ob nicht doch etwas kommt](#anleger)
  Du wartest eine halbe Stunde gegen besseres Wissen. Wind und vereinzelt 
  Seevögel besuchen dich. Der Blick auf den Sonnenuntergang ist malerisch
  und belohnt dein Warten.
  ~ zeit += 30
+ [Zurück über die Bank](#ankunft)
  ~ zeit += 5

# Die Kiefern an der Nordkante {#windbruch}

~ im_keller = 0

{ sturm }
  Unter den Kiefern liegt der Boden voller Nadeln und abgerissener
  Zweige. Du hörst das Holz arbeiten, und dann hört eine der drei auf,
  Widerstand zu leisten. Es ist kein großer Baum. Von hier unten sieht
  er groß genug aus.
  -> erschlagen

Drei Kiefern, krumm vom Westwind, das einzige Holz der Bank, auf der
einzigen Düne. Zwischen den Stämmen hindurch sieht man die Wolkenbank
wachsen; von hier wirkt sie näher als vom Turm.

{anzug >= 1 or wetter >= 2: Der Wind probiert die Kronen schon aus.|Noch
halten die drei still, wie Tiere, die den Hund gesehen haben.}

* [Bis an die Kante der Düne hinausgehen](#windbruch)
  Unten arbeitet die See am Sand, geduldig wie eine Feile. Hypnotisch, 
  der Zug der Klippe, man kann lange zusehen - und genau das tust du.
  ~ zeit += 15
+ [Zurück über die Bank](#ankunft)
  ~ zeit += 5

# Das Bett {#schlaf}

{ zeit < 95 }
  ~ zeit = 105
  ~ netz = 0
  Nur einen Augenblick die Augen zu, sagst du dir; die Nacht wird noch
  lang genug. Das Bett ist besser als sein Ruf, der Tag war länger als
  die Überfahrt, und der Turm hält die See gut allein. - Du wachst
  davon auf, dass der Turm einen anderen Ton hat, tiefer, unten im
  Mauerwerk. Es ist stockfinster, und im Raum fehlt etwas: das Summen
  der Deckenlampe. Der Strom.
  -> erwachen
{ lampe == 1 }
  -> morgen
{ else }
  -> grauermorgen

# Erwachen {#erwachen}

Die Hände finden im Finstern die Stiefel, den Tisch, die Wand.
{knows("FUNK"): Das Radio läuft auf Batterie weiter und sagt seine
Warnung auf wie ein Gebet.} Vor dem Fenster ist die Nacht voller
Arbeit: Der Sturm ist da, und das Seekabel hat ihm nicht standgehalten.

{schalter == 1: Was vor dem Fenster fehlt, ist der Schein der großen
Lampe. Ihr Hebel liegt auf EIN; von hier unten hilft ihr das nicht.}
{has("laterne") and laterne_voll == 1: Neben der Tür steht die gefüllte
Öl-Laterne. Sie ist jetzt das ganze Licht des Hauses.}
{has("laterne") and laterne_voll == 0: Neben der Tür steht die
Öl-Laterne, so leer, wie du sie gefunden hast. Öl gäbe es im Keller,
und der Weg dorthin führt jetzt durch den Sturm.}

-> arbeitsraum

# Der Morgen {#morgen}

Der Sturm läuft Stunde um Stunde gegen den Turm und findet ihn besetzt:
Unten hält der Generator seinen Takt, oben läuft der Strahl seine
Runden, und du gehst dazwischen auf und ab, Ölkanne in der einen,
Putzlappen in der anderen Hand. Irgendwann ist das, was durch die
Scheiben kommt, nicht mehr ihr Licht, sondern Tag.

Bei grauem Licht stellst du den Generator ab und legst den Hebel um.
Die Bank ist kleiner geworden, der Turm ist es nicht.

Mit dem ersten hellen Wasser kommt das Boot um die Bank. Vom Ruder her
ein Nicken, mehr nicht. Mehr war nicht ausgemacht.

-> END

# Grauer Morgen {#grauermorgen}

Die Nacht vergeht auch so. Der Sturm läuft irgendwann aus, wie jeder
Sturm, und das erste Licht zeigt, was er dagelassen hat: An der
Nordkante der Bank liegt ein Kutter auf der Seite, den Bug im Sand. An
Deck bewegt sich nichts.

Deine Lampe war dunkel, als er sie gebraucht hätte.
{wasser >= 6: Im Keller des Maschinenhauses steht die See und gibt
nicht wieder her, was sie dort gefunden hat.}

Das Boot holt dich am Morgen ab, wie ausgemacht. Es wird eine stille
Überfahrt.

Dein Abenteuer endet hier.

-> END

# Im Wind {#sturz}

Die Leiter hält. Sie hat immer gehalten; halten musste sich, wer auf
ihr stand. Der Wind hat mehr Hände als du, und er kennt das Eisen
länger.

Unter dir ist erst Luft, dann Sand, und dann nichts mehr, das dich
etwas angeht.

Dein Abenteuer endet hier.

-> END

# In der See {#weggespuelt}

Die Bank ist unter deinen Füßen weg, und mit ihr die Richtung. {lampe:
Der Strahl läuft über dich hinweg, zweimal, dreimal. Er kann zeigen,
aber nicht halten.|Der Turm steht schwarz gegen den Himmel, und in ihm
brennt kein Licht, das jemandem sagen könnte, wo du warst.}

Dein Abenteuer endet hier.

-> END

# Unter den Kiefern {#erschlagen}

Es ist kein Lärm, mit dem das Holz kommt, eher ein Seufzer, und dann
nimmt es dir den Himmel weg. Der Sand ist weich an der Nordkante. Es
ändert nichts.

Dein Abenteuer endet hier.

-> END

# Das Wasser im Keller {#ertrunken}

Die See kommt nicht als Welle in den Keller. Sie kommt als Schwall: erst
um die Knöchel, dann über die Knie, und die Stiege hinauf drückt es dir
entgegen, zieht dich nach unten und verschluckt dich.

Dein Abenteuer endet hier.

-> END

# fn handlicht()

~ return has("laterne") and laterne_voll == 1

# fn traglast()

~ return has("laterne") + has("schluessel") + has("band")
