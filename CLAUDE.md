# inkle-md

Ein Spielbuchformat in Markdown mit ink-Semantik und einer RPG-Schicht im Stil
der Spielbücher der 80er. `SPEC.md` ist die Sprachdefinition und entscheidet;
der Code folgt ihr, nicht umgekehrt. Weicht der Code ab, ist entweder die Spec
zu ändern oder der Code, aber nie stillschweigend nur eines von beidem.

## Arbeiten in diesem Projekt

```bash
node --test 'test/*.test.js'
node src/cli.js lint examples/thornwood.md --strict
node src/cli.js lint examples/house/book.yaml --strict
node src/cli.js lint examples/nightside/book.yaml --strict
node src/cli.js export examples/thornwood-book/book.yaml --out build/play.html
```

- Keine Abhängigkeiten, kein Build-Schritt, Node 20 oder neuer. Was Node nicht
  mitbringt, wird geschrieben statt installiert (siehe `src/yaml.js`).
- Jede Quelldatei trägt den MPL-2.0-Header. Neue Datei, neuer Header.
- Fehler tragen einen Code aus SPEC 10.3, Warnungen einen aus SPEC 11. Ein
  neuer Prüffall braucht einen Code, einen Eintrag in der Spec und einen Test.
- Alle drei Beispiele müssen `--strict` sauber bleiben; sie sind der Abnahmetest.
  `thornwood` und `house` decken die Grundschicht ab, `nightside` die 0.7-Schicht
  aus Fakten, Ereignissen, Orten und Host-Zeit.
- Deutsche Texte mit echten Umlauten, auch in Beispielen und Commit-Nachrichten.

## Abweichungen von den Workspace-Standards

**Keine lokalen CI-Hooks.** Die zentrale local-CI ist auf Xcode ausgelegt:
Stage 1 ist der SwiftLint-Gate, Stage 2 baut und testet über den
simulator-broker. Für ein reines Node-Projekt ohne Xcode-Target gibt es dort
nichts auszuführen, und ein Hook, der nichts prüft, ist schlechter als keiner,
weil er Grün meldet. Das Äquivalent ist `node --test 'test/*.test.js'` plus
`--strict`-Lint auf allen drei Beispielen; solange das nicht als Hook läuft, wird
es vor jedem Commit von Hand ausgeführt. Entschieden mit Tobias am 11.08.2026.

**Kein SwiftLint, keine swift-contracts.** Kein Swift im Projekt.

`tokensave` ist eingerichtet und indiziert nach jedem Commit über den globalen
post-commit-Hook.

<!-- msc:standards:start -->

## Workspace standards

Generated from `standards.json` (mcp-server) - change it there and reinstall,
never inside the markers. `project_standards` serves the incident behind a rule
(`rule: "<id>"`, ask before weakening one) and the setup rules not printed here;
they bind the same.

### Working with the user

- **Result first, details on request** - Status in one sentence, then at most three bullet points, keyword style and solution oriented. Reasons, alternatives and technical detail such as file paths and line numbers only on request. No tables or subheadings for intermediate states, nothing repeated that already stands in a task, no em dash anywhere - hyphen instead. `collab.answers`
- **Be critical, and say so in one sentence** - Name contradictions, mistakes and missing information in one sentence rather than working around them, and say what nobody has thought to ask yet. Never guess: ask while Tobias is reachable, decide autonomously offline and present the assumption later. `collab.not-a-yes-man`
- **Assume several sessions run in the same workspace** - Never assume a clean working tree or exclusive access to a device, a build or a file. Be frugal with memory and compute. `collab.parallel-sessions`
- **Neutral, gender-inclusive language and accessibility throughout** - Gender-inclusive wording and accessibility are requirements in every change, not a later pass. `collab.language`
- **Match the model to the job** - Agents run on Opus or Sonnet, whichever does the work reliably, and text deliverables - store texts, documentation, marketing copy - are written by Fable. An advisor always uses the stronger model available - Fable or Opus. `collab.models`

### Git

- **Work happens on `main`** - No feature branches. Commit to `main` directly, in small steps that keep it green. `git.trunk`
- **Claim files before editing them** - Claim via `memory_claim_files`, release when done. Rebase before pushing, never force-push `main`. Stage by name - `git add <path>`, never `git add -A`, never `git add .`, never `git commit -a`. What you did not change is not yours to commit. `git.parallel`
- **Never point a git command at the whole tree** - `git reset`, `git checkout -- .`, `git stash` without paths, `git clean` and `git restore .` hit every session working in that checkout, not just yours. Name paths, or do not run it. Needing a clean tree for a measurement is not an exception - use `git worktree add` and measure there. `git.no-sweeping-commands`
- **In a shared tree, commit as soon as it is green** - Do not carry a large uncommitted change set through a long measurement or a wait. Commit the part that builds and passes, keep working from there. A commit is cheap to revert; uncommitted work in a shared checkout is a bet on nobody else touching it. `git.commit-when-green`

### Tooling

- **Code exploration goes through tokensave** - Its MCP tools, not file reads and not Explore agents; a PreToolUse hook enforces this. `tooling.tokensave`
- **iOS builds, tests, simulators and devices go through `simulator-broker`** - Never `xcodebuild`, `simctl` or `devicectl` directly - scripts and physical devices go through `simulator-broker/src/cli.mjs run --project <name> -- <command>`, and stage 2 of the local CI calls `simulator-broker test` or `build` the same way. The single exemption is input and orientation - taps, swipes, text entry, rotation - through the editor's simulator tools while holding a broker lease for that device; building, installing, launching, screenshots and test runs stay the broker's. `tooling.builds`
- **Throwaway work goes in the session scratchpad, named so housekeeping finds it** - Working copies, build output and coverage runs go in the session scratchpad, never in a repository or loose in `/tmp`; name build output `build/`, `Build/` or `DerivedData/`. `tooling.scratch`
- **Task state lives in agent-memory** - Never in `todo.md` or another markdown file. Writing a read-only export is fine; reading state back out of it is not. `tooling.state`
- **A claimed task carries a two-hour lease - renew it before a long silent run** - Before a `git push` with the full suite, an accessibility run or anything else that leaves the task untouched for over an hour, call `memory_queue_renew`. Every `memory_queue_update` on the task renews it too; a session heartbeat does not. `tooling.task-lease`
- **One active queue per project** - Everything a project has to do goes in that one queue; `dependsOn` is the only hard gate and resolves inside its own queue. `tooling.one-queue-per-project`
- **Questions for Tobias go to the queue `entscheidungen-tobias`** - Anything blocked on a decision by Tobias goes to the queue `entscheidungen-tobias` (project `tobias`), never into the project backlog - three lines: the decision, the options with consequences, what stands still. `tooling.decisions-queue`
- **Writing agents get their own worktree while a run needs a stable tree** - A build or test run reads the working tree for minutes; an agent editing during that window makes the result meaningless. Give concurrently writing agents `isolation: "worktree"`, then apply their diffs with `git apply -3` once the run is done. Only bundle agents into the shared tree when nothing is measuring. `tooling.worktree-for-parallel-writes`
- **Say it to the other session, not only about it** - When you find that another session broke something, damaged your work or is about to, send it a `memory_control_send` message naming the files, the rule and the concrete next step - and claim your files in the same breath. A finding that only reaches the human arrives after the next collision. `tooling.tell-the-other-session`

<!-- msc:standards:end -->
