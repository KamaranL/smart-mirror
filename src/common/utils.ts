/* Utilities */

import * as core from '@actions/core';
import { pattern, message as messageData } from './ref';

export function isDebug(): boolean {
  return process.env.RUNNER_DEBUG === '1' ? true : false;
}

export function isLocal(): boolean {
  return process.env.GITHUB_ACTIONS === 'true' ? false : true;
}

export function isTesting(): boolean {
  return process.env.NODE_ENV === 'test' ? true : false;
}

function __log(log: {
  stream: string | string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  message: any;
  caller?: string;
  code?: number;
}): void {
  let streams: string[] = [];
  let message;

  if (typeof log.stream === 'string') {
    streams.push(log.stream);
  } else {
    streams = log.stream;
  }

  if (streams.includes('info')) {
    if (!isDebug()) {
      if (!isLocal()) {
        core.info(log.message as string);
      } else {
        if (!isTesting()) {
          // eslint-disable-next-line no-console
          console.info(`[info]${log.message}`);
        }
      }
    }
  }

  if (streams.includes('warn')) {
    if (!isDebug()) {
      if (!isLocal()) {
        core.warning(log.message as string);
      } else {
        if (!isTesting()) {
          // eslint-disable-next-line no-console
          console.warn(`\x1b[33m[warn]${log.message}\x1b[0m`);
        }
      }
    }
  }

  if (streams.includes('error')) {
    message = `Error: (${log.caller}) `;

    if (log.message instanceof Error) {
      message += log.message.message;
      if (isDebug()) {
        message += ':';
        message += log.message.stack?.replace(pattern.first.line, '');
      }
    } else {
      message += log.message;
    }

    !isLocal()
      ? core.setFailed(message)
      : // eslint-disable-next-line no-console
        console.error(`\x1b[31m${message}\x1b[0m`, log.code);
  }

  if (streams.includes('debug')) {
    if (typeof log.message === 'object') {
      log.message = JSON.stringify(log.message, null, 2);
    }

    if (!isLocal()) {
      core.debug(log.message as string);
    } else {
      if (isDebug()) {
        if (!isTesting()) {
          // eslint-disable-next-line no-console
          console.debug(`\x1b[34m${log.message}\x1b[0m`);
        }
      }
    }
  }
}

export const log = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  info: (message: any) =>
    __log({
      stream: ['info', 'debug'],
      message
    }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  warn: (message: any) =>
    __log({
      stream: ['warn', 'debug'],
      message
    }),

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: (e: any, caller = 'Unknown', code = 1): never => {
    __log({
      stream: 'error',
      message: e,
      caller,
      code
    });
    if (!isLocal()) {
      throw new Error();
    } else {
      process.exit(code);
    }
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  debug: (message: any) =>
    __log({
      stream: 'debug',
      message
    })
};

export const obj = {
  tryGetValue<T extends object, K extends keyof T>(
    tObj: T,
    tKey: K
  ): { success: boolean; value?: T[K] } {
    const exists = tKey in tObj;
    return { success: exists, value: exists ? tObj[tKey] : undefined };
  },

  contains<T extends object, K extends keyof T>(tObj: T, tKeys: K[]): boolean {
    let val = false;
    for (const key of tKeys) {
      const skey = key as string;
      if (!tObj[key] || tObj[key] === undefined || tObj[key] === '')
        throw new Error(`'${skey}' is not set`);
      val = true;
    }

    return val;
  }
};

export const str = {
  dataToObj(data: string, delimeter = '='): { [key: string]: string } {
    const dict: { [key: string]: string } = {};
    const list = data.split('\n');

    for (const line of list) {
      if (line !== '' && line.includes(delimeter)) {
        const items = line.split(delimeter);
        dict[items[0]] = items[1];
      }
    }

    return dict;
  },

  format(templateString: string, substitution: string | string[]): string {
    let formatted = templateString;
    const tokens = templateString.match(pattern.all.tokens);

    if (tokens) {
      let i = 0;

      if (tokens.length === 1 && typeof substitution === 'string') {
        formatted = formatted.replace(tokens[0], substitution);
      }
      if (tokens.length > 1 && Array.isArray(substitution)) {
        if (tokens.length !== substitution.length)
          log.warn('Length mismatch on string format.');
        for (const token of tokens) {
          formatted = formatted.replace(token, substitution[i]);
          i++;
        }
      }
    }

    return formatted;
  }
};

export const msg = str.dataToObj(messageData);
