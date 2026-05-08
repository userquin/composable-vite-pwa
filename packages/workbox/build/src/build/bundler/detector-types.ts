export interface BuildSWResult {
  rolldown?: boolean
  vite?: boolean
}
export interface GenerateSWDependenciesResult extends BuildSWResult {
  magicast?: boolean
}
