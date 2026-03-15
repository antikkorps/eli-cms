export class EliError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'EliError';
    this.status = status;
  }

  static async fromResponse(response: Response): Promise<EliError> {
    let message = response.statusText || 'Request failed';
    try {
      const body = await response.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        message = body.error;
      }
    } catch {
      // body not JSON, use statusText
    }
    return new EliError(response.status, message);
  }

  isNotFound(): boolean {
    return this.status === 404;
  }

  isUnauthorized(): boolean {
    return this.status === 401;
  }

  isForbidden(): boolean {
    return this.status === 403;
  }
}
