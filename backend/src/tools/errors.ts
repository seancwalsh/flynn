/**
 * Tool-specific error types
 * 
 * Provides typed errors for common tool failure scenarios.
 * These errors are caught by the tool executor and converted to ToolResult failures.
 */

/**
 * Base class for tool errors with error codes
 */
export class ToolError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "ToolError";
  }
}

/**
 * Thrown when the user doesn't have access to the requested resource
 */
export class UnauthorizedError extends ToolError {
  constructor(message = "You don't have access to this resource") {
    super(message, "UNAUTHORIZED");
    this.name = "UnauthorizedError";
  }
}

/**
 * Thrown when a child is not found
 */
export class ChildNotFoundError extends ToolError {
  constructor(childId: string) {
    super(`Child not found: ${childId}`, "CHILD_NOT_FOUND");
    this.name = "ChildNotFoundError";
  }
}

/**
 * Thrown when a session is not found
 */
export class SessionNotFoundError extends ToolError {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`, "SESSION_NOT_FOUND");
    this.name = "SessionNotFoundError";
  }
}

/**
 * Thrown when a goal is not found
 */
export class GoalNotFoundError extends ToolError {
  constructor(goalId: string) {
    super(`Goal not found: ${goalId}`, "GOAL_NOT_FOUND");
    this.name = "GoalNotFoundError";
  }
}

/**
 * Thrown when a resource requires a child ID that wasn't provided
 */
export class ChildIdRequiredError extends ToolError {
  constructor(resourceType: string) {
    super(`Child ID is required to access ${resourceType}`, "CHILD_ID_REQUIRED");
    this.name = "ChildIdRequiredError";
  }
}

/**
 * Thrown when a resource requires a user ID that wasn't provided
 */
export class UserIdRequiredError extends ToolError {
  constructor() {
    super("User ID is required", "USER_ID_REQUIRED");
    this.name = "UserIdRequiredError";
  }
}

/**
 * Thrown when a database query fails
 */
export class DatabaseError extends ToolError {
  constructor(message: string) {
    super(message, "DATABASE_ERROR");
    this.name = "DatabaseError";
  }
}
