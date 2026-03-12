import { STORAGE_KEY, defaultTabBlueprints } from './constants'
import type { CollectionTab, EntityTemplate, PersistedState, Project } from '../types/workspace'
import { buildStructuredReference } from '../utils/references'
import { createHistoryEvent, isoNow, uid } from '../utils/workspace'

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

export function buildSeedProject(): Project {
  const templates = getDefaultTemplates()
  const tabs = defaultTabBlueprints.map((tab) => ({
    id: uid('tab'),
    name: tab.name,
    icon: tab.icon,
    prompt: tab.prompt,
  }))

  const tabByName = Object.fromEntries(tabs.map((tab) => [tab.name, tab])) as Record<
    string,
    CollectionTab
  >
  const chapterId = uid('entity')
  const characterId = uid('entity')
  const scenarioId = uid('entity')
  const historyId = uid('entity')
  const worldId = uid('entity')
  const now = isoNow()

  const entities = [
    {
      id: chapterId,
      tabId: tabByName['Capítulos'].id,
      title: 'Capítulo 1 — La grieta de ceniza',
      content:
        `## Gancho\nAriadna detecta que el pulso del Velo cambió durante la guardia nocturna.\n\n## Escena clave\nLa alarma nace en ${buildStructuredReference(
          scenarioId,
          'Puerto Ceniza',
        )}, mientras ${buildStructuredReference(characterId, 'Ariadna Vale')} decide romper protocolo.\n\n## Consecuencia\nLa decisión obliga a revisar ${buildStructuredReference(worldId, 'Principio de Resonancia')}.`,
      templateId: templates[1].id,
      tags: ['apertura', 'misterio'],
      aliases: ['La grieta'],
      fields: [
        { id: uid('field'), key: 'Objetivo', value: 'Descubrir el origen del pulso anómalo.' },
        {
          id: uid('field'),
          key: 'Obstáculo',
          value: 'La ciudad prohíbe inspecciones sin sello del consejo.',
        },
      ],
      assets: [],
      status: 'active' as const,
      revision: 3,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Capítulo base sembrado para el MVP.', 'system')],
    },
    {
      id: characterId,
      tabId: tabByName['Personajes'].id,
      title: 'Ariadna Vale',
      content:
        `Inspectora de grietas rituales. Confía más en patrones que en autoridades.\n\nTrabaja entre ${buildStructuredReference(
          scenarioId,
          'Puerto Ceniza',
        )} y los archivos de ${buildStructuredReference(historyId, 'La Ruptura del Norte')}.`,
      templateId: templates[0].id,
      tags: ['protagonista', 'inspectora'],
      aliases: ['Ari'],
      fields: [
        { id: uid('field'), key: 'Rol narrativo', value: 'Protagonista analítica' },
        { id: uid('field'), key: 'Deseo', value: 'Evitar una segunda ruptura dimensional.' },
        {
          id: uid('field'),
          key: 'Miedo',
          value: 'Convertirse en la causa del desastre que quiere impedir.',
        },
      ],
      assets: [],
      status: 'active' as const,
      revision: 4,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Personaje inicial listo para edición.', 'system')],
    },
    {
      id: scenarioId,
      tabId: tabByName['Escenarios'].id,
      title: 'Puerto Ceniza',
      content:
        `Ciudad portuaria construida sobre muelles de obsidiana. Cada calle vibra cuando el Velo sufre presión.\n\nSu red de túneles conecta con ${buildStructuredReference(
          historyId,
          'La Ruptura del Norte',
        )}.`,
      templateId: templates[2].id,
      tags: ['ciudad', 'frontera'],
      aliases: ['La boca del humo'],
      fields: [
        { id: uid('field'), key: 'Función', value: 'Punto de entrada al conflicto principal.' },
        { id: uid('field'), key: 'Riesgo', value: 'Aumenta resonancia en tormentas.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 2,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Escenario inicial preparado.', 'system')],
    },
    {
      id: historyId,
      tabId: tabByName['Historia'].id,
      title: 'La Ruptura del Norte',
      content:
        `Hace quince años, una cadena de sellos colapsó y abrió fisuras que aún condicionan la política del continente.\n\nLos registros apuntan a la primera formulación de ${buildStructuredReference(
          worldId,
          'Principio de Resonancia',
        )}.`,
      templateId: templates[1].id,
      tags: ['evento', 'pasado'],
      aliases: ['La Ruptura'],
      fields: [{ id: uid('field'), key: 'Impacto', value: 'Redibujó el mapa político y ritual.' }],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Evento histórico inicial cargado.', 'system')],
    },
    {
      id: worldId,
      tabId: tabByName['Lógica del mundo'].id,
      title: 'Principio de Resonancia',
      content:
        `Toda grieta responde a una emoción dominante sostenida en el tiempo. Si se altera ese patrón, el Velo cambia de forma.\n\nAplicación directa en ${buildStructuredReference(
          chapterId,
          'Capítulo 1 — La grieta de ceniza',
        )}.`,
      templateId: templates[2].id,
      tags: ['regla', 'velo'],
      aliases: ['Resonancia'],
      fields: [
        {
          id: uid('field'),
          key: 'Coste',
          value: 'Cada intervención deja eco en quien la ejecuta.',
        },
      ],
      assets: [],
      status: 'active' as const,
      revision: 2,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Regla del mundo inicial cargada.', 'system')],
    },
  ]

  return {
    id: uid('project'),
    name: 'Crónicas del Umbral',
    description: 'Proyecto narrativo inicial con tabs, referencias, búsqueda, historial y grafo.',
    createdAt: now,
    updatedAt: now,
    tabs,
    entities,
    templates,
    history: [
      createHistoryEvent(
        'Proyecto creado',
        'Se generó un workspace inicial listo para explorar.',
        'system',
      ),
    ],
  }
}

export function getDefaultPersistedState(): PersistedState {
  const project = buildSeedProject()
  const firstTabId = project.tabs[0]?.id ?? ''
  const firstEntityId =
    project.entities.find((entity) => entity.tabId === firstTabId)?.id ?? project.entities[0]?.id ?? ''
  return {
    settings: null,
    projects: [project],
    activeProjectId: project.id,
    activeTabId: firstTabId,
    activeEntityId: firstEntityId,
  }
}

export function loadPersistedState(): PersistedState {
  const empty = getDefaultPersistedState()
  const rawState = localStorage.getItem(STORAGE_KEY)
  if (!rawState) {
    return empty
  }

  try {
    const parsed = JSON.parse(rawState) as Partial<PersistedState>
    if (!parsed.projects?.length) {
      return empty
    }

    return {
      settings: parsed.settings ?? null,
      projects: parsed.projects,
      activeProjectId: parsed.activeProjectId ?? parsed.projects[0].id,
      activeTabId:
        parsed.activeTabId ?? parsed.projects[0].tabs[0]?.id ?? getDefaultPersistedState().activeTabId,
      activeEntityId:
        parsed.activeEntityId ??
        parsed.projects[0].entities[0]?.id ??
        getDefaultPersistedState().activeEntityId,
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return empty
  }
}
