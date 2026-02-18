import { Relationship } from './types';

/**
 * Regex to match the relationship syntax: <<descriptor>>[[target]]
 * Captures:
 *   group 1 = descriptor (text between << and >>)
 *   group 2 = target name (text between [[ and ]], trimmed)
 */
const RELATIONSHIP_REGEX = /<<([^>]*?)>>\[\[\s*(.*?)\s*\]\]/g;

/**
 * Generate a simple unique ID for a relationship.
 */
function generateId(sourceFile: string, line: number, index: number): string {
    return `${sourceFile}:${line}:${index}`;
}

/**
 * Parse a descriptor string (the text between << and >>) to determine
 * direction and label.
 *
 * Rules:
 *   "-+"           → outgoing, no label
 *   "+-"           → incoming, no label
 *   "++"           → bidirectional, no label
 *   "+text+"       → bidirectional, label = text
 *   "+text"        → incoming, label = text
 *   "text+"        → outgoing, label = text
 *   "text"         → undirected, label = text
 *   empty / "-" only / other invalid → null (skip)
 */
function parseDescriptor(
    descriptor: string
): { direction: Relationship['direction']; label: string | null } | null {
    // Trim whitespace
    const d = descriptor.trim();

    // Empty descriptor is malformed
    if (d.length === 0) {
        return null;
    }

    // Exact arrow tokens (no label)
    if (d === '-+') {
        return { direction: 'outgoing', label: null };
    }
    if (d === '+-') {
        return { direction: 'incoming', label: null };
    }
    if (d === '++') {
        return { direction: 'bidirectional', label: null };
    }

    // Check for descriptors that are only dashes/plusses but don't match above
    // e.g. "-", "--", "---", etc. → malformed
    if (/^[-+]+$/.test(d) && d !== '-+' && d !== '+-' && d !== '++') {
        // Check if it could be a label with + prefix/suffix
        // "++" is already handled, so remaining pure symbol combos are invalid
        // unless they match +label+ / +label / label+ patterns below
        // Only pure - combinations are invalid
        if (/^-+$/.test(d)) {
            return null;
        }
    }

    // Bidirectional with label: +label+
    if (d.startsWith('+') && d.endsWith('+') && d.length > 2) {
        const label = d.slice(1, -1).trim();
        if (label.length === 0) {
            return null;
        }
        return { direction: 'bidirectional', label };
    }

    // Incoming with label: +label (starts with + but doesn't end with +)
    if (d.startsWith('+') && !d.endsWith('+')) {
        const label = d.slice(1).trim();
        if (label.length === 0) {
            return null;
        }
        return { direction: 'incoming', label };
    }

    // Outgoing with label: label+ (ends with + but doesn't start with +)
    if (d.endsWith('+') && !d.startsWith('+')) {
        const label = d.slice(0, -1).trim();
        if (label.length === 0) {
            return null;
        }
        return { direction: 'outgoing', label };
    }

    // Undirected with label: just text (no + or - at boundaries)
    // Must contain at least one letter or digit to be a valid label
    if (/[a-zA-Z0-9]/.test(d)) {
        return { direction: 'undirected', label: d };
    }

    // Anything else is malformed
    return null;
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
