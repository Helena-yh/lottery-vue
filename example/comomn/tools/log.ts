const format = (msg: string) => `${new Date().toISOString()}[Demo]: ${msg}`;

export const log = (msg: string) => console.log(format(msg));
export const warn = (msg: string) => console.warn(format(msg));
export const error = (msg: string) => console.error(format(msg));
