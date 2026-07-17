import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const base = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'CRM API',
      version: '1.0.0',
      description: 'API de solo lectura para consumo desde Power BI u otros sistemas.',
    },
    servers: [{ url: base }],
    security: [{ ApiKeyAuth: [] }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key generada desde Configuración → API',
        },
      },
    },
    paths: {
      '/api/v1/clients': {
        get: {
          summary: 'Listar clientes',
          tags: ['Clientes'],
          parameters: [
            { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fecha de creación desde (YYYY-MM-DD)' },
            { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fecha de creación hasta (YYYY-MM-DD)' },
          ],
          responses: {
            '200': {
              description: 'Lista de clientes',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer' },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            nombres: { type: 'string' },
                            apellidos: { type: 'string' },
                            tipoIdentificacion: { type: 'string', enum: ['NACIONAL', 'DIMEX', 'PASAPORTE', 'JURIDICA'] },
                            numeroIdentificacion: { type: 'string' },
                            provincia: { type: 'string' },
                            canton: { type: 'string' },
                            distrito: { type: 'string' },
                            telefono: { type: 'string', nullable: true },
                            email: { type: 'string', nullable: true },
                            estadoValidacion: { type: 'string', nullable: true },
                            estadoVenta: { type: 'string', nullable: true },
                            instaladaAt: { type: 'string', format: 'date-time', nullable: true },
                            asignadoAt: { type: 'string', format: 'date-time', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            updatedAt: { type: 'string', format: 'date-time' },
                            vendedorId: { type: 'string' },
                            vendedorNombre: { type: 'string' },
                            vendedorEmail: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { description: 'API key inválida o ausente' },
          },
        },
      },
      '/api/v1/prospects': {
        get: {
          summary: 'Listar prospectos',
          tags: ['Prospectos'],
          parameters: [
            { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fecha de asignación desde (YYYY-MM-DD)' },
            { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fecha de asignación hasta (YYYY-MM-DD)' },
          ],
          responses: {
            '200': {
              description: 'Lista de prospectos',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer' },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            nroOrden: { type: 'string' },
                            estadoOrden: { type: 'string', nullable: true },
                            cliente: { type: 'string', nullable: true },
                            provincia: { type: 'string', nullable: true },
                            canton: { type: 'string', nullable: true },
                            distrito: { type: 'string', nullable: true },
                            telCelular: { type: 'string', nullable: true },
                            tipificacion: { type: 'string', nullable: true },
                            totalContactos: { type: 'integer' },
                            ultimoContacto: { type: 'string', format: 'date-time', nullable: true },
                            proveedorCompetidor: { type: 'string', nullable: true },
                            asignadoAt: { type: 'string', format: 'date-time', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                            vendedorId: { type: 'string', nullable: true },
                            vendedorNombre: { type: 'string', nullable: true },
                            vendedorEmail: { type: 'string', nullable: true },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { description: 'API key inválida o ausente' },
          },
        },
      },
      '/api/v1/users': {
        get: {
          summary: 'Listar usuarios (vendedores)',
          tags: ['Usuarios'],
          responses: {
            '200': {
              description: 'Lista de usuarios',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer' },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            nombre: { type: 'string', nullable: true },
                            apellidos: { type: 'string', nullable: true },
                            rol: { type: 'string' },
                            extension: { type: 'string', nullable: true },
                            createdAt: { type: 'string', format: 'date-time' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { description: 'API key inválida o ausente' },
          },
        },
      },
      '/api/v1/extension-stats': {
        get: {
          summary: 'Estadísticas de llamadas por extensión',
          tags: ['Interphone'],
          parameters: [
            { name: 'desde', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fecha desde (YYYY-MM-DD)' },
            { name: 'hasta', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Fecha hasta (YYYY-MM-DD)' },
          ],
          responses: {
            '200': {
              description: 'Estadísticas diarias por extensión',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer' },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            extension: { type: 'string' },
                            fecha: { type: 'string', format: 'date' },
                            respondido: { type: 'integer' },
                            perdidas: { type: 'integer' },
                            llamadasEntrantes: { type: 'integer' },
                            duracionInboundSeg: { type: 'integer' },
                            llamadasSalientes: { type: 'integer' },
                            duracionSalidaSeg: { type: 'integer' },
                            correoVoz: { type: 'integer' },
                            sinRespuesta: { type: 'integer' },
                            ocupado: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            '401': { description: 'API key inválida o ausente' },
          },
        },
      },
    },
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  return res.status(200).json(spec);
}
