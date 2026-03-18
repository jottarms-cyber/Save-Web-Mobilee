export interface Product {
  codigo: string;
  descricao: string;
  complemento: string;
  [key: string]: any;
}

export interface AppState {
  products: Product[];
  lastUpdated: string | null;
}
