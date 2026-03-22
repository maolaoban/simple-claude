export class History {
  private commands: string[] = [];
  private position = -1;

  add(command: string): void {
    if (command.trim() && command !== this.commands[this.commands.length - 1]) {
      this.commands.push(command);
    }
    this.position = this.commands.length;
  }

  previous(): string | null {
    if (this.position > 0) {
      this.position--;
      return this.commands[this.position];
    }
    return null;
  }

  next(): string | null {
    if (this.position < this.commands.length - 1) {
      this.position++;
      return this.commands[this.position];
    }
    this.position = this.commands.length;
    return '';
  }

  reset(): void {
    this.position = this.commands.length;
  }
}