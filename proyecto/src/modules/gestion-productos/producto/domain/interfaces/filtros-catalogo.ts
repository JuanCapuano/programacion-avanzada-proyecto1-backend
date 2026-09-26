export interface FiltrosCatalogo {
  texto?: string;
  buscarDenominacion?: boolean;
  buscarLinea?: boolean;
  buscarSuperLinea?: boolean;
  denominacion?: string;
  linea?: string;
  superLinea?: string;
  skip: number;
  take: number;
}
