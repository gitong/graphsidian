# Graphsidian

An Obsidian plugin that adds support for **directed, labeled relationships** between notes and visualizes them in an interactive force-directed graph.

![Graph View Screenshot](https://raw.githubusercontent.com/gitong/graphsidian/main/screenshot.png)

## Features

- **Custom Relationship Syntax**: Define directed, bidirectional, and labeled connections directly in your notes.
- **Interactive Graph View**: Visualize your note network with a D3.js force-directed graph.
- **Live Preview Support**: Relationships are rendered beautifully in Live Preview mode.
- **Autocomplete**: Typing `>[[` automatically expands to the new syntax template.
- **Clean Interface**: Minimalist design with no intrusive popups on graph edges.
- **Customizable**: Adjust link distance, node repulsion, and colors in settings.

## Relationship Syntax

Graphsidian uses a special syntax `<descriptor>[[Target]]` to define relationships. The descriptor determines the direction and label.

| Syntax | Direction | Label | Description |
|---|---|---|---|
| `<-+>[[Target]]` | Outgoing → | None | Arrow points from this note to Target. |
| `<+->[[Target]]` | Incoming ← | None | Arrow points from Target to this note. |
| `<++>[[Target]]` | Bidirectional ↔ | None | Arrows point both ways. |
| `<-->[[Target]]` | Undirected — | None | Simple connection with no arrows. |
| `<-text->[[Target]]` | Undirected — | `text` | Labeled connection. |
| `<-text+>[[Target]]` | Outgoing → | `text` | Labeled outgoing connection. |
| `<+text->[[Target]]` | Incoming ← | `text` | Labeled incoming connection. |
| `<+text+>[[Target]]` | Bidirectional ↔ | `text` | Labeled bidirectional connection. |

### Autocomplete

Type `>[[` in the editor, and it will automatically expand to `<-->[[`. The cursor will be placed inside the brackets, ready for you to type the target note name.

## Usage

1.  **Define Relationships**: Use the syntax above in any note to create connections.
2.  **Open Graph View**:
    *   Click the **Graphsidian** ribbon icon (network graph symbol).
    *   Or open the Command Palette (`Ctrl/Cmd + P`) and search for **"Graphsidian: Open Graph View"**.
3.  **Navigate**: Click on nodes or edges to navigate to related notes. Drag nodes to rearrange the graph.

## Settings

You can customize the graph behavior in **Settings > Graphsidian**:

-   **Link Distance**: Controls how long the edges are. Increase for a more spread-out graph.
-   **Node Repulsion**: Controls how strongly nodes push each other away. Increase to reduce overlap.
-   **Show Arrows**: Toggle arrowheads on/off.
-   **Show Labels**: Toggle text labels on edges.
-   **Colors**: Customize colors for outgoing, incoming, and bidirectional links.

## Installation

1.  Search for "Graphsidian" in the Obsidian Community Plugins settings.
2.  Click **Install**.
3.  Click **Enable**.

---

**Version**: 0.2.1
**License**: MIT
