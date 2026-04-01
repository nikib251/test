declare module 'pg' {
  export class Pool {
    constructor(config?: any);
    connect(): Promise<PoolClient>;
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    end(): Promise<void>;
    on(event: string, listener: (...args: any[]) => void): this;
  }

  export interface PoolClient {
    query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
    release(): void;
  }

  export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
  }
}

declare module 'uuid' {
  export function v4(): string;
}

declare module 'express' {
  import * as http from 'http';

  export interface Request {
    params: any;
    query: any;
    body: any;
    headers: any;
    method: string;
    url: string;
    path: string;
  }

  export interface Response {
    json(body: any): Response;
    status(code: number): Response;
    send(body?: any): Response;
  }

  export type NextFunction = (err?: any) => void;
  export type RequestHandler = (req: Request, res: Response, next: NextFunction) => any;

  export interface IRouter {
    get(path: string, ...handlers: RequestHandler[]): IRouter;
    post(path: string, ...handlers: RequestHandler[]): IRouter;
    put(path: string, ...handlers: RequestHandler[]): IRouter;
    delete(path: string, ...handlers: RequestHandler[]): IRouter;
    use(...handlers: any[]): IRouter;
  }

  export interface Application extends IRouter {
    listen(port: number, callback?: () => void): http.Server;
  }

  export function Router(): IRouter;

  interface Express {
    (): Application;
    json(): RequestHandler;
    Router(): IRouter;
  }

  const express: Express;
  export default express;
}

declare module 'cors' {
  function cors(options?: any): any;
  export default cors;
}
