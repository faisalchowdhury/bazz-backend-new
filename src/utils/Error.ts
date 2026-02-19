export class CustomError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = "CustomError";
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
  }
}
