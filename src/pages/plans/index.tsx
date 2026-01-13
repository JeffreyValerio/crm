import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, CheckCircle2, XCircle, Package, Tag } from 'lucide-react';

interface ProductType {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  products?: Plan[];
}

interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  productTypeId: string | null;
  productType: ProductType | null;
  createdAt: string;
  updatedAt: string;
}

export default function PlansPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'types' | 'products'>('types');
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  
  // Estados para diálogos de tipos de producto
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  const [typeFormData, setTypeFormData] = useState({ nombre: '', descripcion: '', activo: true });
  const [typeError, setTypeError] = useState('');
  const [typeSubmitting, setTypeSubmitting] = useState(false);
  
  // Estados para diálogos de productos
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Plan | null>(null);
  const [productFormData, setProductFormData] = useState({ nombre: '', descripcion: '', activo: true, productTypeId: '' });
  const [productError, setProductError] = useState('');
  const [productSubmitting, setProductSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        setCurrentUser(data.user);
        
        if (data.user.role !== 'admin') {
          router.push('/');
          return;
        }

        await loadData();
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  async function loadData() {
    await Promise.all([loadProductTypes(), loadPlans()]);
  }

  async function loadProductTypes() {
    const response = await fetch('/api/product-types');
    if (response.ok) {
      const data = await response.json();
      setProductTypes(data.productTypes || []);
    }
  }

  async function loadPlans() {
    const response = await fetch('/api/plans');
    if (response.ok) {
      const data = await response.json();
      setPlans(data.plans || []);
    }
  }

  // Funciones para tipos de producto
  function handleOpenTypeDialog(type?: ProductType) {
    if (type) {
      setEditingType(type);
      setTypeFormData({
        nombre: type.nombre,
        descripcion: type.descripcion || '',
        activo: type.activo,
      });
    } else {
      setEditingType(null);
      setTypeFormData({ nombre: '', descripcion: '', activo: true });
    }
    setTypeError('');
    setTypeDialogOpen(true);
  }

  async function handleTypeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTypeError('');
    setTypeSubmitting(true);

    try {
      const url = editingType ? `/api/product-types/${editingType.id}` : '/api/product-types';
      const method = editingType ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(typeFormData),
      });

      const data = await response.json();

      if (response.ok) {
        await loadProductTypes();
        setTypeDialogOpen(false);
        setTypeFormData({ nombre: '', descripcion: '', activo: true });
        setEditingType(null);
      } else {
        setTypeError(data.error || 'Error al guardar el tipo de producto');
      }
    } catch (error) {
      setTypeError('Error al procesar la solicitud');
    } finally {
      setTypeSubmitting(false);
    }
  }

  async function handleDeleteType(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este tipo de producto?')) {
      return;
    }

    const response = await fetch(`/api/product-types/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await loadProductTypes();
      await loadPlans();
    } else {
      const data = await response.json();
      alert(data.error || 'Error al eliminar el tipo de producto');
    }
  }

  // Funciones para productos
  function handleOpenProductDialog(product?: Plan) {
    if (product) {
      setEditingProduct(product);
      setProductFormData({
        nombre: product.nombre,
        descripcion: product.descripcion || '',
        activo: product.activo,
        productTypeId: product.productTypeId || '',
      });
    } else {
      setEditingProduct(null);
      setProductFormData({ nombre: '', descripcion: '', activo: true, productTypeId: '' });
    }
    setProductError('');
    setProductDialogOpen(true);
  }

  async function handleProductSubmit(e: React.FormEvent) {
    e.preventDefault();
    setProductError('');
    setProductSubmitting(true);

    try {
      const url = editingProduct ? `/api/plans/${editingProduct.id}` : '/api/plans';
      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productFormData),
      });

      const data = await response.json();

      if (response.ok) {
        await loadPlans();
        setProductDialogOpen(false);
        setProductFormData({ nombre: '', descripcion: '', activo: true, productTypeId: '' });
        setEditingProduct(null);
      } else {
        setProductError(data.error || 'Error al guardar el producto');
      }
    } catch (error) {
      setProductError('Error al procesar la solicitud');
    } finally {
      setProductSubmitting(false);
    }
  }

  async function handleToggleProductActive(id: string, currentStatus: boolean) {
    try {
      const response = await fetch(`/api/plans/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !currentStatus }),
      });

      if (response.ok) {
        await loadPlans();
      } else {
        alert('Error al actualizar el producto');
      }
    } catch (error) {
      alert('Error al procesar la solicitud');
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Cargando...</div>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
            <p className="text-muted-foreground">
              Gestiona los tipos de producto y productos disponibles
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b">
          <button
            onClick={() => setActiveTab('types')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'types'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Tag className="inline mr-2 h-4 w-4" />
            Tipos de Producto
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === 'products'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Package className="inline mr-2 h-4 w-4" />
            Productos
          </button>
        </div>

        {/* Tab de Tipos de Producto */}
        {activeTab === 'types' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tipos de Producto</CardTitle>
                  <CardDescription>
                    Gestiona los tipos de producto (categorías padre)
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenTypeDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Tipo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Productos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay tipos de producto registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    productTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">{type.nombre}</TableCell>
                        <TableCell>{type.descripcion || '-'}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              type.activo
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-gray-500/10 text-gray-600'
                            }`}
                          >
                            {type.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {type.products?.length || 0} producto(s)
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenTypeDialog(type)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteType(type.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Tab de Productos */}
        {activeTab === 'products' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Productos</CardTitle>
                  <CardDescription>
                    Gestiona los productos (hijos de tipos de producto)
                  </CardDescription>
                </div>
                <Button onClick={() => handleOpenProductDialog()}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nuevo Producto
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Tipo de Producto</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No hay productos registrados
                      </TableCell>
                    </TableRow>
                  ) : (
                    plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.nombre}</TableCell>
                        <TableCell>{plan.productType?.nombre || 'Sin tipo'}</TableCell>
                        <TableCell>{plan.descripcion || '-'}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              plan.activo
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-gray-500/10 text-gray-600'
                            }`}
                          >
                            {plan.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleProductActive(plan.id, plan.activo)}
                              title={plan.activo ? 'Desactivar' : 'Activar'}
                            >
                              {plan.activo ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-gray-600" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenProductDialog(plan)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Diálogo de Tipo de Producto */}
        <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingType ? 'Editar Tipo de Producto' : 'Nuevo Tipo de Producto'}
              </DialogTitle>
              <DialogDescription>
                {editingType
                  ? 'Modifica la información del tipo de producto'
                  : 'Crea un nuevo tipo de producto (categoría padre)'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleTypeSubmit} className="space-y-4">
              {typeError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {typeError}
                </div>
              )}

              <div>
                <label htmlFor="type-nombre" className="block text-sm font-medium mb-1">
                  Nombre *
                </label>
                <Input
                  id="type-nombre"
                  value={typeFormData.nombre}
                  onChange={(e) => setTypeFormData({ ...typeFormData, nombre: e.target.value })}
                  required
                  placeholder="Nombre del tipo de producto"
                  disabled={typeSubmitting}
                />
              </div>

              <div>
                <label htmlFor="type-descripcion" className="block text-sm font-medium mb-1">
                  Descripción
                </label>
                <textarea
                  id="type-descripcion"
                  value={typeFormData.descripcion}
                  onChange={(e) => setTypeFormData({ ...typeFormData, descripcion: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Descripción del tipo de producto (opcional)"
                  disabled={typeSubmitting}
                />
              </div>

              {editingType && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="type-activo"
                    checked={typeFormData.activo}
                    onChange={(e) => setTypeFormData({ ...typeFormData, activo: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={typeSubmitting}
                  />
                  <label htmlFor="type-activo" className="text-sm font-medium">
                    Tipo activo
                  </label>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTypeDialogOpen(false);
                    setTypeFormData({ nombre: '', descripcion: '', activo: true });
                    setEditingType(null);
                    setTypeError('');
                  }}
                  disabled={typeSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={typeSubmitting}>
                  {typeSubmitting ? 'Guardando...' : editingType ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Diálogo de Producto */}
        <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? 'Modifica la información del producto'
                  : 'Crea un nuevo producto asociado a un tipo de producto'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              {productError && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {productError}
                </div>
              )}

              <div>
                <label htmlFor="product-type" className="block text-sm font-medium mb-1">
                  Tipo de Producto *
                </label>
                <Select
                  id="product-type"
                  value={productFormData.productTypeId}
                  onChange={(e) => setProductFormData({ ...productFormData, productTypeId: e.target.value })}
                  required
                  disabled={productSubmitting}
                >
                  <option value="">Seleccionar tipo de producto</option>
                  {productTypes
                    .filter((type) => type.activo)
                    .map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.nombre}
                      </option>
                    ))}
                </Select>
              </div>

              <div>
                <label htmlFor="product-nombre" className="block text-sm font-medium mb-1">
                  Nombre *
                </label>
                <Input
                  id="product-nombre"
                  value={productFormData.nombre}
                  onChange={(e) => setProductFormData({ ...productFormData, nombre: e.target.value })}
                  required
                  placeholder="Nombre del producto"
                  disabled={productSubmitting}
                />
              </div>

              <div>
                <label htmlFor="product-descripcion" className="block text-sm font-medium mb-1">
                  Descripción
                </label>
                <textarea
                  id="product-descripcion"
                  value={productFormData.descripcion}
                  onChange={(e) => setProductFormData({ ...productFormData, descripcion: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Descripción del producto (opcional)"
                  disabled={productSubmitting}
                />
              </div>

              {editingProduct && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="product-activo"
                    checked={productFormData.activo}
                    onChange={(e) => setProductFormData({ ...productFormData, activo: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                    disabled={productSubmitting}
                  />
                  <label htmlFor="product-activo" className="text-sm font-medium">
                    Producto activo
                  </label>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setProductDialogOpen(false);
                    setProductFormData({ nombre: '', descripcion: '', activo: true, productTypeId: '' });
                    setEditingProduct(null);
                    setProductError('');
                  }}
                  disabled={productSubmitting}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={productSubmitting}>
                  {productSubmitting ? 'Guardando...' : editingProduct ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
