export class OpsApiError extends Error {
  readonly status: number
  readonly issues?: unknown
  /**
   * The parsed JSON the server answered with, whatever its shape. Some errors carry numbers a screen
   * needs: Disburse's 402 sends `balanceKes` and `requiredKes`. Undefined when the body wasn't JSON.
   */
  readonly body?: unknown

  constructor(message: string, status: number, issues?: unknown, body?: unknown) {
    super(message)
    this.name = "OpsApiError"
    this.status = status
    this.issues = issues
    this.body = body
  }
}
