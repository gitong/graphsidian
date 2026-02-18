import {
    EditorView,
    Decoration,
    DecorationSet,
    ViewPlugin,
    ViewUpdate,
    WidgetType,
} from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';

const RELATIONSHIP_REGEX = /<<([^>]*?)>>\[\[\s*(.*?)\s*\]\]/g;

/**
 * Parse a descriptor to get an arrow symbol for display.
 */
function getArrowForDescriptor(descriptor: string): string {
    const d = descriptor.trim();
    if (d === '-+') return '→';
    if (d === '+-') return '←';
    if (d === '++') return '↔';
    if (d.startsWith('+') && d.endsWith('+') && d.length > 2) return '↔';
    if (d.startsWith('+')) return '←';
    if (d.endsWith('+')) return '→';
    if (/[a-zA-Z0-9]/.test(d)) return '—';
    return '';
}

/**
 * Extract label from descriptor.
 */
function getLabelForDescriptor(descriptor: string): string {
    const d = descriptor.trim();
    if (d === '-+' || d === '+-' || d === '++') return '';
    if (d.startsWith('+') && d.endsWith('+') && d.length > 2) return d.slice(1, -1).trim();
    if (d.startsWith('+')) return d.slice(1).trim();
    if (d.endsWith('+')) return d.slice(0, -1).trim();
    return d;
}

/**
 * Widget that renders a styled relationship badge inline.
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
        badge.textContent = `${this.arrow} ${this.label ? this.label + ' ' : ''}${this.target}`;
        return badge;
    }

    ignoreEvent(): boolean {
        return false;
    }
}

/**
 * CodeMirror ViewPlugin for live preview decorations.
 */
function buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();

    for (const { from, to } of view.visibleRanges) {
        const text = view.state.doc.sliceString(from, to);
        let match: RegExpExecArray | null;
        RELATIONSHIP_REGEX.lastIndex = 0;

        while ((match = RELATIONSHIP_REGEX.exec(text)) !== null) {
            const start = from + match.index;
            const end = start + match[0].length;
            const descriptor = match[1];
            const target = match[2].trim();

            const arrow = getArrowForDescriptor(descriptor);
            if (!arrow) continue;

            const label = getLabelForDescriptor(descriptor);

            builder.add(
                start,
                end,
                Decoration.replace({
                    widget: new RelationshipWidget(arrow, label, target),
                })
            );
        }
    }

    return builder.finish();
}

export const editorExtension = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildDecorations(view);
        }

        update(update: ViewUpdate): void {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = buildDecorations(update.view);
            }
        }
    },
    {
        decorations: (v) => v.decorations,
    }
);
