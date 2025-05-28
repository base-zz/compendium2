interface Logger {
  info(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
  data(message: string, ...args: unknown[]): void;
  (message: string, ...args: unknown[]): void;
}

declare function createLogger(namespace: string): Logger;
declare function getLogger(): Logger;

declare const trace: (message: string, ...args: unknown[]) => void;
declare const debug: (message: string, ...args: unknown[]) => void;
declare const info: (message: string, ...args: unknown[]) => void;
declare const warn: (message: string, ...args: unknown[]) => void;
declare const error: (message: string, ...args: unknown[]) => void;

declare const logger: Logger;

export { createLogger, getLogger, trace, debug, info, warn, error };
export default logger;
