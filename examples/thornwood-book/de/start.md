# Am Waldrand {#begin}

Der Pfad teilt sich vor einer Weißdornhecke, rechts von dir hörst du das Gluckern eines kleinen Bachs. {&Ein Krachen|Ein Knirschen|Stille} im Unterholz.

Du hast {gold} Goldstücke bei dir und ein Glück von {luck}.

+ [Das Dickicht am Ufer untersuchen](#thicket)
+ [Zum Bach gehen](#brook)
+ {has("lantern")} [In den Spalt unter der Hecke klettern](#crypt.crypt) Du zwängst dich hinein, die Laterne voran.

# Im Dickicht {#thicket}

{!Dornen fahren dir über die Arme.|Du kennst den Weg durch die Dornen inzwischen.}

Du siehst nichts Besonderes.

+ [Weiter, Richtung Bach](#brook)
+ [Zur Hecke zurückgehen](#begin)

# Am anderen Ufer {#other-side}

Hier ist nichts. Enttäuscht gehst du zurück.
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

-> begin
