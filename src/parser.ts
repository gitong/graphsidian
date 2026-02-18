import { Relationship } from './types';

/**
 * Regex to match the relationship syntax: <descriptor>[[target]]
 * The descriptor must start and end with - or +.
 * Captures:
 *   group 1 = descriptor (content between < and >, e.g. "-+", "+-", "-text-")
 *   group 2 = target name (text between [[ and ]], trimmed)
 */
const RELATIONSHIP_REGEX = /<([+\-][^>]*?[+\-])>\s*\[\[\s*(.*?)\s*\]\]/g;

/**
 * Generate a simple unique ID for a relationship.
 */
function generateId(sourceFile: string, line: number, index: number): string {
    return `${sourceFile}:${line}:${index}`;
}

/**
 * Parse a descriptor string to determine direction and label.
 *
 * The first and last characters determine direction:
 *   first=-  last=+ → outgoing     (e.g. "-+" or "-text+")
 *   first=+  last=- → incoming     (e.g. "+-" or "+text-")
 *   first=+  last=+ → bidirectional (e.g. "++" or "+text+")
 *   first=-  last=- → undirected   (e.g. "--" or "-text-")
 *
 * The label is the text between the first and last characters (trimmed).
 * If there is no text between them (length == 2), label is null.
 */
function parseDescriptor(
    descriptor: string
): { direction: Relationship['direction']; label: string | null } | null {
    const d = descriptor.trim();

    // Must have at least 2 chars (leading boundary + trailing boundary)
    if (d.length < 2) {
        return null;
    }

    const first = d[0];
    const last = d[d.length - 1];

    // Must start and end with - or +
    if ((first !== '-' && first !== '+') || (last !== '-' && last !== '+')) {
        return null;
    }

    // Determine direction from boundary characters
    let direction: Relationship['direction'];
    if (first === '-' && last === '+') direction = 'outgoing';
    else if (first === '+' && last === '-') direction = 'incoming';
    else if (first === '+' && last === '+') direction = 'bidirectional';
    else direction = 'undirected'; // first === '-' && last === '-'

    // Extract label (text between boundary chars)
    const labelText = d.length > 2 ? d.slice(1, -1).trim() : null;
    const label = labelText && labelText.length > 0 ? labelText : null;

    return { direction, label };
}

/**
 * Parse all relationship declarations from a note's content.
 *
 * @param content - Raw text content of the note
 * @param sourceFile - Filename of the source note (without .md extension)
 * @returns Array of parsed Relationship objects
 */
export function parseRelationships(
    content: string,
    sourceFile: string
): Relationship[] {
    const relationships: Relationship[] = [];
    const lines = content.split('\n');
    let matchIndex = 0;

    // Reset regex state
    RELATIONSHIP_REGEX.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = RELATIONSHIP_REGEX.exec(content)) !== null) {
        const descriptor = match[1];
        const targetRaw = match[2];

        // Determine which line this match is on
        const matchPos = match.index;
        let lineNumber = 1;
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
            charCount += lines[i].length + 1; // +1 for newline
            if (charCount > matchPos) {
                lineNumber = i + 1;
                break;
            }
        }

        const target = targetRaw.trim();
        if (target.length === 0) {
            matchIndex++;
            continue;
        }

        const parsed = parseDescriptor(descriptor);
        if (parsed === null) {
            matchIndex++;
            continue;
        }

        relationships.push({
            id: generateId(sourceFile, lineNumber, matchIndex),
            sourceFile,
            targetFile: target,
            direction: parsed.direction,
            label: parsed.label,
            line: lineNumber,
        });

        matchIndex++;
    }

    return relationships;
}
