import { Vault, TFile } from 'obsidian';
import { Relationship } from './types';
import { parseRelationships } from './parser';

/**
 * In-memory index of all relationships across the vault.
 * Keyed by source filename for efficient per-file updates.
 */
export class RelationshipIndex {
    private relationships: Map<string, Relationship[]> = new Map();

    /**
     * Re-parse a single file and update its relationships in the index.
     */
    reindexFile(filename: string, content: string): void {
        const sourceKey = this.stripExtension(filename);
        const parsed = parseRelationships(content, sourceKey);
        this.relationships.set(sourceKey, parsed);
    }

    /**
     * Remove all relationships originating from a file.
     */
    removeFile(filename: string): void {
        const sourceKey = this.stripExtension(filename);
        this.relationships.delete(sourceKey);
    }

    /**
     * Handle a file rename: update source references AND target references.
     */
    renameFile(oldName: string, newName: string): void {
        const oldKey = this.stripExtension(oldName);
        const newKey = this.stripExtension(newName);

        // Update source-keyed entry
        const rels = this.relationships.get(oldKey);
        if (rels) {
            this.relationships.delete(oldKey);
            const updated = rels.map((r) => ({
                ...r,
                sourceFile: newKey,
                id: r.id.replace(oldKey, newKey),
            }));
            this.relationships.set(newKey, updated);
        }

        // Update target references across all files
        for (const [key, fileRels] of this.relationships) {
            let changed = false;
            const updatedRels = fileRels.map((r) => {
                if (r.targetFile === oldKey) {
                    changed = true;
                    return { ...r, targetFile: newKey };
                }
                return r;
            });
            if (changed) {
                this.relationships.set(key, updatedRels);
            }
        }
    }

    /**
     * Get all relationships across the entire vault.
     */
    getAllRelationships(): Relationship[] {
        const all: Relationship[] = [];
        for (const rels of this.relationships.values()) {
            all.push(...rels);
        }
        return all;
    }

    /**
     * Get relationships originating from a specific file.
     */
    getRelationshipsForFile(filename: string): Relationship[] {
        const key = this.stripExtension(filename);
        return this.relationships.get(key) || [];
    }

    /**
     * Perform a full vault scan, parsing every markdown file.
     */
    async fullScan(vault: Vault): Promise<void> {
        this.relationships.clear();
        const files = vault.getMarkdownFiles();
        for (const file of files) {
            const content = await vault.cachedRead(file);
            this.reindexFile(file.basename, content);
        }
    }

    /**
     * Get all unique node names (both sources and targets).
     */
    getAllNodes(): string[] {
        const nodes = new Set<string>();
        for (const rels of this.relationships.values()) {
            for (const r of rels) {
                nodes.add(r.sourceFile);
                nodes.add(r.targetFile);
            }
        }
        return Array.from(nodes);
    }

    /**
     * Strip .md extension from a filename if present.
     */
    private stripExtension(filename: string): string {
        return filename.replace(/\.md$/, '');
    }
}
