---
title: Die Gruft unter dem Weißdorn
author: inkle-md
version: 0.1.0
languages:
  default: de
  available: [de]

start: begin

stats:
  skill:    { name: Geschick, start: "roll(1,6) + 6",  max: start }
  stamina:  { name: Ausdauer, start: "roll(2,6) + 12", max: start }
  luck:     { name: Glück,    start: "roll(1,6) + 6",  max: start }
  gold:     { name: Gold,     start: 12 }

inventory:
  slots: 8
  start: [lantern, provisions]

items:
  sword:      { name: Schwert, kind: weapon }
  axe:        { name: Streitaxt, kind: weapon, attack_bonus: 1, damage_override: 3 }
  lantern:    { name: Laterne, kind: gear }
  silver-key: { name: Silberner Schlüssel, kind: gear }
  provisions: { name: Proviant, kind: consumable, uses: 10,
                effect: "stamina = min(stamina + 4, stamina_max)",
                when: "not in_combat" }

setup:
  - title: Wähle deine Waffe
    pick: 1
    from:
      - { label: Schwert, item: sword }
      - { label: Streitaxt, item: axe }

combat:
  attack: "skill + roll(2,6) + weapon_attack"
  damage: "max(weapon_damage, 2) - armour_defence"
  rule: higher-wins
  luck_in_combat: true

enemies:
  goblin: { name: Goblin, skill: 5, stamina: 6, flee_after: 3 }

death:
  when: "stamina <= 0"
  goto: death

undo:
  depth: 10

strings:
  combat.hit:       "Du triffst {enemy}."
  combat.taken:     "{enemy} trifft dich."
  combat.tie:       "Die Klingen kreuzen sich, ohne dass etwas daraus wird."

---

# Am Waldrand {#begin}

Der Pfad teilt sich vor einer Weißdornhecke. {&Ein Krachen|Ein Knirschen|Stille} im Unterholz.

Du hast noch {gold} Goldstücke und ein Glück von {luck}.

* [Nach links, ins Dickicht](#thicket)
* [Nach rechts, zum Bach](#brook)
* {has("lantern")} [In den Spalt unter der Hecke](#crypt) Du zwängst dich hinein, die Laterne voran.

# Im Dickicht {#thicket}

{!Dornen fahren dir über die Arme.|Du kennst den Weg durch die Dornen inzwischen.}

* [Weiter, bis der Wald sich lichtet](#brook)
+ [Zurück zur Hecke](#begin)

# Am Bach {#brook}

Das Wasser ist klar genug, dass du den Grund siehst. Etwas Helles liegt darin.

* [Danach greifen]() Deine Finger schließen sich um eine Münze.
  ~ gold = gold + 3
  * [Weitergehen](#begin)
  + [Noch einmal suchen]() Diesmal nur Kies.
  ---
  Du wischst dir die Hand an der Hose ab.
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

# Die Gruft {#crypt}

{!Kalte Luft schlägt dir entgegen.|Du kennst den Weg jetzt.}

Ein Goblin fährt aus einer Nische hoch.

!combat goblin
  win  -> chamber
  lose -> death
  flee [Zurück durch den Spalt](#thicket) Du lässt mehr als deinen Stolz zurück.

## Die zweite Kammer {#chamber}

Auf dem Sarkophag liegt ein silberner Schlüssel.

* [Den Schlüssel nehmen]() Etwas seufzt in der Dunkelheit.
  ~ take("silver-key")
  ~ remember("KRAKEN")
+ [Zum eisernen Tor](#gate)
---
-> gate

# Das eiserne Tor {#gate}

Das Tor schließt die Gruft nach Norden ab.

{ has("silver-key") and knows("KRAKEN") }
  Der Schlüssel dreht sich, als hätte er auf dich gewartet.
{ has("silver-key") }
  Der Schlüssel passt, aber deine Hand zittert zu sehr.
  ~ luck = luck - 1
  -> chamber
{ else }
  Ohne Schlüssel bleibt das Tor, was es ist.
  -> chamber

* [Hinaus ins Licht](#daylight)

# Wieder im Licht {#daylight}

Hinter dem Tor steigt der Gang an, und irgendwo darüber steht die Sonne.

Dein Abenteuer endet gut, mit {gold} Goldstücken in der Tasche.

-> END

# Gestorben {#death}

Dein Abenteuer endet hier.

-> END
