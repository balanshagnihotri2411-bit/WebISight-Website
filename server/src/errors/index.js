export class InvalidUrlError extends Error {
  constructor(message = 'Invalid or unsafe URL provided') {
    super(message);
    this.name = 'InvalidUrlError';
    this.statusCode = 400;
  }
}

export class AuditTimeoutError extends Error {
  constructor(message = 'Audit timed out') {
    super(message);
    this.name = 'AuditTimeoutError';
    this.statusCode = 504;
  }
}

export class AuditFailedError extends Error {
  constructor(message = 'Audit failed due to an upstream error') {
    super(message);
    this.name = 'AuditFailedError';
    this.statusCode = 502;
  }
}
