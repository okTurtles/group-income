export type JSONType = string | number | boolean | null | JSONObject | JSONArray
export interface JSONObject { [key: string]: JSONType }
export type JSONArray = Array<JSONType>
