import { APP_CLIENT, APP_NAME } from "@inventario/types";

export const EMPRESA = {
  razonSocial: APP_CLIENT,
  producto: APP_NAME,
  ruc: "2060XXXXXXX",
  direccion: "Lima, Perú",
  web: "www.bdconsultores.pe",
  email: "contacto@bdconsultores.pe",
} as const;
