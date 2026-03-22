import { STORAGE_KEY, defaultTabBlueprints } from '../constants'
import type { CollectionTab, PersistedState, Project } from '../../types/workspace'
import { buildStructuredReference } from '../../utils/references'
import { createHistoryEvent, isoNow, migratePersistedState, uid } from '../../utils/workspace'
import { getDefaultTemplates } from './templates'

export function buildSeedProject(): Project {
  const templates = getDefaultTemplates()
  const tabs = defaultTabBlueprints.map((tab) => ({
    id: uid('tab'),
    name: tab.name,
    icon: tab.icon,
    color: tab.color,
    prompt: tab.prompt,
  }))

  const tabByName = Object.fromEntries(tabs.map((tab) => [tab.name, tab])) as Record<string, CollectionTab>
  const chapterId = uid('entity')
  const characterId = uid('entity')
  const scenarioId = uid('entity')
  const historyId = uid('entity')
  const worldId = uid('entity')
  const factionId = uid('entity')
  const secondaryCharId = uid('entity')
  const merchantId = uid('entity')
  const relicId = uid('entity')
  const isleId = uid('entity')
  const coupEventId = uid('entity')
  const chapter2Id = uid('entity')
  const chapter3Id = uid('entity')
  const chapter4Id = uid('entity')
  const chapter5Id = uid('entity')
  const smugglerId = uid('entity')
  const archivistId = uid('entity')
  const captainId = uid('entity')
  const shrineId = uid('entity')
  const stormEventId = uid('entity')
  const isleBayId = uid('entity')
  const pirateFactionId = uid('entity')
  const relicShardId = uid('entity')
  const envoyId = uid('entity')
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
      id: chapter2Id,
      tabId: tabByName['Capítulos'].id,
      title: 'Capítulo 2 — Sombras en el muelle',
      content:
        `## Gancho
Rafi el Contrabandista entrega a ${buildStructuredReference(characterId, 'Ariadna Vale')} un fragmento de diario que menciona el ${buildStructuredReference(historyId, 'La Ruptura del Norte')}.\n\n## Escena clave
Una transacción en ${buildStructuredReference(scenarioId, 'Puerto Ceniza')} se convierte en trampa cuando ${buildStructuredReference(factionId, 'Gremio de la Ceniza')} interviene.\n\n## Consecuencia
Ariadna debe decidir entre denunciar o usar la pista de contrabando para avanzar.`,
      templateId: templates[1].id,
      tags: ['investigación', 'decisión'],
      aliases: ['Sombras muelle'],
      fields: [
        { id: uid('field'), key: 'Objetivo', value: 'Recuperar pistas sin alertar al gremio.' },
        { id: uid('field'), key: 'Obstáculo', value: 'Informantes corruptos y rutas bloqueadas.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Capítulo 2 semilla añadido.', 'system')],
    },
    {
      id: chapter3Id,
      tabId: tabByName['Capítulos'].id,
      title: 'Capítulo 3 — Bajo el Santuario',
      content:
        `## Gancho
La expedición a ${buildStructuredReference(shrineId, 'Santuario del Eco')} descubre inscripciones que apuntan a ${buildStructuredReference(worldId, 'Principio de Resonancia')}.\n\n## Escena clave
Un miembro del equipo toca un ${buildStructuredReference(relicShardId, 'Fragmento de Sello')} y sufre una visión que cambia la investigación.\n\n## Consecuencia
La investigación se acelera pero el equipo queda dividido.`,
      templateId: templates[1].id,
      tags: ['expedición', 'visiones'],
      aliases: ['Bajo Santuario'],
      fields: [
        { id: uid('field'), key: 'Objetivo', value: 'Descifrar inscripciones y mapear resonancias.' },
        { id: uid('field'), key: 'Giro', value: 'La visión revela una traición cercana.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Capítulo 3 semilla añadido.', 'system')],
    },
    {
      id: chapter4Id,
      tabId: tabByName['Capítulos'].id,
      title: 'Capítulo 4 — La Bahía del Vigía',
      content:
        `## Gancho
En ${buildStructuredReference(isleBayId, 'Bahía del Vigía')} se prepara un trueque que implicará al ${buildStructuredReference(pirateFactionId, 'Los Corazones Negros')}.\n\n## Escena clave
Capitán Oran negocia el paso seguro de una embarcación que transporta piezas del ${buildStructuredReference(relicId, 'Sello Roto')}.\n\n## Consecuencia
Se desata un enfrentamiento que cambia el control de rutas.`,
      templateId: templates[1].id,
      tags: ['navegación', 'negociación'],
      aliases: ['Bahía Vigía'],
      fields: [
        { id: uid('field'), key: 'Objetivo', value: 'Asegurar tránsito sin derramamiento de sangre.' },
        { id: uid('field'), key: 'Obstáculo', value: 'Corsarios y emboscadas.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Capítulo 4 semilla añadido.', 'system')],
    },
    {
      id: chapter5Id,
      tabId: tabByName['Capítulos'].id,
      title: 'Capítulo 5 — Juicio en la Marea',
      content:
        `## Gancho
El Enviado del Consejo llega a ${buildStructuredReference(scenarioId, 'Puerto Ceniza')} y exige rendición de cuentas por las resonancias.\n\n## Escena clave
Un tribunal improvisado decide medidas que podrían sellar o abrir nuevas grietas.\n\n## Consecuencia
La política local cambia y ${buildStructuredReference(characterId, 'Ariadna Vale')} debe elegir su lealtad.`,
      templateId: templates[1].id,
      tags: ['política', 'decisión'],
      aliases: ['Juicio Marea'],
      fields: [
        { id: uid('field'), key: 'Objetivo', value: 'Proteger al inocente o salvar a la comunidad.' },
        { id: uid('field'), key: 'Giro', value: 'Revelación de documentos antiguos que implican al consejo.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Capítulo 5 semilla añadido.', 'system')],
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
    {
      id: factionId,
      tabId: tabByName['Personajes'].id,
      title: 'Gremio de la Ceniza',
      content:
        `Hermandad mercantil que controla parte del muelle y trafica secretos del Velo. Tienen conflicto directo con ${buildStructuredReference(
          factionId,
          'Gremio de la Ceniza',
        )} y con autoridades locales. Su interés principal es el control de ${buildStructuredReference(
          relicId,
          'Sello Roto',
        )}.`,
      templateId: templates[3].id,
      tags: ['gremio', 'interés-económico'],
      aliases: ['Gremio'],
      fields: [
        { id: uid('field'), key: 'Líder', value: 'Maestra Helin' },
        { id: uid('field'), key: 'Objetivo colectivo', value: 'Asegurar rutas comerciales y secretos arcanos.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Gremio semilla añadido.', 'system')],
    },
    {
      id: secondaryCharId,
      tabId: tabByName['Personajes'].id,
      title: 'Maestra Helin',
      content:
        `Capitana del Gremio de la Ceniza. Respetada y temida en igual medida. Mantiene una alianza tácita con ${buildStructuredReference(
          merchantId,
          'Red de comerciantes de Obsidiana',
        )} y mira con recelo a ${buildStructuredReference(characterId, 'Ariadna Vale')}.`,
      templateId: templates[0].id,
      tags: ['antagonista', 'líder'],
      aliases: ['Helin'],
      fields: [
        { id: uid('field'), key: 'Rol narrativo', value: 'Antagonista pragmática' },
        { id: uid('field'), key: 'Deseo', value: 'Proteger la influencia del gremio' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Líder del gremio creada.', 'system')],
    },
    {
      id: merchantId,
      tabId: tabByName['Escenarios'].id,
      title: 'Red de comerciantes de Obsidiana',
      content:
        `Una red informal que mueve artefactos y conocimiento. Operan entre ${buildStructuredReference(
          scenarioId,
          'Puerto Ceniza',
        )} y los islotes del archipiélago. Controlan rutas que evitan los puestos oficiales.`,
      templateId: templates[6].id,
      tags: ['red', 'comercio'],
      aliases: ['Red obsidiana'],
      fields: [
        { id: uid('field'), key: 'Función', value: 'Canalizar objetos y mensajería ilegal.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Red comercial semilla creada.', 'system')],
    },
    {
      id: relicId,
      tabId: tabByName['Lógica del mundo'].id,
      title: 'Sello Roto',
      content:
        `Fragmento de un sello antiguo que modula la resonancia. Su presencia altera a quienes intentan usarlo. Fue recuperado parcialmente en ${buildStructuredReference(
          isleId,
          'Isla del Eco',
        )}.`,
      templateId: templates[4].id,
      tags: ['artefacto', 'resonancia'],
      aliases: ['Sello'],
      fields: [
        { id: uid('field'), key: 'Origen', value: 'Sellos del Norte, fragmentado durante la Ruptura.' },
        { id: uid('field'), key: 'Poder', value: 'Amplifica emociones sostenidas a pequeña escala.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Artefacto clave añadido al grafo.', 'system')],
    },
    {
      id: isleId,
      tabId: tabByName['Escenarios'].id,
      title: 'Isla del Eco',
      content:
        `Pequeño islote donde las olas devuelven susurros del pasado. Sitio de excavaciones y comercio prohibido. Cerca de aquí se recuperó ${buildStructuredReference(
          relicId,
          'Sello Roto',
        )}.`,
      templateId: templates[6].id,
      tags: ['islote', 'secreto'],
      aliases: ['Eco'],
      fields: [
        { id: uid('field'), key: 'Riesgo', value: 'Muchos visitantes vuelven cambiados.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Localidad añadida para logísticas de trama.', 'system')],
    },
    {
      id: coupEventId,
      tabId: tabByName['Historia'].id,
      title: 'Intento de Golpe en el Muelle',
      content:
        `Un conflicto reciente que vio a facciones locales intentar tomar control del puerto. Su secuela coloca a ${buildStructuredReference(
          factionId,
          'Gremio de la Ceniza',
        )} en una posición comprometida y abre una pista hacia ${buildStructuredReference(
          historyId,
          'La Ruptura del Norte',
        )}.`,
      templateId: templates[5].id,
      tags: ['conflicto', 'reciente'],
      aliases: ['Golpe del muelle'],
      fields: [
        { id: uid('field'), key: 'Actores', value: 'Gremio de la Ceniza, guardia del puerto, mercenarios externos.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Evento semilla para enlazar tramas.', 'system')],
    },
    {
      id: smugglerId,
      tabId: tabByName['Personajes'].id,
      title: 'Rafi el Contrabandista',
      content:
        `Contrabandista local que mueve piezas del pasado por las rendijas del puerto. Tiene tratos con ${buildStructuredReference(
          factionId,
          'Gremio de la Ceniza',
        )} y conoce rutas hacia ${buildStructuredReference(isleId, 'Isla del Eco')}.`,
      templateId: templates[0].id,
      tags: ['contrabando', 'informante'],
      aliases: ['Rafi'],
      fields: [
        { id: uid('field'), key: 'Rol narrativo', value: 'Conector de tramas' },
        { id: uid('field'), key: 'Secreto', value: 'Sabe quién guarda fragmentos del Sello.' },
      ],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Contrabandista local añadido.', 'system')],
    },
    {
      id: archivistId,
      tabId: tabByName['Personajes'].id,
      title: 'Archivista Loma',
      content:
        `Custodia archivos de la Ruptura en ${buildStructuredReference(historyId, 'La Ruptura del Norte')}. Provee a ${buildStructuredReference(characterId, 'Ariadna Vale')} pistas olvidadas.`,
      templateId: templates[0].id,
      tags: ['archivista', 'recursos'],
      aliases: ['Loma'],
      fields: [{ id: uid('field'), key: 'Deseo', value: 'Proteger la verdad histórica' }],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Archivista para investigación añadido.', 'system')],
    },
    {
      id: captainId,
      tabId: tabByName['Personajes'].id,
      title: 'Capitán Oran',
      content:
        `Capitán de un carguero que evita aduanas y protege rutas hacia ${buildStructuredReference(isleBayId, 'Bahía del Vigía')}. Fue testigo del ${buildStructuredReference(coupEventId, 'Intento de Golpe en el Muelle')}.`,
      templateId: templates[0].id,
      tags: ['marino', 'aliado'],
      aliases: ['Oran'],
      fields: [{ id: uid('field'), key: 'Rol narrativo', value: 'Ally/Transportista' }],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Capitán añadido para movilidad narrativa.', 'system')],
    },
    {
      id: shrineId,
      tabId: tabByName['Escenarios'].id,
      title: 'Santuario del Eco',
      content:
        `Ruinas semisumergidas en ${buildStructuredReference(isleId, 'Isla del Eco')} donde antiguos rituales moderaban la resonancia. Cerca se hallaron fragmentos como ${buildStructuredReference(relicShardId, 'Fragmento de Sello')}.`,
      templateId: templates[6].id,
      tags: ['ruina', 'ritual'],
      aliases: ['Santuario'],
      fields: [{ id: uid('field'), key: 'Símbolo', value: 'Conchas talladas con runas' }],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Lugar ritual agregado.', 'system')],
    },
    {
      id: stormEventId,
      tabId: tabByName['Historia'].id,
      title: 'La Tormenta que Murmuró',
      content:
        `Evento meteorológico que amplificó resonancias y dejó a ${buildStructuredReference(relicId, 'Sello Roto')} parcialmente expuesto. Originó nuevas expediciones hacia ${buildStructuredReference(isleId, 'Isla del Eco')}.`,
      templateId: templates[5].id,
      tags: ['clima', 'catalizador'],
      aliases: ['Tormenta'],
      fields: [{ id: uid('field'), key: 'Consecuencias', value: 'Movilizó facciones y saqueadores.' }],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Evento climático para complicar tramas.', 'system')],
    },
    {
      id: isleBayId,
      tabId: tabByName['Escenarios'].id,
      title: 'Bahía del Vigía',
      content:
        `Entrada natural al archipiélago con playas de grava negra. Punto de encuentro para mercantes y piratas; ruta hacia ${buildStructuredReference(isleId, 'Isla del Eco')}.`,
      templateId: templates[6].id,
      tags: ['bahía', 'puerto-dorado'],
      aliases: ['Vigía'],
      fields: [{ id: uid('field'), key: 'Rutas', value: 'Costeras y pasajes entre rocas' }],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Bahía añadida como hub marítimo.', 'system')],
    },
    {
      id: pirateFactionId,
      tabId: tabByName['Personajes'].id,
      title: 'Los Corazones Negros',
      content:
        `Banda de corsarios que opera en la sombra de ${buildStructuredReference(isleBayId, 'Bahía del Vigía')}. Rivalizan con ${buildStructuredReference(factionId, 'Gremio de la Ceniza')} por control de rutas.`,
      templateId: templates[3].id,
      tags: ['piratas', 'enemigos'],
      aliases: ['Corazones Negros'],
      fields: [{ id: uid('field'), key: 'Líder', value: 'Capitán Negro' }],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Facción rival añadida.', 'system')],
    },
    {
      id: relicShardId,
      tabId: tabByName['Lógica del mundo'].id,
      title: 'Fragmento de Sello',
      content:
        `Pequeño fragmento del Sello Roto con propiedad resonante residual. Fue descubierto por saqueadores tras ${buildStructuredReference(stormEventId, 'La Tormenta que Murmuró')}.`,
      templateId: templates[4].id,
      tags: ['artefacto', 'fragmento'],
      aliases: ['Fragmento'],
      fields: [{ id: uid('field'), key: 'Costo', value: 'Causa sueños intrusivos en quien lo toca.' }],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Fragmento menor añadido para pistas.', 'system')],
    },
    {
      id: envoyId,
      tabId: tabByName['Personajes'].id,
      title: 'Enviado del Consejo',
      content:
        `Representante del consejo regional enviado para investigar el aumento de resonancia en ${buildStructuredReference(scenarioId, 'Puerto Ceniza')}. Su llegada tensiona acuerdos con ${buildStructuredReference(factionId, 'Gremio de la Ceniza')}.`,
      templateId: templates[0].id,
      tags: ['autoridad', 'conflicto'],
      aliases: ['Enviado'],
      fields: [{ id: uid('field'), key: 'Rol narrativo', value: 'Catalizador político' }],
      assets: [],
      status: 'active' as const,
      revision: 1,
      updatedAt: now,
      history: [createHistoryEvent('Creación', 'Enviado para conectar política y trama.', 'system')],
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
  return migratePersistedState({
    settings: null,
    projects: [project],
    activeProjectId: project.id,
    activeTabId: firstTabId,
    activeEntityId: firstEntityId,
    changeLog: [],
  })
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

    return migratePersistedState({
      settings: parsed.settings ?? null,
      projects: parsed.projects,
      activeProjectId: parsed.activeProjectId ?? parsed.projects[0].id,
      activeTabId:
        parsed.activeTabId ?? parsed.projects[0].tabs[0]?.id ?? getDefaultPersistedState().activeTabId,
      activeEntityId:
        parsed.activeEntityId ??
        parsed.projects[0].entities[0]?.id ??
        getDefaultPersistedState().activeEntityId,
      changeLog: parsed.changeLog ?? [],
    })
  } catch {
    localStorage.removeItem(STORAGE_KEY)
    return empty
  }
}
