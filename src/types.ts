/**
 * Core data model for a directed/labeled relationship between two notes.
 */
export interface Relationship {
    /** Auto-generated unique ID */
    id: string;
    /** Filename where the syntax is declared (without .md extension) */
    sourceFile: string;
    /** Resolved target filename (without .md extension) */
    targetFile: string;
    /** Direction of the relationship */
    direction: 'outgoing' | 'incoming' | 'undirected' | 'bidirectional';
    /** Optional label text, null if unlabeled */
    label: string | null;
    /** Line number in source file where the declaration appears (1-indexed) */
    line: number;
}

/**
 * Plugin settings persisted to data.json.
 */
export interface DirectedGraphSettings {
    showArrows: boolean;
    showLabels: boolean;
    labelFilter: string;
    outgoingColor: string;
    incomingColor: string;
    undirectedColor: string;
    bidirectionalColor: string;
    linkDistance: number;
    nodeRepulsion: number;
}

export const DEFAULT_SETTINGS: DirectedGraphSettings = {
    showArrows: true,
    showLabels: true,
    labelFilter: '',
    outgoingColor: '#00BFFF',
    incomingColor: '#FF6347',
    undirectedColor: '#999999',
    bidirectionalColor: '#9B59B6',
    linkDistance: 150,
    nodeRepulsion: 300,
};

export const VIEW_TYPE_DIRECTED_GRAPH = 'directed-graph-view';
