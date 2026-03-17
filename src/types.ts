export interface Product {
  codigo: string;
  descricao: string;
  [key: string]: any;
}

export interface AppState {
  products: Product[];
  lastUpdated: string | null;
}
