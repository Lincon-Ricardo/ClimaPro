export interface Symptom {
  id: string;
  symptom: string;
  icon: string;
  short: string;
  causes: string[];
  checklist: string[];
  fix: string[];
}

export const SYMPTOMS: Symptom[] = [
  {
    id: 'nao-fria',
    symptom: 'Não gela / ar quente',
    icon: '🔥',
    short: 'Aparelho ligado mas sem refrigeração',
    causes: [
      'Falta de gás refrigerante (vazamento)',
      'Filtros muito sujos bloqueando o fluxo de ar',
      'Termostato configurado no modo errado',
      'Condensadora suja obstruindo troca de calor',
      'Sensor de temperatura desregulado',
    ],
    checklist: [
      'Verificar modo do termostato (cool / 16-18°C)',
      'Avaliar retorno do ar e temperatura na saída',
      'Inspecionar e limpar filtros',
      'Verificar pressão do gás (manômetro)',
      'Limpar serpentina da condensadora',
      'Testar sensor de temperatura',
    ],
    fix: [
      'Lavar filtros e retomar observação por 20 min',
      'Se pressão baixa → procurar vazamento antes de completar gás',
      'Limpar evaporadora e condensadora',
      'Orientar cliente sobre uso e manutenção preventiva',
    ],
  },
  {
    id: 'vazando',
    symptom: 'Vazando água',
    icon: '💧',
    short: 'Gotejando ou vazamento de água interna',
    causes: [
      'Bandeja de dreno entupida',
      'Mangueira de dreno desconectada ou dobrada',
      'Evaporadora congelada derretendo (sujeira + entupimento)',
      'Desnível errado do aparelho',
      'Sujidade excessiva no trocador',
    ],
    checklist: [
      'Remover e limpar a bandeja de dreno',
      'Verificar desobstrução da mangueira de dreno',
      'Checar inclinação do aparelho',
      'Inspecionar evaporadora congelada',
      'Limpar completamente a evaporadora',
    ],
    fix: [
      'Desentupir dreno com soprador/ar comprimido',
      'Corrigir o desnível (lado do dreno levemente mais baixo)',
      'Higienização completa da evaporadora',
      'Recolocar e testar drenagem',
    ],
  },
  {
    id: 'barulho',
    symptom: 'Fazendo barulho',
    icon: '🔊',
    short: 'Ruído, vibração ou chiado',
    causes: [
      'Sujeira no eixo ou filtro desalinhado',
      'Bomba de dreno vibrando',
      'Parafusos soltos ou fixação inadequada',
      'Sujidade no motor / rolamento',
      'Objeto preso na turbina',
    ],
    checklist: [
      'Localizar a origem do ruído (turbina, motor, bomba)',
      'Verificar fixação de parafusos e suportes',
      'Inspecionar turbina/ventilador por objetos',
      'Lubrificar rolamentos de motor se necessário',
      'Testar em todas as velocidades',
    ],
    fix: [
      'Retirar objetos estranhos da turbina',
      'Apertar fixações e reequilibrar',
      'Substituir motor/rolamento se desgastado',
      'Realizar limpeza interna',
    ],
  },
  {
    id: 'cheiro',
    symptom: 'Cheiro ruim',
    icon: '🚫',
    short: 'Odor desagradável no ar',
    causes: [
      'Acúmulo de fungos e bactérias na evaporadora',
      'Bandeja com água parada',
      'Dreno sujo',
      'Filtro muito sujo com odores retidos',
      'Mofo no duto ou interior do aparelho',
    ],
    checklist: [
      'Inspecionar o odor (úmido, queimado, mofo)',
      'Verificar evaporadora para mofo',
      'Checar bandeja e dreno com água parada',
      'Avaliar filtros',
    ],
    fix: [
      'Higienização completa com produto específico',
      'Aplicar ozônio se disponível',
      'Desinfetar bandeja e dreno',
      'Recomendar limpeza periódica (higienização)',
    ],
  },
  {
    id: 'nao-liga',
    symptom: 'Não liga',
    icon: '⛔',
    short: 'Sem resposta ao ligar',
    causes: [
      'Sem energia / disjuntor desarmado',
      'Controle remoto sem bateria ou com defeito',
      'Sensor/placa eletrônica com falha',
      'Capacitor do compressor queimado',
      'Proteção térmica ativada',
    ],
    checklist: [
      'Verificar disjuntor e tomada com multímetro',
      'Testar com outro controle/fonte',
      'Checar capacitor de partida',
      'Inspecionar placa e conexões',
      'Verificar código de erro do display',
    ],
    fix: [
      'Religar disjuntor e testar',
      'Trocar bateria/controle',
      'Substituir capacitor defeituoso',
      'Orientar sobre instalação elétrica',
    ],
  },
  {
    id: 'gelando-demais',
    symptom: 'Congelando / gelando demais',
    icon: '🧊',
    short: 'Evaporadora congelando ou excesso de frio',
    causes: [
      'Falta de gás causando baixa pressão e congelamento',
      'Fluxo de ar insuficiente (filtro/evaporadora suja)',
      'Sensor de temperatura defeituoso',
      'Soprador com velocidade baixa',
      'Modo seco/frio com temperatura muito baixa',
    ],
    checklist: [
      'Verificar congelamento na evaporadora',
      'Confirmar fluxo de ar e filtros',
      'Medir pressão do sistema',
      'Testar sensor de temperatura',
      'Ajustar velocidade do soprador',
    ],
    fix: [
      'Descongelar o aparelho antes de testar',
      'Corrigir carga de gás após checar vazamento',
      'Limpar filtros e trocador',
      'Trocar sensor se defeituoso',
    ],
  },
  {
    id: 'desliga-sozinho',
    symptom: 'Desliga sozinho',
    icon: '⏻',
    short: 'Liga e desliga em seguida',
    causes: [
      'Proteção térmica do compressor',
      'Superaquecimento da condensadora',
      'Baixo fluxo de ar',
      'Problema elétrico oscilante',
      'Placa acionando proteção por erro',
    ],
    checklist: [
      'Observar ciclo liga/desliga',
      'Verificar temperatura da condensadora',
      'Checar tensão da rede',
      'Ler código de erro da placa',
      'Testar compressor/sensor',
    ],
    fix: [
      'Limpar condensadora e melhorar ventilação',
      'Regular carga de gás',
      'Estabilizar energia (recomendar técnico elétrico)',
      'Substituir peças defeituosas',
    ],
  },
];
