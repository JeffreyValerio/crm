/**
 * Usuarios excluidos de estadísticas, gráficos y reportes.
 * Son cuentas de prueba que no deben contaminar los datos reales.
 */
export const EXCLUDED_USER_EMAILS: string[] = [
  'test.vendedor@jenvaltec.com',
];

/**
 * Condición Prisma para excluir cuentas de prueba de queries sobre User.
 * Usar en where: { ...excludeTestUsers }
 */
export const excludeTestUsers = {
  NOT: { email: { in: EXCLUDED_USER_EMAILS } },
} as const;

/**
 * Condición Prisma para excluir clientes creados por cuentas de prueba.
 * Usar en where: { ...excludeTestUsersFromClients }
 */
export const excludeTestUsersFromClients = {
  NOT: { creator: { email: { in: EXCLUDED_USER_EMAILS } } },
} as const;
