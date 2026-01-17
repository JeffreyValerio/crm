import type { NextApiRequest, NextApiResponse } from 'next';

// Datos completos de provincias, cantones y distritos de Costa Rica
const costaRicaGeo = {
  'San José': {
    cantones: {
      'San José': ['Carmen', 'Merced', 'Hospital', 'Catedral', 'Zapote', 'San Francisco de Dos Ríos', 'Uruca', 'Mata Redonda', 'Pavas', 'Hatillo', 'San Sebastián'],
      'Escazú': ['Escazú', 'San Antonio', 'San Rafael'],
      'Desamparados': ['Desamparados', 'San Miguel', 'San Juan de Dios', 'San Rafael Arriba', 'San Antonio', 'Frailes', 'Patarrá', 'San Cristóbal', 'Rosario', 'Damas', 'San Rafael Abajo', 'Gravilias', 'Los Guidos'],
      'Puriscal': ['Santiago', 'Mercedes Sur', 'Barbacoas', 'Grifo Alto', 'San Rafael', 'Candelaria', 'Desamparaditos', 'San Antonio', 'Chires'],
      'Tarrazú': ['San Marcos', 'San Lorenzo', 'San Carlos'],
      'Aserrí': ['Aserrí', 'Tarbaca', 'Vuelta de Jorco', 'San Gabriel', 'La Legua', 'Monterrey', 'Salitrillos'],
      'Mora': ['Colón', 'Guayabo', 'Tabarcia', 'Piedras Negras', 'Picagres', 'Jaris', 'Quitirrisí'],
      'Goicoechea': ['Guadalupe', 'San Francisco', 'Calle Blancos', 'Mata de Plátano', 'Ipís', 'Rancho Redondo', 'Purral'],
      'Santa Ana': ['Santa Ana', 'Salitral', 'Pozos', 'Uruca', 'Piedades', 'Brasil'],
      'Alajuelita': ['Alajuelita', 'San Josecito', 'San Antonio', 'Concepción', 'San Felipe'],
      'Vázquez de Coronado': ['San Isidro', 'San Rafael', 'Dulce Nombre de Jesús', 'Patalillo', 'Cascajal'],
      'Acosta': ['San Ignacio', 'Guaitil', 'Palmichal', 'Cangrejal', 'Sabanillas'],
      'Tibás': ['San Juan', 'Cinco Esquinas', 'Anselmo Llorente', 'Leon XIII', 'Colima'],
      'Moravia': ['San Vicente', 'San Jerónimo', 'La Trinidad'],
      'Montes de Oca': ['San Pedro', 'Sabanilla', 'Mercedes', 'San Rafael'],
      'Turrubares': ['San Pablo', 'San Pedro', 'San Juan de Mata', 'San Luis', 'Carara'],
      'Dota': ['Santa María', 'Jardín', 'Copey'],
      'Curridabat': ['Curridabat', 'Granadilla', 'Sánchez', 'Tirrases'],
      'Pérez Zeledón': ['San Isidro de El General', 'General', 'Daniel Flores', 'Rivas', 'San Pedro', 'Platanares', 'Pejibaye', 'Cajón', 'Barú', 'Río Nuevo', 'Páramo', 'La Amistad'],
      'León Cortés': ['San Pablo', 'San Andrés', 'Llano Bonito', 'San Isidro', 'Santa Cruz', 'San Antonio']
    }
  },
  'Alajuela': {
    cantones: {
      'Alajuela': ['Alajuela', 'San José', 'Carrizal', 'San Antonio', 'Guácima', 'San Isidro', 'Sabanilla', 'San Rafael', 'Río Segundo', 'Desamparados', 'Turrúcares', 'Tambor', 'Garita', 'Sarapiquí'],
      'San Ramón': ['San Ramón', 'Santiago', 'San Juan', 'Piedades Norte', 'Piedades Sur', 'San Rafael', 'San Isidro', 'Angeles', 'Alfaro', 'Volio', 'Concepción', 'Zapotal', 'Peñas Blancas'],
      'Grecia': ['Grecia', 'San Isidro', 'San José', 'San Roque', 'Tacares', 'Río Cuarto', 'Puente de Piedra', 'Bolívar'],
      'San Mateo': ['San Mateo', 'Desmonte', 'Jesús María', 'Labrador'],
      'Atenas': ['Atenas', 'Jesús', 'Mercedes', 'San Isidro', 'Concepción', 'San José', 'Santa Eulalia', 'Escobal'],
      'Naranjo': ['Naranjo', 'San Miguel', 'San José', 'Cirrí Sur', 'San Jerónimo', 'San Juan', 'El Rosario', 'Palmitos'],
      'Palmares': ['Palmares', 'Zaragoza', 'Buenos Aires', 'Santiago', 'Candelaria', 'Esquipulas', 'La Granja'],
      'Poás': ['San Pedro', 'San Juan', 'San Rafael', 'Carrillos', 'Sabana Redonda'],
      'Orotina': ['Orotina', 'El Mastate', 'Hacienda Vieja', 'Coyolar', 'La Ceiba'],
      'San Carlos': ['Quesada', 'Florencia', 'Buenavista', 'Aguas Zarcas', 'Venecia', 'Pital', 'La Fortuna', 'La Tigra', 'La Palmera', 'Venado', 'Cutris', 'Monterrey', 'Pocosol'],
      'Zarcero': ['Zarcero', 'Laguna', 'Tapezco', 'Guadalupe', 'Palmira', 'Zapote', 'Brisas'],
      'Valverde Vega': ['Sarchí Norte', 'Sarchí Sur', 'Toro Amarillo', 'San Pedro', 'Rodríguez'],
      'Upala': ['Upala', 'Aguas Claras', 'San José o Pizote', 'Bijagua', 'Delicias', 'Dos Ríos', 'Yolillal', 'Canalete'],
      'Los Chiles': ['Los Chiles', 'Caño Negro', 'El Amparo', 'San Jorge'],
      'Guatuso': ['San Rafael', 'Buenavista', 'Cote', 'Katira']
    }
  },
  'Cartago': {
    cantones: {
      'Cartago': ['Oriental', 'Occidental', 'Carmen', 'San Nicolás', 'Aguacaliente o San Francisco', 'Guadalupe o Arenilla', 'Corralillo', 'Tierra Blanca', 'Dulce Nombre', 'Llano Grande', 'Quebradilla'],
      'Paraíso': ['Paraíso', 'Santiago', 'Orosi', 'Cachí', 'Llanos de Santa Lucía'],
      'La Unión': ['Tres Ríos', 'San Diego', 'San Juan', 'San Rafael', 'Concepción', 'Dulce Nombre', 'San Ramón', 'Río Azul'],
      'Jiménez': ['Juan Viñas', 'Tucurrique', 'Pejibaye'],
      'Turrialba': ['Turrialba', 'La Suiza', 'Peralta', 'Santa Cruz', 'Santa Teresita', 'Pavones', 'Tuis', 'Tayutic', 'Santa Rosa', 'Tres Equis', 'La Isabel', 'Chirripó'],
      'Alvarado': ['Pacayas', 'Cervantes', 'Capellades'],
      'Oreamuno': ['San Rafael', 'Cot', 'Potrero Cerrado', 'Cipreses', 'Santa Rosa'],
      'El Guarco': ['El Tejar', 'San Isidro', 'Tobosi', 'Patio de Agua']
    }
  },
  'Heredia': {
    cantones: {
      'Heredia': ['Heredia', 'Mercedes', 'San Francisco', 'Ulloa', 'Varablanca'],
      'Barva': ['Barva', 'San Pedro', 'San Pablo', 'San Roque', 'Santa Lucía', 'San José de la Montaña'],
      'Santo Domingo': ['Santo Domingo', 'San Vicente', 'San Miguel', 'Paracito', 'Santo Tomás', 'Santa Rosa', 'Tures', 'Pará'],
      'Santa Bárbara': ['Santa Bárbara', 'San Pedro', 'San Juan', 'Jesús', 'Santo Domingo', 'Purabá'],
      'San Rafael': ['San Rafael', 'San Josecito', 'Santiago', 'Angeles', 'Concepción'],
      'San Isidro': ['San Isidro', 'San José', 'Concepción', 'San Francisco'],
      'Belén': ['San Antonio', 'La Ribera', 'La Asunción'],
      'Flores': ['San Joaquín', 'Barrantes', 'Llorente'],
      'San Pablo': ['San Pablo', 'Rincón de Sabanilla'],
      'Sarapiquí': ['Puerto Viejo', 'La Virgen', 'Las Horquetas', 'Llanuras del Gaspar', 'Cureña']
    }
  },
  'Guanacaste': {
    cantones: {
      'Liberia': ['Liberia', 'Cañas Dulces', 'Mayorga', 'Nacascolo', 'Curubandé'],
      'Nicoya': ['Nicoya', 'Mansion', 'San Antonio', 'Quebrada Honda', 'Samara', 'Nosara', 'Belén de Nosarita'],
      'Santa Cruz': ['Santa Cruz', 'Bolsón', 'Veintisiete de Abril', 'Tempate', 'Cartagena', 'Cuajiniquil', 'Diriá', 'Cabo Velas', 'Tamarindo'],
      'Bagaces': ['Bagaces', 'Fortuna', 'Mogote', 'Río Naranjo'],
      'Carrillo': ['Filadelfia', 'Palmira', 'Sardinal', 'Belén'],
      'Cañas': ['Cañas', 'Palmira', 'San Miguel', 'Bebedero', 'Porozal'],
      'Abangares': ['Las Juntas', 'Sierra', 'San Juan', 'Colorado'],
      'Tilarán': ['Tilarán', 'Quebrada Grande', 'Tronadora', 'Santa Rosa', 'Líbano', 'Tierras Morenas', 'Arenal'],
      'Nandayure': ['Carmona', 'Santa Rita', 'Zapotal', 'San Pablo', 'Porvenir', 'Bejuco'],
      'La Cruz': ['La Cruz', 'Santa Cecilia', 'La Garita', 'Santa Elena'],
      'Hojancha': ['Hojancha', 'Monte Romo', 'Puerto Carrillo', 'Huacas']
    }
  },
  'Puntarenas': {
    cantones: {
      'Puntarenas': ['Puntarenas', 'Pitahaya', 'Chomes', 'Lepanto', 'Paquera', 'Manzanillo', 'Guacimal', 'Barranca', 'Monte Verde', 'Isla del Coco', 'Cóbano', 'Chacarita', 'Chira', 'Acapulco', 'El Roble', 'Arancibia'],
      'Esparza': ['Espíritu Santo', 'San Juan Grande', 'Macacona', 'San Rafael', 'San Jerónimo'],
      'Buenos Aires': ['Buenos Aires', 'Volcán', 'Potrero Grande', 'Boruca', 'Pilas', 'Colinas', 'Chánguena', 'Biolley', 'Brunka'],
      'Montes de Oro': ['Miramar', 'La Unión', 'San Isidro'],
      'Osa': ['Puerto Cortés', 'Palmar', 'Sierpe', 'Bahía Ballena', 'Piedras Blancas', 'Bahía Drake'],
      'Quepos': ['Quepos', 'Savegre', 'Naranjito'],
      'Golfito': ['Golfito', 'Puerto Jiménez', 'Guaycará', 'Pavón'],
      'Coto Brus': ['San Vito', 'Sabalito', 'Agua Buena', 'Limoncito', 'Pittier'],
      'Parrita': ['Parrita'],
      'Corredores': ['Corredor', 'La Cuesta', 'Paso Canoas', 'Laurel'],
      'Garabito': ['Jacó', 'Tárcoles']
    }
  },
  'Limón': {
    cantones: {
      'Limón': ['Limón', 'Valle La Estrella', 'Río Blanco', 'Matama'],
      'Pococí': ['Guápiles', 'Jiménez', 'Rita', 'Roxana', 'Cariari', 'Colorado', 'La Colonia'],
      'Siquirres': ['Siquirres', 'Pacuarito', 'Florida', 'Germania', 'Cairo', 'Alegría'],
      'Talamanca': ['Bratsi', 'Sixaola', 'Cahuita', 'Telire'],
      'Matina': ['Matina', 'Batán', 'Carrandi'],
      'Guácimo': ['Guácimo', 'Mercedes', 'Pocora', 'Río Jiménez', 'Duacari']
    }
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { province, canton } = req.query;

  if (req.method === 'GET') {
    try {
      // Obtener todas las provincias
      if (!province && !canton) {
        const provinces = Object.keys(costaRicaGeo);
        return res.status(200).json({ provinces });
      }

      // Obtener cantones de una provincia
      if (province && !canton) {
        const provinceData = (costaRicaGeo as any)[province as string];
        if (!provinceData) {
          return res.status(404).json({ error: 'Provincia no encontrada' });
        }
        const cantones = Object.keys(provinceData.cantones);
        return res.status(200).json({ cantones });
      }

      // Obtener distritos de un cantón en una provincia
      if (province && canton) {
        const provinceData = (costaRicaGeo as any)[province as string];
        if (!provinceData) {
          return res.status(404).json({ error: 'Provincia no encontrada' });
        }
        const distritos = provinceData.cantones[canton as string];
        if (!distritos) {
          return res.status(404).json({ error: 'Cantón no encontrado' });
        }
        return res.status(200).json({ distritos });
      }

      return res.status(400).json({ error: 'Parámetros inválidos' });
    } catch (error) {
      console.error('Error fetching geo data:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
