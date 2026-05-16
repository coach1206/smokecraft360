/**
 * relationshipGraph — core directed weighted graph data structure
 * used by all domain-specific knowledge graphs.
 */

export type EntityType =
  | "guest" | "product" | "recommendation" | "environment"
  | "venue"  | "session"  | "orchestration"  | "social_group"
  | "temporal_pattern" | "staff";

export interface GraphNode {
  id:         string;
  type:       EntityType;
  label:      string;
  properties: Record<string, unknown>;
  createdAt:  number;
  updatedAt:  number;
}

export interface GraphEdge {
  id:         string;
  fromId:     string;
  toId:       string;
  relation:   string;
  weight:     number; // 0–1
  properties: Record<string, unknown>;
  createdAt:  number;
}

export class RelationshipGraph {
  readonly name: string;
  private readonly nodes = new Map<string, GraphNode>();
  private readonly edges = new Map<string, GraphEdge>();
  private readonly adjacency  = new Map<string, Set<string>>();
  private readonly reverseAdj = new Map<string, Set<string>>();

  constructor(name: string) { this.name = name; }

  // ── Nodes ─────────────────────────────────────────────────────────────────

  upsertNode(id: string, type: EntityType, label: string, props: Record<string, unknown> = {}): GraphNode {
    const existing = this.nodes.get(id);
    const now = Date.now();
    const node: GraphNode = {
      id, type, label,
      properties: { ...(existing?.properties ?? {}), ...props },
      createdAt:  existing?.createdAt ?? now,
      updatedAt:  now,
    };
    this.nodes.set(id, node);
    if (!this.adjacency.has(id))  this.adjacency.set(id,  new Set());
    if (!this.reverseAdj.has(id)) this.reverseAdj.set(id, new Set());
    return node;
  }

  getNode(id: string): GraphNode | undefined { return this.nodes.get(id); }

  removeNode(id: string): void {
    // Remove all edges involving this node
    for (const edgeId of [...(this.adjacency.get(id) ?? []), ...(this.reverseAdj.get(id) ?? [])]) {
      this.removeEdge(edgeId);
    }
    this.nodes.delete(id);
    this.adjacency.delete(id);
    this.reverseAdj.delete(id);
  }

  // ── Edges ─────────────────────────────────────────────────────────────────

  addEdge(
    fromId:   string,
    toId:     string,
    relation: string,
    weight:   number = 1.0,
    props:    Record<string, unknown> = {},
  ): GraphEdge {
    const id   = `${fromId}:${relation}:${toId}`;
    const edge: GraphEdge = { id, fromId, toId, relation, weight, properties: props, createdAt: Date.now() };
    this.edges.set(id, edge);
    this.adjacency.get(fromId)?.add(id)  ?? this.adjacency.set(fromId, new Set([id]));
    this.reverseAdj.get(toId)?.add(id)   ?? this.reverseAdj.set(toId,  new Set([id]));
    return edge;
  }

  removeEdge(edgeId: string): void {
    const edge = this.edges.get(edgeId);
    if (!edge) return;
    this.adjacency.get(edge.fromId)?.delete(edgeId);
    this.reverseAdj.get(edge.toId)?.delete(edgeId);
    this.edges.delete(edgeId);
  }

  updateWeight(fromId: string, toId: string, relation: string, weight: number): void {
    const id   = `${fromId}:${relation}:${toId}`;
    const edge = this.edges.get(id);
    if (edge) edge.weight = Math.max(0, Math.min(1, weight));
  }

  // ── Traversal ──────────────────────────────────────────────────────────────

  neighbors(nodeId: string, relation?: string): GraphNode[] {
    const edgeIds = [...(this.adjacency.get(nodeId) ?? [])];
    return edgeIds
      .map(id => this.edges.get(id))
      .filter((e): e is GraphEdge => !!e && (!relation || e.relation === relation))
      .map(e => this.nodes.get(e.toId))
      .filter((n): n is GraphNode => !!n);
  }

  incomingNeighbors(nodeId: string, relation?: string): GraphNode[] {
    const edgeIds = [...(this.reverseAdj.get(nodeId) ?? [])];
    return edgeIds
      .map(id => this.edges.get(id))
      .filter((e): e is GraphEdge => !!e && (!relation || e.relation === relation))
      .map(e => this.nodes.get(e.fromId))
      .filter((n): n is GraphNode => !!n);
  }

  shortestPath(fromId: string, toId: string): string[] {
    const queue   = [[fromId]];
    const visited = new Set<string>([fromId]);
    while (queue.length) {
      const path = queue.shift()!;
      const last = path[path.length - 1];
      if (last === toId) return path;
      for (const nb of this.neighbors(last)) {
        if (!visited.has(nb.id)) {
          visited.add(nb.id);
          queue.push([...path, nb.id]);
        }
      }
    }
    return [];
  }

  // ── Serialization ──────────────────────────────────────────────────────────

  stats(): { nodes: number; edges: number } {
    return { nodes: this.nodes.size, edges: this.edges.size };
  }

  toJSON(): { nodes: GraphNode[]; edges: GraphEdge[] } {
    return { nodes: [...this.nodes.values()], edges: [...this.edges.values()] };
  }
}
