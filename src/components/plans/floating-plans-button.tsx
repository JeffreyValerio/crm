import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { FileText, Layers } from 'lucide-react';

interface ProductType {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  products?: Plan[];
}

interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  productTypeId: string | null;
  productType: ProductType | null;
}

export function FloatingPlansButton() {
  const [open, setOpen] = useState(false);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadProductTypes();
    }
  }, [open]);

  async function loadProductTypes() {
    setLoading(true);
    try {
      const response = await fetch('/api/product-types');
      if (response.ok) {
        const data = await response.json();
        // Solo mostrar tipos activos con productos activos
        const activeTypes = (data.productTypes || []).filter(
          (type: ProductType) => type.activo && (type.products?.length || 0) > 0
        );
        setProductTypes(activeTypes);
      }
    } catch (error) {
      console.error('Error loading product types:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        title="Ver planes disponibles"
      >
        <FileText className="h-4 w-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto max-w-3xl">
          <DialogHeader>
            <DialogTitle>Planes Disponibles</DialogTitle>
            <DialogDescription>
              Lista de planes activos en el sistema
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col gap-4 py-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-32 rounded bg-muted animate-pulse" />
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map(j => (
                      <div key={j} className="h-7 w-40 rounded-full bg-muted animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : productTypes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay productos activos disponibles</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {productTypes.map((type) => {
                const activePlans = type.products?.filter(p => p.activo) ?? [];
                return (
                  <div key={type.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2 mb-3">
                      <Layers className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {type.nombre}
                      </span>
                      <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                        {activePlans.length} plan{activePlans.length !== 1 ? 'es' : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {activePlans.map((plan) => (
                        <div
                          key={plan.id}
                          className="inline-flex items-center rounded-md border bg-muted/40 px-3 py-1.5 text-sm font-medium leading-tight"
                          title={plan.descripcion || undefined}
                        >
                          {plan.nombre}
                        </div>
                      ))}
                    </div>
                    {type.descripcion && (
                      <p className="mt-2 text-xs text-muted-foreground">{type.descripcion}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
