# Am Waldrand {#begin}

Der Pfad teilt sich vor einer Weißdornhecke. {&Ein Krachen|Ein Knirschen|Stille} im Unterholz.

Du hast {gold} Goldstücke bei dir und ein Glück von {luck}.

+ [Nach links ins Dickicht gehen](#thicket)
+ [Nach rechts zum Bach gehen](#brook)
+ {has("lantern")} [In den Spalt unter der Hecke klettern](#crypt.crypt) Du zwängst dich hinein, die Laterne voran.

# Im Dickicht {#thicket}

{!Dornen fahren dir über die Arme.|Du kennst den Weg durch die Dornen inzwischen.}

+ [Weitergehen, bis der Wald sich lichtet](#brook)
+ [Zur Hecke zurückgehen](#begin)

# Am Bach {#brook}

Das Wasser ist klar genug, dass du den Grund siehst. {knows("MUENZE"): Nichts glänzt mehr darin.|Etwas Helles liegt darin.}

* [Danach greifen]() Deine Finger schließen sich um eine Münze.
  ~ gold = gold + 3
  ~ remember("MUENZE")
+ [Über den Bach springen]()
  { test("skill") }
    Du landest sicher drüben und schlägst dich zum Dickicht durch.
    -> thicket
  { else }
    Du rutschst am nassen Stein ab und schlägst dir das Knie auf.
    ~ stamina = stamina - 2
+ [Zur Hecke zurückgehen](#begin)
---
Der Bach zieht weiter, ohne sich um dich zu kümmern.

-> begin
