import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';

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
        className="fixed top-1/2 right-6 -translate-y-1/2 h-14 w-14 rounded-full shadow-lg z-50"
        size="icon"
      >
        <FileText className="h-6 w-6" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Planes Disponibles</DialogTitle>
            <DialogDescription>
              Lista de planes activos en el sistema
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando productos...</p>
            </div>
          ) : productTypes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No hay productos activos disponibles</p>
            </div>
          ) : (
            <div className="space-y-6">
              {productTypes.map((type) => (
                <div key={type.id} className="space-y-3">
                  <h3 className="text-lg font-semibold">{type.nombre}</h3>
                  {type.descripcion && (
                    <p className="text-sm text-muted-foreground">{type.descripcion}</p>
                  )}
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {type.products
                      ?.filter((plan) => plan.activo)
                      .map((plan) => (
                        <Card key={plan.id}>
                          <CardHeader>
                            <CardTitle className="text-lg">{plan.nombre}</CardTitle>
                          </CardHeader>
                          {plan.descripcion && (
                            <CardContent>
                              <p className="text-sm text-muted-foreground">{plan.descripcion}</p>
                            </CardContent>
                          )}
                        </Card>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
