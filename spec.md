# Obsidian Directed Graph Plugin — Specification
<!-- Version 0.1.0 -->
<!-- Date: 2026-02-18 -->
<!-- Author: Gitong -->
<!-- Gherkin Format -->

## Overview

Obsidian's built-in Graph View displays connections between notes but lacks **directionality** and **labeling**. This plugin introduces a new inline syntax for declaring directed, labeled relationships between notes, a parser to extract them, and an enhanced Graph View module to render arrows and labels.

---

## Syntax Reference

All relationship declarations are written **inside the source note** (e.g., `Awal.md`).

| Syntax | Direction | Label | Description |
|---|---|---|---|
| `<<-+>>[[Target]]` | Awal → Target | _(none)_ | Outgoing arrow, no label |
| `<<+->>[[Target]]` | Target → Awal | _(none)_ | Incoming arrow, no label |
| `<<++>>[[Target]]` | Awal ↔ Target | _(none)_ | Bidirectional arrow, no label |
| `<<label>>[[Target]]` | Awal — Target | `label` | Undirected edge with label |
| `<<+label>>[[Target]]` | Target → Awal | `label` | Incoming arrow with label |
| `<<label+>>[[Target]]` | Awal → Target | `label` | Outgoing arrow with label |
| `<<+label+>>[[Target]]` | Awal ↔ Target | `label` | Bidirectional arrow with label |

> **Whitespace rule**: Spaces inside `[[ Target ]]` are trimmed and resolve to `Target.md`.

---

## Feature Specifications (Gherkin)

### Feature: Relationship Syntax Parsing

```gherkin
Feature: Relationship Syntax Parsing
  As a note author
  I want to declare directed and labeled relationships using inline syntax
  So that my notes carry structured, semantic connections

  Background:
    Given I have a note called "Awal.md"
    And the Obsidian Directed Graph plugin is enabled

  # -----------------------------------------------------------
  # Scenario Group: Outgoing Arrow Without Label
  # -----------------------------------------------------------

  Scenario: Outgoing arrow without label using <<-+>>
    Given the note "Awal.md" contains the text:
      """
      <<-+>>[[Target]]
      """
    When the parser processes "Awal.md"
    Then a relationship should be created with:
      | field     | value      |
      | source    | Awal       |
      | target    | Target     |
      | direction | outgoing   |
      | label     |            |

  Scenario: Outgoing arrow without label with spaces in target
    Given the note "Awal.md" contains the text:
      """
      <<-+>>[[  Target  ]]
      """
    When the parser processes "Awal.md"
    Then a relationship should be created with:
      | field     | value      |
      | source    | Awal       |
      | target    | Target     |
      | direction | outgoing   |
      | label     |            |

  # -----------------------------------------------------------
  # Scenario Group: Incoming Arrow Without Label
  # -----------------------------------------------------------

  Scenario: Incoming arrow without label using <<+->>
    Given the note "Awal.md" contains the text:
      """
      <<+->>[[Target]]
      """
    When the parser processes "Awal.md"
    Then a relationship should be created with:
      | field     | value      |
      | source    | Awal       |
      | target    | Target     |
      | direction | incoming   |
      | label     |            |

  # -----------------------------------------------------------
  # Scenario Group: Undirected Edge With Label
  # -----------------------------------------------------------

  Scenario: Undirected relationship with label
    Given the note "Awal.md" contains the text:
      """
      <<arah>>[[Target]]
      """
    When the parser processes "Awal.md"
    Then a relationship should be created with:
      | field     | value      |
      | source    | Awal       |
      | target    | Target     |
      | direction | undirected |
      | label     | arah       |

  Scenario: Undirected relationship with multi-word label
    Given the note "Awal.md" contains the text:
      """
      <<depends on>>[[Library Core]]
      """
    When the parser processes "Awal.md"
    Then a relationship should be created with:
      | field     | value       |
      | source    | Awal        |
      | target    | Library Core|
      | direction | undirected  |
      | label     | depends on  |

  # -----------------------------------------------------------
  # Scenario Group: Incoming Arrow With Label
  # -----------------------------------------------------------

  Scenario: Incoming arrow with label using <<+label>>
    Given the note "Awal.md" contains the text:
      """
      <<+arah>>[[Target]]
      """
    When the parser processes "Awal.md"
    Then a relationship should be created with:
      | field     | value      |
      | source    | Awal       |
      | target    | Target     |
      | direction | incoming   |
      | label     | arah       |

  # -----------------------------------------------------------
  # Scenario Group: Outgoing Arrow With Label
  # -----------------------------------------------------------

  Scenario: Outgoing arrow with label using <<label+>>
    Given the note "Awal.md" contains the text:
      """
      <<arah+>>[[Target]]
      """
    When the parser processes "Awal.md"
    Then a relationship should be created with:
      | field     | value      |
      | source    | Awal       |
      | target    | Target     |
      | direction | outgoing   |
      | label     | arah       |

  # -----------------------------------------------------------
  # Scenario Group: Bidirectional Arrow
  # -----------------------------------------------------------

  Scenario: Bidirectional arrow without label using <<++>>
    Given the note "Awal.md" contains the text:
      """
      <<++>>[[Target]]
      """
    When the parser processes "Awal.md"
    Then a relationship should be created with:
      | field     | value         |
      | source    | Awal          |
      | target    | Target        |
      | direction | bidirectional |
      | label     |               |

  Scenario: Bidirectional arrow with label using <<+label+>>
    Given the note "Awal.md" contains the text:
      """
      <<+collaborates+>>[[Target]]
      """
    When the parser processes "Awal.md"
    Then a relationship should be created with:
      | field     | value         |
      | source    | Awal          |
      | target    | Target        |
      | direction | bidirectional |
      | label     | collaborates  |

  # -----------------------------------------------------------
  # Scenario Group: Multiple Relationships in One Note
  # -----------------------------------------------------------

  Scenario: Note with multiple relationships
    Given the note "Awal.md" contains the text:
      """
      Some context here.
      <<-+>>[[Alpha]]
      More text in between.
      <<+depends on>>[[Beta]]
      <<manages>>[[Gamma]]
      """
    When the parser processes "Awal.md"
    Then 3 relationships should be created
    And relationship 1 should be:
      | field     | value      |
      | source    | Awal       |
      | target    | Alpha      |
      | direction | outgoing   |
      | label     |            |
    And relationship 2 should be:
      | field     | value      |
      | source    | Awal       |
      | target    | Beta       |
      | direction | incoming   |
      | label     | depends on |
    And relationship 3 should be:
      | field     | value      |
      | source    | Awal       |
      | target    | Gamma      |
      | direction | undirected |
      | label     | manages    |

  # -----------------------------------------------------------
  # Scenario Group: Edge Cases
  # -----------------------------------------------------------

  Scenario: Conflicting declarations across two notes produce two separate relationships
    Given "Awal.md" contains the text:
      """
      <<-+>>[[Target]]
      """
    And "Target.md" contains the text:
      """
      <<-+>>[[Awal]]
      """
    When the parser processes all notes
    Then 2 relationships should exist:
      | source | target | direction |
      | Awal   | Target | outgoing  |
      | Target | Awal   | outgoing  |
    And both relationships are displayed as separate edges in the graph

  Scenario: Duplicate declarations in different notes are not merged
    Given "Awal.md" contains the text:
      """
      <<manages+>>[[Target]]
      """
    And "Target.md" contains the text:
      """
      <<+manages>>[[Awal]]
      """
    When the parser processes all notes
    Then 2 relationships should exist
    And each relationship reflects the declaration in its respective source file

  Scenario: Target note does not yet exist
    Given the note "Awal.md" contains the text:
      """
      <<-+>>[[NonExistent]]
      """
    And there is no note called "NonExistent.md"
    When the parser processes "Awal.md"
    Then a relationship should be created with target "NonExistent"
    And the target node should be rendered as a ghost node in the graph

  Scenario: Ignore malformed syntax — missing closing brackets
    Given the note "Awal.md" contains the text:
      """
      <<-+>>[[Target
      """
    When the parser processes "Awal.md"
    Then no relationships should be created

  Scenario: Ignore malformed syntax — missing arrow tokens
    Given the note "Awal.md" contains the text:
      """
      <<>>[[Target]]
      """
    When the parser processes "Awal.md"
    Then no relationships should be created

  Scenario: Standard Obsidian wikilinks are not affected
    Given the note "Awal.md" contains the text:
      """
      This references [[Target]] normally.
      """
    When the parser processes "Awal.md"
    Then no directed relationships should be created
    And the standard Obsidian link behavior is preserved
```

---

### Feature: Enhanced Graph View Rendering

```gherkin
Feature: Enhanced Graph View Rendering
  As a knowledge worker
  I want the graph view to display arrows and labels on edges
  So that I can visually understand relationship direction and meaning

  Background:
    Given the Obsidian Directed Graph plugin is enabled
    And the enhanced Graph View is active

  # -----------------------------------------------------------
  # Scenario Group: Arrow Rendering
  # -----------------------------------------------------------

  Scenario: Outgoing arrow is rendered with arrowhead on target
    Given "Awal.md" declares <<-+>>[[Target]]
    When I open the enhanced Graph View
    Then an edge is drawn from "Awal" to "Target"
    And the edge displays an arrowhead pointing at "Target"

  Scenario: Incoming arrow is rendered with arrowhead on source
    Given "Awal.md" declares <<+->>[[Target]]
    When I open the enhanced Graph View
    Then an edge is drawn from "Target" to "Awal"
    And the edge displays an arrowhead pointing at "Awal"

  Scenario: Undirected labeled edge has no arrowhead
    Given "Awal.md" declares <<arah>>[[Target]]
    When I open the enhanced Graph View
    Then an edge is drawn between "Awal" and "Target"
    And the edge has no arrowhead on either end

  Scenario: Bidirectional arrow renders arrowheads on both ends
    Given "Awal.md" declares <<++>>[[Target]]
    When I open the enhanced Graph View
    Then an edge is drawn between "Awal" and "Target"
    And the edge displays arrowheads on both ends

  Scenario: Bidirectional arrow with label renders arrowheads and label
    Given "Awal.md" declares <<+collaborates+>>[[Target]]
    When I open the enhanced Graph View
    Then an edge is drawn between "Awal" and "Target"
    And the edge displays arrowheads on both ends
    And the edge displays the label "collaborates"

  Scenario: Conflicting declarations render as two separate edges
    Given "Awal.md" declares <<manages+>>[[Target]]
    And "Target.md" declares <<-+>>[[Awal]]
    When I open the enhanced Graph View
    Then two distinct edges are rendered between "Awal" and "Target"
    And edge 1 shows an arrow from "Awal" to "Target" with label "manages"
    And edge 2 shows an arrow from "Target" to "Awal" without label

  # -----------------------------------------------------------
  # Scenario Group: Label Rendering
  # -----------------------------------------------------------

  Scenario: Labeled edge displays its label text
    Given "Awal.md" declares <<manages>>[[Target]]
    When I open the enhanced Graph View
    Then the edge between "Awal" and "Target" displays the label "manages"
    And the label is positioned at the midpoint of the edge

  Scenario: Unlabeled edge shows no text
    Given "Awal.md" declares <<-+>>[[Target]]
    When I open the enhanced Graph View
    Then the edge between "Awal" and "Target" has no label text

  Scenario: Label text is readable at default zoom
    Given "Awal.md" declares <<reports to>>[[Manager]]
    When I open the enhanced Graph View at default zoom level
    Then the label "reports to" is legible and does not overlap node names

  # -----------------------------------------------------------
  # Scenario Group: Visual Differentiation
  # -----------------------------------------------------------

  Scenario: Directed edges are visually distinct from undirected
    Given "Awal.md" declares <<-+>>[[Alpha]]
    And "Awal.md" declares <<collaborates>>[[Beta]]
    When I open the enhanced Graph View
    Then the edge to "Alpha" uses a directed style (arrowhead, solid line)
    And the edge to "Beta" uses an undirected style (no arrowhead, dashed line)

  Scenario: Ghost nodes for non-existent targets
    Given "Awal.md" declares <<-+>>[[FutureNote]]
    And "FutureNote.md" does not exist
    When I open the enhanced Graph View
    Then "FutureNote" appears as a ghost node (semi-transparent)
    And clicking the ghost node offers to create "FutureNote.md"

  # -----------------------------------------------------------
  # Scenario Group: Interaction
  # -----------------------------------------------------------

  Scenario: Hovering over an edge shows relationship detail
    Given "Awal.md" declares <<+manages>>[[Target]]
    When I hover over the edge between "Awal" and "Target"
    Then a tooltip displays:
      | field     | value    |
      | from      | Target   |
      | to        | Awal     |
      | label     | manages  |
      | defined in| Awal.md  |

  Scenario: Clicking an edge navigates to the source note
    Given "Awal.md" declares <<-+>>[[Target]]
    When I click the edge between "Awal" and "Target"
    Then Obsidian opens "Awal.md"
    And the cursor is placed at the line containing the relationship declaration
```

---

### Feature: Live Editing and Sync

```gherkin
Feature: Live Editing and Sync
  As a note author
  I want relationship changes to reflect in the graph immediately
  So that I get real-time feedback on my knowledge structure

  Background:
    Given the Obsidian Directed Graph plugin is enabled

  Scenario: Adding a new relationship updates the graph
    Given "Awal.md" is open in the editor
    And the enhanced Graph View is open in a side pane
    When I type "<<-+>>[[NewNote]]" in "Awal.md"
    Then the graph adds a directed edge from "Awal" to "NewNote" within 2 seconds

  Scenario: Removing a relationship updates the graph
    Given "Awal.md" contains "<<-+>>[[Target]]"
    And the enhanced Graph View shows the edge
    When I delete the line "<<-+>>[[Target]]" from "Awal.md"
    Then the edge from "Awal" to "Target" is removed from the graph within 2 seconds

  Scenario: Renaming a target note updates all references
    Given "Awal.md" contains "<<-+>>[[OldName]]"
    When I rename "OldName.md" to "NewName.md"
    Then the relationship in "Awal.md" updates to "<<-+>>[[NewName]]"
    And the graph reflects the updated target
```

---

### Feature: Plugin Settings

```gherkin
Feature: Plugin Settings
  As a user
  I want to configure the graph rendering options
  So that the visualization fits my workflow

  Scenario: Toggle arrow visibility
    Given I open the plugin settings
    When I disable "Show Arrows"
    Then all edges in the enhanced Graph View render without arrowheads
    And labels remain visible

  Scenario: Toggle label visibility
    Given I open the plugin settings
    When I disable "Show Labels"
    Then all edges in the enhanced Graph View render without label text
    And arrows remain visible

  Scenario: Filter edges by label
    Given I open the plugin settings
    And relationships exist with labels "manages", "depends on", and "extends"
    When I set the label filter to "manages"
    Then only edges with label "manages" are displayed in the graph

  Scenario: Customize edge colors by direction
    Given I open the plugin settings
    When I set "Outgoing Arrow Color" to "#00BFFF"
    And I set "Incoming Arrow Color" to "#FF6347"
    And I set "Undirected Edge Color" to "#999999"
    Then the enhanced Graph View uses those colors accordingly
```

---

## Syntax Grammar (EBNF)

```ebnf
relationship    = "<<" , descriptor , ">>" , "[[" , target_name , "]]" ;
descriptor      = arrow_out | arrow_in | arrow_bi | label_only | label_in | label_out | label_bi ;
arrow_out       = "-+" ;
arrow_in        = "+-" ;
arrow_bi        = "++" ;
label_only      = label ;
label_in        = "+" , label ;
label_out       = label , "+" ;
label_bi        = "+" , label , "+" ;
label           = { letter | digit | " " }- ;
target_name     = { any_char }- ;
```

---

## Data Model

```
Relationship {
  id         : string        // auto-generated unique ID
  sourceFile : string        // filename where syntax is declared
  targetFile : string        // resolved target filename
  direction  : "outgoing" | "incoming" | "undirected" | "bidirectional"
  label      : string | null
  line       : number        // line number in source file
}
```

---

## Design Decisions

### 1. Bidirectional Syntax

**Decision**: Bidirectional arrows use **`<<++>>`** (no label) and **`<<+label+>>`** (with label) only.

Alternative shorthands like `<<-+->>` or `<<label+->>` are **not supported**. This keeps the grammar unambiguous: `+` at the start means "incoming", `+` at the end means "outgoing", `+` on both sides means "bidirectional". The `-+` / `+-` forms are reserved for unlabeled directional arrows.

### 2. Duplicate Handling

**Decision**: Conflicting or duplicate declarations across notes produce **separate, independent edges** — no merging.

If `Awal.md` declares `<<manages+>>[[Target]]` and `Target.md` declares `<<+manages>>[[Awal]]`, these are stored and rendered as **two distinct relationships**, each owned by its respective source file. This is consistent with the edge-case scenarios defined above (see "Conflicting declarations" and "Duplicate declarations" scenarios).

### 3. Compatibility (Index Strategy)

**Decision**: The plugin maintains a **parallel in-memory index** of relationships. It does **not** inject into Obsidian's native `resolvedLinks` or `metadataCache`.

Rationale:
- Avoids side effects on other plugins that depend on `resolvedLinks`.
- Standard Obsidian `[[wikilinks]]` continue to work exactly as before.
- The plugin listens to vault events (`modify`, `delete`, `rename`) to keep its index in sync without modifying Obsidian internals.
