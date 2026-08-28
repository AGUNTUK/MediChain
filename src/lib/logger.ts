const DEBUG = import.meta.env.DEV;

export const logger = {
  info: (...args: unknown[]) => DEBUG && console.log(...args),
  warn: (...args: unknown[]) => DEBUG && console.warn(...args),
  error: (...args: unknown[]) => console.error(...args),
};

export default logger;
