import {
    Plugin,
    TFile,
    TAbstractFile,
    WorkspaceLeaf,
    MarkdownPostProcessorContext,
} from 'obsidian';
import {
    DirectedGraphSettings,
    DEFAULT_SETTINGS,
    VIEW_TYPE_DIRECTED_GRAPH,
} from './types';
import { RelationshipIndex } from './relationship-index';
import { DirectedGraphView } from './graph-view';
import { DirectedGraphSettingTab } from './settings';
import { parseRelationships } from './parser';

export default class DirectedGraphPlugin extends Plugin {
    settings: DirectedGraphSettings = DEFAULT_SETTINGS;
    index: RelationshipIndex = new RelationshipIndex();
    private existingFiles: Set<string> = new Set();
    private debounceTimer: ReturnType<typeof setTimeout> | null = null;

    async onload(): Promise<void> {
        console.log('Loading Directed Graph plugin');

        // Load settings
        await this.loadSettings();

        // Register the custom view
        this.registerView(VIEW_TYPE_DIRECTED_GRAPH, (leaf) => {
            return new DirectedGraphView(
                leaf,
                this.index,
                this.settings,
                this.existingFiles
            );
        });

        // Add ribbon icon
        this.addRibbonIcon('git-fork', 'Open Directed Graph', () => {
            this.activateView();
        });

        // Add command
        this.addCommand({
            id: 'open-directed-graph',
            name: 'Open Directed Graph View',
            callback: () => this.activateView(),
        });

        // Settings tab
        this.addSettingTab(new DirectedGraphSettingTab(this.app, this));

        // Register markdown post-processor for reading view
        this.registerMarkdownPostProcessor(
            (el: HTMLElement, ctx: MarkdownPostProcessorContext) => {
                this.postProcess(el, ctx);
            }
        );

        // Wait for vault to be ready, then perform initial scan
        this.app.workspace.onLayoutReady(async () => {
            await this.performFullScan();
            this.registerVaultEvents();
        });

        // Register editor change listener for autocomplete
        this.registerEvent(
            this.app.workspace.on('editor-change', (editor) => {
                const cursor = editor.getCursor();
                const line = editor.getLine(cursor.line);
                const prefix = line.slice(0, cursor.ch);

                // Check for >[[ pattern, but not ->[[  (avoid re-trigger)
                if (prefix.endsWith('>[[') && !prefix.endsWith('->[[')) {
                    // Replace >[[ with <-->[[  (Obsidian auto-pairs the closing ]])
                    const from = { line: cursor.line, ch: cursor.ch - 3 };
                    const to = cursor;
                    editor.replaceRange('<-->[[', from, to);

                    // Move cursor to end: <-->[[ |
                    // Inserted 6 chars (<-->[[), cursor at from + 6
                    const newCursor = { line: cursor.line, ch: from.ch + 6 };
                    editor.setCursor(newCursor);
                }
            })
        );
    }

    onunload(): void {
        console.log('Unloading Directed Graph plugin');
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_DIRECTED_GRAPH);
    }

    /**
     * Perform initial full vault scan.
     */
    private async performFullScan(): Promise<void> {
        // Build existing files set
        this.updateExistingFiles();

        // Scan all markdown files
        await this.index.fullScan(this.app.vault);

        // Refresh any open graph views
        this.refreshGraphView();
    }

    /**
     * Register vault event listeners for live sync.
     */
    private registerVaultEvents(): void {
        // File modified → re-parse
        this.registerEvent(
            this.app.vault.on('modify', (file: TAbstractFile) => {
                if (file instanceof TFile && file.extension === 'md') {
                    this.debouncedReindex(file);
                }
            })
        );

        // File deleted → remove from index
        this.registerEvent(
            this.app.vault.on('delete', (file: TAbstractFile) => {
                if (file instanceof TFile && file.extension === 'md') {
                    this.index.removeFile(file.basename);
                    this.existingFiles.delete(file.basename);
                    this.refreshGraphView();
                }
            })
        );

        // File renamed → update references
        this.registerEvent(
            this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
                if (file instanceof TFile && file.extension === 'md') {
                    const oldBasename = oldPath.replace(/\.md$/, '').split('/').pop() || '';
                    this.index.renameFile(oldBasename, file.basename);
                    this.existingFiles.delete(oldBasename);
                    this.existingFiles.add(file.basename);
                    this.refreshGraphView();
                }
            })
        );

        // File created → add to existing files
        this.registerEvent(
            this.app.vault.on('create', (file: TAbstractFile) => {
                if (file instanceof TFile && file.extension === 'md') {
                    this.existingFiles.add(file.basename);
                }
            })
        );
    }

    /**
     * Debounced re-index to avoid excessive updates during rapid typing.
     * Updates within 500ms, well within the 2-second spec requirement.
     */
    private debouncedReindex(file: TFile): void {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(async () => {
            const content = await this.app.vault.cachedRead(file);
            this.index.reindexFile(file.basename, content);
            this.refreshGraphView();
        }, 500);
    }

    /**
     * Update the set of existing file basenames.
     */
    private updateExistingFiles(): void {
        this.existingFiles.clear();
        for (const file of this.app.vault.getMarkdownFiles()) {
            this.existingFiles.add(file.basename);
        }
    }

    /**
     * Refresh all open graph views.
     */
    refreshGraphView(): void {
        for (const leaf of this.app.workspace.getLeavesOfType(
            VIEW_TYPE_DIRECTED_GRAPH
        )) {
            const view = leaf.view;
            if (view instanceof DirectedGraphView) {
                view.updateSettings(this.settings);
                view.updateExistingFiles(this.existingFiles);
                view.refresh();
            }
        }
    }

    /**
     * Open or focus the directed graph view.
     */
    private async activateView(): Promise<void> {
        const existing = this.app.workspace.getLeavesOfType(
            VIEW_TYPE_DIRECTED_GRAPH
        );

        if (existing.length > 0) {
            this.app.workspace.revealLeaf(existing[0]);
            return;
        }

        const leaf = this.app.workspace.getRightLeaf(false);
        if (leaf) {
            await leaf.setViewState({
                type: VIEW_TYPE_DIRECTED_GRAPH,
                active: true,
            });
            this.app.workspace.revealLeaf(leaf);
        }
    }

    /**
     * Markdown post-processor: render relationship syntax as styled badges
     * in reading view.
     */
    private postProcess(
        el: HTMLElement,
        ctx: MarkdownPostProcessorContext
    ): void {
        const textNodes = this.getTextNodes(el);

        for (const textNode of textNodes) {
            const text = textNode.textContent || '';
            const regex = /<([+\-][^>]*?[+\-])>\s*\[\[\s*(.*?)\s*\]\]/g;
            let match: RegExpExecArray | null;
            const fragments: (string | HTMLElement)[] = [];
            let lastIndex = 0;
            let hasMatch = false;

            while ((match = regex.exec(text)) !== null) {
                hasMatch = true;
                // Add text before match
                if (match.index > lastIndex) {
                    fragments.push(text.slice(lastIndex, match.index));
                }

                const descriptor = match[1];
                const target = match[2].trim();

                // Parse to get direction and label
                const relationships = parseRelationships(
                    match[0],
                    'temp'
                );

                if (relationships.length > 0) {
                    const rel = relationships[0];
                    const badge = this.createRelationshipBadge(rel, target);
                    fragments.push(badge);
                } else {
                    // Malformed — leave as-is
                    fragments.push(match[0]);
                }

                lastIndex = match.index + match[0].length;
            }

            if (hasMatch) {
                // Add remaining text
                if (lastIndex < text.length) {
                    fragments.push(text.slice(lastIndex));
                }

                // Replace the text node with fragments
                const parent = textNode.parentNode;
                if (parent) {
                    for (const frag of fragments) {
                        if (typeof frag === 'string') {
                            parent.insertBefore(
                                document.createTextNode(frag),
                                textNode
                            );
                        } else {
                            parent.insertBefore(frag, textNode);
                        }
                    }
                    parent.removeChild(textNode);
                }
            }
        }
    }

    /**
     * Create a styled badge element for a relationship in reading view.
     */
    private createRelationshipBadge(
        rel: { direction: string; label: string | null },
        target: string
    ): HTMLElement {
        const badge = document.createElement('span');
        badge.addClass('dg-badge');
        badge.addClass(`dg-badge-${rel.direction}`);

        const arrow = this.getArrowSymbol(rel.direction);
        const label = rel.label ? ` ${rel.label} ` : ' ';

        badge.innerHTML = `<span class="dg-badge-arrow">${arrow}</span><span class="dg-badge-label">${label}</span><a class="dg-badge-target" data-href="${target}">${target}</a>`;

        // Make the target link clickable
        const link = badge.querySelector('.dg-badge-target');
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.app.workspace.openLinkText(target, '');
            });
        }

        return badge;
    }

    private getArrowSymbol(direction: string): string {
        switch (direction) {
            case 'outgoing':
                return '→';
            case 'incoming':
                return '←';
            case 'bidirectional':
                return '↔';
            case 'undirected':
                return '—';
            default:
                return '—';
        }
    }

    /**
     * Get all text nodes within an element (recursive).
     */
    private getTextNodes(el: HTMLElement): Text[] {
        const nodes: Text[] = [];
        const walker = document.createTreeWalker(
            el,
            NodeFilter.SHOW_TEXT,
            null
        );
        let node: Text | null;
        while ((node = walker.nextNode() as Text | null)) {
            nodes.push(node);
        }
        return nodes;
    }

    async loadSettings(): Promise<void> {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData()
        );
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }
}
