import { ItemView, WorkspaceLeaf, TFile, Menu } from 'obsidian';
import { VIEW_TYPE_DIRECTED_GRAPH, Relationship, DirectedGraphSettings } from './types';
import { GraphRenderer } from './graph-renderer';
import { RelationshipIndex } from './relationship-index';

/**
 * Custom ItemView that displays the directed graph.
 */
export class DirectedGraphView extends ItemView {
    private renderer: GraphRenderer | null = null;
    private index: RelationshipIndex;
    private settings: DirectedGraphSettings;
    private existingFiles: Set<string>;

    constructor(
        leaf: WorkspaceLeaf,
        index: RelationshipIndex,
        settings: DirectedGraphSettings,
        existingFiles: Set<string>
    ) {
        super(leaf);
        this.index = index;
        this.settings = settings;
        this.existingFiles = existingFiles;
    }

    getViewType(): string {
        return VIEW_TYPE_DIRECTED_GRAPH;
    }

    getDisplayText(): string {
        return 'Directed Graph';
    }

    getIcon(): string {
        return 'git-fork';
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1] as HTMLElement;
        container.empty();
        container.addClass('directed-graph-container');

        this.renderer = new GraphRenderer(
            container,
            this.settings,
            this.existingFiles,
            (filename: string, line?: number) => this.navigateToNote(filename, line),
            (filename: string) => this.createNote(filename)
        );

        this.refresh();
    }

    async onClose(): Promise<void> {
        if (this.renderer) {
            this.renderer.destroy();
            this.renderer = null;
        }
    }

    /**
     * Re-render the graph with current data.
     */
    refresh(): void {
        if (!this.renderer) return;

        const relationships = this.index.getAllRelationships();
        const nodes = this.index.getAllNodes();

        this.renderer.update(nodes, relationships);
    }

    /**
     * Update settings and re-render.
     */
    updateSettings(settings: DirectedGraphSettings): void {
        this.settings = settings;
        if (this.renderer) {
            this.renderer.updateSettings(settings);
        }
    }

    /**
     * Update the set of existing files (for ghost node detection).
     */
    updateExistingFiles(files: Set<string>): void {
        this.existingFiles = files;
        if (this.renderer) {
            this.renderer.updateExistingFiles(files);
        }
    }

    /**
     * Navigate to a note file, optionally jumping to a specific line.
     */
    private async navigateToNote(filename: string, line?: number): Promise<void> {
        const file = this.app.vault.getAbstractFileByPath(`${filename}.md`);
        if (file && file instanceof TFile) {
            const leaf = this.app.workspace.getLeaf('tab');
            await leaf.openFile(file);
            if (line !== undefined) {
                const editor = this.app.workspace.activeEditor?.editor;
                if (editor) {
                    editor.setCursor({ line: line - 1, ch: 0 });
                    editor.scrollIntoView(
                        { from: { line: line - 1, ch: 0 }, to: { line: line - 1, ch: 0 } },
                        true
                    );
                }
            }
        }
    }

    /**
     * Offer to create a new note for a ghost node.
     */
    private async createNote(filename: string): Promise<void> {
        const path = `${filename}.md`;
        const existing = this.app.vault.getAbstractFileByPath(path);
        if (!existing) {
            await this.app.vault.create(path, '');
            const file = this.app.vault.getAbstractFileByPath(path);
            if (file && file instanceof TFile) {
                const leaf = this.app.workspace.getLeaf('tab');
                await leaf.openFile(file);
            }
        }
    }
}
