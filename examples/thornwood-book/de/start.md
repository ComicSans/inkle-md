# Am Waldrand {#begin}

Der Pfad teilt sich vor einer Weißdornhecke, rechts von dir hörst du das Gluckern eines kleinen Bachs. {&Ein Krachen|Ein Knirschen|Stille} im Unterholz.

Du hast {gold} Goldstücke bei dir und ein Glück von {luck}.

+ [Das Dickicht am Ufer untersuchen](#thicket)
+ [Zum Bach gehen](#brook)
+ {has("lantern")} [In den Spalt unter der Hecke klettern](#crypt.crypt) Du zwängst dich hinein, die Laterne voran.

# Im Dickicht {#thicket}

{!Dornen fahren dir über die Arme.|Du kennst den Weg durch die Dornen inzwischen.}

Nur Dornen. Aber von hier aus siehst du, dass unter der Weißdornhecke der Boden absackt: Da ist ein Spalt, und er ist tiefer, als eine Hecke ihn braucht.

+ [Weiter, Richtung Bach](#brook)
+ [Zur Hecke zurückgehen](#begin)

# Am anderen Ufer {#other-side}

{ visits(other-side) == 1 }
  Im Schlamm des Ufers glänzt ein flacher Kiesel, rund wie eine Münze und leichter. Du steckst ihn ein, gegen die Vernunft und für das Glück.
  ~ luck = min(luck + 1, luck_max)
{ else }
  Hier ist nichts weiter. Du gehst zurück.

-> brook

# Am Bach {#brook}

Das Wasser ist klar genug, dass du den Grund siehst, vereinzelt einen kleinen Fisch. {knows("MUENZE"): Woher das Gold wohl stammen mag?|Etwas Helles liegt darin.}

* [Danach greifen]() Deine Finger schließen sich um eine Münze.
  ~ gold = gold + 3
  ~ remember("MUENZE")
+ [Über den Bach springen]()
  { test("skill") }
    Du landest sicher drüben.
    -> other-side
  { else }
    Du rutschst am nassen Stein ab und schlägst dir das Knie auf.
    ~ stamina = stamina - 2
+ [Zur Hecke zurückgehen](#begin)
---
Der Bach zieht weiter, ohne sich um dich zu kümmern.

-> brook
