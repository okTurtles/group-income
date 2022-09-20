import Request from './request.ts'
import ServerResponse from './response.ts'
import Toolkit from './toolkit.ts'

type JSONStringifyable = boolean | null | number | object | string

export interface MatchedRoute extends NormalizedRoute {
  params: RequestParams
}

export interface NormalizedRoute extends Route {
  paramNames: Array<string>,
  segments: Array<string>
}

export type RequestParams = { [param: string]: string }
export type RequestState = { [name: string]: string }

export type ResponseBody = Deno.Reader | Uint8Array | JSONStringifyable

export interface Route {
  method: string,
  path: string,
  handler: RouteHandler,
  vhost?: string
}
export type RouteHandler = (request: Request, h: Toolkit) => RouteHandlerResult
export type RouteHandlerResult = ServerResponse | ResponseBody | Error | Promise<ServerResponse | ResponseBody | Error>

export interface RouteOptions extends Omit<Partial<Route>, 'method' | 'path'> {
  method?: Route['method'] | Iterable<Route['method']>,
  path?: Route['path'] | Iterable<Route['path']>
}

export type { DirectoryHandlerOptions } from './helpers/directory.tsx'
export type { FileHandlerOptions } from './helpers/file.ts'
export type { ServerOptions } from './server.ts'
