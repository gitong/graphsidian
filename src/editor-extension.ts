import {
    EditorView,
    Decoration,
    DecorationSet,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from '@codemirror/view';
import { RangeSetBuilder, Extension } from '@codemirror/state';

const RELATIONSHIP_REGEX = /<([+\-][^>]*?[+\-])>\s*\[\[\s*(.*?)\s*\]\]/g;

/**
 * Parse a descriptor to get an arrow symbol for display.
 * Direction is determined by first and last characters (- or +).
 */
function getArrowForDescriptor(descriptor: string): string {
    const d = descriptor.trim();
    if (d.length < 2) return '';

    const first = d[0];
    const last = d[d.length - 1];

    if ((first !== '-' && first !== '+') || (last !== '-' && last !== '+')) return '';

    if (first === '-' && last === '+') return '→';  // outgoing
    if (first === '+' && last === '-') return '←';  // incoming
    if (first === '+' && last === '+') return '↔';  // bidirectional
    return '—'; // undirected
}

/**
 * Extract label from descriptor (text between first and last boundary chars).
 */
function getLabelForDescriptor(descriptor: string): string {
    const d = descriptor.trim();
    if (d.length <= 2) return '';
    return d.slice(1, -1).trim();
}

/**
 * Widget that renders a styled relationship badge with clickable target link.
 */
class RelationshipWidget extends WidgetType {
    constructor(
        private arrow: string,
        private label: string,
        private target: string
    ) {
        super();
    }

    toDOM(): HTMLElement {
        const badge = document.createElement('span');
        badge.className = 'dg-badge dg-badge-inline';

        // Arrow
        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'dg-badge-arrow';
        arrowSpan.textContent = this.arrow;
        badge.appendChild(arrowSpan);

        // Label (if any)
        if (this.label) {
            const labelSpan = document.createElement('span');
            labelSpan.className = 'dg-badge-label';
            labelSpan.textContent = ` ${this.label} `;
            badge.appendChild(labelSpan);
        } else {
            badge.appendChild(document.createTextNode(' '));
        }

        // Target as clickable link
        const link = document.createElement('a');
        link.className = 'dg-badge-target internal-link';
        link.dataset.href = this.target;
        link.textContent = this.target;
        link.addEventListener('click', (e) => {
            e.preventDefault();
            (window as any).app?.workspace?.openLinkText(this.target, '');
        });
        badge.appendChild(link);

        return badge;
    }

    ignoreEvent(): boolean {
        return false;
    }
}

/**
 * Build mark decorations that override HTML tag styling.
 * Mark decorations PERSIST even when the cursor is on the line,
 * preventing Obsidian from coloring <<text>> as red HTML tags.
 */
function buildMarkDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    const doc = view.state.doc;
    const text = doc.toString();
    let match: RegExpExecArray | null;
    RELATIONSHIP_REGEX.lastIndex = 0;

    while ((match = RELATIONSHIP_REGEX.exec(text)) !== null) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;
        const descriptor = match[1];

        const arrow = getArrowForDescriptor(descriptor);
        if (!arrow) continue;

        // Mark the entire range to override HTML styling
        builder.add(
            matchStart,
            matchEnd,
            Decoration.mark({ class: 'dg-relationship-syntax' })
        );
    }

    return builder.finish();
}


/**
 * Build replace decorations that show widgets (hidden when cursor is on line).
 */
function buildReplaceDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match: RegExpExecArray | null;
        RELATIONSHIP_REGEX.lastIndex = 0;

        while ((match = RELATIONSHIP_REGEX.exec(text)) !== null) {
            const matchStart = from + match.index;
            const matchEnd = matchStart + match[0].length;
            const descriptor = match[1];
            const target = match[2].trim();

            const arrow = getArrowForDescriptor(descriptor);
            if (!arrow) continue;

            const label = getLabelForDescriptor(descriptor);

            builder.add(
                matchStart,
                matchEnd,
                Decoration.replace({
                    widget: new RelationshipWidget(arrow, label, target),
                })
            );
        }
    }

    return builder.finish();
}

/**
 * ViewPlugin for replace decorations (widget display).
 */
const replacePlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildReplaceDecorations(view);
        }

        update(update: ViewUpdate): void {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = buildReplaceDecorations(update.view);
            }
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);

/**
 * ViewPlugin for mark decorations (HTML override - persists with cursor).
 */
const markPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildMarkDecorations(view);
        }

        update(update: ViewUpdate): void {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = buildMarkDecorations(update.view);
            }
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);

export const editorExtension: Extension = [replacePlugin, markPlugin];
