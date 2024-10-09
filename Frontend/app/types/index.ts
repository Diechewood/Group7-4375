export interface Material {
    id: string
    name: string
    inventory: number
    goal: number
    revenue: number
    msrp: number
    variants?: Material[]
  }
  
  export interface Category {
    name: string
  }