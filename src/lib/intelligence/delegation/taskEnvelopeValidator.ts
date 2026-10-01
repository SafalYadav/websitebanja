// src/lib/intelligence/delegation/taskEnvelopeValidator.ts
import {
  TaskEnvelope,
  TaskEnvelopeSchema,
  DelegationRiskLevel,
} from "./delegationTypes";
import { redactSecretsInString, redactSecretsInObject } from "../memory/memoryStore";

const RISK_RANKS: Record<DelegationRiskLevel, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

export interface ValidationOutcome {
  valid: boolean;
  errors: string[];
  sanitizedEnvelope?: TaskEnvelope;
}

export class TaskEnvelopeValidator {
  private static instance: TaskEnvelopeValidator;

  public static getInstance(): TaskEnvelopeValidator {
    if (!TaskEnvelopeValidator.instance) {
      TaskEnvelopeValidator.instance = new TaskEnvelopeValidator();
    }
    return TaskEnvelopeValidator.instance;
  }

  /**
   * Validates a standalone Task Envelope against schema and safety standards.
   */
  public validateEnvelope(envelope: unknown): ValidationOutcome {
    const parseResult = TaskEnvelopeSchema.safeParse(envelope);
    if (!parseResult.success) {
      const errors = parseResult.error.issues.map(
        (i) => `Field '${i.path.join(".")}': ${i.message}`
      );
      return { valid: false, errors };
    }

    const data = parseResult.data as TaskEnvelope;
    const errors: string[] = [];

    // Redact any accidental secrets inside strings
    const sanitizedEnvelope: TaskEnvelope = {
      ...data,
      objective: redactSecretsInString(data.objective),
      constraints: (data.constraints || []).map((c) => redactSecretsInString(c)),
      input: redactSecretsInObject(data.input),
      metadata: data.metadata ? redactSecretsInObject(data.metadata) : undefined,
    };

    // Depth check
    if (sanitizedEnvelope.depth > 2) {
      errors.push(`Delegation depth ${sanitizedEnvelope.depth} exceeds maximum allowable depth (2).`);
    }

    // Agent hierarchy validation
    if (sanitizedEnvelope.depth === 0) {
      const agentLower = sanitizedEnvelope.agent.toLowerCase();
      if (agentLower !== "executive" && agentLower !== "ceo") {
        errors.push(`Depth 0 task must belong to CEO / Executive. Found: '${sanitizedEnvelope.agent}'.`);
      }
    } else if (sanitizedEnvelope.depth === 1) {
      const agentLower = sanitizedEnvelope.agent.toLowerCase();
      if (agentLower !== "boss") {
        errors.push(`Depth 1 task must belong to Boss supervisor. Found: '${sanitizedEnvelope.agent}'.`);
      }
    } else if (sanitizedEnvelope.depth === 2) {
      const allowedDepth2 = ["skills", "uniqueness", "generator", "mitra", "planner", "extractor", "designer"];
      if (!allowedDepth2.includes(sanitizedEnvelope.agent.toLowerCase())) {
        errors.push(`Depth 2 agent '${sanitizedEnvelope.agent}' is not a recognized specialized worker.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedEnvelope,
    };
  }

  /**
   * Validates hierarchical propagation invariants between a parent and child Task Envelope.
   * Enforces tool allowlist narrowing, budget bounds, deadline constraints, risk propagation,
   * human approval retention, and tenant isolation.
   */
  public validateChildDelegation(
    parent: TaskEnvelope,
    child: TaskEnvelope
  ): ValidationOutcome {
    const standalone = this.validateEnvelope(child);
    const errors: string[] = [...standalone.errors];

    // 1. Parent/Child ID linkage
    if (child.parentTaskId !== parent.taskId) {
      errors.push(`Child parentTaskId ('${child.parentTaskId}') must match parent taskId ('${parent.taskId}').`);
    }

    // 2. Strict Depth increment: Child depth must be exactly parent.depth + 1
    if (child.depth !== parent.depth + 1) {
      errors.push(`Child depth (${child.depth}) must be exactly parent depth (${parent.depth}) + 1.`);
    }

    // 3. Cyclic delegation prevention
    if (parent.agent.toLowerCase() === child.agent.toLowerCase()) {
      errors.push(`Self-delegation loop detected: agent '${child.agent}' cannot delegate to itself.`);
    }
    if (parent.agent.toLowerCase() === "boss" && (child.agent.toLowerCase() === "executive" || child.agent.toLowerCase() === "ceo")) {
      errors.push("Cyclic upward delegation forbidden: Boss cannot delegate back to CEO.");
    }
    if (parent.depth >= 2) {
      errors.push(`Agent at depth ${parent.depth} ('${parent.agent}') cannot further delegate.`);
    }

    // 4. Tool Allowlist Narrowing (Security Invariant)
    // Child cannot gain tools not explicitly in parent's allowlist
    const parentTools = new Set(parent.toolAllowlist);
    for (const tool of child.toolAllowlist) {
      if (!parentTools.has(tool)) {
        errors.push(`Child tool '${tool}' is not in parent tool allowlist. Broadening tool permissions is strictly forbidden.`);
      }
    }

    // 5. Budget Constraints
    if (
      parent.budget.maxToolCalls != null &&
      child.budget.maxToolCalls != null &&
      child.budget.maxToolCalls > parent.budget.maxToolCalls
    ) {
      errors.push(`Child maxToolCalls (${child.budget.maxToolCalls}) cannot exceed parent budget (${parent.budget.maxToolCalls}).`);
    }

    if (
      parent.budget.maxModelCalls != null &&
      child.budget.maxModelCalls != null &&
      child.budget.maxModelCalls > parent.budget.maxModelCalls
    ) {
      errors.push(`Child maxModelCalls (${child.budget.maxModelCalls}) cannot exceed parent budget (${parent.budget.maxModelCalls}).`);
    }

    if (
      parent.budget.maxDurationMs != null &&
      child.budget.maxDurationMs != null &&
      child.budget.maxDurationMs > parent.budget.maxDurationMs
    ) {
      errors.push(`Child maxDurationMs (${child.budget.maxDurationMs}) cannot exceed parent budget (${parent.budget.maxDurationMs}).`);
    }

    if (
      parent.budget.maxRetries != null &&
      child.budget.maxRetries != null &&
      child.budget.maxRetries > parent.budget.maxRetries
    ) {
      errors.push(`Child maxRetries (${child.budget.maxRetries}) cannot exceed parent limit (${parent.budget.maxRetries}).`);
    }

    // 6. Deadline Propagation
    const parentDeadlineTime = new Date(parent.deadline).getTime();
    const childDeadlineTime = new Date(child.deadline).getTime();
    if (!isNaN(parentDeadlineTime) && !isNaN(childDeadlineTime)) {
      if (childDeadlineTime > parentDeadlineTime) {
        errors.push(`Child deadline (${child.deadline}) exceeds parent deadline (${parent.deadline}).`);
      }
    }

    // 7. Risk Level Propagation
    // Child cannot downgrade risk level from parent
    const parentRiskRank = RISK_RANKS[parent.riskLevel] || 1;
    const childRiskRank = RISK_RANKS[child.riskLevel] || 1;
    if (childRiskRank < parentRiskRank) {
      errors.push(`Child risk level '${child.riskLevel}' cannot be downgraded from parent risk level '${parent.riskLevel}'.`);
    }

    // 8. Approval Requirement Retention
    // If parent requires human approval, child cannot remove it
    if (parent.approvalRequired && !child.approvalRequired) {
      errors.push("Parent requires human approval; child delegation cannot remove the approval requirement.");
    }

    // 9. Tenant Isolation
    if (parent.tenantId && child.tenantId && parent.tenantId !== child.tenantId) {
      errors.push(`Cross-tenant delegation violation: parent tenant '${parent.tenantId}' differs from child tenant '${child.tenantId}'.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitizedEnvelope: standalone.sanitizedEnvelope,
    };
  }

  public validateParentChild(parent: TaskEnvelope, child: TaskEnvelope): ValidationOutcome {
    return this.validateChildDelegation(parent, child);
  }
}

export const taskEnvelopeValidator = TaskEnvelopeValidator.getInstance();
