// src/lib/intelligence/delegation/delegationTree.ts
import type { ExecutionTreeNode, DelegationStatus, DelegationRiskLevel, TaskEscalation } from "./delegationTypes";

export class DelegationTreeStore {
  private static instance: DelegationTreeStore;
  private nodes: Map<string, ExecutionTreeNode> = new Map();
  private rootTaskIds: string[] = [];

  private constructor() {}

  public static getInstance(): DelegationTreeStore {
    if (!DelegationTreeStore.instance) {
      DelegationTreeStore.instance = new DelegationTreeStore();
    }
    return DelegationTreeStore.instance;
  }

  /**
   * Registers a new node in the execution hierarchy.
   */
  public addNode(node: ExecutionTreeNode): void {
    if (this.nodes.has(node.taskId)) {
      // Update existing if already present
      this.updateNode(node.taskId, node);
      return;
    }

    const newNode: ExecutionTreeNode = {
      ...node,
      children: node.children ? [...node.children] : [],
    };

    this.nodes.set(node.taskId, newNode);

    if (!node.parentTaskId) {
      if (!this.rootTaskIds.includes(node.taskId)) {
        this.rootTaskIds.unshift(node.taskId);
      }
    } else {
      const parent = this.nodes.get(node.parentTaskId);
      if (parent) {
        if (!parent.children.some((c) => c.taskId === node.taskId)) {
          parent.children.push(newNode);
        }
      }
    }
  }

  /**
   * Updates an existing node in the execution tree.
   */
  public updateNode(taskId: string, updates: Partial<ExecutionTreeNode>): ExecutionTreeNode | undefined {
    const existing = this.nodes.get(taskId);
    if (!existing) return undefined;

    const updated: ExecutionTreeNode = {
      ...existing,
      ...updates,
      children: updates.children ? updates.children : existing.children,
    };

    this.nodes.set(taskId, updated);

    // If it's a child node, ensure parent's reference is updated
    if (updated.parentTaskId) {
      const parent = this.nodes.get(updated.parentTaskId);
      if (parent) {
        const idx = parent.children.findIndex((c) => c.taskId === taskId);
        if (idx >= 0) {
          parent.children[idx] = updated;
        } else {
          parent.children.push(updated);
        }
      }
    }

    return updated;
  }

  /**
   * Retrieves a specific node by its taskId.
   */
  public getNode(taskId: string): ExecutionTreeNode | undefined {
    return this.nodes.get(taskId);
  }

  /**
   * Retrieves the full execution tree rooted at rootTaskId.
   */
  public getTree(rootTaskId: string): ExecutionTreeNode | undefined {
    return this.nodes.get(rootTaskId);
  }

  /**
   * Returns all root execution trees, optionally filtered by limit.
   */
  public getAllTrees(options?: { limit?: number }): ExecutionTreeNode[] {
    const limit = options?.limit ?? 20;
    const roots: ExecutionTreeNode[] = [];

    for (const rootId of this.rootTaskIds) {
      const node = this.nodes.get(rootId);
      if (node) {
        roots.push(node);
      }
      if (roots.length >= limit) break;
    }

    return roots;
  }

  /**
   * Clears the in-memory tree store (used for tests).
   */
  public clear(): void {
    this.nodes.clear();
    this.rootTaskIds = [];
  }
}

export const delegationTreeStore = DelegationTreeStore.getInstance();
