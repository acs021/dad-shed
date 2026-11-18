export class ShedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShedError";
  }
}
