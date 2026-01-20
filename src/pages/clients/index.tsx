import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { MainLayout } from '@/components/layout/main-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Eye, Upload, Download } from 'lucide-react';
import { CldImage } from 'next-cloudinary';
import jsPDF from 'jspdf';

interface ProductType {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

interface Plan {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  productTypeId: string | null;
  productType: ProductType | null;
}

interface StatusComment {
  id: string;
  tipo: string;
  estadoAnterior: string | null;
  estadoNuevo: string;
  comentario: string;
  createdAt: string;
  creator: {
    id: string;
    email: string;
  };
}

interface Client {
  id: string;
  nombres: string;
  apellidos: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  fechaNacimiento: string | null;
  stb: number | null;
  email: string | null;
  telefono: string | null;
  provincia: string;
  canton: string;
  distrito: string;
  senasExactas: string;
  coordenadasLat: string | null;
  coordenadasLng: string | null;
  numeroMedidor: string | null;
  cedulaFrontalUrl: string | null;
  cedulaTraseraUrl: string | null;
  selfieUrl: string | null;
  validationStatus: string | null;
  validationComment: string | null;
  saleStatus: string | null;
  saleComment: string | null;
  planId: string | null;
  plan: Plan | null;
  creator?: {
    id: string;
    email: string;
  };
  statusComments?: StatusComment[];
  createdAt: string;
  updatedAt: string;
}

interface ClientFormData {
  nombres: string;
  apellidos: string;
  tipoIdentificacion: string;
  numeroIdentificacion: string;
  fechaNacimiento: string;
  stb: string;
  email: string;
  telefono: string;
  provincia: string;
  canton: string;
  distrito: string;
  senasExactas: string;
  coordenadasLat: string;
  coordenadasLng: string;
  numeroMedidor: string;
  productTypeId: string;
  planId: string;
  cedulaFrontalUrl: string;
  cedulaTraseraUrl: string;
  selfieUrl: string;
  validationStatus: string;
  validationComment: string;
  saleStatus: string;
  saleComment: string;
}

export default function ClientsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [filterValidationStatus, setFilterValidationStatus] = useState<string>('');
  const [filterSaleStatus, setFilterSaleStatus] = useState<string>('');
  const [filterCreatedBy, setFilterCreatedBy] = useState<string>('');
  const [users, setUsers] = useState<{ id: string; email: string }[]>([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cantones, setCantones] = useState<string[]>([]);
  const [distritos, setDistritos] = useState<string[]>([]);
  const [loadingCantones, setLoadingCantones] = useState(false);
  const [loadingDistritos, setLoadingDistritos] = useState(false);
  const [initializingForm, setInitializingForm] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    defaultValues: {
      nombres: '',
      apellidos: '',
      tipoIdentificacion: 'NACIONAL',
      numeroIdentificacion: '',
      fechaNacimiento: '',
      stb: '0',
      email: '',
      telefono: '',
      provincia: '',
      canton: '',
      distrito: '',
      senasExactas: '',
      coordenadasLat: '',
      coordenadasLng: '',
      numeroMedidor: '',
      productTypeId: '',
      planId: '',
      cedulaFrontalUrl: '',
      cedulaTraseraUrl: '',
      selfieUrl: '',
      validationStatus: 'EN_PROCESO_VALIDACION',
      validationComment: '',
      saleStatus: '',
      saleComment: '',
    },
  });

  const formData = watch();
  const selectedProductType = watch('productTypeId');
  const selectedProvince = watch('provincia');
  const selectedCanton = watch('canton');
  const filteredPlans = selectedProductType
    ? plans.filter((p) => p.productTypeId === selectedProductType && p.activo)
    : [];

  // Cargar provincias al iniciar
  useEffect(() => {
    loadProvinces();
  }, []);

  // Cargar cantones cuando cambia la provincia
  useEffect(() => {
    // No ejecutar durante la inicialización del formulario
    if (initializingForm) return;
    
    if (selectedProvince) {
      loadCantones(selectedProvince);
    } else {
      setCantones([]);
      setDistritos([]);
    }
  }, [selectedProvince, initializingForm]);

  // Cargar distritos cuando cambia el cantón
  useEffect(() => {
    // No ejecutar durante la inicialización del formulario
    if (initializingForm) return;
    
    if (selectedProvince && selectedCanton) {
      loadDistritos(selectedProvince, selectedCanton);
    } else {
      setDistritos([]);
    }
  }, [selectedProvince, selectedCanton, initializingForm]);

  // Efecto para establecer valores cuando se cargan cantones/distritos durante edición
  // Este efecto se ejecuta cuando las opciones están disponibles y hay un cliente en edición
  useEffect(() => {
    if (initializingForm && editingClient) {
      // Si los cantones están cargados y el cliente tiene un cantón válido, establecerlo
      if (cantones.length > 0 && editingClient.canton) {
        const cantonExists = cantones.includes(editingClient.canton);
        if (cantonExists) {
          setValue('canton', editingClient.canton, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
        }
      }
      
      // Si los distritos están cargados y el cliente tiene un distrito válido, establecerlo
      if (distritos.length > 0 && editingClient.distrito) {
        const distritoExists = distritos.includes(editingClient.distrito);
        if (distritoExists) {
          setValue('distrito', editingClient.distrito, { shouldValidate: false, shouldDirty: false, shouldTouch: false });
        }
      }
    }
  }, [cantones, distritos, initializingForm, editingClient, setValue]);

  // Efecto para cargar productos cuando cambia el tipo de producto seleccionado
  useEffect(() => {
    if (selectedProductType) {
      // Los productos ya están filtrados en filteredPlans
      // Solo necesitamos limpiar el planId si no hay productos disponibles
      if (filteredPlans.length === 0) {
        setValue('planId', '');
      }
    } else {
      setValue('planId', '');
    }
  }, [selectedProductType, filteredPlans.length, setValue]);

  useEffect(() => {
    async function checkAuth() {
      const response = await fetch('/api/auth/me');
      if (!response.ok) {
        router.push('/login');
      } else {
        const data = await response.json();
        setCurrentUser(data.user);
        
        // Cargar filtros desde query params si existen (solo para admin)
        if (data.user?.role === 'admin') {
          if (router.query.validationStatus) {
            setFilterValidationStatus(router.query.validationStatus as string);
          }
          if (router.query.saleStatus) {
            setFilterSaleStatus(router.query.saleStatus as string);
          }
          if (router.query.createdBy) {
            setFilterCreatedBy(router.query.createdBy as string);
          }
          await loadUsers();
        }
        
        await Promise.all([loadPlans(), loadProductTypes()]);
        setLoading(false);
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    if (!loading && currentUser) {
      loadClients();
    }
  }, [filterValidationStatus, filterSaleStatus, filterCreatedBy, loading, currentUser]);

  async function loadClients() {
    const params = new URLSearchParams();
    // Solo aplicar filtros de estado y creador si el usuario es admin
    if (currentUser?.role === 'admin') {
      if (filterValidationStatus) params.append('validationStatus', filterValidationStatus);
      if (filterSaleStatus) params.append('saleStatus', filterSaleStatus);
      if (filterCreatedBy) params.append('createdBy', filterCreatedBy);
    }

    const response = await fetch(`/api/clients?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      setClients(data.clients || []);
    }
  }

  async function loadUsers() {
    const response = await fetch('/api/users');
    if (response.ok) {
      const data = await response.json();
      setUsers(data.users?.map((u: { id: string; email: string }) => ({ id: u.id, email: u.email })) || []);
    }
  }

  async function loadPlans() {
    const response = await fetch('/api/plans');
    if (response.ok) {
      const data = await response.json();
      setPlans(data.plans || []);
    }
  }

  async function loadProductTypes() {
    const response = await fetch('/api/product-types');
    if (response.ok) {
      const data = await response.json();
      setProductTypes(data.productTypes || []);
    }
  }

  async function loadProvinces() {
    const response = await fetch('/api/geo/provinces');
    if (response.ok) {
      const data = await response.json();
      setProvinces(data.provinces || []);
    }
  }

  async function loadCantones(province: string) {
    setLoadingCantones(true);
    const response = await fetch(`/api/geo/provinces?province=${encodeURIComponent(province)}`);
    if (response.ok) {
      const data = await response.json();
      setCantones(data.cantones || []);
    }
    setLoadingCantones(false);
  }

  async function loadDistritos(province: string, canton: string) {
    setLoadingDistritos(true);
    const response = await fetch(`/api/geo/provinces?province=${encodeURIComponent(province)}&canton=${encodeURIComponent(canton)}`);
    if (response.ok) {
      const data = await response.json();
      setDistritos(data.distritos || []);
    }
    setLoadingDistritos(false);
  }

  async function handleOpenDialog(client?: Client) {
    if (client) {
      setEditingClient(client);
      // Activar flag de inicialización para evitar que los useEffect limpien los valores
      setInitializingForm(true);
      
      // PRIMERO: Cargar todas las opciones necesarias antes de hacer reset
      if (client.provincia) {
        await loadCantones(client.provincia);
        
        if (client.canton) {
          await loadDistritos(client.provincia, client.canton);
        }
      }
      
      // SEGUNDO: Hacer reset DESPUÉS de que todas las opciones estén cargadas
      // Esto asegura que cuando el formulario se renderice, los selects tienen sus opciones disponibles
      reset({
        nombres: client.nombres,
        apellidos: client.apellidos,
        tipoIdentificacion: client.tipoIdentificacion,
        numeroIdentificacion: client.numeroIdentificacion,
        fechaNacimiento: client.fechaNacimiento ? new Date(client.fechaNacimiento).toISOString().split('T')[0] : '',
        stb: client.stb?.toString() || '0',
        email: client.email || '',
        telefono: client.telefono || '',
        provincia: client.provincia || '',
        canton: client.canton || '',
        distrito: client.distrito || '',
        senasExactas: client.senasExactas,
        coordenadasLat: client.coordenadasLat || '',
        coordenadasLng: client.coordenadasLng || '',
        numeroMedidor: client.numeroMedidor || '',
        productTypeId: client.plan?.productTypeId || '',
        planId: client.planId || '',
        cedulaFrontalUrl: client.cedulaFrontalUrl || '',
        cedulaTraseraUrl: client.cedulaTraseraUrl || '',
        selfieUrl: client.selfieUrl || '',
        validationStatus: client.validationStatus || 'EN_PROCESO_VALIDACION',
        validationComment: client.validationComment || '',
        saleStatus: client.saleStatus || '',
        saleComment: client.saleComment || '',
      }, { keepDefaultValues: false });
      
      // Desactivar flag de inicialización después de un pequeño delay
      setTimeout(() => {
        setInitializingForm(false);
      }, 100);
    } else {
      setEditingClient(null);
      // Limpiar cantones y distritos para nuevo cliente
      setCantones([]);
      setDistritos([]);
      reset({
        nombres: '',
        apellidos: '',
        tipoIdentificacion: 'NACIONAL',
        numeroIdentificacion: '',
        fechaNacimiento: '',
        stb: '0',
        email: '',
        telefono: '',
        provincia: '',
        canton: '',
        distrito: '',
        senasExactas: '',
        coordenadasLat: '',
        coordenadasLng: '',
        numeroMedidor: '',
        productTypeId: '',
        planId: '',
        cedulaFrontalUrl: '',
        cedulaTraseraUrl: '',
        selfieUrl: '',
        validationStatus: 'EN_PROCESO_VALIDACION',
        validationComment: '',
        saleStatus: '',
        saleComment: '',
      });
    }
    setError('');
    setDialogOpen(true);
  }

  async function handleUploadImage(field: 'cedulaFrontalUrl' | 'cedulaTraseraUrl' | 'selfieUrl') {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingImage(field);
      try {
        // Eliminar imagen anterior si existe y es de Cloudinary
        const currentUrl = watch(field);
        if (currentUrl && currentUrl.includes('cloudinary.com')) {
          try {
            await fetch('/api/clients/delete-image', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ public_id: currentUrl }),
            });
          } catch (error) {
            console.error('Error al eliminar imagen anterior:', error);
          }
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/clients/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          setValue(field, data.url);
        } else {
          alert(data.error || 'Error al subir la imagen');
        }
      } catch (error) {
        alert('Error al subir la imagen');
      } finally {
        setUploadingImage(null);
      }
    };
    input.click();
  }

  // Función helper para extraer public_id de una URL de Cloudinary
  function getCloudinaryPublicId(url: string | null): string | null {
    if (!url || !url.includes('cloudinary.com')) return null;
    try {
      // Extraer public_id de la URL de Cloudinary
      // Formato: https://res.cloudinary.com/{cloud_name}/image/upload/{version}/{public_id}.{ext}
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      if (match && match[1]) {
        return match[1];
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  const onSubmit = async (data: ClientFormData) => {
    setError('');
    setSubmitting(true);

    try {
      const url = editingClient ? `/api/clients/${editingClient.id}` : '/api/clients';
      const method = editingClient ? 'PUT' : 'POST';

      // Preparar datos para enviar
      const submitData = {
        ...data,
        stb: data.stb ? parseInt(data.stb) : null,
        fechaNacimiento: data.fechaNacimiento || null,
        coordenadasLat: data.coordenadasLat?.trim() || null,
        coordenadasLng: data.coordenadasLng?.trim() || null,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (response.ok) {
        await loadClients();
        setDialogOpen(false);
        setEditingClient(null);
        reset();
      } else {
        setError(result.error || 'Error al guardar el cliente');
      }
    } catch (error) {
      setError('Error al procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  async function handleDelete(id: string) {
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      return;
    }

    const response = await fetch(`/api/clients/${id}`, {
      method: 'DELETE',
    });

    if (response.ok) {
      await loadClients();
    } else {
      alert('Error al eliminar el cliente');
    }
  }

  async function handleView(client: Client) {
    const response = await fetch(`/api/clients/${client.id}`);
    if (response.ok) {
      const data = await response.json();
      setViewingClient(data.client);
      setViewDialogOpen(true);
    }
  }

  async function handleDownloadPDF(client: Client) {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      const imageWidth = pageWidth - 2 * margin;
      const imageHeight = 60;
      let yPosition = margin;

      // Título
      pdf.setFontSize(18);
      pdf.text('Documentos del Cliente', margin, yPosition);
      yPosition += 10;

      // Información del cliente
      pdf.setFontSize(12);
      pdf.text(`Cliente: ${client.nombres} ${client.apellidos}`, margin, yPosition);
      yPosition += 6;
      pdf.text(`Cédula: ${client.numeroIdentificacion}`, margin, yPosition);
      yPosition += 10;

      // Función auxiliar para cargar y agregar imagen
      const addImageToPDF = async (imageUrl: string | null, label: string): Promise<void> => {
        if (!imageUrl) return;

        return new Promise((resolve) => {
          // Verificar si necesitamos una nueva página
          if (yPosition + imageHeight + 20 > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }

          // Agregar etiqueta
          pdf.setFontSize(10);
          pdf.setTextColor(0, 0, 0);
          pdf.text(label, margin, yPosition);
          yPosition += 5;

          // Construir URL completa
          const fullUrl = imageUrl.startsWith('http') || imageUrl.startsWith('//')
            ? imageUrl 
            : `${window.location.origin}${imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl}`;

          // Cargar imagen usando fetch para evitar problemas de CORS
          fetch(fullUrl)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`Error al cargar imagen: ${response.statusText}`);
              }
              return response.blob();
            })
            .then((blob) => {
              const reader = new FileReader();
              
              reader.onload = () => {
                try {
                  const dataUrl = reader.result as string;
                  const img = new window.Image();
                  
                  img.onload = () => {
                    // Calcular dimensiones manteniendo proporción
                    let finalWidth = imageWidth;
                    let finalHeight = (img.height * imageWidth) / img.width;

                    // Si la imagen es muy alta, ajustar
                    if (finalHeight > imageHeight) {
                      finalHeight = imageHeight;
                      finalWidth = (img.width * imageHeight) / img.height;
                    }

                    // Agregar imagen al PDF
                    pdf.addImage(dataUrl, 'JPEG', margin, yPosition, finalWidth, finalHeight);
                    yPosition += finalHeight + 10;
                    resolve();
                  };

                  img.onerror = () => {
                    pdf.setFontSize(10);
                    pdf.setTextColor(255, 0, 0);
                    pdf.text(`Error al procesar: ${label}`, margin, yPosition);
                    yPosition += 5;
                    resolve();
                  };

                  img.src = dataUrl;
                } catch (error) {
                  console.error(`Error al procesar imagen ${label}:`, error);
                  pdf.setFontSize(10);
                  pdf.setTextColor(255, 0, 0);
                  pdf.text(`Error al procesar: ${label}`, margin, yPosition);
                  yPosition += 5;
                  resolve();
                }
              };

              reader.onerror = () => {
                pdf.setFontSize(10);
                pdf.setTextColor(255, 0, 0);
                pdf.text(`Error al leer: ${label}`, margin, yPosition);
                yPosition += 5;
                resolve();
              };

              reader.readAsDataURL(blob);
            })
            .catch((error) => {
              console.error(`Error al cargar imagen ${label}:`, error);
              pdf.setFontSize(10);
              pdf.setTextColor(255, 0, 0);
              pdf.text(`Error al cargar: ${label}`, margin, yPosition);
              yPosition += 5;
              resolve();
            });
        });
      };

      // Agregar las tres fotos
      await addImageToPDF(client.cedulaFrontalUrl, 'Cédula Frontal');
      await addImageToPDF(client.cedulaTraseraUrl, 'Cédula Trasera');
      await addImageToPDF(client.selfieUrl, 'Selfie');

      // Descargar PDF
      const fileName = `Cliente_${client.nombres}_${client.apellidos}_${client.numeroIdentificacion}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  }

  function getValidationStatusLabel(status: string | null) {
    const labels: Record<string, string> = {
      EN_PROCESO_VALIDACION: 'En validación',
      APROBADA: 'Aprobada',
      REQUIERE_DEPOSITO: 'Requiere Depósito',
      NO_APLICA: 'No Aplica',
      INCOBRABLE: 'Incobrable',
      DEUDA_MENOR_ANIO: 'Deuda Menor a un Año',
    };
    return labels[status || ''] || status || 'N/A';
  }

  function getSaleStatusLabel(status: string | null) {
    const labels: Record<string, string> = {
      PENDIENTE_INSTALACION: 'Pendiente Instalación',
      INSTALADA: 'Instalada',
      CANCELADA: 'Cancelada',
    };
    return labels[status || ''] || status || 'N/A';
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
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="text-muted-foreground">
              Gestiona los clientes del sistema
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        </div>

        {currentUser?.role === 'admin' && (
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Estado de Validación</label>
                  <Select
                    value={filterValidationStatus}
                    onChange={(e) => setFilterValidationStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="EN_PROCESO_VALIDACION">En validación</option>
                    <option value="APROBADA">Aprobada</option>
                    <option value="REQUIERE_DEPOSITO">Requiere Depósito</option>
                    <option value="NO_APLICA">No Aplica</option>
                    <option value="INCOBRABLE">Incobrable</option>
                    <option value="DEUDA_MENOR_ANIO">Deuda Menor a un Año</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Estado de Venta</label>
                  <Select
                    value={filterSaleStatus}
                    onChange={(e) => setFilterSaleStatus(e.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="PENDIENTE_INSTALACION">Pendiente Instalación</option>
                    <option value="INSTALADA">Instalada</option>
                    <option value="CANCELADA">Cancelada</option>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Creado Por</label>
                  <Select
                    value={filterCreatedBy}
                    onChange={(e) => setFilterCreatedBy(e.target.value)}
                  >
                    <option value="">Todos los usuarios</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.email}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              {clients.length} cliente(s) encontrado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Identificación</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Plan</TableHead>
                  {currentUser?.role === 'admin' && (
                    <>
                      <TableHead>Estado Validación</TableHead>
                      <TableHead>Estado Venta</TableHead>
                      <TableHead>Creado Por</TableHead>
                    </>
                  )}
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={currentUser?.role === 'admin' ? 8 : 5} className="text-center text-muted-foreground">
                      No hay clientes registrados
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>{client.nombres} {client.apellidos}</TableCell>
                      <TableCell>{client.numeroIdentificacion}</TableCell>
                      <TableCell>{client.telefono || 'N/A'}</TableCell>
                      <TableCell>{client.plan?.nombre || 'N/A'}</TableCell>
                      {currentUser?.role === 'admin' && (
                        <>
                          <TableCell>{getValidationStatusLabel(client.validationStatus)}</TableCell>
                          <TableCell>{getSaleStatusLabel(client.saleStatus)}</TableCell>
                          <TableCell>{client.creator?.email || 'N/A'}</TableCell>
                        </>
                      )}
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(client)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenDialog(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadPDF(client)}
                            title="Descargar fotos como PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {currentUser?.role === 'admin' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(client.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Dialog para crear/editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingClient ? 'Modifica la información del cliente' : 'Completa los datos del nuevo cliente'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              {/* Fotos */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-primary">📷</span>
                  Documentos y Fotos
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Cédula Frontal *</label>
                    {watch('cedulaFrontalUrl') ? (
                      <div className="relative">
                        {watch('cedulaFrontalUrl').includes('cloudinary.com') ? (
                          <CldImage
                            src={getCloudinaryPublicId(watch('cedulaFrontalUrl')) || watch('cedulaFrontalUrl')}
                            alt="Cédula Frontal"
                            width={200}
                            height={150}
                            className="rounded-md border"
                            crop={{
                              type: 'auto',
                              source: true
                            }}
                          />
                        ) : (
                          <img
                            src={watch('cedulaFrontalUrl')}
                            alt="Cédula Frontal"
                            className="rounded-md border w-[200px] h-[150px] object-cover"
                          />
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => handleUploadImage('cedulaFrontalUrl')}
                          disabled={uploadingImage === 'cedulaFrontalUrl'}
                        >
                          {uploadingImage === 'cedulaFrontalUrl' ? 'Subiendo...' : 'Cambiar'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleUploadImage('cedulaFrontalUrl')}
                        disabled={uploadingImage === 'cedulaFrontalUrl'}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingImage === 'cedulaFrontalUrl' ? 'Subiendo...' : 'Subir'}
                      </Button>
                    )}
                    <input
                      type="hidden"
                      {...register('cedulaFrontalUrl', { required: 'La cédula frontal es obligatoria' })}
                    />
                    {errors.cedulaFrontalUrl && (
                      <p className="text-sm text-destructive mt-1">{errors.cedulaFrontalUrl.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Cédula Trasera <span className="text-destructive">*</span>
                    </label>
                    {watch('cedulaTraseraUrl') ? (
                      <div className="relative">
                        {watch('cedulaTraseraUrl').includes('cloudinary.com') ? (
                          <CldImage
                            src={getCloudinaryPublicId(watch('cedulaTraseraUrl')) || watch('cedulaTraseraUrl')}
                            alt="Cédula Trasera"
                            width={200}
                            height={150}
                            className="rounded-md border"
                            crop={{
                              type: 'auto',
                              source: true
                            }}
                          />
                        ) : (
                          <img
                            src={watch('cedulaTraseraUrl')}
                            alt="Cédula Trasera"
                            className="rounded-md border w-[200px] h-[150px] object-cover"
                          />
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => handleUploadImage('cedulaTraseraUrl')}
                          disabled={uploadingImage === 'cedulaTraseraUrl'}
                        >
                          {uploadingImage === 'cedulaTraseraUrl' ? 'Subiendo...' : 'Cambiar'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleUploadImage('cedulaTraseraUrl')}
                        disabled={uploadingImage === 'cedulaTraseraUrl'}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingImage === 'cedulaTraseraUrl' ? 'Subiendo...' : 'Subir'}
                      </Button>
                    )}
                    <input
                      type="hidden"
                      {...register('cedulaTraseraUrl', { required: 'La cédula trasera es obligatoria' })}
                    />
                    {errors.cedulaTraseraUrl && (
                      <p className="text-sm text-destructive mt-1">{errors.cedulaTraseraUrl.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Selfie <span className="text-destructive">*</span>
                    </label>
                    {watch('selfieUrl') ? (
                      <div className="relative">
                        {watch('selfieUrl').includes('cloudinary.com') ? (
                          <CldImage
                            src={getCloudinaryPublicId(watch('selfieUrl')) || watch('selfieUrl')}
                            alt="Selfie"
                            width={200}
                            height={150}
                            className="rounded-md border"
                            crop={{
                              type: 'auto',
                              source: true
                            }}
                          />
                        ) : (
                          <img
                            src={watch('selfieUrl')}
                            alt="Selfie"
                            className="rounded-md border w-[200px] h-[150px] object-cover"
                          />
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => handleUploadImage('selfieUrl')}
                          disabled={uploadingImage === 'selfieUrl'}
                        >
                          {uploadingImage === 'selfieUrl' ? 'Subiendo...' : 'Cambiar'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleUploadImage('selfieUrl')}
                        disabled={uploadingImage === 'selfieUrl'}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {uploadingImage === 'selfieUrl' ? 'Subiendo...' : 'Subir'}
                      </Button>
                    )}
                    <input
                      type="hidden"
                      {...register('selfieUrl', { required: 'La selfie es obligatoria' })}
                    />
                    {errors.selfieUrl && (
                      <p className="text-sm text-destructive mt-1">{errors.selfieUrl.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Datos personales */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-primary">👤</span>
                  Datos Personales
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Nombres <span className="text-destructive">*</span>
                    </label>
                    <Input
                      {...register('nombres', { required: 'Los nombres son obligatorios' })}
                      placeholder="Ingrese los nombres"
                    />
                    {errors.nombres && (
                      <p className="text-sm text-destructive mt-1">{errors.nombres.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Apellidos <span className="text-destructive">*</span>
                    </label>
                    <Input
                      {...register('apellidos', { required: 'Los apellidos son obligatorios' })}
                      placeholder="Ingrese los apellidos"
                    />
                    {errors.apellidos && (
                      <p className="text-sm text-destructive mt-1">{errors.apellidos.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Tipo de Identificación <span className="text-destructive">*</span>
                    </label>
                    <Select
                      {...register('tipoIdentificacion', { required: 'El tipo de identificación es obligatorio' })}
                    >
                      <option value="">Seleccione un tipo</option>
                      <option value="NACIONAL">Nacional</option>
                      <option value="DIMEX">DIMEX</option>
                      <option value="PASAPORTE">Pasaporte</option>
                      <option value="JURIDICA">Jurídica</option>
                    </Select>
                    {errors.tipoIdentificacion && (
                      <p className="text-sm text-destructive mt-1">{errors.tipoIdentificacion.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Número de Identificación <span className="text-destructive">*</span>
                    </label>
                    <Input
                      {...register('numeroIdentificacion', { required: 'El número de identificación es obligatorio' })}
                      placeholder="Ingrese el número de identificación"
                    />
                    {errors.numeroIdentificacion && (
                      <p className="text-sm text-destructive mt-1">{errors.numeroIdentificacion.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Fecha de Nacimiento <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="date"
                      {...register('fechaNacimiento', { required: 'La fecha de nacimiento es obligatoria' })}
                    />
                    {errors.fechaNacimiento && (
                      <p className="text-sm text-destructive mt-1">{errors.fechaNacimiento.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contacto */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-primary">📧</span>
                  Contacto
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Email <span className="text-destructive">*</span>
                    </label>
                    <Input
                      type="email"
                      {...register('email', { 
                        required: 'El email es obligatorio',
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: 'Email inválido'
                        }
                      })}
                      placeholder="ejemplo@correo.com"
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Teléfono <span className="text-destructive">*</span>
                    </label>
                    <Input
                      {...register('telefono', { required: 'El teléfono es obligatorio' })}
                      placeholder="8888-8888"
                    />
                    {errors.telefono && (
                      <p className="text-sm text-destructive mt-1">{errors.telefono.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Ubicación */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-primary">📍</span>
                  Ubicación
                </h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Provincia <span className="text-destructive">*</span>
                    </label>
                    <Select
                      {...register('provincia', { 
                        required: 'La provincia es obligatoria',
                        onChange: () => {
                          setValue('canton', '');
                          setValue('distrito', '');
                        }
                      })}
                    >
                      <option value="">Seleccione una provincia</option>
                      {provinces.map((province) => (
                        <option key={province} value={province}>
                          {province}
                        </option>
                      ))}
                    </Select>
                    {errors.provincia && (
                      <p className="text-sm text-destructive mt-1">{errors.provincia.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Cantón <span className="text-destructive">*</span>
                    </label>
                    <Select
                      {...register('canton', { 
                        required: 'El cantón es obligatorio',
                        onChange: () => {
                          setValue('distrito', '');
                        }
                      })}
                      disabled={!selectedProvince || loadingCantones}
                    >
                      <option value="">{loadingCantones ? 'Cargando...' : 'Seleccione un cantón'}</option>
                      {cantones.map((canton) => (
                        <option key={canton} value={canton}>
                          {canton}
                        </option>
                      ))}
                    </Select>
                    {errors.canton && (
                      <p className="text-sm text-destructive mt-1">{errors.canton.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Distrito <span className="text-destructive">*</span>
                    </label>
                    <Select
                      {...register('distrito', { required: 'El distrito es obligatorio' })}
                      disabled={!selectedCanton || loadingDistritos}
                    >
                      <option value="">{loadingDistritos ? 'Cargando...' : 'Seleccione un distrito'}</option>
                      {distritos.map((distrito) => (
                        <option key={distrito} value={distrito}>
                          {distrito}
                        </option>
                      ))}
                    </Select>
                    {errors.distrito && (
                      <p className="text-sm text-destructive mt-1">{errors.distrito.message}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Señas Exactas <span className="text-destructive">*</span>
                  </label>
                  <Input
                    {...register('senasExactas', { required: 'Las señas exactas son obligatorias' })}
                    placeholder="Descripción detallada de la ubicación"
                  />
                  {errors.senasExactas && (
                    <p className="text-sm text-destructive mt-1">{errors.senasExactas.message}</p>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Coordenadas Latitud <span className="text-destructive">*</span>
                    </label>
                    <Input
                      {...register('coordenadasLat', { required: 'Las coordenadas de latitud son obligatorias' })}
                      placeholder="Ej: 9.9281"
                      type="text"
                    />
                    {errors.coordenadasLat && (
                      <p className="text-sm text-destructive mt-1">{errors.coordenadasLat.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Coordenadas Longitud <span className="text-destructive">*</span>
                    </label>
                    <Input
                      {...register('coordenadasLng', { required: 'Las coordenadas de longitud son obligatorias' })}
                      placeholder="Ej: -84.0907"
                      type="text"
                    />
                    {errors.coordenadasLng && (
                      <p className="text-sm text-destructive mt-1">{errors.coordenadasLng.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Técnico y Plan */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <span className="text-primary">⚙️</span>
                  Información Técnica
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Número de Medidor <span className="text-destructive">*</span>
                    </label>
                    <Input
                      {...register('numeroMedidor', { required: 'El número de medidor es obligatorio' })}
                      placeholder="Ingrese el número de medidor"
                    />
                    {errors.numeroMedidor && (
                      <p className="text-sm text-destructive mt-1">{errors.numeroMedidor.message}</p>
                    )}
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Tipo de Producto <span className="text-destructive">*</span>
                    </label>
                    <Select
                      {...register('productTypeId', { 
                        required: 'El tipo de producto es obligatorio',
                        onChange: () => {
                          setValue('planId', '');
                        }
                      })}
                    >
                      <option value="">Seleccione un tipo de producto</option>
                      {productTypes
                        .filter((type) => type.activo)
                        .map((type) => (
                          <option key={type.id} value={type.id}>
                            {type.nombre}
                          </option>
                        ))}
                    </Select>
                    {errors.productTypeId && (
                      <p className="text-sm text-destructive mt-1">{errors.productTypeId.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Producto <span className="text-destructive">*</span>
                    </label>
                    <Select
                      {...register('planId', { required: 'El producto es obligatorio' })}
                      disabled={!selectedProductType}
                    >
                      <option value="">
                        {selectedProductType ? 'Seleccione un producto' : 'Seleccione primero un tipo de producto'}
                      </option>
                      {filteredPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.nombre}
                        </option>
                      ))}
                    </Select>
                    {errors.planId && (
                      <p className="text-sm text-destructive mt-1">{errors.planId.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      STB <span className="text-destructive">*</span>
                    </label>
                    <Select
                      {...register('stb', { required: 'El STB es obligatorio' })}
                    >
                      <option value="0">0</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                    </Select>
                    {errors.stb && (
                      <p className="text-sm text-destructive mt-1">{errors.stb.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Estados - Solo en edición y solo para admin */}
              {editingClient && currentUser?.role === 'admin' && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Estados</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Estado de Validación</label>
                      <Select
                        {...register('validationStatus')}
                      >
                        <option value="EN_PROCESO_VALIDACION">En validación</option>
                        <option value="APROBADA">Aprobada</option>
                        <option value="REQUIERE_DEPOSITO">Requiere Depósito</option>
                        <option value="NO_APLICA">No Aplica</option>
                        <option value="INCOBRABLE">Incobrable</option>
                        <option value="DEUDA_MENOR_ANIO">Deuda Menor a un Año</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Estado de Venta</label>
                      <Select
                        {...register('saleStatus')}
                      >
                        <option value="">Sin estado</option>
                        <option value="PENDIENTE_INSTALACION">Pendiente Instalación</option>
                        <option value="INSTALADA">Instalada</option>
                        <option value="CANCELADA">Cancelada</option>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Comentario de Validación</label>
                    <Input
                      {...register('validationComment')}
                      placeholder="Comentario sobre el estado de validación"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Comentario de Venta</label>
                    <Input
                      {...register('saleComment')}
                      placeholder="Comentario sobre el estado de venta"
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : editingClient ? 'Actualizar' : 'Crear'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Dialog para ver detalles */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles del Cliente</DialogTitle>
              <DialogDescription>
                Información completa del cliente
              </DialogDescription>
            </DialogHeader>

            {viewingClient && (
              <div className="space-y-6">
                {/* Fotos */}
                <div>
                  <h3 className="font-semibold mb-3">Fotos</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {viewingClient.cedulaFrontalUrl && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Cédula Frontal</label>
                        {viewingClient.cedulaFrontalUrl.includes('cloudinary.com') ? (
                          <CldImage
                            src={getCloudinaryPublicId(viewingClient.cedulaFrontalUrl) || viewingClient.cedulaFrontalUrl}
                            alt="Cédula Frontal"
                            width={200}
                            height={150}
                            className="rounded-md border"
                            crop={{
                              type: 'auto',
                              source: true
                            }}
                          />
                        ) : (
                          <img
                            src={viewingClient.cedulaFrontalUrl}
                            alt="Cédula Frontal"
                            className="rounded-md border w-[200px] h-[150px] object-cover"
                          />
                        )}
                      </div>
                    )}
                    {viewingClient.cedulaTraseraUrl && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Cédula Trasera</label>
                        {viewingClient.cedulaTraseraUrl.includes('cloudinary.com') ? (
                          <CldImage
                            src={getCloudinaryPublicId(viewingClient.cedulaTraseraUrl) || viewingClient.cedulaTraseraUrl}
                            alt="Cédula Trasera"
                            width={200}
                            height={150}
                            className="rounded-md border"
                            crop={{
                              type: 'auto',
                              source: true
                            }}
                          />
                        ) : (
                          <img
                            src={viewingClient.cedulaTraseraUrl}
                            alt="Cédula Trasera"
                            className="rounded-md border w-[200px] h-[150px] object-cover"
                          />
                        )}
                      </div>
                    )}
                    {viewingClient.selfieUrl && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Selfie</label>
                        {viewingClient.selfieUrl.includes('cloudinary.com') ? (
                          <CldImage
                            src={getCloudinaryPublicId(viewingClient.selfieUrl) || viewingClient.selfieUrl}
                            alt="Selfie"
                            width={200}
                            height={150}
                            className="rounded-md border"
                            crop={{
                              type: 'auto',
                              source: true
                            }}
                          />
                        ) : (
                          <img
                            src={viewingClient.selfieUrl}
                            alt="Selfie"
                            className="rounded-md border w-[200px] h-[150px] object-cover"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Datos personales */}
                <div>
                  <h3 className="font-semibold mb-3">Datos Personales</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nombres</label>
                      <p className="text-sm">{viewingClient.nombres}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Apellidos</label>
                      <p className="text-sm">{viewingClient.apellidos}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Tipo de Identificación</label>
                      <p className="text-sm">{viewingClient.tipoIdentificacion}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Número de Identificación</label>
                      <p className="text-sm">{viewingClient.numeroIdentificacion}</p>
                    </div>
                    {viewingClient.fechaNacimiento && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Fecha de Nacimiento</label>
                        <p className="text-sm">{new Date(viewingClient.fechaNacimiento).toLocaleDateString('es-CR')}</p>
                      </div>
                    )}
                    {viewingClient.stb && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">STB</label>
                        <p className="text-sm">{viewingClient.stb}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contacto */}
                <div>
                  <h3 className="font-semibold mb-3">Contacto</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-sm">{viewingClient.email || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Teléfono</label>
                      <p className="text-sm">{viewingClient.telefono || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Ubicación */}
                <div>
                  <h3 className="font-semibold mb-3">Ubicación</h3>
                  <div className="space-y-2">
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Provincia</label>
                        <p className="text-sm">{viewingClient.provincia}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Cantón</label>
                        <p className="text-sm">{viewingClient.canton}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Distrito</label>
                        <p className="text-sm">{viewingClient.distrito}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Señas Exactas</label>
                      <p className="text-sm">{viewingClient.senasExactas}</p>
                    </div>
                    {(viewingClient.coordenadasLat || viewingClient.coordenadasLng) && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Latitud</label>
                          <p className="text-sm">{viewingClient.coordenadasLat || 'N/A'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Longitud</label>
                          <p className="text-sm">{viewingClient.coordenadasLng || 'N/A'}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Técnico y Plan */}
                <div>
                  <h3 className="font-semibold mb-3">Información Técnica</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Número de Medidor</label>
                      <p className="text-sm">{viewingClient.numeroMedidor || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Plan</label>
                      <p className="text-sm">{viewingClient.plan?.nombre || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Metadatos - Solo para admin */}
                {currentUser?.role === 'admin' && (
                  <div>
                    <h3 className="font-semibold mb-3">Información del Sistema</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Creado Por</label>
                        <p className="text-sm">{viewingClient.creator?.email || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Fecha de Creación</label>
                        <p className="text-sm">{new Date(viewingClient.createdAt).toLocaleString('es-CR')}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Estados - Solo para admin */}
                {currentUser?.role === 'admin' && (
                  <div>
                    <h3 className="font-semibold mb-3">Estados</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Estado de Validación</label>
                        <p className="text-sm">{getValidationStatusLabel(viewingClient.validationStatus)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Estado de Venta</label>
                        <p className="text-sm">{getSaleStatusLabel(viewingClient.saleStatus)}</p>
                      </div>
                    </div>
                    {viewingClient.validationComment && (
                      <div className="mt-3">
                        <label className="text-sm font-medium text-muted-foreground">Comentario de Validación</label>
                        <p className="text-sm bg-muted p-2 rounded">{viewingClient.validationComment}</p>
                      </div>
                    )}
                    {viewingClient.saleComment && (
                      <div className="mt-3">
                        <label className="text-sm font-medium text-muted-foreground">Comentario de Venta</label>
                        <p className="text-sm bg-muted p-2 rounded">{viewingClient.saleComment}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Historial de Comentarios de Estado */}
                {viewingClient.statusComments && viewingClient.statusComments.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Historial de Cambios de Estado</h3>
                    <div className="space-y-3">
                      {viewingClient.statusComments.map((comment) => (
                        <Card key={comment.id}>
                          <CardContent className="pt-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-sm font-medium text-primary">
                                  {comment.tipo === 'VALIDACION' ? 'Validación' : 'Venta'}
                                </span>
                                {comment.estadoAnterior && (
                                  <span className="text-sm text-muted-foreground ml-2">
                                    {comment.estadoAnterior} →
                                  </span>
                                )}
                                <span className="text-sm font-medium ml-2">
                                  {comment.estadoNuevo}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(comment.createdAt).toLocaleString('es-CR')}
                              </span>
                            </div>
                            {comment.comentario && (
                              <p className="text-sm text-muted-foreground mb-2">{comment.comentario}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Por: {comment.creator.email}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button onClick={() => setViewDialogOpen(false)}>
                Cerrar
              </Button>
              {viewingClient && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    handleOpenDialog(viewingClient);
                  }}
                >
                  Editar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
