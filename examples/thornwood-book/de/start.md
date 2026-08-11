# Am Waldrand {#begin}

Der Pfad teilt sich vor einer Weißdornhecke. {&Ein Krachen|Ein Knirschen|Stille} im Unterholz.

Du hast noch {gold} Goldstücke und ein Glück von {luck}.

* [Nach links, ins Dickicht](#thicket)
* [Nach rechts, zum Bach](#brook)
* {has("lantern")} [In den Spalt unter der Hecke](#crypt.crypt) Du zwängst dich hinein, die Laterne voran.

# Im Dickicht {#thicket}

{!Dornen fahren dir über die Arme.|Du kennst den Weg durch die Dornen inzwischen.}

* [Weiter, bis der Wald sich lichtet](#brook)
+ [Zurück zur Hecke](#begin)

# Am Bach {#brook}

Das Wasser ist klar genug, dass du den Grund siehst. Etwas Helles liegt darin.

* [Danach greifen]() Deine Finger schließen sich um eine Münze.
  ~ gold = gold + 3
* [Über den Bach springen]()
  { test("skill") }
    Du landest sicher drüben und schlägst dich zum Dickicht durch.
    -> thicket
  { else }
    Du rutschst am nassen Stein ab und schlägst dir das Knie auf.
    ~ stamina = stamina - 2
+ [Zurück zur Hecke](#begin)
---
Der Bach zieht weiter, ohne sich um dich zu kümmern.

-> begin
