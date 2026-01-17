import jsPDF from 'jspdf';

interface AdvanceDetail {
  id: string;
  monto: number;
  quincenas: number;
  montoRestante: number;
  montoPorQuincena: number;
  descuentoEnEstaQuincena: number;
  montoRestanteDespues: number;
}

interface PayrollData {
  id: string;
  periodo: string;
  quincena: number;
  diasTrabajados: number;
  diasEsperados?: number;
  salarioBase: number | string;
  montoDiario: number | string;
  total: number | string;
  estado: string;
  aprobadoAt?: string | Date | null;
  fechaPago?: string | Date | null;
  user: {
    id: string;
    email: string;
  };
  aprobador?: {
    id: string;
    email: string;
  } | null;
  adelantosDesglose?: AdvanceDetail[];
}

export function generatePayrollPDF(payroll: PayrollData, showDailySalary: boolean = false): jsPDF {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = margin;

  // Colores
  const primaryColor = [37, 99, 235]; // Azul #2563eb
  const darkColor = [17, 24, 39]; // Gris oscuro
  const lightColor = [243, 244, 246]; // Gris claro

  // Función para formatear colones
  // Usamos "CRC " en lugar de "₡" porque jsPDF puede no renderizar correctamente el símbolo Unicode
  const formatearColones = (monto: number | string): string => {
    const num = typeof monto === 'string' ? parseFloat(monto) : monto;
    return `CRC ${num.toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Formatear período (ej: "Enero 2025")
  const [año, mes] = payroll.periodo.split('-');
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const nombreMes = meses[parseInt(mes) - 1];
  const periodoFormateado = `${nombreMes} ${año}`;

  // Encabezado con fondo
  pdf.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.rect(0, 0, pageWidth, 50, 'F');
  
  // Título
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('COMPROBANTE DE PAGO', pageWidth / 2, 25, { align: 'center' });
  
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text('NÓMINA', pageWidth / 2, 35, { align: 'center' });

  yPosition = 60;

  // Información del comprobante
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Número de Comprobante: ${payroll.id}`, margin, yPosition);
  yPosition += 6;
  
  const fechaEmision = new Date().toLocaleDateString('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  pdf.text(`Fecha de Emisión: ${fechaEmision}`, margin, yPosition);
  yPosition += 15;

  // Datos del vendedor
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DATOS DEL VENDEDOR', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Email: ${payroll.user.email}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`ID: ${payroll.user.id}`, margin, yPosition);
  yPosition += 15;

  // Detalles del período
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DETALLES DEL PERÍODO', margin, yPosition);
  yPosition += 8;

  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Período: ${periodoFormateado}`, margin, yPosition);
  yPosition += 6;
  pdf.text(`Quincena: ${payroll.quincena}`, margin, yPosition);
  yPosition += 15;

  // Tabla de detalles del pago - Versión simplificada
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('DETALLES DEL PAGO', margin, yPosition);
  yPosition += 10;

  // Calcular monto ganado proporcionalmente y descuentos
  const salarioBaseNum = typeof payroll.salarioBase === 'string' ? parseFloat(payroll.salarioBase) : payroll.salarioBase;
  const totalNum = typeof payroll.total === 'string' ? parseFloat(payroll.total) : payroll.total;
  const diasEsperados = payroll.diasEsperados || payroll.diasTrabajados; // Fallback si no existe
  // Calcular monto ganado proporcionalmente: salarioBase * (diasTrabajados / diasEsperados)
  const montoGanado = salarioBaseNum * (payroll.diasTrabajados / diasEsperados);
  const adelantosDesglose = payroll.adelantosDesglose || [];
  
  // Calcular descuentos sumando SOLO los descuentos individuales de cada adelanto
  // NO usar montoGanado - total porque eso incluiría la diferencia de días no trabajados
  const descuentoAdelantos = adelantosDesglose.reduce((sum, adelanto) => sum + adelanto.descuentoEnEstaQuincena, 0);
  const tieneDescuentos = descuentoAdelantos > 0;
  
  const rowHeight = 7;

  // Encabezado simple
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.text('Concepto', margin, yPosition);
  pdf.text('Monto', pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 5;

  // Línea separadora
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += rowHeight;

  // Filas de la tabla
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  
  // Días trabajados
  pdf.text('Días Trabajados:', margin, yPosition);
  pdf.text(`${payroll.diasTrabajados} días`, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += rowHeight;

  // Solo mostrar salario diario si showDailySalary es true (solo para admin)
  if (showDailySalary) {
    pdf.text('Salario por Día:', margin, yPosition);
    pdf.text(formatearColones(payroll.montoDiario), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += rowHeight;
  }

  // Mostrar salario base y monto ganado si hay diferencia (días trabajados < días esperados)
  const hayDiferenciaDias = payroll.diasTrabajados < diasEsperados;
  
  pdf.setFont('helvetica', 'bold');
  pdf.text('Salario Base (Quincena):', margin, yPosition);
  pdf.text(formatearColones(payroll.salarioBase), pageWidth - margin, yPosition, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  yPosition += rowHeight;
  
  // Mostrar monto ganado proporcionalmente si hay diferencia
  if (hayDiferenciaDias) {
    const montoGanado = salarioBaseNum * (payroll.diasTrabajados / diasEsperados);
    pdf.text('Monto Ganado (Proporcional):', margin, yPosition);
    pdf.text(formatearColones(montoGanado), pageWidth - margin, yPosition, { align: 'right' });
    yPosition += rowHeight;
  }

  // Si hay descuentos de adelantos, mostrarlos con desglose
  if (tieneDescuentos && adelantosDesglose.length > 0) {
    // Subtítulo para adelantos
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(239, 68, 68); // Rojo
    pdf.text('Descuentos por Adelantos:', margin, yPosition);
    yPosition += rowHeight;

    // Desglose de cada adelanto
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    for (const adelanto of adelantosDesglose) {
      const montoDescontado = formatearColones(adelanto.descuentoEnEstaQuincena);
      const montoTotalAdelanto = formatearColones(adelanto.monto);
      const saldoRestante = formatearColones(adelanto.montoRestanteDespues);
      
      pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
      // Mostrar: "Adelanto de X, Saldo: Y"
      pdf.text(`Adelanto de ${montoTotalAdelanto} (Saldo: ${saldoRestante}):`, margin, yPosition);
      pdf.setTextColor(239, 68, 68);
      pdf.text(`-${montoDescontado}`, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += rowHeight;
    }
    
    // Subtotal de descuentos
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(239, 68, 68);
    pdf.text('Subtotal Descuentos:', margin, yPosition);
    pdf.text(`-${formatearColones(descuentoAdelantos)}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += rowHeight + 3;
    
    // Restaurar color
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    
    // Línea separadora antes del total
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += rowHeight;
  } else if (tieneDescuentos) {
    // Fallback: solo mostrar total de descuentos si no hay desglose
    pdf.setTextColor(239, 68, 68);
    pdf.text('Descuentos por Adelantos:', margin, yPosition);
    pdf.text(`-${formatearColones(descuentoAdelantos)}`, pageWidth - margin, yPosition, { align: 'right' });
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    yPosition += rowHeight + 3;
    
    // Línea separadora antes del total
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += rowHeight;
  }

  // Total
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  pdf.text('TOTAL A PAGAR:', margin, yPosition);
  pdf.text(formatearColones(payroll.total), pageWidth - margin, yPosition, { align: 'right' });
  
  yPosition += 15;

  // Estado
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  pdf.text('Estado:', margin, yPosition);
  
  pdf.setFont('helvetica', 'normal');
  let estadoColor: number[];
  let estadoTexto: string;
  switch (payroll.estado) {
    case 'APROBADO':
      estadoColor = [34, 197, 94]; // Verde
      estadoTexto = 'Aprobado';
      break;
    case 'PAGADO':
      estadoColor = [34, 197, 94]; // Verde
      estadoTexto = 'Pagado';
      break;
    default:
      estadoColor = [239, 68, 68]; // Rojo
      estadoTexto = 'Pendiente';
  }
  
  pdf.setTextColor(estadoColor[0], estadoColor[1], estadoColor[2]);
  pdf.text(estadoTexto, margin + 25, yPosition);
  yPosition += 10;

  // Fecha de aprobación
  if (payroll.aprobadoAt) {
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const fechaAprobacion = new Date(payroll.aprobadoAt).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    pdf.text(`Fecha de Aprobación: ${fechaAprobacion}`, margin, yPosition);
    yPosition += 6;
    
    if (payroll.aprobador) {
      pdf.text(`Aprobado por: ${payroll.aprobador.email}`, margin, yPosition);
      yPosition += 6;
    }
  }

  // Fecha de pago
  if (payroll.fechaPago) {
    pdf.setFontSize(10);
    pdf.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    const fechaPago = new Date(payroll.fechaPago).toLocaleDateString('es-CR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    pdf.text(`Fecha de Pago: ${fechaPago}`, margin, yPosition);
    yPosition += 10;
  }

  // Pie de página
  const footerY = pdf.internal.pageSize.getHeight() - 15;
  pdf.setFontSize(8);
  pdf.setTextColor(128, 128, 128);
  pdf.setFont('helvetica', 'italic');
  pdf.text(
    'Este documento es un comprobante de pago generado automáticamente por el sistema CRM.',
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );

  // Línea de separación antes del pie
  pdf.setDrawColor(200, 200, 200);
  pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  return pdf;
}
