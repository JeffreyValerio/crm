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
import { Plus, Edit, Trash2, Eye, Upload, Download, Copy, Check, MoreVertical, MessageCircle, ChevronLeft, ChevronRight, Search, UserCheck, MapPin } from 'lucide-react';
import { TableEmptyState } from '@/components/ui/table-empty-state';
import { TableSkeleton } from '@/components/ui/table-skeleton';
import { CldImage } from 'next-cloudinary';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { getUserDisplayName, getValidationStatusLabel, getSaleStatusLabel } from '@/lib/labels';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
  formulario: string | null;
  planId: string | null;
  plan: Plan | null;
  creator?: {
    id: string;
    email: string;
    nombre: string | null;
    apellidos: string | null;
  };
  statusComments?: StatusComment[];
  createdAt: string;
  updatedAt: string;
  assignedAt: string | null;
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
  formulario: string;
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
  const [filterYear, setFilterYear] = useState<string>(new Date().getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalClients, setTotalClients] = useState<number>(0);
  const [users, setUsers] = useState<{ id: string; email: string; nombre?: string | null; apellidos?: string | null }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<{ role?: string } | null>(null);
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cantones, setCantones] = useState<string[]>([]);
  const [distritos, setDistritos] = useState<string[]>([]);
  const [loadingCantones, setLoadingCantones] = useState(false);
  const [loadingDistritos, setLoadingDistritos] = useState(false);
  const [initializingForm, setInitializingForm] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top?: number; bottom?: number; right: number } | null>(null);
  const [reassignClientId, setReassignClientId] = useState<string | null>(null);
  const [reassignUserId, setReassignUserId] = useState<string>('');
  const [reassignOriginalUserId, setReassignOriginalUserId] = useState<string>('');
  const [reassignLoading, setReassignLoading] = useState(false);
  const [viewTab, setViewTab] = useState<'info' | 'fotos' | 'historial'>('info');
  const [editTab, setEditTab] = useState<'datos' | 'ubicacion' | 'tecnico' | 'fotos' | 'estado'>('datos');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      formulario: '',
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
  }, [filterValidationStatus, filterSaleStatus, filterCreatedBy, filterYear, filterMonth, searchTerm, currentPage, loading, currentUser]);

  // Resetear a página 1 cuando cambia la búsqueda o los filtros
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchTerm, filterValidationStatus, filterSaleStatus, filterCreatedBy, filterYear, filterMonth]);

  // Debounce para la búsqueda
  useEffect(() => {
    if (!currentUser || loading) return;
    
    const timeoutId = setTimeout(() => {
      loadClients();
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId) {
        setOpenMenuId(null);
        setMenuPosition(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [openMenuId]);

  async function loadClients() {
    const params = new URLSearchParams();
    // Solo aplicar filtros de estado y creador si el usuario es admin
    if (currentUser?.role === 'admin') {
      if (filterValidationStatus) params.append('validationStatus', filterValidationStatus);
      if (filterSaleStatus) params.append('saleStatus', filterSaleStatus);
      if (filterCreatedBy) params.append('createdBy', filterCreatedBy);
    }

    // Búsqueda
    if (searchTerm.trim()) params.append('search', searchTerm.trim());

    // Filtro de período
    if (filterYear) params.append('year', filterYear);
    if (filterMonth) params.append('month', filterMonth);

    // Paginación
    params.append('page', currentPage.toString());
    params.append('limit', '10');

    const response = await fetch(`/api/clients?${params.toString()}`);
    if (response.ok) {
      const data = await response.json();
      setClients(data.clients || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalClients(data.pagination?.total || 0);
    }
  }

  async function loadUsers() {
    const response = await fetch('/api/users');
    if (response.ok) {
      const data = await response.json();
      setUsers(data.users?.map((u: { id: string; email: string; nombre?: string; apellidos?: string }) => ({ 
        id: u.id, 
        email: u.email,
        nombre: u.nombre,
        apellidos: u.apellidos,
      })) || []);
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

  async function handleCopyToClipboard(value: string, fieldName: string) {
    if (!value) return;
    
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(fieldName);
      toast.success('Copiado al portapapeles');
      setTimeout(() => {
        setCopiedField(null);
      }, 2000);
    } catch (error) {
      console.error('Error al copiar:', error);
      toast.error('Error al copiar al portapapeles');
    }
  }

  async function handleOpenDialog(client?: Client) {
    setEditTab('datos');
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
        formulario: client.formulario || '',
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
        formulario: '',
      });
    }
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
          toast.success('Imagen subida correctamente');
        } else {
          toast.error(data.error || 'Error al subir la imagen');
        }
      } catch (error) {
        toast.error('Error al subir la imagen');
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
        toast.success(editingClient ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente');
      } else {
        toast.error(result.error || 'Error al guardar el cliente');
      }
    } catch (error) {
      toast.error('Error al procesar la solicitud');
    } finally {
      setSubmitting(false);
    }
  };

  async function handleDelete(id: string) {
    setDeleting(true);
    try {
      const response = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      if (response.ok) {
        await loadClients();
        toast.success('Cliente eliminado correctamente');
      } else {
        toast.error('Error al eliminar el cliente');
      }
    } finally {
      setDeleting(false);
      setDeleteConfirmId(null);
    }
  }

  function handleWhatsApp(client: Client) {
    // Formatear fecha de hoy
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const fechaVenta = `${day}/${month}/${year}`;

    // Obtener nombre completo
    const nombreCompleto = `${client.nombres} ${client.apellidos}`.toUpperCase();

    // Obtener producto/paquete
    const paquete = client.plan?.nombre || 'N/A';

    // Obtener asesor (creador)
    const asesor = getUserDisplayName(client.creator) || 'N/A';

    // Construir el mensaje
    const mensaje = `Nombre: ${nombreCompleto}
Cédula: ${client.numeroIdentificacion}
Provincia: ${client.provincia}
Cantón: ${client.canton}
Formulario: ${client.formulario || ''}
Paquete: ${paquete}
Venta: ${fechaVenta}
Orden: 
Asesor: ${asesor}
Comentario: En espera de Instalacion`;

    // Codificar el mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);

    // Abrir WhatsApp Web o app
    window.open(`https://wa.me/?text=${mensajeCodificado}`, '_blank');
    
    setOpenMenuId(null);
    setMenuPosition(null);
  }

  async function handleView(client: Client) {
    const response = await fetch(`/api/clients/${client.id}`);
    if (response.ok) {
      const data = await response.json();
      setViewingClient(data.client);
      setViewTab('info');
      setViewDialogOpen(true);
    }
  }

  async function handleReassign() {
    if (!reassignClientId || !reassignUserId) return;
    setReassignLoading(true);
    try {
      const res = await fetch(`/api/clients/${reassignClientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createdBy: reassignUserId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Error al reasignar el cliente');
        return;
      }
      setReassignClientId(null);
      setReassignUserId('');
      toast.success('Cliente reasignado correctamente');
      await loadClients();
    } catch {
      toast.error('Error al reasignar el cliente');
    } finally {
      setReassignLoading(false);
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
      toast.success('PDF generado correctamente');
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <TableSkeleton cols={8} showFilters />
      </MainLayout>
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

        {/* Buscar y filtros juntos */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar y filtrar</CardTitle>
            <CardDescription>
              Busca por nombre, apellido, cédula, teléfono, email o formulario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-4">
              <div className="relative min-w-[200px] flex-1 max-w-md">
                <label className="text-sm font-medium mb-2 block">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar clientes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {currentUser?.role === 'admin' && (
                <>
                  <div className="min-w-[180px]">
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
                  <div className="min-w-[180px]">
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
                  <div className="min-w-[180px]">
                    <label className="text-sm font-medium mb-2 block">Creado Por</label>
                    <Select
                      value={filterCreatedBy}
                      onChange={(e) => setFilterCreatedBy(e.target.value)}
                    >
                      <option value="">Todos los usuarios</option>
                      {users.map((user) => {
                        const displayName = getUserDisplayName(user);
                        return (
                          <option key={user.id} value={user.id}>
                            {displayName}
                          </option>
                        );
                      })}
                    </Select>
                  </div>
                </>
              )}
              {/* Filtro de período — disponible para todos */}
              <div className="min-w-[130px]">
                <label className="text-sm font-medium mb-2 block">Mes</label>
                <Select value={filterMonth} onChange={(e) => { setFilterMonth(e.target.value); setCurrentPage(1); }}>
                  <option value="">Todos</option>
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </Select>
              </div>
              <div className="min-w-[100px]">
                <label className="text-sm font-medium mb-2 block">Año</label>
                <Select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setCurrentPage(1); }}>
                  <option value="">Todos</option>
                  {[0, 1, 2].map((i) => {
                    const y = new Date().getFullYear() - i;
                    return <option key={y} value={String(y)}>{y}</option>;
                  })}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Clientes</CardTitle>
            <CardDescription>
              {totalClients} cliente(s) encontrado(s) {totalPages > 1 && `(Página ${currentPage} de ${totalPages})`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Formulario</TableHead>
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
                  <TableEmptyState
                    colSpan={currentUser?.role === 'admin' ? 10 : 7}
                    message={searchTerm.trim() ? 'No se encontraron clientes que coincidan con la búsqueda' : 'No hay clientes registrados'}
                  />
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {client.assignedAt && currentUser?.role !== 'admin' ? (
                          <div>
                            <span className="text-xs text-primary font-medium block">Asignado</span>
                            {new Date(client.assignedAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        ) : (
                          new Date(client.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
                        )}
                      </TableCell>
                      <TableCell>{client.nombres} {client.apellidos}</TableCell>
                      <TableCell>{client.formulario || 'N/A'}</TableCell>
                      <TableCell>{client.numeroIdentificacion}</TableCell>
                      <TableCell>{client.telefono || 'N/A'}</TableCell>
                      <TableCell>{client.plan?.nombre || 'N/A'}</TableCell>
                      {currentUser?.role === 'admin' && (
                        <>
                          <TableCell>
                            <Badge variant={validationBadgeVariant(client.validationStatus)}>
                              {getValidationStatusLabel(client.validationStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {client.saleStatus && (
                              <Badge variant={saleBadgeVariant(client.saleStatus)}>
                                {getSaleStatusLabel(client.saleStatus)}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{getUserDisplayName(client.creator)}</TableCell>
                        </>
                      )}
                      <TableCell>
                        <div className="relative">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              const button = e.currentTarget;
                              const rect = button.getBoundingClientRect();
                              const spaceBelow = window.innerHeight - rect.bottom;
                              setMenuPosition(spaceBelow < 220
                                ? { bottom: window.innerHeight - rect.top + 4, right: window.innerWidth - rect.right }
                                : { top: rect.bottom + 4, right: window.innerWidth - rect.right }
                              );
                              setOpenMenuId(openMenuId === client.id ? null : client.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando página {currentPage} de {totalPages} ({totalClients} cliente(s) en total)
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Menú flotante de acciones */}
        {openMenuId && menuPosition && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => {
                setOpenMenuId(null);
                setMenuPosition(null);
              }}
            />
            <div 
              className="fixed z-50 w-56 rounded-md border bg-background shadow-lg"
              style={{
                ...(menuPosition.top !== undefined ? { top: `${menuPosition.top}px` } : { bottom: `${menuPosition.bottom}px` }),
                right: `${menuPosition.right}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-1">
                {(() => {
                  const client = clients.find(c => c.id === openMenuId);
                  if (!client) return null;
                  return (
                    <>
                      <button
                        onClick={() => {
                          handleView(client);
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalles
                      </button>
                      <button
                        onClick={() => {
                          handleOpenDialog(client);
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          handleDownloadPDF(client);
                          setOpenMenuId(null);
                          setMenuPosition(null);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                      >
                        <Download className="h-4 w-4" />
                        Descargar PDF
                      </button>
                      <button
                        onClick={() => {
                          handleWhatsApp(client);
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                      >
                        <MessageCircle className="h-4 w-4" />
                        WhatsApp
                      </button>
                      {currentUser?.role === 'admin' && (
                        <>
                          <button
                            onClick={() => {
                              setReassignClientId(client.id);
                              setReassignUserId(client.creator?.id ?? '');
                              setReassignOriginalUserId(client.creator?.id ?? '');
                              setOpenMenuId(null);
                              setMenuPosition(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                          >
                            <UserCheck className="h-4 w-4" />
                            Mover a usuario
                          </button>
                          <div className="h-px bg-border my-1" />
                          <button
                            onClick={() => {
                              setDeleteConfirmId(client.id);
                              setOpenMenuId(null);
                              setMenuPosition(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-sm hover:bg-destructive/10 hover:text-destructive transition-colors text-left text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Eliminar
                          </button>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        {/* Dialog para crear/editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-5xl">
            <DialogHeader>
              <DialogTitle>
                {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription>
                {editingClient ? 'Modifica la información del cliente' : 'Completa los datos del nuevo cliente'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit, (errs) => {
                const datosF = ['nombres','apellidos','tipoIdentificacion','numeroIdentificacion','fechaNacimiento','email','telefono'];
                const ubicF = ['provincia','canton','distrito','senasExactas','coordenadasLat','coordenadasLng'];
                const tecF = ['stb','numeroMedidor','productTypeId','planId'];
                const fotosF = ['cedulaFrontalUrl','cedulaTraseraUrl','selfieUrl'];
                const keys = Object.keys(errs);
                if (keys.some(k => datosF.includes(k))) setEditTab('datos');
                else if (keys.some(k => ubicF.includes(k))) setEditTab('ubicacion');
                else if (keys.some(k => tecF.includes(k))) setEditTab('tecnico');
                else if (keys.some(k => fotosF.includes(k))) setEditTab('fotos');
              })} className="space-y-4">
              {/* Tab nav */}
              <div className="flex border-b -mx-6 px-6">
                {[
                  { key: 'datos', label: 'Datos' },
                  { key: 'ubicacion', label: 'Ubicación' },
                  { key: 'tecnico', label: 'Técnico' },
                  { key: 'fotos', label: 'Fotos' },
                  ...(editingClient && currentUser?.role === 'admin' ? [{ key: 'estado', label: 'Estado' }] : []),
                ].map(tab => (
                  <button key={tab.key} type="button" onClick={() => setEditTab(tab.key as any)}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap -mb-px",
                      editTab === tab.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                    )}>
                    {tab.label}
                  </button>
                ))}
              </div>
              {/* FOTOS TAB */}
              <div className={editTab !== 'fotos' ? 'hidden' : ''}>
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

              </div>{/* end fotos tab */}
              {/* DATOS TAB */}
              <div className={editTab !== 'datos' ? 'hidden' : ''}>
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
                    <div className="relative">
                      <Input
                        {...register('nombres', { required: 'Los nombres son obligatorios' })}
                        placeholder="Ingrese los nombres"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => handleCopyToClipboard(watch('nombres'), 'nombres')}
                        title="Copiar"
                      >
                        {copiedField === 'nombres' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.nombres && (
                      <p className="text-sm text-destructive mt-1">{errors.nombres.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Apellidos <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        {...register('apellidos', { required: 'Los apellidos son obligatorios' })}
                        placeholder="Ingrese los apellidos"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => handleCopyToClipboard(watch('apellidos'), 'apellidos')}
                        title="Copiar"
                      >
                        {copiedField === 'apellidos' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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
                    <div className="relative">
                      <Input
                        {...(() => {
                          const { onChange: rhfOnChange, ...rest } = register('numeroIdentificacion', {
                            required: 'El número de identificación es obligatorio',
                            validate: (value) => {
                              const tipo = watch('tipoIdentificacion');
                              if (tipo === 'NACIONAL' || tipo === 'JURIDICA' || tipo === 'DIMEX') {
                                if (!/^\d+$/.test(value)) return 'Solo se permiten números para este tipo de identificación';
                              } else {
                                if (!/^[a-zA-Z0-9]+$/.test(value)) return 'Solo se permiten letras y números, sin guiones ni espacios';
                              }
                              return true;
                            },
                          });
                          return {
                            ...rest,
                            onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                              const tipo = watch('tipoIdentificacion');
                              if (tipo === 'NACIONAL' || tipo === 'JURIDICA' || tipo === 'DIMEX') {
                                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                              } else {
                                e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
                              }
                              return rhfOnChange(e);
                            },
                          };
                        })()}
                        placeholder="Ingrese el número de identificación"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => handleCopyToClipboard(watch('numeroIdentificacion'), 'numeroIdentificacion')}
                        title="Copiar"
                      >
                        {copiedField === 'numeroIdentificacion' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.numeroIdentificacion && (
                      <p className="text-sm text-destructive mt-1">{errors.numeroIdentificacion.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Fecha de Nacimiento <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        type="date"
                        {...register('fechaNacimiento', { required: 'La fecha de nacimiento es obligatoria' })}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => handleCopyToClipboard(watch('fechaNacimiento'), 'fechaNacimiento')}
                        title="Copiar"
                      >
                        {copiedField === 'fechaNacimiento' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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
                    <div className="relative">
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
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => handleCopyToClipboard(watch('email'), 'email')}
                        title="Copiar"
                      >
                        {copiedField === 'email' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.email && (
                      <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Teléfono <span className="text-destructive">*</span>
                    </label>
                    <div className="relative">
                      <Input
                        {...register('telefono', { 
                          required: 'El teléfono es obligatorio',
                          pattern: {
                            value: /^\d{8}$/,
                            message: 'El teléfono debe tener exactamente 8 dígitos'
                          }
                        })}
                        placeholder="88888888"
                        className="pr-10"
                        maxLength={8}
                        onChange={(e) => {
                          // Filtrar solo números y limitar a 8 dígitos
                          const value = e.target.value.replace(/\D/g, '').slice(0, 8);
                          e.target.value = value;
                          setValue('telefono', value, { shouldValidate: true });
                        }}
                        onKeyPress={(e) => {
                          // Solo permitir números
                          if (!/[0-9]/.test(e.key)) {
                            e.preventDefault();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => handleCopyToClipboard(watch('telefono'), 'telefono')}
                        title="Copiar"
                      >
                        {copiedField === 'telefono' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {errors.telefono && (
                      <p className="text-sm text-destructive mt-1">{errors.telefono.message}</p>
                    )}
                  </div>
                </div>
              </div>

              </div>{/* end datos tab */}
              {/* UBICACION TAB */}
              <div className={editTab !== 'ubicacion' ? 'hidden' : ''}>
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
                  <div className="relative">
                    <Input
                      {...register('senasExactas', { required: 'Las señas exactas son obligatorias' })}
                      placeholder="Descripción detallada de la ubicación"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => handleCopyToClipboard(watch('senasExactas'), 'senasExactas')}
                      title="Copiar"
                    >
                      {copiedField === 'senasExactas' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {errors.senasExactas && (
                    <p className="text-sm text-destructive mt-1">{errors.senasExactas.message}</p>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Coordenadas Latitud <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          {...register('coordenadasLat', { required: 'Las coordenadas de latitud son obligatorias' })}
                          placeholder="Ej: 9.9281"
                          type="text"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => handleCopyToClipboard(watch('coordenadasLat'), 'coordenadasLat')}
                          title="Copiar"
                        >
                          {copiedField === 'coordenadasLat' ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.coordenadasLat && (
                        <p className="text-sm text-destructive mt-1">{errors.coordenadasLat.message}</p>
                      )}
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Coordenadas Longitud <span className="text-destructive">*</span>
                      </label>
                      <div className="relative">
                        <Input
                          {...register('coordenadasLng', { required: 'Las coordenadas de longitud son obligatorias' })}
                          placeholder="Ej: -84.0907"
                          type="text"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => handleCopyToClipboard(watch('coordenadasLng'), 'coordenadasLng')}
                          title="Copiar"
                        >
                          {copiedField === 'coordenadasLng' ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {errors.coordenadasLng && (
                        <p className="text-sm text-destructive mt-1">{errors.coordenadasLng.message}</p>
                      )}
                    </div>
                  </div>
                  {watch('coordenadasLat') && watch('coordenadasLng') && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        navigator.clipboard.writeText(`${watch('coordenadasLat')}, ${watch('coordenadasLng')}`);
                        window.open('https://www.claro.cr/mapacobertura/', '_blank', 'noopener');
                      }}
                    >
                      <MapPin className="h-4 w-4" />
                      Ver cobertura Claro
                    </Button>
                  )}
                </div>
              </div>

              </div>{/* end ubicacion tab */}
              {/* TECNICO TAB */}
              <div className={editTab !== 'tecnico' ? 'hidden' : ''}>
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
                    <div className="relative">
                      <Input
                        {...register('numeroMedidor', { required: 'El número de medidor es obligatorio' })}
                        placeholder="Ingrese el número de medidor"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => handleCopyToClipboard(watch('numeroMedidor'), 'numeroMedidor')}
                        title="Copiar"
                      >
                        {copiedField === 'numeroMedidor' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
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

              </div>{/* end tecnico tab */}
              {/* ESTADO TAB */}
              <div className={editTab !== 'estado' ? 'hidden' : ''}>
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
                        <option value="NO_COMPLETO_FACEID">No completó FaceID</option>
                        <option value="CANCELADO_POR_COBERTURA">Cancelado por cobertura</option>
                        <option value="CLIENTE_NO_PERMITE_INSTALACION">Cliente no permite instalación</option>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Comentario de Validación</label>
                    <div className="relative">
                      <Input
                        {...register('validationComment')}
                        placeholder="Comentario sobre el estado de validación"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => handleCopyToClipboard(watch('validationComment'), 'validationComment')}
                        title="Copiar"
                      >
                        {copiedField === 'validationComment' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Comentario de Venta</label>
                    <div className="relative">
                      <Input
                        {...register('saleComment')}
                        placeholder="Comentario sobre el estado de venta"
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => handleCopyToClipboard(watch('saleComment'), 'saleComment')}
                        title="Copiar"
                      >
                        {copiedField === 'saleComment' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  {watch('saleStatus') && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Formulario</label>
                      <div className="relative">
                        <Input
                          {...register('formulario')}
                          placeholder="Ingrese el formulario"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => handleCopyToClipboard(watch('formulario'), 'formulario')}
                          title="Copiar"
                        >
                          {copiedField === 'formulario' ? (
                            <Check className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </div>{/* end estado tab */}

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
          <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
            {viewingClient && (
              <div>
                {/* Header */}
                <div className="pr-8 mb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <DialogTitle className="text-xl leading-tight">
                        {viewingClient.nombres} {viewingClient.apellidos}
                      </DialogTitle>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {viewingClient.validationStatus && (
                          <Badge variant={validationBadgeVariant(viewingClient.validationStatus)}>
                            {getValidationStatusLabel(viewingClient.validationStatus)}
                          </Badge>
                        )}
                        {viewingClient.saleStatus && (
                          <Badge variant={saleBadgeVariant(viewingClient.saleStatus)}>
                            {getSaleStatusLabel(viewingClient.saleStatus)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="WhatsApp"
                        onClick={() => { handleWhatsApp(viewingClient); setViewDialogOpen(false); }}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Descargar PDF"
                        onClick={() => handleDownloadPDF(viewingClient)}>
                        <Download className="h-4 w-4" />
                      </Button>
                      {viewingClient.coordenadasLat && viewingClient.coordenadasLng && (
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Ver en mapa Claro (coordenadas copiadas al portapapeles)"
                          onClick={() => {
                            navigator.clipboard.writeText(`${viewingClient.coordenadasLat}, ${viewingClient.coordenadasLng}`);
                            window.open('https://www.claro.cr/mapacobertura/', '_blank', 'noopener');
                          }}>
                          <MapPin className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" className="h-8 px-3 gap-1.5"
                        onClick={() => { setViewDialogOpen(false); handleOpenDialog(viewingClient); }}>
                        <Edit className="h-3.5 w-3.5" /> Editar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Tab bar */}
                <div className="flex border-b -mx-6 px-6 mt-4 mb-4">
                  {(['info', 'fotos', 'historial'] as const).map(tab => (
                    <button key={tab} type="button" onClick={() => setViewTab(tab)}
                      className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap",
                        viewTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {tab === 'info' ? 'Información' : tab === 'fotos' ? 'Fotos' : `Historial${viewingClient.statusComments?.length ? ` (${viewingClient.statusComments.length})` : ''}`}
                    </button>
                  ))}
                </div>

                {/* INFO TAB */}
                {viewTab === 'info' && (
                  <div className="space-y-5">
                    <ViewSection title="Personal">
                      <ViewRow label="Nombres" value={viewingClient.nombres} copyKey="v-nombres" copiedField={copiedField} onCopy={handleCopyToClipboard} />
                      <ViewRow label="Apellidos" value={viewingClient.apellidos} copyKey="v-apellidos" copiedField={copiedField} onCopy={handleCopyToClipboard} />
                      <ViewRow label="Tipo ID" value={viewingClient.tipoIdentificacion} copyKey="v-tipoid" copiedField={copiedField} onCopy={handleCopyToClipboard} />
                      <ViewRow label="Cédula" value={viewingClient.numeroIdentificacion} copyKey="v-cedula" copiedField={copiedField} onCopy={handleCopyToClipboard} />
                      {viewingClient.fechaNacimiento && <ViewRow label="Nacimiento" value={new Date(viewingClient.fechaNacimiento).toLocaleDateString('es-CR')} copyKey="v-nac" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                      {viewingClient.stb != null && <ViewRow label="STB" value={String(viewingClient.stb)} copyKey="v-stb" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                    </ViewSection>
                    <ViewSection title="Contacto">
                      {viewingClient.telefono && <ViewRow label="Teléfono" value={viewingClient.telefono} copyKey="v-tel" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                      {viewingClient.email && <ViewRow label="Email" value={viewingClient.email} copyKey="v-email" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                    </ViewSection>
                    <ViewSection title="Ubicación">
                      <ViewRow label="Provincia" value={viewingClient.provincia} copyKey="v-prov" copiedField={copiedField} onCopy={handleCopyToClipboard} />
                      <ViewRow label="Cantón" value={viewingClient.canton} copyKey="v-canton" copiedField={copiedField} onCopy={handleCopyToClipboard} />
                      <ViewRow label="Distrito" value={viewingClient.distrito} copyKey="v-dist" copiedField={copiedField} onCopy={handleCopyToClipboard} />
                      <ViewRow label="Señas" value={viewingClient.senasExactas} copyKey="v-senas" copiedField={copiedField} onCopy={handleCopyToClipboard} />
                      {viewingClient.coordenadasLat && <ViewRow label="Latitud" value={viewingClient.coordenadasLat} copyKey="v-lat" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                      {viewingClient.coordenadasLng && <ViewRow label="Longitud" value={viewingClient.coordenadasLng} copyKey="v-lng" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                    </ViewSection>
                    <ViewSection title="Técnico">
                      {viewingClient.numeroMedidor && <ViewRow label="Medidor" value={viewingClient.numeroMedidor} copyKey="v-med" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                      {viewingClient.plan?.nombre && <ViewRow label="Plan" value={viewingClient.plan.nombre} copyKey="v-plan" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                      {viewingClient.formulario && <ViewRow label="Formulario" value={viewingClient.formulario} copyKey="v-form" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                    </ViewSection>
                    {currentUser?.role === 'admin' && (
                      <ViewSection title="Sistema y Estado">
                        <ViewRow label="Creado por" value={getUserDisplayName(viewingClient.creator)} copyKey="v-creator" copiedField={copiedField} onCopy={handleCopyToClipboard} />
                        <ViewRow label="Registro" value={new Date(viewingClient.createdAt).toLocaleString('es-CR')} copyKey="v-fecha" copiedField={copiedField} onCopy={handleCopyToClipboard} />
                        {viewingClient.validationComment && <ViewRow label="Coment. validación" value={viewingClient.validationComment} copyKey="v-valcom" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                        {viewingClient.saleComment && <ViewRow label="Coment. venta" value={viewingClient.saleComment} copyKey="v-salecom" copiedField={copiedField} onCopy={handleCopyToClipboard} />}
                      </ViewSection>
                    )}
                  </div>
                )}

                {/* FOTOS TAB */}
                {viewTab === 'fotos' && (
                  <div className="grid gap-5 sm:grid-cols-3">
                    {[
                      { url: viewingClient.cedulaFrontalUrl, label: 'Cédula Frontal' },
                      { url: viewingClient.cedulaTraseraUrl, label: 'Cédula Trasera' },
                      { url: viewingClient.selfieUrl, label: 'Selfie' },
                    ].map(({ url, label }) => (
                      <div key={label}>
                        <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
                        {url ? (
                          url.includes('cloudinary.com') ? (
                            <CldImage src={getCloudinaryPublicId(url) || url} alt={label} width={280} height={200}
                              className="rounded-lg border w-full object-cover"
                              crop={{ type: 'auto', source: true }} />
                          ) : (
                            <img src={url} alt={label} className="rounded-lg border w-full h-[160px] object-cover" />
                          )
                        ) : (
                          <div className="rounded-lg border border-dashed bg-muted/30 h-[160px] flex items-center justify-center">
                            <p className="text-xs text-muted-foreground">Sin foto</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* HISTORIAL TAB */}
                {viewTab === 'historial' && (
                  <div>
                    {(!viewingClient.statusComments || viewingClient.statusComments.length === 0) ? (
                      <p className="text-sm text-muted-foreground text-center py-10">Sin cambios de estado registrados</p>
                    ) : (
                      <div className="relative pl-6">
                        <div className="absolute left-2 top-0 bottom-4 w-px bg-border" />
                        <div className="space-y-3">
                          {viewingClient.statusComments.map((comment) => (
                            <div key={comment.id} className="relative">
                              <div className="absolute -left-[18px] top-2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
                              <div className="rounded-lg border bg-card p-3">
                                <div className="flex items-start justify-between gap-2 mb-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                                      {comment.tipo === 'VALIDACION' ? 'Validación' : 'Venta'}
                                    </span>
                                    {comment.estadoAnterior && (
                                      <span className="text-xs text-muted-foreground">{comment.estadoAnterior} →</span>
                                    )}
                                    <span className="text-xs font-medium">{comment.estadoNuevo}</span>
                                  </div>
                                  <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                    {new Date(comment.createdAt).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                                {comment.comentario && <p className="text-sm text-muted-foreground">{comment.comentario}</p>}
                                <p className="text-xs text-muted-foreground mt-1.5">Por: {getUserDisplayName(comment.creator)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>


        {/* Dialog confirmar eliminación */}
        <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Eliminar cliente</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Esta acción es permanente y no se puede deshacer. ¿Confirmas que querés eliminar este cliente?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog reasignar cliente */}
        <Dialog
          open={!!reassignClientId}
          onOpenChange={(open) => {
            if (!open) {
              setReassignClientId(null);
              setReassignUserId('');
              setReassignOriginalUserId('');
            }
          }}
        >
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Mover cliente a otro usuario</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <label htmlFor="reassign-user" className="text-sm font-medium mb-2 block">
                Selecciona el usuario destino
              </label>
              <Select
                id="reassign-user"
                value={reassignUserId}
                onChange={(e) => setReassignUserId(e.target.value)}
              >
                <option value="">Seleccione un usuario</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nombre && u.apellidos ? `${u.nombre} ${u.apellidos}` : u.email}
                  </option>
                ))}
              </Select>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setReassignClientId(null);
                  setReassignUserId('');
                  setReassignOriginalUserId('');
                }}
                disabled={reassignLoading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleReassign}
                disabled={!reassignUserId || reassignUserId === reassignOriginalUserId || reassignLoading}
              >
                {reassignLoading ? 'Guardando...' : 'Mover'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}

// ── Badge variant helpers ──────────────────────────────────────────────────────
type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'pending';

function validationBadgeVariant(status: string | null): BadgeVariant {
  switch (status) {
    case 'APROBADA': return 'success';
    case 'REQUIERE_DEPOSITO': return 'warning';
    case 'DEUDA_MENOR_ANIO': return 'warning';
    case 'NO_APLICA': return 'info';
    case 'INCOBRABLE': return 'destructive';
    default: return 'pending';
  }
}

function saleBadgeVariant(status: string | null): BadgeVariant {
  switch (status) {
    case 'INSTALADA': return 'success';
    case 'PENDIENTE_INSTALACION': return 'pending';
    case 'CANCELADA': return 'destructive';
    case 'CANCELADO_POR_COBERTURA': return 'destructive';
    case 'CLIENTE_NO_PERMITE_INSTALACION': return 'destructive';
    case 'NO_COMPLETO_FACEID': return 'warning';
    default: return 'default';
  }
}

// ── View dialog sub-components ─────────────────────────────────────────────────
function ViewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      <div className="divide-y rounded-lg border bg-muted/20 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ViewRow({
  label, value, copyKey, copiedField, onCopy,
}: {
  label: string;
  value: string;
  copyKey: string;
  copiedField: string | null;
  onCopy: (v: string, k: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="text-xs text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <span className="text-sm flex-1 min-w-0 break-words">{value}</span>
      <button
        onClick={() => onCopy(value, copyKey)}
        className="flex-shrink-0 p-1 rounded hover:bg-accent transition-colors"
        title="Copiar"
      >
        {copiedField === copyKey
          ? <Check className="h-3.5 w-3.5 text-green-500" />
          : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
    </div>
  );
}
