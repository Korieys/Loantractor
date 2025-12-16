/**
 * Secure Logger Service
 * 
 * DESIGN:
 * - In Development: Passes through to console.log/error/warn for debugging.
 * - In Production: Suppresses 'log' and 'warn' to prevent PII leakage. Only 'error' is retained
 *   for monitoring (e.g., Sentry), but we should be careful not to log PII in errors.
 */

const isDev = import.meta.env.DEV;

export const logger = {
    log: (...args: any[]) => {
        if (isDev) {
            console.log(...args);
        }
    },
    warn: (...args: any[]) => {
        if (isDev) {
            console.warn(...args);
        }
    },
    error: (...args: any[]) => {
        // We always want to see errors, but in a real SOC2 env, we'd sanitize this.
        console.error(...args);
    },
    info: (...args: any[]) => {
        if (isDev) {
            console.info(...args);
        }
    }
};
