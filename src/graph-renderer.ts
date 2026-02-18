import * as d3 from 'd3';
import { Relationship, DirectedGraphSettings } from './types';

interface GraphNode extends d3.SimulationNodeDatum {
    id: string;
    isGhost: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
    relationship: Relationship;
    curveOffset: number;
}

/**
 * D3-based force-directed graph renderer.
 * Handles SVG creation, force simulation, arrows, labels, and interactions.
 */
export class GraphRenderer {
    private container: HTMLElement;
    private settings: DirectedGraphSettings;
    private existingFiles: Set<string>;
    private onNavigate: (filename: string, line?: number) => void;
    private onCreate: (filename: string) => void;

    private svg!: d3.Selection<SVGSVGElement, unknown, null, undefined>;
    private g!: d3.Selection<SVGGElement, unknown, null, undefined>;
    private simulation!: d3.Simulation<GraphNode, GraphLink>;

    private nodes: GraphNode[] = [];
    private links: GraphLink[] = [];
    private width = 800;
    private height = 600;
    private resizeObserver: ResizeObserver | null = null;

    constructor(
        container: HTMLElement,
        settings: DirectedGraphSettings,
        existingFiles: Set<string>,
        onNavigate: (filename: string, line?: number) => void,
        onCreate: (filename: string) => void
    ) {
        this.container = container;
        this.settings = settings;
        this.existingFiles = existingFiles;
        this.onNavigate = onNavigate;
        this.onCreate = onCreate;

        this.initSvg();
        this.initSimulation();
    }

    private initSvg(): void {
        // SVG
        this.svg = d3
            .select(this.container)
            .append('svg')
            .attr('class', 'dg-svg')
            .attr('width', '100%')
            .attr('height', '100%');

        // Get actual dimensions
        const rect = this.container.getBoundingClientRect();
        this.width = rect.width || 800;
        this.height = rect.height || 600;

        // Defs for arrow markers
        const defs = this.svg.append('defs');
        this.createMarkers(defs);

        // Zoomable group
        this.g = this.svg.append('g');

        // Zoom behavior
        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event) => {
                this.g.attr('transform', event.transform);
            });

        this.svg.call(zoom);

        // Resize observer
        this.resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                this.width = entry.contentRect.width;
                this.height = entry.contentRect.height;
                if (this.simulation) {
                    this.simulation
                        .force(
                            'center',
                            d3.forceCenter(this.width / 2, this.height / 2)
                        )
                        .alpha(0.3)
                        .restart();
                }
            }
        });
        this.resizeObserver.observe(this.container);
    }

    private createMarkers(
        defs: d3.Selection<SVGDefsElement, unknown, null, undefined>
    ): void {
        const directions = [
            { id: 'arrow-outgoing', color: this.settings.outgoingColor },
            { id: 'arrow-incoming', color: this.settings.incomingColor },
            { id: 'arrow-bidirectional', color: this.settings.bidirectionalColor },
        ];

        for (const { id, color } of directions) {
            defs
                .append('marker')
                .attr('id', id)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 20)
                .attr('refY', 0)
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', color);

            // Reverse marker for bidirectional start
            defs
                .append('marker')
                .attr('id', `${id}-reverse`)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', -10)
                .attr('refY', 0)
                .attr('markerWidth', 8)
                .attr('markerHeight', 8)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M10,-5L0,0L10,5')
                .attr('fill', color);
        }
    }

    private initSimulation(): void {
        this.simulation = d3
            .forceSimulation<GraphNode>()
            .force(
                'link',
                d3
                    .forceLink<GraphNode, GraphLink>()
                    .id((d) => d.id)
                    .distance(this.settings.linkDistance)
            )
            .force('charge', d3.forceManyBody().strength(-this.settings.nodeRepulsion))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .force('collision', d3.forceCollide().radius(40));
    }

    /**
     * Update the graph with new data.
     */
    update(nodeNames: string[], relationships: Relationship[]): void {
        // Filter by label if set
        let filtered = relationships;
        if (this.settings.labelFilter.trim()) {
            const filter = this.settings.labelFilter.trim().toLowerCase();
            filtered = relationships.filter(
                (r) => r.label && r.label.toLowerCase().includes(filter)
            );
        }

        // Build nodes
        const nodeSet = new Set<string>();
        for (const name of nodeNames) {
            nodeSet.add(name);
        }
        for (const r of filtered) {
            nodeSet.add(r.sourceFile);
            nodeSet.add(r.targetFile);
        }

        // Preserve positions of existing nodes
        const oldNodeMap = new Map<string, GraphNode>();
        for (const n of this.nodes) {
            oldNodeMap.set(n.id, n);
        }

        this.nodes = Array.from(nodeSet).map((id) => {
            const existing = oldNodeMap.get(id);
            return {
                id,
                isGhost: !this.existingFiles.has(id),
                x: existing?.x ?? this.width / 2 + (Math.random() - 0.5) * 100,
                y: existing?.y ?? this.height / 2 + (Math.random() - 0.5) * 100,
                vx: existing?.vx,
                vy: existing?.vy,
            };
        });

        // Build links with curve offsets for parallel edges
        const edgeCounts = new Map<string, number>();
        this.links = filtered.map((r) => {
            const key = [r.sourceFile, r.targetFile].sort().join('--');
            const count = edgeCounts.get(key) || 0;
            edgeCounts.set(key, count + 1);

            return {
                source: r.sourceFile,
                target: r.targetFile,
                relationship: r,
                curveOffset: count * 30,
            };
        });

        this.render();
    }

    private render(): void {
        // Clear existing elements
        this.g.selectAll('*').remove();

        // Links group
        const linkGroup = this.g
            .append('g')
            .attr('class', 'dg-links');

        const linkElements = linkGroup
            .selectAll('path')
            .data(this.links)
            .enter()
            .append('path')
            .attr('class', 'dg-link')
            .attr('fill', 'none')
            .attr('stroke', (d) => this.getEdgeColor(d.relationship))
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', 'none')
            .attr('marker-end', (d) => this.getMarkerEnd(d.relationship))
            .attr('marker-start', (d) => this.getMarkerStart(d.relationship))
            .style('cursor', 'pointer')
            .on('click', (_event, d) => {
                this.onNavigate(d.relationship.sourceFile, d.relationship.line);
            });

        // Link labels
        const labelGroup = this.g
            .append('g')
            .attr('class', 'dg-labels');

        const labelElements = this.settings.showLabels
            ? labelGroup
                .selectAll('text')
                .data(this.links.filter((l) => l.relationship.label))
                .enter()
                .append('text')
                .attr('class', 'dg-link-label')
                .attr('text-anchor', 'middle')
                .attr('dy', -8)
                .text((d) => d.relationship.label || '')
            : null;

        // Nodes group
        const nodeGroup = this.g
            .append('g')
            .attr('class', 'dg-nodes');

        const nodeElements = nodeGroup
            .selectAll('g')
            .data(this.nodes)
            .enter()
            .append('g')
            .attr('class', 'dg-node')
            .style('cursor', 'pointer')
            .call(this.dragBehavior() as any)
            .on('click', (_event, d) => {
                if (d.isGhost) {
                    this.onCreate(d.id);
                } else {
                    this.onNavigate(d.id);
                }
            });

        // Node circles
        nodeElements
            .append('circle')
            .attr('r', 12)
            .attr('class', (d) => (d.isGhost ? 'dg-node-ghost' : 'dg-node-normal'))
            .attr('fill', (d) => (d.isGhost ? 'rgba(150,150,150,0.3)' : '#6c5ce7'))
            .attr('stroke', (d) => (d.isGhost ? '#999' : '#a29bfe'))
            .attr('stroke-width', 2)
            .attr('stroke-dasharray', (d) => (d.isGhost ? '4,2' : 'none'));

        // Node labels
        nodeElements
            .append('text')
            .attr('class', 'dg-node-label')
            .attr('dx', 16)
            .attr('dy', 4)
            .text((d) => d.id)
            .style('opacity', (d) => (d.isGhost ? 0.5 : 1));

        // Update simulation
        this.simulation.nodes(this.nodes).on('tick', () => {
            linkElements.attr('d', (d) => {
                const source = d.source as GraphNode;
                const target = d.target as GraphNode;
                if (d.curveOffset === 0) {
                    return `M${source.x},${source.y}L${target.x},${target.y}`;
                }
                // Curved path for parallel edges
                const dx = (target.x || 0) - (source.x || 0);
                const dy = (target.y || 0) - (source.y || 0);
                const dr = Math.sqrt(dx * dx + dy * dy);
                const offset = d.curveOffset;
                return `M${source.x},${source.y}A${dr + offset},${dr + offset} 0 0,1 ${target.x},${target.y}`;
            });

            if (labelElements) {
                labelElements
                    .attr('x', (d) => {
                        const s = d.source as GraphNode;
                        const t = d.target as GraphNode;
                        return ((s.x || 0) + (t.x || 0)) / 2;
                    })
                    .attr('y', (d) => {
                        const s = d.source as GraphNode;
                        const t = d.target as GraphNode;
                        return ((s.y || 0) + (t.y || 0)) / 2;
                    });
            }

            nodeElements.attr('transform', (d) => `translate(${d.x},${d.y})`);
        });

        (
            this.simulation.force('link') as d3.ForceLink<GraphNode, GraphLink>
        ).links(this.links);

        this.simulation.alpha(0.8).restart();
    }

    private getEdgeColor(r: Relationship): string {
        switch (r.direction) {
            case 'outgoing':
                return this.settings.outgoingColor;
            case 'incoming':
                return this.settings.incomingColor;
            case 'bidirectional':
                return this.settings.bidirectionalColor;
            case 'undirected':
                return this.settings.undirectedColor;
        }
    }

    private getMarkerEnd(r: Relationship): string {
        if (!this.settings.showArrows) return '';
        switch (r.direction) {
            case 'outgoing':
                return 'url(#arrow-outgoing)';
            case 'incoming':
                return '';
            case 'bidirectional':
                return 'url(#arrow-bidirectional)';
            case 'undirected':
                return '';
        }
    }

    private getMarkerStart(r: Relationship): string {
        if (!this.settings.showArrows) return '';
        switch (r.direction) {
            case 'incoming':
                return 'url(#arrow-incoming-reverse)';
            case 'bidirectional':
                return 'url(#arrow-bidirectional-reverse)';
            default:
                return '';
        }
    }


    private dragBehavior(): d3.DragBehavior<Element, GraphNode, GraphNode> {
        return d3
            .drag<Element, GraphNode>()
            .on('start', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) this.simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            });
    }

    /**
     * Update settings and re-render markers/colors.
     */
    updateSettings(settings: DirectedGraphSettings): void {
        this.settings = settings;
        // Rebuild markers with new colors
        this.svg.select('defs').remove();
        const defs = this.svg.insert('defs', ':first-child');
        this.createMarkers(defs);
        // Re-render
        const nodeNames = this.nodes.map((n) => n.id);
        const relationships = this.links.map((l) => l.relationship);
        this.update(nodeNames, relationships);
    }

    /**
     * Update existing files set (for ghost detection).
     */
    updateExistingFiles(files: Set<string>): void {
        this.existingFiles = files;
    }

    /**
     * Clean up all resources.
     */
    destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        this.simulation.stop();
        this.svg.remove();
    }
}
