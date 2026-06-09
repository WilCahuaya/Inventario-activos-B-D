export interface LabelZplInput {
  entidadNombre: string;
  codigoBarras: string;
  nombreBien: string;
}

export function buildLabelZpl(options: LabelZplInput): string {
  const entidad = options.entidadNombre.slice(0, 28).replace(/\^/g, " ");
  const codigo = options.codigoBarras.replace(/\^/g, "");
  const nombre = options.nombreBien.slice(0, 32).replace(/\^/g, " ");

  return `^XA
^FO20,10^A0N,18,18^FDB&D - ${entidad}^FS
^FO20,32^BY2^BCN,56,Y,N,N^FD${codigo}^FS
^FO20,100^A0N,16,16^FD${nombre}^FS
^XZ
`;
}

export function buildBatchLabelZpl(entidadNombre: string, items: LabelZplInput[]): string {
  return items
    .map((item) =>
      buildLabelZpl({
        entidadNombre,
        codigoBarras: item.codigoBarras,
        nombreBien: item.nombreBien,
      }),
    )
    .join("\n");
}
