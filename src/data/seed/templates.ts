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
  ]
}
