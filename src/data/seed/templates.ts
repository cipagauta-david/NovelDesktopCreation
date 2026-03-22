import type { EntityTemplate } from '../../types/workspace'
import { uid } from '../../utils/workspace'

export function getDefaultTemplates(): EntityTemplate[] {
  return [
    {
      id: uid('template'),
      name: 'Personaje núcleo',
      description: 'Ficha breve con deseo, miedo y contradicción.',
      fields: ['Rol narrativo', 'Deseo', 'Miedo', 'Secreto'],
      defaultContent:
        '## Voz\nDescribe cómo suena el personaje en escena.\n\n## Conflicto\n¿Qué pierde si falla?\n\n## Referencias\nConecta esta entidad con lugares, capítulos y reglas usando {{}}.',
    },
    {
      id: uid('template'),
      name: 'Capítulo operativo',
      description: 'Objetivo, obstáculo y giro principal.',
      fields: ['Objetivo', 'Obstáculo', 'Giro', 'POV'],
      defaultContent:
        '## Apertura\nSitúa al lector sin fricción.\n\n## Escalada\nSube presión, coste y claridad de intención.\n\n## Cierre\nDeja una nueva pregunta abierta.',
    },
    {
      id: uid('template'),
      name: 'Escenario evocador',
      description: 'Lugar con atmósfera, función y riesgos.',
      fields: ['Función', 'Clima', 'Riesgo', 'Símbolo'],
      defaultContent:
        '## Atmósfera\nEscribe sensaciones dominantes.\n\n## Utilidad narrativa\n¿Por qué este escenario importa de verdad?\n\n## Relaciones\nAnota conexiones con entidades clave.',
    },
    {
      id: uid('template'),
      name: 'Facción / Organización',
      description: 'Grupos con objetivos, jerarquías y relaciones con personajes y lugares.',
      fields: ['Líder', 'Objetivo colectivo', 'Recursos', 'Enemigos'],
      defaultContent:
        '## Estructura\nDescribe la jerarquía y roles importantes.\n\n## Motivación\n¿Por qué existe esta facción y qué busca a corto plazo?\n\n## Conexiones\nVincula a personajes, lugares y eventos relevantes con {{}}.',
    },
    {
      id: uid('template'),
      name: 'Objeto mítico',
      description: 'Artefactos con historia, propiedades y coste narrativo.',
      fields: ['Origen', 'Poder', 'Costo', 'Portador'],
      defaultContent:
        '## Historia del objeto\nCuenta qué hizo y quién lo usó.\n\n## Efecto\nDescribe el poder y sus límites.\n\n## Eco narrativo\nCómo afecta a quien lo usa.',
    },
    {
      id: uid('template'),
      name: 'Evento histórico ampliado',
      description: 'Eventos con causas, desarrollo y consecuencias a medio/largo plazo.',
      fields: ['Causa', 'Actores', 'Consecuencias', 'Pruebas'],
      defaultContent:
        '## Línea de tiempo\nSecuencia de hitos relevantes.\n\n## Testigos\nPersonajes o registros que atestiguan lo ocurrido.\n\n## Relevancia actual\nCómo influye en la trama presente.',
    },
    {
      id: uid('template'),
      name: 'Localidad / Mapa',
      description: 'Subáreas dentro de un escenario más amplio con rutas, puntos de interés y riesgos.',
      fields: ['Puntos de interés', 'Rutas', 'Riesgos', 'Recursos'],
      defaultContent:
        '## Plano\nDescribe conexiones físicas y rutas clave.\n\n## Uso narrativo\nQué escenas o conflictos ocurren aquí.\n\n## Conexiones\nRelaciona con entidades y eventos relevantes.',
    },
  ]
}
