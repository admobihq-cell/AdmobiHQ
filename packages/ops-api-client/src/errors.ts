export class OpsApiError extends Error {
  readonly status: number
  readonly issues?: unknown

  constructor(message: string, status: number, issues?: unknown) {
    super(message)
    this.name = "OpsApiError"
    this.status = status
    this.issues = issues
  }
}
