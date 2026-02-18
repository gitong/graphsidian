import { describe, it, expect } from 'vitest';
import { parseRelationships } from '../src/parser';

describe('Relationship Syntax Parsing', () => {
    // -----------------------------------------------------------
    // Outgoing Arrow Without Label: <-+>
    // -----------------------------------------------------------

    it('parses outgoing arrow without label: <-+>[[Target]]', () => {
        const result = parseRelationships('<-+>[[Target]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            sourceFile: 'Awal',
            targetFile: 'Target',
            direction: 'outgoing',
            label: null,
        });
    });

    it('trims whitespace in target: <-+>[[  Target  ]]', () => {
        const result = parseRelationships('<-+>[[  Target  ]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0].targetFile).toBe('Target');
    });

    // -----------------------------------------------------------
    // Incoming Arrow Without Label: <+->
    // -----------------------------------------------------------

    it('parses incoming arrow without label: <+->[[Target]]', () => {
        const result = parseRelationships('<+->[[Target]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            sourceFile: 'Awal',
            targetFile: 'Target',
            direction: 'incoming',
            label: null,
        });
    });

    // -----------------------------------------------------------
    // Undirected Edge With Label: <-text->
    // -----------------------------------------------------------

    it('parses undirected relationship with label: <-arah->[[Target]]', () => {
        const result = parseRelationships('<-arah->[[Target]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            sourceFile: 'Awal',
            targetFile: 'Target',
            direction: 'undirected',
            label: 'arah',
        });
    });

    it('parses undirected with multi-word label: <-depends on->[[Library Core]]', () => {
        const result = parseRelationships('<-depends on->[[Library Core]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            targetFile: 'Library Core',
            direction: 'undirected',
            label: 'depends on',
        });
    });

    // -----------------------------------------------------------
    // Incoming Arrow With Label: <+arah->
    // -----------------------------------------------------------

    it('parses incoming arrow with label: <+arah->[[Target]]', () => {
        const result = parseRelationships('<+arah->[[Target]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            direction: 'incoming',
            label: 'arah',
        });
    });

    // -----------------------------------------------------------
    // Outgoing Arrow With Label: <-arah+>
    // -----------------------------------------------------------

    it('parses outgoing arrow with label: <-arah+>[[Target]]', () => {
        const result = parseRelationships('<-arah+>[[Target]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            direction: 'outgoing',
            label: 'arah',
        });
    });

    // -----------------------------------------------------------
    // Bidirectional Arrow: <++> and <+text+>
    // -----------------------------------------------------------

    it('parses bidirectional arrow without label: <++>[[Target]]', () => {
        const result = parseRelationships('<++>[[Target]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            direction: 'bidirectional',
            label: null,
        });
    });

    it('parses bidirectional arrow with label: <+collaborates+>[[Target]]', () => {
        const result = parseRelationships('<+collaborates+>[[Target]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            direction: 'bidirectional',
            label: 'collaborates',
        });
    });

    // -----------------------------------------------------------
    // Undirected Without Label: <-->
    // -----------------------------------------------------------

    it('parses undirected without label: <-->[[Target]]', () => {
        const result = parseRelationships('<-->[[Target]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            direction: 'undirected',
            label: null,
        });
    });

    // -----------------------------------------------------------
    // Multiple Relationships in One Note
    // -----------------------------------------------------------

    it('parses multiple relationships in one note', () => {
        const content = `Some context here.
<-+>[[Alpha]]
More text in between.
<+depends on->[[Beta]]
<-manages->[[Gamma]]`;

        const result = parseRelationships(content, 'Awal');
        expect(result).toHaveLength(3);

        expect(result[0]).toMatchObject({
            sourceFile: 'Awal',
            targetFile: 'Alpha',
            direction: 'outgoing',
            label: null,
        });

        expect(result[1]).toMatchObject({
            sourceFile: 'Awal',
            targetFile: 'Beta',
            direction: 'incoming',
            label: 'depends on',
        });

        expect(result[2]).toMatchObject({
            sourceFile: 'Awal',
            targetFile: 'Gamma',
            direction: 'undirected',
            label: 'manages',
        });
    });

    // -----------------------------------------------------------
    // Edge Cases
    // -----------------------------------------------------------

    it('ignores malformed syntax — missing closing brackets', () => {
        const result = parseRelationships('<-+>[[Target', 'Awal');
        expect(result).toHaveLength(0);
    });

    it('ignores standard Obsidian wikilinks', () => {
        const result = parseRelationships(
            'This references [[Target]] normally.',
            'Awal'
        );
        expect(result).toHaveLength(0);
    });

    it('does not match HTML tags like <div>[[Target]]', () => {
        const result = parseRelationships('<div>[[Target]]', 'Awal');
        expect(result).toHaveLength(0);
    });

    it('produces two separate relationships from conflicting declarations', () => {
        const fromAwal = parseRelationships('<-+>[[Target]]', 'Awal');
        const fromTarget = parseRelationships('<-+>[[Awal]]', 'Target');

        expect(fromAwal).toHaveLength(1);
        expect(fromTarget).toHaveLength(1);
        expect(fromAwal[0].direction).toBe('outgoing');
        expect(fromTarget[0].direction).toBe('outgoing');
        expect(fromAwal[0].sourceFile).toBe('Awal');
        expect(fromTarget[0].sourceFile).toBe('Target');
    });

    it('does not merge duplicate declarations from different files', () => {
        const fromAwal = parseRelationships('<-manages+>[[Target]]', 'Awal');
        const fromTarget = parseRelationships('<+manages->[[Awal]]', 'Target');

        expect(fromAwal).toHaveLength(1);
        expect(fromTarget).toHaveLength(1);
        expect(fromAwal[0].sourceFile).toBe('Awal');
        expect(fromTarget[0].sourceFile).toBe('Target');
    });

    // -----------------------------------------------------------
    // Line number tracking
    // -----------------------------------------------------------

    it('correctly tracks line numbers', () => {
        const content = `Line 1
<-+>[[Alpha]]
Line 3
<-manages->[[Beta]]`;

        const result = parseRelationships(content, 'Awal');
        expect(result).toHaveLength(2);
        expect(result[0].line).toBe(2);
        expect(result[1].line).toBe(4);
    });

    // -----------------------------------------------------------
    // Spaces between descriptor and target
    // -----------------------------------------------------------

    it('allows spaces between descriptor and target: <-arah-> [[Target]]', () => {
        const result = parseRelationships('<-arah-> [[Target]]', 'Awal');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            direction: 'undirected',
            label: 'arah',
            targetFile: 'Target',
        });
    });
});
