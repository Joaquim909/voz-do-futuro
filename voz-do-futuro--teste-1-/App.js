import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  SafeAreaView,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

// ============================================================
// CORES & CONFIGURAÇÕES
// ============================================================

const COLORS = {
  bgMain: '#071C1A',
  bgSec: '#0B2925',
  card: '#123A34',
  cardLight: '#185047',

  creme: '#FFF4D6',
  yellow: '#F5C542',
  orange: '#F28C28',
  green: '#58CC02', // Verde Duolingo
  blue: '#1CB0F6',  // Azul Duolingo
  cyan: '#55D6BE',
  red: '#FF4B4B',   // Vermelho Duolingo
  purple: '#9B72CF',

  white: '#FFFFFF',
  text: '#F4F7F5',
  textSec: '#A9C2BC',
  border: '#28645B',
  black: '#061311',
};

const MAX_LEVEL = 100;
const XP_PER_CORRECT = 10;
const QUESTIONS_PER_QUIZ = 5;
const CHALLENGE_INITIAL_TIME = 50;
const CHALLENGE_CORRECT_BONUS = 3;
const CHALLENGE_WRONG_PENALTY = 12;

// Metas/tarefas diárias: cada tarefa concluída dá XP bônus (uma vez por dia)
const DAILY_TASKS = [
  { id: 'quiz1', icon: '📝', title: 'Concluir 1 quiz', goal: 1, xp: 20 },
  { id: 'correct5', icon: '✅', title: 'Acertar 5 questões', goal: 5, xp: 30 },
  { id: 'mathpt', icon: '📐', title: 'Responder 3 questões de Português ou Matemática', goal: 3, xp: 20 },
  { id: 'challenge', icon: '⚡', title: 'Jogar um Desafio 50s', goal: 1, xp: 25 },
  { id: 'hard', icon: '🔥', title: 'Concluir um quiz de nível Difícil', goal: 1, xp: 40 },
  { id: 'perfect', icon: '🏅', title: 'Gabaritar um quiz (100% de acertos)', goal: 1, xp: 50 },
];

// Conquistas exibidas no perfil (calculadas a partir do histórico)
const ACHIEVEMENTS = [
  { id: 'first', icon: '🌱', title: 'Primeiro passo', desc: 'Conclua 1 quiz', check: (s) => s.totalQuizzes >= 1 },
  { id: 'ten', icon: '📚', title: 'Dedicação', desc: 'Conclua 10 quizzes', check: (s) => s.totalQuizzes >= 10 },
  { id: 'perfect', icon: '🏅', title: 'Gabaritou!', desc: 'Acerte tudo em um quiz', check: (s) => s.perfectQuizzes >= 1 },
  { id: 'sharp', icon: '🎯', title: 'Mira certeira', desc: 'Acerte 50 questões', check: (s) => s.totalCorrect >= 50 },
  { id: 'streak3', icon: '🔥', title: 'Em chamas', desc: 'Estude 3 dias seguidos', check: (s, u) => (u?.streak || 1) >= 3 },
  { id: 'lvl5', icon: '⭐', title: 'Nível 5', desc: 'Chegue ao nível 5', check: (s, u) => (u?.level || 1) >= 5 },
];

// Opções de Avatares Aprimorados (Estilo Mascotinho)
const AVATAR_PRESETS = [
  { skin: '#C98B5A', hair: '#241A17', paint: '#E85D5D', accessory: 'none', clothes: 'green' },
  { skin: '#F1C27D', hair: '#F5C542', paint: '#none', accessory: 'cocar', clothes: 'blue' },
  { skin: '#8D5524', hair: '#061311', paint: '#4EA8DE', accessory: 'glasses', clothes: 'orange' },
  { skin: '#FFDBAC', hair: '#E85D5D', paint: '#none', accessory: 'necklace', clothes: 'purple' },
  { skin: '#E0AC69', hair: '#241A17', paint: '#49B675', accessory: 'cocar', clothes: 'green' },
  { skin: '#F1C27D', hair: '#061311', paint: '#none', accessory: 'glasses', clothes: 'blue' },
];

// ============================================================
// BANCO DE QUESTÕES (90 Questões)
// ============================================================

const Q = (id, vestibular, subject, difficulty, statement, options, correctAnswer, explanation, fonte = null) => ({
  id, vestibular, subject, difficulty, statement, options, correctAnswer, explanation, ...(fonte ? { fonte } : {}),
});

const baseQuestions = [
  // QUESTÕES BASEADAS EM ITENS IDENTIFICADOS NAS PROVAS OFICIAIS DE 2024.
  // Os enunciados abaixo foram reescritos/resumidos; a fonte oficial e o número original
  // ficam nos metadados. A classificação de dificuldade é pedagógica para o app, não oficial.
  Q('enem-2024-oficial-q91', 'ENEM', 'Física', 'Fácil', 'Em uma colisão, a parte deformável da carroceria de um automóvel aumenta a segurança dos ocupantes. Qual é o principal efeito físico dessa deformação?', ['Aumenta a energia cinética do carro.', 'Absorve parte da energia cinética durante o impacto.', 'Elimina a quantidade de movimento do sistema.', 'Impede que qualquer força atue sobre os ocupantes.'], 'B', 'A zona de deformação absorve energia durante a colisão, reduzindo a intensidade do impacto transmitido aos ocupantes.', { tipo: 'adaptada', ano: 2024, etapa: '2º dia — Ciências da Natureza', numero: 91, caderno: 'Azul; equivalentes: Amarelo 119, Verde 105', referencia: 'ENEM 2024 — caderno azul, questão 91 (gabarito B)', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2024' }),
  Q('psc-2024-oficial-q24', 'PSC', 'Geografia', 'Fácil', 'Na prova do PSC/UFAM 2024, uma questão aborda o uso das Tecnologias da Informação e Comunicação (TIC) no monitoramento ambiental. Qual aplicação corresponde a esse uso?', ['Acelerar a exploração mineral em áreas protegidas.', 'Diminuir a transparência dos dados ambientais.', 'Reduzir as áreas de preservação permanente.', 'Automatizar processos de fiscalização ambiental.'], 'D', 'As TIC podem apoiar o monitoramento e automatizar etapas da fiscalização ambiental.', { tipo: 'adaptada', ano: 2024, etapa: '2ª etapa — PSC/UFAM', numero: 24, referencia: 'Prova de Conhecimentos Gerais PSC 2024 — 2ª etapa; gabarito definitivo D', url: 'https://edoc.ufam.edu.br/bitstream/123456789/7950/46/Edital%2004%20de%202024%20-%20Prova%202a%20Etapa%20PSC%202024.pdf' }),
  Q('psc-2024-oficial-q31', 'PSC', 'Biologia', 'Médio', 'Quando um neurônio é estimulado, há entrada de íons sódio através da membrana. Como se chama a mudança inicial do potencial elétrico da membrana?', ['Despolarização.', 'Hiperpolarização.', 'Limiar de membrana.', 'Repolarização.'], 'A', 'A entrada de Na⁺ torna o interior da membrana menos negativo, caracterizando a despolarização.', { tipo: 'adaptada', ano: 2024, etapa: '2ª etapa — PSC/UFAM', numero: 31, referencia: 'Prova de Conhecimentos Gerais PSC 2024 — 2ª etapa; gabarito definitivo A', url: 'https://edoc.ufam.edu.br/bitstream/123456789/7950/46/Edital%2004%20de%202024%20-%20Prova%202a%20Etapa%20PSC%202024.pdf' }),
  Q('psc-2024-oficial-q47', 'PSC', 'Matemática', 'Difícil', 'Uma população é modelada por f(t) = f₀ · e^(0,05t). Sabendo que ln(3) ≈ 1,10, em aproximadamente quantos anos a população triplica?', ['10 anos.', '16 anos.', '18 anos.', '20 anos.', '22 anos.'], 'E', 'Para triplicar: 3 = e^(0,05t). Então ln(3) = 0,05t; t ≈ 1,10/0,05 = 22 anos.', { tipo: 'adaptada', ano: 2024, etapa: '2ª etapa — PSC/UFAM', numero: 47, referencia: 'Prova de Conhecimentos Gerais PSC 2024 — 2ª etapa; gabarito definitivo E', url: 'https://edoc.ufam.edu.br/bitstream/123456789/7950/46/Edital%2004%20de%202024%20-%20Prova%202a%20Etapa%20PSC%202024.pdf' }),

  // SIS/UEA 2024 — itens reescritos a partir do caderno da Prova de Acompanhamento III.
  Q('sis-2024-oficial-q13', 'SIS', 'História', 'Fácil', 'Na economia açucareira da América portuguesa no século XVI, quais elementos foram centrais para a organização da produção?', ['Pequena propriedade e trabalho assalariado.', 'Produção voltada ao mercado interno e rotação de culturas.', 'Monocultura e mão de obra livre.', 'Latifúndio e trabalho escravizado.'], 'D', 'A produção açucareira colonial se apoiava em grandes propriedades, monocultura voltada à exportação e trabalho escravizado.', { tipo: 'adaptada', ano: 2024, etapa: 'SIS/UEA — Acompanhamento III', numero: 13, referencia: 'Caderno SIS III 2024; gabarito definitivo D', url: 'https://souvetor.com/wp-content/uploads/2025/05/UEA-PROVA-SIS-III-2024.pdf' }),
  Q('sis-2024-oficial-q24', 'SIS', 'Tecnologia', 'Médio', 'Uma questão do SIS/UEA 2024 aborda tecnologias ligadas à Indústria 4.0. Qual par representa tecnologias próprias desse contexto?', ['Eletricidade e integração de sistemas.', 'Motor a combustão e internet das coisas.', 'Linha de montagem e computação em nuvem.', 'Big data e robótica avançada.'], 'D', 'Big data e robótica avançada estão entre as tecnologias associadas à Indústria 4.0.', { tipo: 'adaptada', ano: 2024, etapa: 'SIS/UEA — Acompanhamento III', numero: 24, referencia: 'Caderno SIS III 2024; gabarito definitivo D', url: 'https://souvetor.com/wp-content/uploads/2025/05/UEA-PROVA-SIS-III-2024.pdf' }),
  Q('sis-2024-oficial-q49', 'SIS', 'Física', 'Difícil', 'Um dissipador de alumínio de 150 g esfria de 80 °C para 20 °C. Considere calor específico de 0,2 cal/(g·°C), 1 cal = 4 J e potência de dissipação de 180 W. Aproximadamente quanto tempo leva esse resfriamento?', ['20 s.', '32 s.', '40 s.', '48 s.'], 'C', 'Q = m·c·ΔT = 150·0,2·60 = 1800 cal = 7200 J. Como P = Q/t, t = 7200/180 = 40 s.', { tipo: 'adaptada', ano: 2024, etapa: 'SIS/UEA — Acompanhamento III', numero: 49, referencia: 'Caderno SIS III 2024; gabarito definitivo C', url: 'https://souvetor.com/wp-content/uploads/2025/05/UEA-PROVA-SIS-III-2024.pdf' }),

  Q('enem-2025-oficial-q136', 'ENEM', 'Matemática', 'Fácil', 'Um carro percorre 30 km por dia durante 7 dias. Seu consumo é de 1 m³ de GNV a cada 13 km, e há cilindros de 10, 14, 17, 21 e 25 m³. Qual é a menor capacidade que permite rodar a semana inteira sem novo abastecimento?', ['10 m³.', '14 m³.', '17 m³.', '21 m³.', '25 m³.'], 'C', 'A distância semanal é 30 × 7 = 210 km. O consumo é 210 ÷ 13 ≈ 16,15 m³; portanto, a menor capacidade suficiente é 17 m³.', { tipo: 'adaptada', ano: 2025, etapa: '2º dia — Matemática', numero: 136, caderno: 'Azul 136; Amarelo 146; Cinza 141; Verde 142', referencia: 'ENEM 2025 — questão 136 do caderno azul; gabarito C', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2025' }),

  // ENEM — FÁCIL
  {
    id: 'enem-f-01',
    vestibular: 'ENEM',
    subject: 'Matemática',
    difficulty: 'Fácil',
    statement: 'Uma escola possui 120 alunos. Em determinado dia, 25% dos alunos faltaram. Quantos alunos compareceram à escola?',
    options: ['30 alunos', '60 alunos', '90 alunos', '100 alunos'],
    correctAnswer: 'C',
    explanation: '25% de 120 corresponde a 30 alunos. Portanto, 120 - 30 = 90 alunos compareceram.',
  },
  {
    id: 'enem-f-02',
    vestibular: 'ENEM',
    subject: 'Português',
    difficulty: 'Fácil',
    statement: 'Em uma campanha de conscientização ambiental, a principal finalidade de utilizar uma linguagem clara e objetiva é:',
    options: ['Dificultar a compreensão da mensagem.', 'Facilitar a compreensão pelo público.', 'Utilizar palavras exclusivamente científicas.', 'Tornar o texto mais extenso.'],
    correctAnswer: 'B',
    explanation: 'A linguagem clara e objetiva facilita a compreensão da mensagem pelo público-alvo.',
  },
  {
    id: 'enem-f-03',
    vestibular: 'ENEM',
    subject: 'Geografia',
    difficulty: 'Fácil',
    statement: 'O processo de urbanização está relacionado principalmente:',
    options: ['Ao crescimento da população rural.', 'À redução das cidades.', 'Ao crescimento das cidades e da população urbana.', 'À diminuição das atividades econômicas.'],
    correctAnswer: 'C',
    explanation: 'Urbanização é o processo de crescimento das cidades e da população que vive em áreas urbanas.',
  },
  {
    id: 'enem-f-04',
    vestibular: 'ENEM',
    subject: 'Biologia',
    difficulty: 'Fácil',
    statement: 'Qual organela celular é responsável principalmente pela produção de energia na forma de ATP?',
    options: ['Ribossomo', 'Núcleo', 'Mitocôndria', 'Lisossomo'],
    correctAnswer: 'C',
    explanation: 'As mitocôndrias realizam etapas importantes da respiração celular e produzem ATP.',
  },
  {
    id: 'enem-f-05',
    vestibular: 'ENEM',
    subject: 'História',
    difficulty: 'Fácil',
    statement: 'A Proclamação da República no Brasil ocorreu em:',
    options: ['1822', '1889', '1898', '1930'],
    correctAnswer: 'B',
    explanation: 'A República foi proclamada no Brasil em 15 de novembro de 1889.',
  },

  // ENEM — MÉDIO
  {
    id: 'enem-m-01',
    vestibular: 'ENEM',
    subject: 'Matemática',
    difficulty: 'Médio',
    statement: 'Uma camiseta custa R$ 80,00. Durante uma promoção, ela recebe desconto de 15%. Qual será o preço final da camiseta?',
    options: ['R$ 60,00', 'R$ 68,00', 'R$ 72,00', 'R$ 75,00'],
    correctAnswer: 'B',
    explanation: '15% de R$ 80 é R$ 12. Assim, R$ 80 - R$ 12 = R$ 68.',
  },
  {
    id: 'enem-m-02',
    vestibular: 'ENEM',
    subject: 'Física',
    difficulty: 'Médio',
    statement: 'Um carro percorre 180 km em 3 horas, mantendo velocidade constante. Qual é sua velocidade média?',
    options: ['30 km/h', '50 km/h', '60 km/h', '90 km/h'],
    correctAnswer: 'C',
    explanation: 'A velocidade média é calculada por distância dividida pelo tempo: 180 ÷ 3 = 60 km/h.',
  },
  {
    id: 'enem-m-03',
    vestibular: 'ENEM',
    subject: 'Geografia',
    difficulty: 'Médio',
    statement: 'O desmatamento da Amazônia pode provocar impactos ambientais como:',
    options: ['Aumento da biodiversidade.', 'Redução da erosão.', 'Perda de biodiversidade e alterações no ciclo da água.', 'Aumento da cobertura vegetal.'],
    correctAnswer: 'C',
    explanation: 'O desmatamento pode destruir habitats, reduzir a biodiversidade e alterar processos ambientais como o ciclo da água.',
  },
  {
    id: 'enem-m-04',
    vestibular: 'ENEM',
    subject: 'Química',
    difficulty: 'Médio',
    statement: 'Uma solução apresenta pH igual a 3. Em relação a uma solução de pH 7, ela é:',
    options: ['Mais básica.', 'Mais ácida.', 'Neutra.', 'Exatamente igual.'],
    correctAnswer: 'B',
    explanation: 'Valores de pH menores que 7 indicam soluções ácidas.',
  },
  {
    id: 'enem-m-05',
    vestibular: 'ENEM',
    subject: 'Português',
    difficulty: 'Médio',
    statement: 'Quando um texto apresenta informações organizadas para convencer o leitor a adotar determinada ideia, predomina a função de:',
    options: ['Entretenimento.', 'Persuasão.', 'Descrição exclusivamente visual.', 'Narração fantástica.'],
    correctAnswer: 'B',
    explanation: 'A persuasão busca influenciar o leitor a aceitar uma ideia ou realizar determinada ação.',
  },

  // ENEM — DIFÍCIL
  {
    id: 'enem-d-01',
    vestibular: 'ENEM',
    subject: 'Matemática',
    difficulty: 'Difícil',
    statement: 'Uma população cresce segundo um modelo exponencial. Se inicialmente possui 2.000 indivíduos e dobra a cada 5 anos, quantos indivíduos haverá após 15 anos?',
    options: ['4.000', '6.000', '8.000', '16.000'],
    correctAnswer: 'D',
    explanation: 'Em 15 anos ocorrerão três períodos de 5 anos. Portanto: 2.000 × 2³ = 16.000.',
  },
  {
    id: 'enem-d-02',
    vestibular: 'ENEM',
    subject: 'Biologia',
    difficulty: 'Difícil',
    statement: 'Em uma cadeia alimentar, a redução significativa de uma espécie predadora pode provocar:',
    options: ['Aumento imediato de todas as espécies.', 'Alterações nas populações das espécies que eram suas presas.', 'Desaparecimento obrigatório dos produtores.', 'Nenhuma alteração no ecossistema.'],
    correctAnswer: 'B',
    explanation: 'A retirada de um predador altera as relações ecológicas e pode aumentar a população de suas presas.',
  },
  {
    id: 'enem-d-03',
    vestibular: 'ENEM',
    subject: 'História',
    difficulty: 'Difícil',
    statement: 'A Revolução Industrial provocou profundas transformações sociais e econômicas. Entre elas está:',
    options: ['A redução da produção mecanizada.', 'O crescimento das cidades e do trabalho industrial.', 'O desaparecimento das fábricas.', 'A diminuição da circulação de mercadorias.'],
    correctAnswer: 'B',
    explanation: 'A industrialização impulsionou a produção mecanizada, a urbanização e o crescimento do trabalho fabril.',
  },
  {
    id: 'enem-d-04',
    vestibular: 'ENEM',
    subject: 'Física',
    difficulty: 'Difícil',
    statement: 'Um objeto de massa 10 kg sofre uma força resultante de 30 N. Considerando a segunda lei de Newton, sua aceleração será:',
    options: ['1 m/s²', '2 m/s²', '3 m/s²', '30 m/s²'],
    correctAnswer: 'C',
    explanation: 'Pela segunda lei de Newton, F = m × a. Assim, 30 = 10 × a, portanto a = 3 m/s².',
  },
  {
    id: 'enem-d-05',
    vestibular: 'ENEM',
    subject: 'Geografia',
    difficulty: 'Difícil',
    statement: 'As mudanças climáticas podem afetar a Amazônia de diferentes formas. Um possível impacto é:',
    options: ['Aumento permanente das chuvas em todas as regiões.', 'Redução da temperatura global causada exclusivamente pela floresta.', 'Alterações no regime de chuvas e aumento de eventos extremos.', 'Eliminação completa dos períodos de seca.'],
    correctAnswer: 'C',
    explanation: 'As mudanças climáticas podem modificar padrões de precipitação e aumentar a ocorrência de eventos climáticos extremos.',
  },

  // PSC — FÁCIL
  {
    id: 'psc-f-01',
    vestibular: 'PSC',
    subject: 'Matemática',
    difficulty: 'Fácil',
    statement: 'Quanto é 15 + 27?',
    options: ['32', '40', '42', '45'],
    correctAnswer: 'C',
    explanation: '15 + 27 = 42.',
  },
  {
    id: 'psc-f-02',
    vestibular: 'PSC',
    subject: 'História',
    difficulty: 'Fácil',
    statement: 'Quem foi responsável pela chegada da expedição portuguesa ao território que posteriormente seria chamado de Brasil, em 1500?',
    options: ['Pedro Álvares Cabral', 'Tiradentes', 'Dom Pedro II', 'Getúlio Vargas'],
    correctAnswer: 'A',
    explanation: 'A expedição comandada por Pedro Álvares Cabral chegou ao território em 1500.',
  },
  {
    id: 'psc-f-03',
    vestibular: 'PSC',
    subject: 'Biologia',
    difficulty: 'Fácil',
    statement: 'Qual dos seguintes é um exemplo de ser vivo produtor?',
    options: ['Leão', 'Capim', 'Cobra', 'Gavião'],
    correctAnswer: 'B',
    explanation: 'As plantas produzem seu próprio alimento por meio da fotossíntese e são classificadas como produtores.',
  },
  {
    id: 'psc-f-04',
    vestibular: 'PSC',
    subject: 'Geografia',
    difficulty: 'Fácil',
    statement: 'O maior estado brasileiro em extensão territorial é:',
    options: ['Amazonas', 'São Paulo', 'Bahia', 'Paraná'],
    correctAnswer: 'A',
    explanation: 'O Amazonas é o maior estado brasileiro em área territorial.',
  },
  {
    id: 'psc-f-05',
    vestibular: 'PSC',
    subject: 'Português',
    difficulty: 'Fácil',
    statement: 'Qual palavra apresenta um significado contrário ao termo “feliz”?',
    options: ['Alegre', 'Contente', 'Triste', 'Animado'],
    correctAnswer: 'C',
    explanation: '“Triste” apresenta sentido contrário ao termo “feliz”.',
  },

  // PSC — MÉDIO
  {
    id: 'psc-m-01',
    vestibular: 'PSC',
    subject: 'Matemática',
    difficulty: 'Médio',
    statement: 'Uma loja aumentou o preço de um produto de R$ 200 para R$ 240. Qual foi o percentual de aumento?',
    options: ['10%', '15%', '20%', '25%'],
    correctAnswer: 'C',
    explanation: 'O aumento foi de R$ 40. Como 40 ÷ 200 = 0,20, o aumento foi de 20%.',
  },
  {
    id: 'psc-m-02',
    vestibular: 'PSC',
    subject: 'Física',
    difficulty: 'Médio',
    statement: 'Qual unidade é utilizada no Sistema Internacional para medir energia?',
    options: ['Newton', 'Joule', 'Pascal', 'Watt'],
    correctAnswer: 'B',
    explanation: 'O joule (J) é a unidade do Sistema Internacional utilizada para medir energia.',
  },
  {
    id: 'psc-m-03',
    vestibular: 'PSC',
    subject: 'Biologia',
    difficulty: 'Médio',
    statement: 'A fotossíntese realizada pelas plantas utiliza principalmente:',
    options: ['Oxigênio e glicose.', 'Gás carbônico, água e luz.', 'Nitrogênio e oxigênio.', 'Proteínas e sais minerais.'],
    correctAnswer: 'B',
    explanation: 'Na fotossíntese, as plantas utilizam água, gás carbônico e energia luminosa para produzir matéria orgânica.',
  },
  {
    id: 'psc-m-04',
    vestibular: 'PSC',
    subject: 'Geografia',
    difficulty: 'Médio',
    statement: 'A Zona Franca de Manaus foi criada com o objetivo de:',
    options: ['Estimular atividades econômicas na região amazônica.', 'Reduzir a população de Manaus.', 'Eliminar a indústria amazônica.', 'Impedir a entrada de produtos no Amazonas.'],
    correctAnswer: 'A',
    explanation: 'A Zona Franca de Manaus busca promover desenvolvimento econômico e industrial na região.',
  },
  {
    id: 'psc-m-05',
    vestibular: 'PSC',
    subject: 'Química',
    difficulty: 'Médio',
    statement: 'A água (H₂O) é classificada como:',
    options: ['Elemento químico.', 'Substância composta.', 'Mistura heterogênea.', 'Mistura homogênea.'],
    correctAnswer: 'B',
    explanation: 'A água pura possui dois elementos químicos, hidrogênio e oxigênio, sendo uma substância composta.',
  },

  // PSC — DIFÍCIL
  {
    id: 'psc-d-01',
    vestibular: 'PSC',
    subject: 'Matemática',
    difficulty: 'Difícil',
    statement: 'Uma função é definida por f(x) = 2x + 5. Qual é o valor de f(10)?',
    options: ['15', '20', '25', '30'],
    correctAnswer: 'C',
    explanation: 'Substituindo x por 10: f(10) = 2 × 10 + 5 = 25.',
  },
  {
    id: 'psc-d-02',
    vestibular: 'PSC',
    subject: 'Biologia',
    difficulty: 'Difícil',
    statement: 'A seleção natural proposta por Darwin está relacionada:',
    options: ['À transmissão de características adquiridas durante a vida.', 'À sobrevivência e reprodução diferencial de indivíduos mais adaptados.', 'À ideia de que todas as espécies são imutáveis.', 'À ausência de variação entre indivíduos.'],
    correctAnswer: 'B',
    explanation: 'A seleção natural favorece indivíduos que possuem características que aumentam suas chances de sobrevivência e reprodução.',
  },
  {
    id: 'psc-d-03',
    vestibular: 'PSC',
    subject: 'Química',
    difficulty: 'Difícil',
    statement: 'Em uma reação química, a massa total dos reagentes é de 100 g. Considerando a conservação da massa, a massa total dos produtos será:',
    options: ['50 g', '80 g', '100 g', '200 g'],
    correctAnswer: 'C',
    explanation: 'Pela lei da conservação da massa, em um sistema fechado a massa dos reagentes é igual à massa dos produtos.',
  },
  {
    id: 'psc-d-04',
    vestibular: 'PSC',
    subject: 'História',
    difficulty: 'Difícil',
    statement: 'A Revolução Francesa teve entre suas principais causas:',
    options: ['A estabilidade econômica e social da França.', 'As desigualdades sociais, crise econômica e questionamentos ao absolutismo.', 'A ausência de conflitos políticos.', 'A expansão do feudalismo.'],
    correctAnswer: 'B',
    explanation: 'A crise econômica, as desigualdades sociais e as críticas ao absolutismo contribuíram para a Revolução Francesa.',
  },
  {
    id: 'psc-d-05',
    vestibular: 'PSC',
    subject: 'Geografia',
    difficulty: 'Difícil',
    statement: 'A preservação da floresta amazônica possui importância global porque:',
    options: ['A floresta não possui relação com o clima.', 'A Amazônia participa de ciclos ambientais importantes e abriga grande biodiversidade.', 'A floresta é formada exclusivamente por áreas urbanas.', 'A Amazônia não influencia os recursos hídricos.'],
    correctAnswer: 'B',
    explanation: 'A Amazônia possui enorme biodiversidade e desempenha funções importantes nos ciclos da água e do carbono.',
  },

  // SIS — FÁCIL
  {
    id: 'sis-f-01',
    vestibular: 'SIS',
    subject: 'Matemática',
    difficulty: 'Fácil',
    statement: 'Qual é o resultado de 8 × 7?',
    options: ['48', '54', '56', '64'],
    correctAnswer: 'C',
    explanation: '8 × 7 = 56.',
  },
  {
    id: 'sis-f-02',
    vestibular: 'SIS',
    subject: 'Geografia',
    difficulty: 'Fácil',
    statement: 'O estado do Amazonas está localizado na região:',
    options: ['Sul', 'Sudeste', 'Norte', 'Nordeste'],
    correctAnswer: 'C',
    explanation: 'O Amazonas pertence à região Norte do Brasil.',
  },
  {
    id: 'sis-f-03',
    vestibular: 'SIS',
    subject: 'Biologia',
    difficulty: 'Fácil',
    statement: 'Os seres humanos respiram principalmente utilizando o:',
    options: ['Sistema digestório.', 'Sistema respiratório.', 'Sistema nervoso.', 'Sistema urinário.'],
    correctAnswer: 'B',
    explanation: 'O sistema respiratório realiza as trocas gasosas necessárias ao organismo.',
  },
  {
    id: 'sis-f-04',
    vestibular: 'SIS',
    subject: 'História',
    difficulty: 'Fácil',
    statement: 'A Independência do Brasil foi proclamada em:',
    options: ['1500', '1750', '1822', '1889'],
    correctAnswer: 'C',
    explanation: 'A Independência do Brasil foi proclamada em 7 de setembro de 1822.',
  },
  {
    id: 'sis-f-05',
    vestibular: 'SIS',
    subject: 'Português',
    difficulty: 'Fácil',
    statement: 'Na frase “O aluno estudou bastante”, a palavra “bastante” indica:',
    options: ['Lugar', 'Tempo', 'Intensidade', 'Negação'],
    correctAnswer: 'C',
    explanation: '“Bastante” indica intensidade da ação de estudar.',
  },

  // SIS — MÉDIO
  {
    id: 'sis-m-01',
    vestibular: 'SIS',
    subject: 'Matemática',
    difficulty: 'Médio',
    statement: 'Uma pessoa possui R$ 150,00 e gasta R$ 45,00. Quanto dinheiro resta?',
    options: ['R$ 95,00', 'R$ 100,00', 'R$ 105,00', 'R$ 115,00'],
    correctAnswer: 'C',
    explanation: '150 - 45 = 105. Portanto, restam R$ 105,00.',
  },
  {
    id: 'sis-m-02',
    vestibular: 'SIS',
    subject: 'Geografia',
    difficulty: 'Médio',
    statement: 'Um dos principais rios da bacia amazônica é o:',
    options: ['Rio Amazonas', 'Rio Paraná', 'Rio Tietê', 'Rio São Francisco'],
    correctAnswer: 'A',
    explanation: 'O Rio Amazonas é um dos principais rios da maior bacia hidrográfica do mundo em extensão e volume de água.',
  },
  {
    id: 'sis-m-03',
    vestibular: 'SIS',
    subject: 'Biologia',
    difficulty: 'Médio',
    statement: 'A biodiversidade pode ser entendida como:',
    options: ['A quantidade de prédios em uma cidade.', 'A variedade de seres vivos, genes e ecossistemas.', 'Apenas a quantidade de animais domésticos.', 'Apenas a quantidade de árvores.'],
    correctAnswer: 'B',
    explanation: 'Biodiversidade envolve a variedade de seres vivos, genes e ecossistemas.',
  },
  {
    id: 'sis-m-04',
    vestibular: 'SIS',
    subject: 'História',
    difficulty: 'Médio',
    statement: 'A escravidão no Brasil foi oficialmente abolida pela Lei Áurea em:',
    options: ['1822', '1850', '1888', '1889'],
    correctAnswer: 'C',
    explanation: 'A Lei Áurea, assinada em 13 de maio de 1888, aboliu oficialmente a escravidão no Brasil.',
  },
  {
    id: 'sis-m-05',
    vestibular: 'SIS',
    subject: 'Química',
    difficulty: 'Médio',
    statement: 'Quando o gelo passa para o estado líquido, ocorre uma mudança chamada:',
    options: ['Fusão', 'Solidificação', 'Condensação', 'Sublimação'],
    correctAnswer: 'A',
    explanation: 'A passagem do estado sólido para o líquido é chamada de fusão.',
  },

  // SIS — DIFÍCIL
  {
    id: 'sis-d-01',
    vestibular: 'SIS',
    subject: 'Matemática',
    difficulty: 'Difícil',
    statement: 'Uma progressão aritmética possui primeiro termo igual a 5 e razão igual a 3. Qual é o quinto termo?',
    options: ['14', '15', '17', '20'],
    correctAnswer: 'C',
    explanation: 'Os termos são 5, 8, 11, 14 e 17. Portanto, o quinto termo é 17.',
  },
  {
    id: 'sis-d-02',
    vestibular: 'SIS',
    subject: 'Biologia',
    difficulty: 'Difícil',
    statement: 'Em uma célula eucariótica, o material genético encontra-se principalmente:',
    options: ['No núcleo.', 'No lisossomo.', 'No complexo golgiense.', 'Nos ribossomos.'],
    correctAnswer: 'A',
    explanation: 'Nas células eucarióticas, a maior parte do DNA está localizada no núcleo.',
  },
  {
    id: 'sis-d-03',
    vestibular: 'SIS',
    subject: 'Química',
    difficulty: 'Difícil',
    statement: 'Quando uma substância sofre uma transformação química, ocorre:',
    options: ['Apenas mudança de tamanho.', 'Formação de novas substâncias.', 'Somente mudança de estado físico.', 'Nenhuma alteração em sua composição.'],
    correctAnswer: 'B',
    explanation: 'Em uma transformação química, ocorre alteração na composição da matéria e formação de novas substâncias.',
  },
  {
    id: 'sis-d-04',
    vestibular: 'SIS',
    subject: 'Física',
    difficulty: 'Difícil',
    statement: 'Um corpo de massa 5 kg possui aceleração de 4 m/s². Qual é a força resultante aplicada sobre ele?',
    options: ['9 N', '10 N', '20 N', '25 N'],
    correctAnswer: 'C',
    explanation: 'Pela segunda lei de Newton: F = m × a. Logo, F = 5 × 4 = 20 N.',
  },
  {
    id: 'sis-d-05',
    vestibular: 'SIS',
    subject: 'Geografia',
    difficulty: 'Difícil',
    statement: 'O processo de expansão urbana sem planejamento adequado pode contribuir para:',
    options: ['Melhoria automática da infraestrutura.', 'Redução completa dos problemas ambientais.', 'Ocupação irregular, problemas de saneamento e impactos ambientais.', 'Eliminação das desigualdades sociais.'],
    correctAnswer: 'C',
    explanation: 'A expansão urbana sem planejamento pode gerar ocupações irregulares, falta de saneamento e diversos impactos ambientais.',
  },
];

// ============================================================
// QUESTÕES ADICIONAIS (completam 5+ de Port./Mat. e 5+ de outras matérias por dificuldade)
// ============================================================

const extraQuestions = [
  // QUESTÕES NOVAS ADAPTADAS A PARTIR DOS CONTEÚDOS/FORMATOS DAS PROVAS OFICIAIS.
  // Não são transcrições literais. O link oficial permite conferir os cadernos originais.
  Q('enem-2024-adapt-01', 'ENEM', 'Matemática', 'Fácil', 'Uma situação-problema envolve comparar o crescimento percentual de dois valores em períodos iguais. Para comparar corretamente os crescimentos relativos, deve-se calcular:', ['A diferença absoluta entre os valores finais.', 'A variação percentual de cada valor em relação ao seu valor inicial.', 'A soma dos valores iniciais e finais.', 'A média dos dois valores finais.'], 'B', 'A variação percentual compara a diferença com o valor inicial: (final − inicial) ÷ inicial × 100.', { tipo: 'adaptada', ano: 2024, referencia: 'Provas e gabaritos do ENEM 2024', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2024' }),
  Q('enem-2024-adapt-02', 'ENEM', 'Biologia', 'Médio', 'Em um ecossistema, a redução acentuada de uma população de produtores tende a afetar primeiro:', ['A entrada de energia na cadeia alimentar.', 'A formação de rochas magmáticas.', 'A rotação da Terra.', 'A salinidade de todos os oceanos.'], 'A', 'Os produtores convertem energia luminosa ou química em matéria orgânica, sustentando os demais níveis tróficos.', { tipo: 'adaptada', ano: 2024, referencia: 'Provas e gabaritos do ENEM 2024', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2024' }),
  Q('enem-2025-adapt-01', 'ENEM', 'Geografia', 'Fácil', 'Ao analisar um mapa temático, a comparação entre regiões exige observar principalmente:', ['Apenas o título do mapa.', 'A legenda, a escala e o fenômeno representado.', 'Somente o nome do cartógrafo.', 'A cor mais escura, independentemente da legenda.'], 'B', 'Legenda, escala e variável representada são essenciais para interpretar e comparar informações cartográficas.', { tipo: 'adaptada', ano: 2025, referencia: 'Provas e gabaritos do ENEM 2025', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2025' }),
  Q('enem-2025-adapt-02', 'ENEM', 'Química', 'Difícil', 'Quando uma substância ácida é diluída em água, em condições usuais, a concentração de íons H₃O⁺ tende a:', ['Aumentar sempre.', 'Diminuir.', 'Permanecer obrigatoriamente igual.', 'Transformar-se em concentração de elétrons livres.'], 'B', 'A diluição reduz a concentração da solução; para uma solução ácida, o pH tende a aumentar em direção a 7.', { tipo: 'adaptada', ano: 2025, referencia: 'Provas e gabaritos do ENEM 2025', url: 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem/provas-e-gabaritos/2025' }),
  Q('sis-2024-adapt-01', 'SIS', 'Matemática', 'Fácil', 'Em uma função afim f(x) = ax + b, com a diferente de zero, o gráfico é:', ['Uma circunferência.', 'Uma reta.', 'Uma parábola.', 'Uma hipérbole em todos os casos.'], 'B', 'Funções afins têm gráficos que são retas; o coeficiente a determina a inclinação.', { tipo: 'adaptada', ano: 2024, etapa: 'SIS/UEA', referencia: 'Questão adaptada ao formato/conteúdo programático do SIS/UEA 2024; não é transcrição literal', url: 'https://www.vunesp.com.br/UEAM2402' }),
  Q('sis-2024-adapt-02', 'SIS', 'Biologia', 'Médio', 'A organela celular associada à fotossíntese nas células vegetais é:', ['Mitocôndria.', 'Lisossomo.', 'Cloroplasto.', 'Complexo golgiense.'], 'C', 'Os cloroplastos contêm clorofila e realizam a fotossíntese.', { tipo: 'adaptada', ano: 2024, etapa: 'SIS/UEA', referencia: 'Questão adaptada ao formato/conteúdo programático do SIS/UEA 2024; não é transcrição literal', url: 'https://www.vunesp.com.br/UEAM2402' }),
  Q('sis-2025-adapt-01', 'SIS', 'Português', 'Difícil', 'Em um texto argumentativo, a tese corresponde:', ['À lista de referências bibliográficas.', 'À ideia central defendida pelo autor.', 'A qualquer exemplo secundário.', 'Ao título, obrigatoriamente.'], 'B', 'A tese é o posicionamento central que o texto procura defender por meio de argumentos.', { tipo: 'adaptada', ano: 2025, etapa: 'SIS/UEA', referencia: 'Questão autoral adaptada ao conteúdo programático do SIS/UEA 2024; não é transcrição literal', url: 'https://www.vunesp.com.br/UEAM2402' }),
  Q('sis-2025-adapt-02', 'SIS', 'Física', 'Difícil', 'No Sistema Internacional, a unidade de medida da força é:', ['Joule.', 'Watt.', 'Newton.', 'Pascal por segundo.'], 'C', 'A força é medida em newtons (N), equivalente a kg·m/s².', { tipo: 'adaptada', ano: 2025, etapa: 'SIS/UEA', referencia: 'Questão autoral adaptada ao conteúdo programático do SIS/UEA 2024; não é transcrição literal', url: 'https://www.vunesp.com.br/UEAM2402' }),
  Q('psc-2024-adapt-01', 'PSC', 'Química', 'Fácil', 'Uma solução com pH igual a 3 é classificada como:', ['Ácida.', 'Neutra.', 'Básica.', 'Metálica.'], 'A', 'Valores de pH inferiores a 7 indicam solução ácida, em condições usuais.', { tipo: 'adaptada', ano: 2024, etapa: 'PSC/UFAM', referencia: 'Repositório oficial de provas e gabaritos do PSC/UFAM', url: 'https://edoc.ufam.edu.br/handle/123456789/7950?locale=pt_BR' }),
  Q('psc-2024-adapt-02', 'PSC', 'História', 'Médio', 'A análise de uma fonte histórica exige considerar, entre outros fatores:', ['Apenas se o documento é antigo.', 'O contexto de produção, autoria e finalidade.', 'Somente a opinião atual do leitor.', 'Que toda fonte seja neutra.'], 'B', 'A contextualização, a autoria e a finalidade ajudam a interpretar criticamente uma fonte histórica.', { tipo: 'adaptada', ano: 2024, etapa: 'PSC/UFAM', referencia: 'Repositório oficial de provas e gabaritos do PSC/UFAM', url: 'https://edoc.ufam.edu.br/handle/123456789/7950?locale=pt_BR' }),
  Q('psc-2025-adapt-01', 'PSC', 'Matemática', 'Médio', 'Se 2x − 7 = 11, o valor de x é:', ['2', '7', '9', '18'], 'C', '2x = 18, portanto x = 9.', { tipo: 'adaptada', ano: 2025, etapa: 'PSC/UFAM', referencia: 'Repositório oficial de documentos do PSC/UFAM', url: 'https://edoc.ufam.edu.br/' }),
  Q('psc-2025-adapt-02', 'PSC', 'Geografia', 'Difícil', 'O desmatamento de florestas tropicais pode contribuir para:', ['Aumento da biodiversidade em todos os casos.', 'Redução da perda de solo.', 'Perda de habitats e alteração dos ciclos da água e do carbono.', 'Eliminação do efeito estufa.'], 'C', 'A retirada da cobertura vegetal pode destruir habitats, favorecer erosão e alterar ciclos biogeoquímicos.', { tipo: 'adaptada', ano: 2025, etapa: 'PSC/UFAM', referencia: 'Repositório oficial de documentos do PSC/UFAM', url: 'https://edoc.ufam.edu.br/' }),

  // ENEM — FÁCIL
  Q('enem-f-06', 'ENEM', 'Matemática', 'Fácil', 'Uma receita usa 2 xícaras de farinha para cada 3 ovos. Para fazer a receita com 9 ovos, quantas xícaras de farinha serão necessárias?', ['4 xícaras', '5 xícaras', '6 xícaras', '8 xícaras'], 'C', 'A proporção é 2 para 3. Com 9 ovos (3 vezes mais), usa-se 3 × 2 = 6 xícaras.'),
  Q('enem-f-07', 'ENEM', 'Matemática', 'Fácil', 'Um ônibus sai às 7h45 e chega ao destino às 10h15. Quanto tempo durou a viagem?', ['2h15min', '2h30min', '2h45min', '3h'], 'B', 'De 7h45 até 10h00 são 2h15min; somando mais 15 min até 10h15, temos 2h30min.'),
  Q('enem-f-08', 'ENEM', 'Português', 'Fácil', 'Em um cartaz com os dizeres “Doe sangue, salve vidas”, o uso do verbo no imperativo tem a função de:', ['Narrar um fato passado.', 'Fazer um apelo ao leitor.', 'Descrever um local.', 'Expressar uma dúvida.'], 'B', 'O imperativo é usado para dar ordens, conselhos ou apelos, como nas campanhas de conscientização.'),
  Q('enem-f-09', 'ENEM', 'Geografia', 'Fácil', 'Qual é o bioma predominante na região Norte do Brasil?', ['Caatinga', 'Cerrado', 'Floresta Amazônica', 'Pampa'], 'C', 'A Floresta Amazônica é o bioma predominante na região Norte do país.'),
  Q('enem-f-10', 'ENEM', 'Química', 'Fácil', 'A água (H₂O) é classificada como:', ['Substância simples', 'Substância composta', 'Mistura heterogênea', 'Elemento químico'], 'B', 'A água é formada por átomos de elementos diferentes (H e O), portanto é uma substância composta.'),

  // ENEM — MÉDIO
  Q('enem-m-06', 'ENEM', 'Matemática', 'Médio', 'Em uma pesquisa com 200 pessoas, 35% preferem o produto A. Quantas pessoas preferem o produto A?', ['55', '60', '70', '75'], 'C', '35% de 200 = 0,35 × 200 = 70 pessoas.'),
  Q('enem-m-07', 'ENEM', 'Matemática', 'Médio', 'A média aritmética das notas 6, 7, 8 e 11 é:', ['7', '8', '9', '10'], 'B', 'Soma = 32. Dividindo por 4 notas, a média é 8.'),
  Q('enem-m-08', 'ENEM', 'Português', 'Médio', 'Em “Embora estivesse cansado, Pedro terminou o trabalho”, a conjunção “embora” expressa ideia de:', ['Causa', 'Concessão', 'Conclusão', 'Tempo'], 'B', '“Embora” introduz uma concessão: um fato que poderia impedir a ação, mas não impediu.'),
  Q('enem-m-09', 'ENEM', 'História', 'Médio', 'A chegada da família real portuguesa ao Brasil, em 1808, teve como uma de suas consequências:', ['O fim da escravidão', 'A abertura dos portos às nações amigas', 'A Proclamação da República', 'A independência imediata do Brasil'], 'B', 'Em 1808, Dom João VI abriu os portos brasileiros às nações amigas, principalmente à Inglaterra.'),
  Q('enem-m-10', 'ENEM', 'Biologia', 'Médio', 'Qual processo permite que o DNA seja copiado antes da divisão celular?', ['Transcrição', 'Tradução', 'Replicação', 'Fotossíntese'], 'C', 'A replicação é o processo de duplicação do DNA que antecede a divisão celular.'),

  // ENEM — DIFÍCIL
  Q('enem-d-06', 'ENEM', 'Matemática', 'Difícil', 'Um capital de R$ 1.000,00 é aplicado a juros compostos de 10% ao mês. Após 2 meses, o montante será:', ['R$ 1.100,00', 'R$ 1.200,00', 'R$ 1.210,00', 'R$ 1.220,00'], 'C', 'M = 1000 × 1,1² = 1000 × 1,21 = R$ 1.210,00.'),
  Q('enem-d-07', 'ENEM', 'Matemática', 'Difícil', 'Lançando-se um dado honesto duas vezes, qual é a probabilidade de a soma dos resultados ser 7?', ['1/12', '1/9', '1/6', '1/4'], 'C', 'Há 6 combinações que somam 7 entre 36 possíveis: 6/36 = 1/6.'),
  Q('enem-d-08', 'ENEM', 'Português', 'Difícil', 'Em “A cidade que nunca dorme adormece, enfim, na madrugada”, o efeito de sentido decorre de:', ['Um paradoxo entre “nunca dormir” e o ato de “adormecer”.', 'Uma enumeração de elementos urbanos.', 'Uma citação direta de outro texto.', 'Um vocabulário técnico especializado.'], 'A', 'O trecho contrapõe a ideia de uma cidade que “nunca dorme” ao fato de ela adormecer, criando um paradoxo.'),
  Q('enem-d-09', 'ENEM', 'Português', 'Difícil', 'No trecho “A leitura amplia o vocabulário; logo, quem lê mais se comunica melhor”, o conectivo “logo” introduz:', ['Uma oposição', 'Uma conclusão', 'Uma condição', 'Uma comparação'], 'B', '“Logo”, nesse contexto, é conjunção conclusiva: apresenta a consequência do que foi dito antes.'),
  Q('enem-d-10', 'ENEM', 'Química', 'Difícil', 'Na reação 2 H₂ + O₂ → 2 H₂O, quantos mols de água são formados a partir de 3 mols de O₂ (com H₂ em excesso)?', ['3 mols', '4 mols', '6 mols', '9 mols'], 'C', 'Cada 1 mol de O₂ forma 2 mols de H₂O. Logo, 3 mols de O₂ formam 6 mols de H₂O.'),

  // PSC — FÁCIL
  Q('psc-f-06', 'PSC', 'Matemática', 'Fácil', 'Qual é o resultado de 7 × 8?', ['54', '56', '58', '64'], 'B', '7 × 8 = 56.'),
  Q('psc-f-07', 'PSC', 'Matemática', 'Fácil', 'O dobro de 35 é:', ['60', '65', '70', '75'], 'C', '35 × 2 = 70.'),
  Q('psc-f-08', 'PSC', 'Português', 'Fácil', 'Assinale a palavra escrita corretamente:', ['Exceção', 'Excessão', 'Esceção', 'Eceção'], 'A', 'A grafia correta é “exceção”, com “xc” e “ç”.'),
  Q('psc-f-09', 'PSC', 'História', 'Fácil', 'Quais povos habitavam o território brasileiro antes da chegada dos portugueses?', ['Os romanos', 'Os povos indígenas', 'Os vikings', 'Os astecas'], 'B', 'Antes de 1500, o território era habitado por diversos povos indígenas.'),
  Q('psc-f-10', 'PSC', 'Geografia', 'Fácil', 'Qual oceano banha a costa leste do Brasil?', ['Pacífico', 'Índico', 'Atlântico', 'Ártico'], 'C', 'O litoral brasileiro é banhado pelo Oceano Atlântico.'),

  // PSC — MÉDIO
  Q('psc-m-06', 'PSC', 'Matemática', 'Médio', 'Se 3x + 5 = 20, o valor de x é:', ['3', '4', '5', '6'], 'C', '3x = 15, logo x = 5.'),
  Q('psc-m-07', 'PSC', 'Matemática', 'Médio', 'A área de um retângulo de lados 8 m e 5 m é:', ['13 m²', '26 m²', '40 m²', '80 m²'], 'C', 'Área = base × altura = 8 × 5 = 40 m².'),
  Q('psc-m-08', 'PSC', 'Português', 'Médio', 'Em qual alternativa há um substantivo coletivo?', ['Aluno', 'Cardume', 'Peixe', 'Rio'], 'B', '“Cardume” designa um conjunto de peixes, por isso é substantivo coletivo.'),
  Q('psc-m-09', 'PSC', 'Português', 'Médio', 'Na frase “Choveu muito ontem”, o verbo está no tempo:', ['Presente', 'Futuro do presente', 'Pretérito imperfeito', 'Pretérito perfeito'], 'D', '“Choveu” indica ação concluída no passado: pretérito perfeito do indicativo.'),
  Q('psc-m-10', 'PSC', 'Química', 'Médio', 'O símbolo químico do sódio é:', ['S', 'So', 'Na', 'Sd'], 'C', 'O símbolo do sódio é Na, do latim “natrium”.'),

  // PSC — DIFÍCIL
  Q('psc-d-06', 'PSC', 'Matemática', 'Difícil', 'As raízes da equação x² − 5x + 6 = 0 são:', ['1 e 6', '2 e 3', '−2 e −3', '1 e 5'], 'B', 'Soma = 5 e produto = 6, portanto as raízes são 2 e 3.'),
  Q('psc-d-07', 'PSC', 'Matemática', 'Difícil', 'Um triângulo retângulo tem catetos medindo 6 cm e 8 cm. Sua hipotenusa mede:', ['9 cm', '10 cm', '12 cm', '14 cm'], 'B', 'Pelo Teorema de Pitágoras: √(6² + 8²) = √100 = 10 cm.'),
  Q('psc-d-08', 'PSC', 'Matemática', 'Difícil', 'O valor de log₂ 32 é:', ['4', '5', '6', '16'], 'B', 'Como 2⁵ = 32, log₂ 32 = 5.'),
  Q('psc-d-09', 'PSC', 'Português', 'Difícil', 'Em “Os livros que comprei são interessantes”, a palavra “que” é:', ['Conjunção integrante', 'Pronome relativo', 'Advérbio', 'Preposição'], 'B', '“Que” retoma “os livros” e introduz uma oração adjetiva: é pronome relativo.'),
  Q('psc-d-10', 'PSC', 'Física', 'Difícil', 'Um corpo em queda livre (g = 10 m/s²), partindo do repouso, atinge qual velocidade após 3 s?', ['10 m/s', '20 m/s', '30 m/s', '45 m/s'], 'C', 'v = g × t = 10 × 3 = 30 m/s.'),

  // SIS — FÁCIL
  Q('sis-f-06', 'SIS', 'Matemática', 'Fácil', 'Quanto é 120 ÷ 4?', ['20', '25', '30', '40'], 'C', '120 ÷ 4 = 30.'),
  Q('sis-f-07', 'SIS', 'Matemática', 'Fácil', 'Um quarto (1/4) de 80 é igual a:', ['10', '20', '25', '40'], 'B', '80 ÷ 4 = 20.'),
  Q('sis-f-08', 'SIS', 'Português', 'Fácil', 'Qual é o plural da palavra “cidadão”?', ['Cidadões', 'Cidadãos', 'Cidadães', 'Cidadans'], 'B', 'O plural de “cidadão” é “cidadãos”.'),
  Q('sis-f-09', 'SIS', 'Biologia', 'Fácil', 'Qual órgão é responsável por bombear o sangue no corpo humano?', ['Pulmão', 'Fígado', 'Coração', 'Rim'], 'C', 'O coração bombeia o sangue por todo o corpo.'),
  Q('sis-f-10', 'SIS', 'Geografia', 'Fácil', 'O Rio Amazonas deságua em qual oceano?', ['Pacífico', 'Atlântico', 'Índico', 'Glacial Ártico'], 'B', 'O Rio Amazonas deságua no Oceano Atlântico, no litoral norte do Brasil.'),

  // SIS — MÉDIO
  Q('sis-m-06', 'SIS', 'Matemática', 'Médio', 'Um produto de R$ 150,00 é vendido com 20% de desconto. Qual é o preço final?', ['R$ 120,00', 'R$ 125,00', 'R$ 130,00', 'R$ 135,00'], 'A', '20% de 150 = 30. Logo, 150 − 30 = R$ 120,00.'),
  Q('sis-m-07', 'SIS', 'Matemática', 'Médio', 'Se o perímetro de um quadrado é 36 cm, cada lado mede:', ['6 cm', '8 cm', '9 cm', '12 cm'], 'C', 'O quadrado tem 4 lados iguais: 36 ÷ 4 = 9 cm.'),
  Q('sis-m-08', 'SIS', 'Português', 'Médio', 'Assinale a alternativa em que o uso da crase está correto:', ['Vou à pé para a escola.', 'Fui à escola de manhã.', 'Ele começou à correr.', 'Entreguei o livro à ele.'], 'B', 'Há crase em “à escola” (preposição “a” + artigo “a”). Nas demais, não há artigo feminino.'),
  Q('sis-m-09', 'SIS', 'Português', 'Médio', 'Qual das palavras abaixo é proparoxítona?', ['Café', 'Amigo', 'Lâmpada', 'Jardim'], 'C', '“Lâmpada” tem a sílaba tônica na antepenúltima sílaba (LÂM-pa-da).'),
  Q('sis-m-10', 'SIS', 'Química', 'Médio', 'O gás essencial para a respiração dos seres humanos é:', ['Nitrogênio', 'Gás carbônico', 'Oxigênio', 'Hidrogênio'], 'C', 'O oxigênio (O₂) é utilizado na respiração celular.'),

  // SIS — DIFÍCIL
  Q('sis-d-06', 'SIS', 'Matemática', 'Difícil', 'A soma dos 10 primeiros termos da PA (2, 4, 6, ...) é:', ['55', '100', '110', '120'], 'C', 'a₁₀ = 20. S = 10 × (2 + 20) ÷ 2 = 110.'),
  Q('sis-d-07', 'SIS', 'Matemática', 'Difícil', 'Se f(x) = 2x + 3, então f(5) é igual a:', ['10', '11', '13', '15'], 'C', 'f(5) = 2 × 5 + 3 = 13.'),
  Q('sis-d-08', 'SIS', 'Matemática', 'Difícil', 'Uma urna tem 3 bolas vermelhas e 7 azuis. A probabilidade de sortear uma bola vermelha é:', ['3/7', '3/10', '7/10', '1/3'], 'B', 'Casos favoráveis = 3; total = 10. Probabilidade = 3/10.'),
  Q('sis-d-09', 'SIS', 'Português', 'Difícil', 'Em “Fez tudo conforme as regras”, o termo “conforme” estabelece relação de:', ['Conformidade', 'Oposição', 'Causa', 'Finalidade'], 'A', '“Conforme” é conjunção/preposição conformativa: indica que algo foi feito de acordo com outra coisa.'),
  Q('sis-d-10', 'SIS', 'Física', 'Difícil', 'A energia cinética de um corpo de 2 kg com velocidade de 3 m/s é:', ['3 J', '6 J', '9 J', '18 J'], 'C', 'Ec = ½ × m × v² = ½ × 2 × 9 = 9 J.'),
];

// Cada questão pode ter uma "fonte" oficial. Exemplo para questões reais:
// fonte: { ano: 2024, caderno: 'Azul', numero: 91 }
// Sem "fonte", o app mostra "Questão autoral • estilo ENEM/PSC/SIS".
const quizQuestions = [...baseQuestions, ...extraQuestions];

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

const getFiveQuestions = (questions) => {
  return shuffleArray(questions).slice(0, QUESTIONS_PER_QUIZ);
};

const pad2 = (n) => String(n).padStart(2, '0');
const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateKey(d);
};

const freshDaily = () => ({ date: dateKey(), progress: {}, done: {} });
const getDaily = (user) => (user?.daily && user.daily.date === dateKey() ? user.daily : freshDaily());

// Texto de origem da questão (ano + caderno quando for questão oficial)
const getFonteLabel = (q) => {
  if (q.fonte?.tipo === 'adaptada') {
    const etapa = q.fonte.etapa ? ` • ${q.fonte.etapa}` : '';
    const numero = q.fonte.numero ? ` • questão original ${q.fonte.numero}` : '';
    const caderno = q.fonte.caderno ? ` • ${q.fonte.caderno}` : '';
    return `Questão adaptada • ${q.vestibular} ${q.fonte.ano}${etapa}${numero}${caderno} • ${q.fonte.referencia}`;
  }
  if (q.fonte) {
    const numero = q.fonte.numero ? ` • Questão ${q.fonte.numero}` : '';
    return `${q.vestibular} ${q.fonte.ano} • Caderno ${q.fonte.caderno}${numero}`;
  }
  return `Questão autoral • estilo ${q.vestibular}`;
};

const getUserStats = (user) => {
  const history = user?.history || [];
  const totalQuizzes = history.length;
  const totalCorrect = history.reduce((s, h) => s + (h.correct || 0), 0);
  const totalQuestions = history.reduce((s, h) => s + (h.answered ?? h.total ?? 0), 0);
  const perfectQuizzes = history.filter(h => h.total > 0 && h.correct === h.total).length;
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  return {
    totalQuizzes,
    totalCorrect,
    totalWrong: Math.max(totalQuestions - totalCorrect, 0),
    perfectQuizzes,
    accuracy,
  };
};

const defaultAvatar = {
  skin: '#C98B5A',
  hair: '#241A17',
  paint: '#E85D5D',
  accessory: 'none',
  clothes: 'green',
};

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

const ProgressBar = ({ current, max, color = COLORS.yellow }) => {
  const percent = max > 0 ? Math.min(Math.max((current / max) * 100, 0), 100) : 0;
  return (
    <View style={styles.progressBg}>
      <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: color }]} />
    </View>
  );
};

// Avatar Redesenhado e Mais Bonito
const AvatarDisplay = ({ avatar = defaultAvatar, size = 'normal' }) => {
  const isSmall = size === 'small';
  const scale = isSmall ? 0.65 : 1;
  const headSize = 118 * scale;

  const clothesColor =
    avatar.clothes === 'blue'
      ? '#3D8FC4'
      : avatar.clothes === 'orange'
      ? '#D87824'
      : avatar.clothes === 'purple'
      ? '#7955A6'
      : '#26795F';

  return (
    <View style={[styles.avatarStage, { transform: [{ scale }] }]}>
      {/* Sombra de Fundo do Avatar */}
      <View style={styles.avatarShadow} />

      {/* Orelhas */}
      <View style={[styles.avatarEar, styles.avatarEarLeft, { backgroundColor: avatar.skin }]} />
      <View style={[styles.avatarEar, styles.avatarEarRight, { backgroundColor: avatar.skin }]} />

      {/* Pescoço */}
      <View style={[styles.avatarNeck, { backgroundColor: avatar.skin }]} />

      {/* Corpo / Roupa */}
      <View style={[styles.avatarBodyNew, { backgroundColor: clothesColor }]}>
        <View style={styles.avatarShirtHighlight} />
      </View>
      <View style={[styles.avatarArm, styles.avatarArmLeft, { backgroundColor: clothesColor }]} />
      <View style={[styles.avatarArm, styles.avatarArmRight, { backgroundColor: clothesColor }]} />

      {/* Cabeça */}
      <View style={[styles.avatarHead, { width: headSize, height: headSize, borderRadius: headSize / 2, backgroundColor: avatar.skin }]}>
        {/* Cabelo */}
        <View style={[styles.avatarHairCap, { backgroundColor: avatar.hair }]}>
          <View style={[styles.hairStrandLeft, { backgroundColor: avatar.hair }]} />
          <View style={[styles.hairStrandRight, { backgroundColor: avatar.hair }]} />
        </View>

        {/* Sobrancelhas Expressivas */}
        <View style={styles.avatarEyebrowLeft} />
        <View style={styles.avatarEyebrowRight} />

        {/* Olhos estilo Mascotinho */}
        <View style={styles.avatarEyeLeft}>
          <View style={styles.avatarEyePupil} />
          <View style={styles.avatarEyeSparkle} />
        </View>
        <View style={styles.avatarEyeRight}>
          <View style={styles.avatarEyePupil} />
          <View style={styles.avatarEyeSparkle} />
        </View>

        {/* Pintura Facial */}
        {avatar.paint !== 'none' && <View style={[styles.avatarPaintMark, { backgroundColor: avatar.paint }]} />}

        {/* Bochechas Rosadas */}
        <View style={styles.avatarCheekLeft} />
        <View style={styles.avatarCheekRight} />

        {/* Sorriso */}
        <View style={styles.avatarSmile} />
      </View>

      {/* Acessório: Óculos Estilosos */}
      {avatar.accessory === 'glasses' && (
        <View style={styles.glassesContainer}>
          <View style={styles.glassFrame} />
          <View style={styles.glassBridge} />
          <View style={styles.glassFrame} />
        </View>
      )}

      {/* Acessório: Cocar Indígena */}
      {avatar.accessory === 'cocar' && (
        <View style={styles.featherCrown}>
          <View style={[styles.feather, styles.feather1]} />
          <View style={[styles.feather, styles.feather2]} />
          <View style={[styles.feather, styles.feather3]} />
          <View style={[styles.feather, styles.feather4]} />
          <View style={[styles.feather, styles.feather5]} />
          <View style={styles.crownBand} />
        </View>
      )}

      {/* Acessório: Colar */}
      {avatar.accessory === 'necklace' && (
        <View style={styles.necklace}>
          <View style={styles.necklaceLine} />
          <View style={[styles.necklaceBead, { left: 4, top: 15, backgroundColor: '#F5C542' }]} />
          <View style={[styles.necklaceBead, { left: 18, top: 23, backgroundColor: '#E85D5D' }]} />
          <View style={[styles.necklaceBead, { left: 34, top: 27, backgroundColor: '#4EA8DE' }]} />
          <View style={[styles.necklaceBead, { left: 50, top: 23, backgroundColor: '#49B675' }]} />
          <View style={[styles.necklaceBead, { left: 64, top: 15, backgroundColor: '#F5C542' }]} />
        </View>
      )}
    </View>
  );
};

// ============================================================
// APLICAÇÃO PRINCIPAL
// ============================================================

export default function App() {
  const [screen, setScreen] = useState('login');
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

  // Form Login/Cadastro
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerGrade, setRegisterGrade] = useState('');
  const [registerUF, setRegisterUF] = useState('');

  // Estados para Edição do Perfil
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [editUF, setEditUF] = useState('');

  // Config do Quiz
  const [gameMode, setGameMode] = useState('Vestibulares');
  const [selectedVestibular, setSelectedVestibular] = useState('ENEM');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Fácil');
  const [selectedSubjectMode, setSelectedSubjectMode] = useState('Principais');

  // Editor visual do avatar
  const [avatarEditorVisible, setAvatarEditorVisible] = useState(false);
  const [draftAvatar, setDraftAvatar] = useState(defaultAvatar);
  const [quizQuestionsState, setQuizQuestionsState] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Leitura por Áudio (Text-to-Speech)
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Resultados e Cronômetro
  const [timeLeft, setTimeLeft] = useState(CHALLENGE_INITIAL_TIME);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [earnedXP, setEarnedXP] = useState(0);
  const quizAnswersRef = useRef([]);

  // Gabarito do último quiz, metas concluídas e bônus
  const [quizReview, setQuizReview] = useState([]);
  const [completedTasksNow, setCompletedTasksNow] = useState([]);
  const [bonusXP, setBonusXP] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);

  useEffect(() => {
    loadAppData();
    return () => {
      Speech.stop();
    };
  }, []);

  const loadAppData = async () => {
    try {
      const savedUsers = await AsyncStorage.getItem('@vdf_users');
      const savedCurrentUser = await AsyncStorage.getItem('@vdf_current_user');

      if (savedUsers) setUsers(JSON.parse(savedUsers));
      if (savedCurrentUser) {
        const parsed = JSON.parse(savedCurrentUser);
        setCurrentUser(parsed);
        initEditFields(parsed);
        setScreen('dashboard');
      }
    } catch (e) {
      console.log('Erro ao carregar os dados:', e);
    }
  };

  const initEditFields = (user) => {
    if (!user) return;
    setEditName(user.name || '');
    setEditEmail(user.email || '');
    setEditGrade(user.grade || '');
    setEditUF(user.uf || '');
  };

  const saveUsers = async (newUsers) => {
    try {
      await AsyncStorage.setItem('@vdf_users', JSON.stringify(newUsers));
      setUsers(newUsers);
    } catch (e) {
      console.log('Erro ao salvar os usuários:', e);
    }
  };

  const updateCurrentUser = async (updatedData) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, ...updatedData };
    const updatedUsers = users.map(u => u.id === currentUser.id ? updatedUser : u);

    setCurrentUser(updatedUser);
    setUsers(updatedUsers);

    await AsyncStorage.setItem('@vdf_users', JSON.stringify(updatedUsers));
    await AsyncStorage.setItem('@vdf_current_user', JSON.stringify(updatedUser));
  };

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      Alert.alert('Atenção', 'Preencha o e-mail e a senha.');
      return;
    }
    const foundUser = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase() && u.password === loginPassword);
    if (!foundUser) {
      Alert.alert('Erro', 'E-mail ou senha incorretos.');
      return;
    }

    await AsyncStorage.setItem('@vdf_current_user', JSON.stringify(foundUser));
    setCurrentUser(foundUser);
    initEditFields(foundUser);
    setLoginEmail('');
    setLoginPassword('');
    setScreen('dashboard');
  };

  const handleRegister = async () => {
    if (!registerName || !registerEmail || !registerPassword) {
      Alert.alert('Atenção', 'Preencha os campos obrigatórios.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === registerEmail.toLowerCase())) {
      Alert.alert('Erro', 'Este e-mail já está cadastrado.');
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      name: registerName,
      email: registerEmail,
      password: registerPassword,
      grade: registerGrade,
      uf: registerUF,
      points: 0,
      xp: 0,
      level: 1,
      streak: 1,
      avatar: { ...defaultAvatar },
      history: [],
      daily: freshDaily(),
      lastStudy: null,
    };

    const newUsers = [...users, newUser];
    await saveUsers(newUsers);
    await AsyncStorage.setItem('@vdf_current_user', JSON.stringify(newUser));

    setCurrentUser(newUser);
    initEditFields(newUser);
    setRegisterName('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterGrade('');
    setRegisterUF('');
    setScreen('dashboard');
  };

  const handleSaveProfileEdits = async () => {
    const normalizedEmail = editEmail.trim().toLowerCase();

    if (!editName.trim() || !normalizedEmail) {
      Alert.alert('Atenção', 'Nome e e-mail são obrigatórios.');
      return;
    }

    const emailInUse = users.some(
      u => u.id !== currentUser?.id && (u.email || '').toLowerCase() === normalizedEmail
    );

    if (emailInUse) {
      Alert.alert('Erro', 'Este e-mail já está sendo usado por outra conta.');
      return;
    }

    await updateCurrentUser({
      name: editName.trim(),
      email: normalizedEmail,
      grade: editGrade.trim(),
      uf: editUF.trim().toUpperCase(),
    });

    Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    setScreen('dashboard');
  };

  const handleSocialLogin = (provider) => {
    Alert.alert('Login Social', `Opção de login com ${provider} acionada.`);
  };

  const handleLogout = async () => {
    stopSpeech();
    setProfileModalVisible(false);
    await AsyncStorage.removeItem('@vdf_current_user');
    setCurrentUser(null);
    setScreen('login');
  };

  const changeAvatar = async (newAvatar) => {
    await updateCurrentUser({ avatar: newAvatar });
  };

  const openAvatarEditor = () => {
    setDraftAvatar({ ...(currentUser?.avatar || defaultAvatar) });
    setAvatarEditorVisible(true);
  };

  const saveAvatarEditor = async () => {
    await changeAvatar(draftAvatar);
    setAvatarEditorVisible(false);
    Alert.alert('Avatar atualizado', 'Seu novo avatar foi salvo no perfil.');
  };

  const updateDraftAvatar = (key, value) => {
    setDraftAvatar(prev => ({ ...prev, [key]: value }));
  };

  // Funções de leitura por Voz (Text to Speech)
  const speakQuestion = (questionObj) => {
    Speech.stop();
    setIsSpeaking(true);

    const optionsText = questionObj.options
      .map((opt, idx) => `Opção ${String.fromCharCode(65 + idx)}: ${opt}`)
      .join('. ');

    const fullTextToRead = `Enunciado: ${questionObj.statement}. Alternativas: ${optionsText}`;

    Speech.speak(fullTextToRead, {
      language: 'pt-BR',
      pitch: 1.0,
      rate: 0.95,
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  const stopSpeech = () => {
    Speech.stop();
    setIsSpeaking(false);
  };

  const startQuiz = (modeOverride = null) => {
    stopSpeech();
    const mode = modeOverride || gameMode;
    setGameMode(mode);

    const isPriority = (q) => q.subject === 'Português' || q.subject === 'Matemática';
    let filtered = [...quizQuestions];

    if (mode === 'Vestibulares') {
      // Pool do vestibular + dificuldade escolhidos
      const pool = quizQuestions.filter(
        q => q.vestibular === selectedVestibular && q.difficulty === selectedDifficulty
      );
      // "Principais" = Português/Matemática primeiro; "Outras" = demais matérias primeiro
      const wantPriority = selectedSubjectMode === 'Principais';
      const wanted = shuffleArray(pool.filter(q => isPriority(q) === wantPriority));
      const rest = shuffleArray(pool.filter(q => isPriority(q) !== wantPriority));
      filtered = [...wanted, ...rest];
    } else if (mode === 'Simulado') {
      filtered = quizQuestions.filter(q => q.vestibular === selectedVestibular);
    }

    // Nunca deixa o quiz com menos de 5 questões
    if (filtered.length < QUESTIONS_PER_QUIZ) {
      const extras = shuffleArray(quizQuestions.filter(q => !filtered.includes(q)));
      filtered = [...filtered, ...extras];
    }

    const selected = mode === 'Vestibulares'
      ? shuffleArray(filtered.slice(0, QUESTIONS_PER_QUIZ))
      : getFiveQuestions(filtered);
    setQuizQuestionsState(selected);
    setCurrentQIndex(0);
    setSelectedAnswer(null);
    setIsConfirmed(false);
    quizAnswersRef.current = [];

    if (mode === 'Desafio') {
      setTimeLeft(CHALLENGE_INITIAL_TIME);
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }

    setScreen('quiz');
  };

  useEffect(() => {
    if (!isTimerRunning || gameMode !== 'Desafio') return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsTimerRunning(false);
          finishQuiz();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, gameMode]);

  const handleConfirmAnswer = () => {
    if (!selectedAnswer || isConfirmed) return;
    stopSpeech();

    const currentQ = quizQuestionsState[currentQIndex];
    const optionLetter = String.fromCharCode(65 + currentQ.options.indexOf(selectedAnswer));
    const isCorrect = optionLetter === currentQ.correctAnswer;

    quizAnswersRef.current.push({
      questionId: currentQ.id,
      isCorrect,
      picked: optionLetter,
      correct: currentQ.correctAnswer,
    });

    if (gameMode === 'Desafio') {
      if (isCorrect) {
        setTimeLeft(prev => Math.min(99, prev + CHALLENGE_CORRECT_BONUS));
      } else {
        setTimeLeft(prev => Math.max(0, prev - CHALLENGE_WRONG_PENALTY));
      }
    }

    setIsConfirmed(true);
  };

  const handleNextQuestion = () => {
    stopSpeech();
    if (currentQIndex + 1 < quizQuestionsState.length) {
      setCurrentQIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setIsConfirmed(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    stopSpeech();
    setIsTimerRunning(false);
    const answers = quizAnswersRef.current;
    const totalCorrect = answers.filter(a => a.isCorrect).length;
    const xpGained = totalCorrect * XP_PER_CORRECT;

    // Gabarito detalhado: uma linha por questão (certa, errada ou em branco)
    const review = quizQuestionsState.map((q, i) => {
      const a = answers[i];
      return {
        n: i + 1,
        id: q.id,
        subject: q.subject,
        statement: q.statement,
        explanation: q.explanation,
        fonte: getFonteLabel(q),
        picked: a ? a.picked : null,
        correct: q.correctAnswer,
        status: !a ? 'blank' : a.isCorrect ? 'right' : 'wrong',
      };
    });

    setQuizReview(review);
    setCorrectCount(totalCorrect);
    setEarnedXP(xpGained);
    setBonusXP(0);
    setCompletedTasksNow([]);
    setLeveledUp(false);

    if (currentUser) {
      const totalQuestions = quizQuestionsState.length;
      const isPerfect = totalQuestions > 0 && totalCorrect === totalQuestions;
      const mathPtAnswered = review.filter(
        r => r.status !== 'blank' && (r.subject === 'Português' || r.subject === 'Matemática')
      ).length;

      // Progresso das metas diárias
      const increments = {
        quiz1: 1,
        correct5: totalCorrect,
        mathpt: mathPtAnswered,
        challenge: gameMode === 'Desafio' ? 1 : 0,
        hard: gameMode === 'Vestibulares' && selectedDifficulty === 'Difícil' ? 1 : 0,
        perfect: isPerfect ? 1 : 0,
      };

      const daily = getDaily(currentUser);
      const progress = { ...daily.progress };
      const done = { ...daily.done };
      const justCompleted = [];
      let bonus = 0;

      DAILY_TASKS.forEach(task => {
        progress[task.id] = Math.min(task.goal, (progress[task.id] || 0) + (increments[task.id] || 0));
        if (!done[task.id] && progress[task.id] >= task.goal) {
          done[task.id] = true;
          justCompleted.push(task);
          bonus += task.xp;
        }
      });

      // Sequência de dias estudando
      const today = dateKey();
      let streak = currentUser.streak || 1;
      if (currentUser.lastStudy !== today) {
        streak = currentUser.lastStudy === yesterdayKey() ? streak + 1 : 1;
      }

      const totalGain = xpGained + bonus;
      const newXP = (currentUser.xp || 0) + totalGain;
      const newPoints = (currentUser.points || 0) + totalGain;
      const newLevel = Math.min(Math.floor(newXP / 100) + 1, MAX_LEVEL);

      const historyEntry = {
        id: Date.now().toString(),
        mode: gameMode,
        vestibular: selectedVestibular,
        difficulty: gameMode === 'Vestibulares' ? selectedDifficulty : null,
        correct: totalCorrect,
        total: totalQuestions,
        answered: answers.length,
        marks: review.map(r => r.status),
        xp: totalGain,
        date: new Date().toLocaleDateString('pt-BR'),
      };

      setBonusXP(bonus);
      setCompletedTasksNow(justCompleted);
      setLeveledUp(newLevel > (currentUser.level || 1));

      await updateCurrentUser({
        xp: newXP,
        points: newPoints,
        level: newLevel,
        streak,
        lastStudy: today,
        daily: { date: today, progress, done },
        history: [historyEntry, ...(currentUser.history || [])],
      });
    }

    setScreen('result');
  };

  // ============================================================
  // RENDERIZAÇÃO DE NAVEGAÇÃO E HEADER
  // ============================================================

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>🌿 VOZ DO FUTURO</Text>
      
      {/* Botão de Perfil Duolingo no Header */}
      <TouchableOpacity 
        style={styles.profileHeaderBtn} 
        onPress={() => setProfileModalVisible(true)}
      >
        <View style={styles.headerAvatarWrapper}>
          <AvatarDisplay avatar={currentUser?.avatar} size="small" />
        </View>
        <View style={styles.headerStatsGroup}>
          <Text style={styles.headerStreakText}>🔥 {currentUser?.streak || 1}d</Text>
          <Text style={styles.headerXpText}>⭐ {currentUser?.points || 0} XP</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderNav = () => (
    <View style={styles.navBar}>
      <TouchableOpacity onPress={() => { stopSpeech(); setIsTimerRunning(false); setScreen('dashboard'); }}>
        <Text style={styles.navItem}>🏠 Início</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { stopSpeech(); setIsTimerRunning(false); setScreen('studySetup'); }}>
        <Text style={styles.navItem}>📚 Estudar</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { stopSpeech(); setIsTimerRunning(false); setScreen('ranking'); }}>
        <Text style={styles.navItem}>🏆 Ranking</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => { stopSpeech(); setIsTimerRunning(false); setScreen('history'); }}>
        <Text style={styles.navItem}>📊 Histórico</Text>
      </TouchableOpacity>
    </View>
  );

  // Perfil compacto + editor de avatar separado
  const renderProfileModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={profileModalVisible}
      onRequestClose={() => setProfileModalVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setProfileModalVisible(false)}
      >
        <TouchableOpacity activeOpacity={1} style={styles.profileDropdownCard}>
          <View style={styles.profileModalAvatarWrap}>
            <AvatarDisplay avatar={currentUser?.avatar} />
            <View style={styles.profileLevelBadge}>
              <Text style={styles.profileLevelBadgeText}>Nível {currentUser?.level || 1}</Text>
            </View>
          </View>

          <Text style={styles.dropdownName}>{currentUser?.name || 'Usuário'}</Text>
          <Text style={styles.dropdownEmail}>{currentUser?.email || ''}</Text>

          <View style={styles.profileMiniStats}>
            <View style={styles.profileMiniStat}>
              <Text style={styles.profileMiniValue}>{currentUser?.xp || 0}</Text>
              <Text style={styles.profileMiniLabel}>XP</Text>
            </View>
            <View style={styles.profileMiniDivider} />
            <View style={styles.profileMiniStat}>
              <Text style={styles.profileMiniValue}>{currentUser?.streak || 1}</Text>
              <Text style={styles.profileMiniLabel}>Dias</Text>
            </View>
            <View style={styles.profileMiniDivider} />
            <View style={styles.profileMiniStat}>
              <Text style={styles.profileMiniValue}>{(currentUser?.history || []).length}</Text>
              <Text style={styles.profileMiniLabel}>Quizzes</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.profileActionBtn, { backgroundColor: COLORS.blue }]}
            onPress={() => {
              setProfileModalVisible(false);
              initEditFields(currentUser);
              setScreen('profileEdit');
            }}
          >
            <Text style={styles.profileActionText}>✏️ Editar informações</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.profileActionBtn, { backgroundColor: COLORS.purple }]}
            onPress={() => {
              setProfileModalVisible(false);
              openAvatarEditor();
            }}
          >
            <Text style={styles.profileActionText}>🎨 Personalizar meu avatar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.duoLogoutBtn} onPress={handleLogout}>
            <Text style={styles.duoLogoutBtnText}>SAIR DA CONTA</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  const renderAvatarEditorModal = () => {
    const skinOptions = ['#C98B5A', '#F1C27D', '#8D5524', '#FFDBAC', '#E0AC69'];
    const hairOptions = ['#241A17', '#061311', '#5A3825', '#F5C542', '#E85D5D'];
    const paintOptions = ['none', '#E85D5D', '#4EA8DE', '#49B675', '#F5C542'];
    const accessoryOptions = ['none', 'glasses', 'cocar', 'necklace'];
    const clothesOptions = ['green', 'blue', 'orange', 'purple'];

    const ChoiceRow = ({ title, values, keyName }) => (
      <View style={styles.avatarEditorSection}>
        <Text style={styles.avatarEditorLabel}>{title}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {values.map((value) => {
            const selected = draftAvatar[keyName] === value;
            const isColor = keyName !== 'accessory' && keyName !== 'clothes';
            return (
              <TouchableOpacity
                key={value}
                style={[
                  styles.avatarChoice,
                  selected && styles.avatarChoiceSelected,
                  isColor && { backgroundColor: value === 'none' ? COLORS.bgSec : value }
                ]}
                onPress={() => updateDraftAvatar(keyName, value)}
              >
                {isColor ? (
                  value === 'none'
                    ? <Text style={styles.avatarChoiceText}>✕</Text>
                    : null
                ) : (
                  <Text style={styles.avatarChoiceText}>
                    {keyName === 'accessory'
                      ? ({ none: '✕', glasses: '👓', cocar: '🪶', necklace: '📿' }[value])
                      : ({ green: '🟢', blue: '🔵', orange: '🟠', purple: '🟣' }[value])}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={avatarEditorVisible}
        onRequestClose={() => setAvatarEditorVisible(false)}
      >
        <View style={styles.avatarEditorOverlay}>
          <View style={styles.avatarEditorCard}>
            <View style={styles.avatarEditorHeader}>
              <View>
                <Text style={styles.avatarEditorTitle}>Personalizar avatar</Text>
                <Text style={styles.avatarEditorSubtitle}>Monte um visual do seu jeito</Text>
              </View>
              <TouchableOpacity onPress={() => setAvatarEditorVisible(false)} style={styles.closeCircle}>
                <Text style={styles.closeCircleText}>×</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.avatarPreviewCard}>
              <AvatarDisplay avatar={draftAvatar} />
            </View>

            <ScrollView style={styles.avatarEditorScroll} showsVerticalScrollIndicator={false}>
              <ChoiceRow title="Tom de pele" values={skinOptions} keyName="skin" />
              <ChoiceRow title="Cabelo" values={hairOptions} keyName="hair" />
              <ChoiceRow title="Pintura facial" values={paintOptions} keyName="paint" />
              <ChoiceRow title="Acessório" values={accessoryOptions} keyName="accessory" />
              <ChoiceRow title="Roupa" values={clothesOptions} keyName="clothes" />
            </ScrollView>

            <View style={styles.avatarEditorButtons}>
              <TouchableOpacity
                style={[styles.avatarEditorBtn, { backgroundColor: COLORS.bgSec }]}
                onPress={() => setAvatarEditorVisible(false)}
              >
                <Text style={styles.avatarEditorCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.avatarEditorBtn, { backgroundColor: COLORS.green }]}
                onPress={saveAvatarEditor}
              >
                <Text style={styles.avatarEditorSaveText}>✓ Salvar avatar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Metas / tarefas diárias
  const renderDailyTasks = () => {
    const daily = getDaily(currentUser);
    const doneCount = DAILY_TASKS.filter(t => daily.done[t.id]).length;
    const totalXP = DAILY_TASKS.reduce((s, t) => s + t.xp, 0);
    const earnedToday = DAILY_TASKS.filter(t => daily.done[t.id]).reduce((s, t) => s + t.xp, 0);

    return (
      <View style={styles.dailyCard}>
        <View style={styles.dailyHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.dailyTitle}>🎯 Metas diárias</Text>
            <Text style={styles.dailySub}>
              {doneCount}/{DAILY_TASKS.length} concluídas • {earnedToday}/{totalXP} XP bônus hoje
            </Text>
          </View>
          {doneCount === DAILY_TASKS.length ? <Text style={styles.dailyAllDone}>🏆</Text> : null}
        </View>
        <ProgressBar current={doneCount} max={DAILY_TASKS.length} color={COLORS.green} />

        {DAILY_TASKS.map(task => {
          const done = !!daily.done[task.id];
          const prog = Math.min(task.goal, daily.progress[task.id] || 0);
          return (
            <View key={task.id} style={[styles.taskRow, done && styles.taskRowDone]}>
              <View style={[styles.taskCheck, done && styles.taskCheckDone]}>
                <Text style={styles.taskCheckText}>{done ? '✓' : task.icon}</Text>
              </View>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.taskTitle, done && styles.taskTitleDone]}>{task.title}</Text>
                {done ? (
                  <Text style={styles.taskStatusDone}>Tarefa concluída!</Text>
                ) : (
                  <View style={{ marginTop: 4 }}>
                    <ProgressBar current={prog} max={task.goal} color={COLORS.blue} />
                    <Text style={styles.taskProgText}>{prog}/{task.goal}</Text>
                  </View>
                )}
              </View>
              <View style={[styles.taskXpBadge, done && styles.taskXpBadgeDone]}>
                <Text style={styles.taskXpText}>{done ? '✓ ' : ''}+{task.xp} XP</Text>
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // ============================================================
  // TELAS DA APLICAÇÃO
  // ============================================================

  if (screen === 'login') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.authBox}>
          <Text style={styles.logoTitle}>🏹 VOZ DO FUTURO</Text>
          <Text style={styles.subTitle}>Plataforma Educacional Gamificada</Text>

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={COLORS.textSec}
            value={loginEmail}
            onChangeText={setLoginEmail}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            placeholderTextColor={COLORS.textSec}
            secureTextEntry
            value={loginPassword}
            onChangeText={setLoginPassword}
          />

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.yellow }]} onPress={handleLogin}>
            <Text style={[styles.btnText, { color: COLORS.black }]}>Entrar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.card, marginTop: 10 }]} onPress={() => setScreen('register')}>
            <Text style={[styles.btnText, { color: COLORS.white }]}>Criar Conta</Text>
          </TouchableOpacity>

          {/* Opções de Login Social */}
          <Text style={styles.socialDivider}>— OU ENTRE COM —</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Google')}>
              <Text style={styles.socialBtnText}>🌐 Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Apple')}>
              <Text style={styles.socialBtnText}>🍎 Apple</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'register') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.authBox}>
          <Text style={styles.logoTitle}>CRIAR CONTA</Text>

          <TextInput
            style={styles.input}
            placeholder="Nome Completo *"
            placeholderTextColor={COLORS.textSec}
            value={registerName}
            onChangeText={setRegisterName}
          />
          <TextInput
            style={styles.input}
            placeholder="E-mail *"
            placeholderTextColor={COLORS.textSec}
            value={registerEmail}
            onChangeText={setRegisterEmail}
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Senha *"
            placeholderTextColor={COLORS.textSec}
            secureTextEntry
            value={registerPassword}
            onChangeText={setRegisterPassword}
          />
          <TextInput
            style={styles.input}
            placeholder="Série/Ano (ex: 3º Ano EM)"
            placeholderTextColor={COLORS.textSec}
            value={registerGrade}
            onChangeText={setRegisterGrade}
          />
          <TextInput
            style={styles.input}
            placeholder="Estado/UF (ex: AM)"
            placeholderTextColor={COLORS.textSec}
            value={registerUF}
            onChangeText={setRegisterUF}
          />

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.green }]} onPress={handleRegister}>
            <Text style={[styles.btnText, { color: COLORS.white }]}>Cadastrar</Text>
          </TouchableOpacity>

          {/* Opções de Login Social */}
          <Text style={styles.socialDivider}>— OU CADASTRE-SE COM —</Text>
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Google')}>
              <Text style={styles.socialBtnText}>🌐 Google</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} onPress={() => handleSocialLogin('Apple')}>
              <Text style={styles.socialBtnText}>🍎 Apple</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{ marginTop: 15, alignItems: 'center' }} onPress={() => setScreen('login')}>
            <Text style={{ color: COLORS.yellow }}>Já tem conta? Entrar</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'profileEdit') {
    const stats = getUserStats(currentUser);
    const xpInLevel = (currentUser?.xp || 0) % 100;
    const nextLevel = Math.min((currentUser?.level || 1) + 1, MAX_LEVEL);
    const unlocked = ACHIEVEMENTS.filter(a => a.check(stats, currentUser)).length;

    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderProfileModal()}
        {renderAvatarEditorModal()}
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => setScreen('dashboard')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>👤 Meu Perfil</Text>

          <View style={styles.profileHeroCard}>
            <View style={styles.profileHeroAvatar}>
              <AvatarDisplay avatar={currentUser?.avatar} />
              <TouchableOpacity style={styles.editAvatarFloatingBtn} onPress={openAvatarEditor}>
                <Text style={styles.editAvatarFloatingText}>✏️</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.profileHeroName}>{currentUser?.name || 'Usuário'}</Text>
            <Text style={styles.profileHeroEmail}>{currentUser?.email || ''}</Text>
            {currentUser?.grade || currentUser?.uf ? (
              <Text style={styles.profileHeroEmail}>
                {[currentUser?.grade, currentUser?.uf].filter(Boolean).join(' • ')}
              </Text>
            ) : null}

            <View style={styles.heroLevelPill}>
              <Text style={styles.heroLevelPillText}>🏆 Nível {currentUser?.level || 1}</Text>
            </View>
            <View style={{ width: '100%', marginTop: 12 }}>
              <Text style={styles.heroXpText}>{xpInLevel}/100 XP para o nível {nextLevel}</Text>
              <ProgressBar current={xpInLevel} max={100} />
            </View>

            <TouchableOpacity style={styles.editAvatarButton} onPress={openAvatarEditor}>
              <Text style={styles.editAvatarButtonText}>🎨 Editar meu avatar</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitleSmall}>📊 Meu desempenho</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>⭐ {currentUser?.xp || 0}</Text>
              <Text style={styles.statBoxLabel}>XP total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>🔥 {currentUser?.streak || 1}</Text>
              <Text style={styles.statBoxLabel}>Dias seguidos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>🎯 {stats.accuracy}%</Text>
              <Text style={styles.statBoxLabel}>Precisão</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>📝 {stats.totalQuizzes}</Text>
              <Text style={styles.statBoxLabel}>Quizzes</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxValue, { color: COLORS.green }]}>✅ {stats.totalCorrect}</Text>
              <Text style={styles.statBoxLabel}>Acertos</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxValue, { color: COLORS.red }]}>❌ {stats.totalWrong}</Text>
              <Text style={styles.statBoxLabel}>Erros</Text>
            </View>
          </View>

          <Text style={styles.sectionTitleSmall}>🏅 Conquistas ({unlocked}/{ACHIEVEMENTS.length})</Text>
          <View style={styles.achGrid}>
            {ACHIEVEMENTS.map(a => {
              const ok = a.check(stats, currentUser);
              return (
                <View key={a.id} style={[styles.achItem, !ok && styles.achItemLocked]}>
                  <Text style={styles.achIcon}>{ok ? a.icon : '🔒'}</Text>
                  <Text style={styles.achTitle}>{a.title}</Text>
                  <Text style={styles.achDesc}>{a.desc}</Text>
                </View>
              );
            })}
          </View>

          {renderDailyTasks()}

          <Text style={styles.sectionTitleSmall}>✏️ Editar informações</Text>
          <View style={styles.card}>
            <Text style={styles.label}>Nome Completo:</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu nome"
              placeholderTextColor={COLORS.textSec}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={styles.label}>E-mail:</Text>
            <TextInput
              style={styles.input}
              placeholder="Seu e-mail"
              placeholderTextColor={COLORS.textSec}
              value={editEmail}
              onChangeText={setEditEmail}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Série/Ano:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 3º Ano Ensino Médio"
              placeholderTextColor={COLORS.textSec}
              value={editGrade}
              onChangeText={setEditGrade}
            />

            <Text style={styles.label}>Estado / UF:</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: AM"
              placeholderTextColor={COLORS.textSec}
              value={editUF}
              onChangeText={setEditUF}
            />

            <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.green, marginTop: 10 }]} onPress={handleSaveProfileEdits}>
              <Text style={[styles.btnText, { color: COLORS.white }]}>Salvar Alterações</Text>
            </TouchableOpacity>
          </View>
          <View style={{ height: 20 }} />
        </ScrollView>
        {renderNav()}
      </SafeAreaView>
    );
  }

  if (screen === 'dashboard') {
    const stats = getUserStats(currentUser);
    const firstName = (currentUser?.name || 'Estudante').trim().split(' ')[0];
    const xpInLevel = (currentUser?.xp || 0) % 100;
    const nextLevel = Math.min((currentUser?.level || 1) + 1, MAX_LEVEL);

    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderProfileModal()}
        {renderAvatarEditorModal()}
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          <TouchableOpacity activeOpacity={0.9} style={styles.heroCard} onPress={() => setProfileModalVisible(true)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AvatarDisplay avatar={currentUser?.avatar} size="small" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.heroName}>Olá, {firstName}! 👋</Text>
                <Text style={styles.heroSub}>
                  {currentUser?.grade ? `${currentUser.grade} • ${currentUser.uf || 'BR'}` : 'Bora estudar hoje?'}
                </Text>
              </View>
              <View style={styles.heroLevelPill}>
                <Text style={styles.heroLevelPillText}>Nível {currentUser?.level || 1}</Text>
              </View>
            </View>

            <Text style={[styles.heroXpText, { marginTop: 14 }]}>{xpInLevel}/100 XP para o nível {nextLevel}</Text>
            <ProgressBar current={xpInLevel} max={100} />

            <View style={styles.chipRow}>
              <View style={styles.statChip}>
                <Text style={styles.statChipValue}>🔥 {currentUser?.streak || 1}</Text>
                <Text style={styles.statChipLabel}>dias seguidos</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipValue}>⭐ {currentUser?.points || 0}</Text>
                <Text style={styles.statChipLabel}>XP total</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipValue}>🎯 {stats.accuracy}%</Text>
                <Text style={styles.statChipLabel}>precisão</Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, styles.startNowBtn]}
            onPress={() => { setGameMode('Vestibulares'); startQuiz('Vestibulares'); }}
          >
            <Text style={styles.startNowText}>▶ Começar agora</Text>
            <Text style={styles.startNowSub}>{selectedVestibular} • {selectedDifficulty}</Text>
          </TouchableOpacity>

          {renderDailyTasks()}

          <Text style={styles.sectionHeader}>Escolha seu vestibular</Text>
          <View style={styles.quickRow}>
            {[
              { v: 'ENEM', color: COLORS.blue },
              { v: 'PSC', color: COLORS.orange },
              { v: 'SIS', color: COLORS.purple },
            ].map(({ v, color }) => (
              <TouchableOpacity
                key={v}
                style={[styles.quickChip, { borderColor: color }]}
                onPress={() => { setSelectedVestibular(v); setGameMode('Vestibulares'); setScreen('studySetup'); }}
              >
                <Text style={[styles.quickChipText, { color }]}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionHeader}>Modos de Estudo</Text>

          <View style={styles.grid}>
            <TouchableOpacity style={[styles.gridCard, { borderTopWidth: 4, borderTopColor: COLORS.green }]} onPress={() => { setGameMode('Vestibulares'); setScreen('studySetup'); }}>
              <Text style={{ fontSize: 28 }}>📚</Text>
              <Text style={styles.gridCardTitle}>Vestibulares</Text>
              <Text style={styles.gridCardSub}>ENEM, PSC e SIS • Português, Matemática e outras matérias.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.gridCard, { borderTopWidth: 4, borderTopColor: COLORS.blue }]} onPress={() => startQuiz('Simulado')}>
              <Text style={{ fontSize: 28 }}>📝</Text>
              <Text style={styles.gridCardTitle}>Simulado</Text>
              <Text style={styles.gridCardSub}>Prova adaptada rápida.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.gridCard, { borderTopWidth: 4, borderTopColor: COLORS.yellow }]} onPress={() => startQuiz('Desafio')}>
              <Text style={{ fontSize: 28 }}>⚡</Text>
              <Text style={styles.gridCardTitle}>Desafio 50s</Text>
              <Text style={styles.gridCardSub}>Corrida contra o tempo!</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.gridCard, { borderTopWidth: 4, borderTopColor: COLORS.purple }]} onPress={() => startQuiz('Provão')}>
              <Text style={{ fontSize: 28 }}>🎯</Text>
              <Text style={styles.gridCardTitle}>Provão Geral</Text>
              <Text style={styles.gridCardSub}>Questões aleatórias gerais.</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{ alignItems: 'center', marginTop: 18, marginBottom: 24 }} onPress={handleLogout}>
            <Text style={{ color: COLORS.textSec, fontWeight: 'bold' }}>Sair da conta</Text>
          </TouchableOpacity>
        </ScrollView>
        {renderNav()}
      </SafeAreaView>
    );
  }

  if (screen === 'studySetup') {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderProfileModal()}
        {renderAvatarEditorModal()}
        <ScrollView style={styles.body}>
          <TouchableOpacity onPress={() => setScreen('dashboard')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>Configurar Estudo</Text>

          <Text style={styles.label}>Vestibular:</Text>
          <View style={styles.row}>
            {['ENEM', 'PSC', 'SIS'].map(v => (
              <TouchableOpacity
                key={v}
                style={[styles.filterChip, selectedVestibular === v && styles.filterActive]}
                onPress={() => setSelectedVestibular(v)}
              >
                <Text style={{ color: COLORS.text }}>{v}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Matérias:</Text>
          <View style={styles.subjectModeCard}>
            <TouchableOpacity
              style={[styles.subjectModeOption, selectedSubjectMode === 'Principais' && styles.subjectModeActive]}
              onPress={() => setSelectedSubjectMode('Principais')}
            >
              <Text style={styles.subjectModeIcon}>⭐</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.subjectModeTitle}>Português + Matemática</Text>
                <Text style={styles.subjectModeSub}>Matérias prioritárias do app</Text>
              </View>
              {selectedSubjectMode === 'Principais' && <Text style={styles.subjectCheck}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.subjectModeOption, selectedSubjectMode === 'Outras' && styles.subjectModeActive]}
              onPress={() => setSelectedSubjectMode('Outras')}
            >
              <Text style={styles.subjectModeIcon}>📚</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.subjectModeTitle}>Outras matérias</Text>
                <Text style={styles.subjectModeSub}>História, Geografia, Biologia, Física, Química...</Text>
              </View>
              {selectedSubjectMode === 'Outras' && <Text style={styles.subjectCheck}>✓</Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Dificuldade:</Text>
          <View style={styles.row}>
            {['Fácil', 'Médio', 'Difícil'].map(d => (
              <TouchableOpacity
                key={d}
                style={[styles.filterChip, selectedDifficulty === d && styles.filterActive]}
                onPress={() => setSelectedDifficulty(d)}
              >
                <Text style={{ color: COLORS.text }}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.green, marginTop: 20 }]} onPress={() => startQuiz('Vestibulares')}>
            <Text style={[styles.btnText, { color: COLORS.white }]}>Iniciar Quiz</Text>
          </TouchableOpacity>
        </ScrollView>
        {renderNav()}
      </SafeAreaView>
    );
  }

  if (screen === 'quiz') {
    const currentQ = quizQuestionsState[currentQIndex];
    if (!currentQ) return null;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { stopSpeech(); setIsTimerRunning(false); setScreen('dashboard'); }}>
            <Text style={{ color: COLORS.yellow, fontWeight: 'bold' }}>✖ Sair</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Q{currentQIndex + 1}/{quizQuestionsState.length}</Text>
          {gameMode === 'Desafio' && (
            <Text style={{ color: timeLeft <= 10 ? COLORS.red : COLORS.yellow, fontWeight: 'bold', fontSize: 18 }}>
              ⏱️ {timeLeft}s
            </Text>
          )}
        </View>

        <ScrollView style={styles.body}>
          <ProgressBar current={currentQIndex + 1} max={quizQuestionsState.length} />

          {/* BOTÃO DE ESCUTAR / PARAR A QUESTÃO */}
          <View style={styles.audioBar}>
            {!isSpeaking ? (
              <TouchableOpacity style={styles.audioBtn} onPress={() => speakQuestion(currentQ)}>
                <Text style={styles.audioBtnText}>🔊 Ouvir Questão</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={[styles.audioBtn, styles.audioBtnActive]} onPress={stopSpeech}>
                <Text style={styles.audioBtnText}>⏹️ Parar Áudio</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.sourceRow}>
            <Text style={styles.sourceChip}>{currentQ.subject}</Text>
            <Text style={styles.sourceChip}>{currentQ.difficulty}</Text>
          </View>
          <Text style={styles.sourceText}>📌 {getFonteLabel(currentQ)}</Text>

          <Text style={styles.statementText}>{currentQ.statement}</Text>

          {currentQ.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx);
            let optionBg = COLORS.card;

            if (isConfirmed) {
              if (letter === currentQ.correctAnswer) {
                optionBg = COLORS.cardLight;
              } else if (selectedAnswer === opt) {
                optionBg = COLORS.red;
              }
            } else if (selectedAnswer === opt) {
              optionBg = COLORS.border;
            }

            return (
              <TouchableOpacity
                key={idx}
                disabled={isConfirmed}
                style={[styles.optionCard, { backgroundColor: optionBg }]}
                onPress={() => setSelectedAnswer(opt)}
              >
                <Text style={styles.optionLetter}>{letter}</Text>
                <Text style={styles.optionText}>{opt}</Text>
              </TouchableOpacity>
            );
          })}

          {isConfirmed && (
            <View style={styles.feedbackBox}>
              <Text style={{ color: String.fromCharCode(65 + currentQ.options.indexOf(selectedAnswer)) === currentQ.correctAnswer ? COLORS.green : COLORS.red, fontWeight: 'bold' }}>
                {String.fromCharCode(65 + currentQ.options.indexOf(selectedAnswer)) === currentQ.correctAnswer
                  ? '✓ Resposta Correta'
                  : '✕ Resposta Incorreta'}
              </Text>
              <Text style={{ color: COLORS.textSec, marginTop: 4 }}>{currentQ.explanation}</Text>
            </View>
          )}

          {!isConfirmed ? (
            <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.yellow, marginTop: 15 }]} onPress={handleConfirmAnswer}>
              <Text style={[styles.btnText, { color: COLORS.black }]}>Confirmar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.green, marginTop: 15 }]} onPress={handleNextQuestion}>
              <Text style={[styles.btnText, { color: COLORS.white }]}>Próxima</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'result') {
    const total = quizReview.length;
    const rightList = quizReview.filter(r => r.status === 'right').map(r => r.n);
    const wrongList = quizReview.filter(r => r.status === 'wrong').map(r => r.n);
    const blankList = quizReview.filter(r => r.status === 'blank').map(r => r.n);
    const pct = total > 0 ? Math.round((rightList.length / total) * 100) : 0;
    const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🎉' : pct >= 40 ? '💪' : '📖';
    const message =
      pct === 100 ? 'Gabaritou! Perfeito!' :
      pct >= 70 ? 'Mandou muito bem!' :
      pct >= 40 ? 'Bom começo, continue praticando!' :
      'Revise o gabarito e tente de novo!';
    const listText = (list) => (list.length ? list.map(n => `Q${n}`).join(', ') : '—');

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
          <View style={styles.resultHero}>
            <Text style={styles.resultEmoji}>{emoji}</Text>
            <Text style={styles.resultTitle}>Quiz Finalizado!</Text>
            <Text style={styles.resultMessage}>{message}</Text>

            <View style={styles.scoreRow}>
              <View style={styles.scoreBox}>
                <Text style={[styles.scoreValue, { color: COLORS.green }]}>{rightList.length}</Text>
                <Text style={styles.scoreLabel}>Certos</Text>
              </View>
              <View style={styles.scoreBox}>
                <Text style={[styles.scoreValue, { color: COLORS.red }]}>{wrongList.length}</Text>
                <Text style={styles.scoreLabel}>Erros</Text>
              </View>
              {blankList.length > 0 && (
                <View style={styles.scoreBox}>
                  <Text style={[styles.scoreValue, { color: COLORS.textSec }]}>{blankList.length}</Text>
                  <Text style={styles.scoreLabel}>Em branco</Text>
                </View>
              )}
              <View style={styles.scoreBox}>
                <Text style={[styles.scoreValue, { color: COLORS.yellow }]}>{pct}%</Text>
                <Text style={styles.scoreLabel}>Aproveit.</Text>
              </View>
            </View>

            <Text style={styles.xpText}>+{earnedXP} XP pelos acertos</Text>
            {bonusXP > 0 && <Text style={styles.xpText}>+{bonusXP} XP de metas diárias 🎯</Text>}
            {leveledUp && <Text style={styles.levelUpText}>⬆️ Subiu para o nível {currentUser?.level}!</Text>}
          </View>

          {completedTasksNow.length > 0 && (
            <View style={styles.bonusBox}>
              <Text style={styles.bonusTitle}>🎉 Meta concluída!</Text>
              {completedTasksNow.map(t => (
                <Text key={t.id} style={styles.bonusLine}>✓ {t.title} — +{t.xp} XP</Text>
              ))}
            </View>
          )}

          <Text style={styles.gabaritoTitle}>📋 Gabarito</Text>
          <View style={styles.markRow}>
            {quizReview.map(r => (
              <View
                key={r.id}
                style={[
                  styles.markChip,
                  r.status === 'right' && styles.markChipRight,
                  r.status === 'wrong' && styles.markChipWrong,
                ]}
              >
                <Text style={styles.markChipText}>Q{r.n}</Text>
                <Text style={styles.markChipText}>{r.status === 'right' ? '✓' : r.status === 'wrong' ? '✕' : '–'}</Text>
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={{ color: COLORS.green, fontWeight: 'bold' }}>✅ Acertou: {listText(rightList)}</Text>
            <Text style={{ color: COLORS.red, fontWeight: 'bold', marginTop: 6 }}>❌ Errou: {listText(wrongList)}</Text>
            {blankList.length > 0 && (
              <Text style={{ color: COLORS.textSec, fontWeight: 'bold', marginTop: 6 }}>⏱️ Não respondeu: {listText(blankList)}</Text>
            )}
          </View>

          {quizReview.map(r => (
            <View
              key={`rev-${r.id}`}
              style={[
                styles.reviewCard,
                r.status === 'right' && { borderLeftColor: COLORS.green },
                r.status === 'wrong' && { borderLeftColor: COLORS.red },
              ]}
            >
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewQ}>Q{r.n} • {r.subject}</Text>
                <Text style={[styles.reviewStatus, { color: r.status === 'right' ? COLORS.green : r.status === 'wrong' ? COLORS.red : COLORS.textSec }]}>
                  {r.status === 'right' ? '✓ Acertou' : r.status === 'wrong' ? '✕ Errou' : '– Em branco'}
                </Text>
              </View>
              <Text style={styles.reviewLine} numberOfLines={3}>{r.statement}</Text>
              <Text style={styles.reviewLine}>
                Sua resposta: <Text style={{ fontWeight: 'bold', color: COLORS.white }}>{r.picked || '—'}</Text>
                {'   '}Gabarito: <Text style={{ fontWeight: 'bold', color: COLORS.green }}>{r.correct}</Text>
              </Text>
              {r.status !== 'right' && <Text style={styles.reviewExplain}>💡 {r.explanation}</Text>}
              <Text style={styles.reviewFonte}>📌 {r.fonte}</Text>
            </View>
          ))}

          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.yellow, marginTop: 16 }]} onPress={() => startQuiz(gameMode)}>
            <Text style={[styles.btnText, { color: COLORS.black }]}>🔁 Jogar novamente</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.green, marginTop: 10 }]} onPress={() => setScreen('dashboard')}>
            <Text style={[styles.btnText, { color: COLORS.white }]}>Voltar ao Início</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'ranking' || screen === 'history') {
    return (
      <SafeAreaView style={styles.container}>
        {renderHeader()}
        {renderProfileModal()}
        {renderAvatarEditorModal()}
        <ScrollView style={styles.body}>
          <TouchableOpacity onPress={() => setScreen('dashboard')} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>{screen === 'ranking' ? '🏆 Ranking Geral' : '📊 Histórico de Estudos'}</Text>

          {screen === 'ranking' ? (
            [...users].sort((a, b) => (b.points || 0) - (a.points || 0)).map((item, index) => (
              <View key={item.id || index} style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: COLORS.yellow, fontWeight: 'bold', marginRight: 10 }}>{index + 1}º</Text>
                  <AvatarDisplay avatar={item.avatar} size="small" />
                  <Text style={{ color: COLORS.white, fontWeight: 'bold', marginLeft: 10 }}>{item.name}</Text>
                </View>
                <Text style={{ color: COLORS.yellow, fontWeight: 'bold' }}>{item.points || 0} XP</Text>
              </View>
            ))
          ) : (
            (currentUser?.history || []).length === 0 ? (
              <Text style={{ color: COLORS.textSec, textAlign: 'center' }}>Nenhum histórico encontrado.</Text>
            ) : (
              (currentUser?.history || []).map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={{ color: COLORS.yellow, fontWeight: 'bold' }}>Modo: {item.mode}</Text>
                  <Text style={{ color: COLORS.textSec }}>Data: {item.date}</Text>
                  {item.vestibular ? (
                    <Text style={{ color: COLORS.textSec }}>
                      {item.vestibular}{item.difficulty ? ` • ${item.difficulty}` : ''}
                    </Text>
                  ) : null}
                  <Text style={{ color: COLORS.text, marginTop: 5 }}>
                    Acertos: {item.correct}/{item.total} • Erros: {Math.max((item.answered ?? item.total) - item.correct, 0)}
                  </Text>
                  {item.marks ? (
                    <View style={styles.historyMarks}>
                      {item.marks.map((m, i) => (
                        <Text key={i} style={{ color: m === 'right' ? COLORS.green : m === 'wrong' ? COLORS.red : COLORS.textSec, fontWeight: 'bold', marginRight: 8 }}>
                          Q{i + 1} {m === 'right' ? '✓' : m === 'wrong' ? '✕' : '–'}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  <Text style={{ color: COLORS.green }}>+{item.xp} XP</Text>
                </View>
              ))
            )
          )}
        </ScrollView>
        {renderNav()}
      </SafeAreaView>
    );
  }

  return null;
}

// ============================================================
// ESTILOS UNIFICADOS
// ============================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgMain,
  },
  body: {
    flex: 1,
    padding: 15,
  },
  authBox: {
    padding: 20,
    justifyContent: 'center',
    flexGrow: 1,
  },
  logoTitle: {
    color: COLORS.yellow,
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 5,
  },
  subTitle: {
    color: COLORS.textSec,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 25,
  },
  input: {
    backgroundColor: COLORS.bgSec,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: COLORS.text,
    marginBottom: 12,
  },
  btn: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderBottomWidth: 4,
    borderBottomColor: 'rgba(0,0,0,0.2)',
  },
  btnText: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  socialDivider: {
    color: COLORS.textSec,
    textAlign: 'center',
    marginVertical: 18,
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  socialBtn: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  socialBtnText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: 'bold',
  },
  backBtn: {
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: COLORS.yellow,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.bgSec,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.yellow,
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Estilos do Botão de Perfil do Header Estilo Duolingo
  profileHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  headerAvatarWrapper: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  headerStatsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  headerStreakText: {
    color: COLORS.yellow,
    fontWeight: 'bold',
    fontSize: 13,
  },
  headerXpText: {
    color: COLORS.green,
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Modal estilo Duolingo
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  profileDropdownCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  dropdownName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 10,
  },
  dropdownEmail: {
    fontSize: 13,
    color: COLORS.textSec,
    marginBottom: 10,
  },
  customizeTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.yellow,
    marginBottom: 12,
    letterSpacing: 1,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
  },
  avatarGridOption: {
    width: 65,
    height: 65,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgSec,
    overflow: 'hidden',
  },
  avatarOptionSelected: {
    borderColor: COLORS.green,
    borderWidth: 3,
  },
  duoLogoutBtn: {
    width: '100%',
    backgroundColor: COLORS.red,
    paddingVertical: 12,
    borderRadius: 14,
    borderBottomWidth: 4,
    borderBottomColor: '#D63636',
    alignItems: 'center',
  },
  duoLogoutBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },

  profileHeroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileHeroAvatar: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
  },
  editAvatarFloatingBtn: {
    position: 'absolute',
    right: 0,
    bottom: 6,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: COLORS.card,
  },
  editAvatarFloatingText: {
    fontSize: 17,
  },
  profileHeroName: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  profileHeroEmail: {
    color: COLORS.textSec,
    fontSize: 13,
    marginTop: 3,
  },
  profileHeroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 14,
    gap: 8,
  },
  profileHeroStat: {
    color: COLORS.text,
    backgroundColor: COLORS.bgSec,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '700',
  },
  editAvatarButton: {
    marginTop: 16,
    width: '100%',
    backgroundColor: COLORS.purple,
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: '#68439A',
  },
  editAvatarButtonText: {
    color: COLORS.white,
    fontWeight: '800',
  },
  profileModalAvatarWrap: {
    position: 'relative',
    width: 125,
    height: 135,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileLevelBadge: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  profileLevelBadgeText: {
    color: COLORS.black,
    fontWeight: '900',
    fontSize: 11,
  },
  profileMiniStats: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: COLORS.bgSec,
    borderRadius: 14,
    paddingVertical: 11,
    marginVertical: 14,
  },
  profileMiniStat: {
    alignItems: 'center',
    minWidth: 60,
  },
  profileMiniValue: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '800',
  },
  profileMiniLabel: {
    color: COLORS.textSec,
    fontSize: 10,
    marginTop: 2,
  },
  profileMiniDivider: {
    width: 1,
    height: 26,
    backgroundColor: COLORS.border,
  },
  profileActionBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 13,
    alignItems: 'center',
    marginBottom: 9,
  },
  profileActionText: {
    color: COLORS.white,
    fontWeight: '800',
  },
  subjectModeCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
    overflow: 'hidden',
  },
  subjectModeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  subjectModeActive: {
    backgroundColor: COLORS.cardLight,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.yellow,
  },
  subjectModeIcon: {
    fontSize: 23,
    marginRight: 12,
  },
  subjectModeTitle: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 14,
  },
  subjectModeSub: {
    color: COLORS.textSec,
    fontSize: 11,
    marginTop: 3,
  },
  subjectCheck: {
    color: COLORS.green,
    fontSize: 20,
    fontWeight: '900',
    marginLeft: 8,
  },
  avatarEditorOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  avatarEditorCard: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    maxHeight: '92%',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarEditorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarEditorTitle: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: '900',
  },
  avatarEditorSubtitle: {
    color: COLORS.textSec,
    fontSize: 12,
    marginTop: 2,
  },
  closeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.bgSec,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeCircleText: {
    color: COLORS.text,
    fontSize: 25,
    lineHeight: 27,
  },
  avatarPreviewCard: {
    backgroundColor: COLORS.bgSec,
    borderRadius: 20,
    height: 155,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarEditorScroll: {
    marginBottom: 10,
  },
  avatarEditorSection: {
    marginBottom: 14,
  },
  avatarEditorLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8,
  },
  avatarChoice: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 9,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgSec,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChoiceSelected: {
    borderColor: COLORS.yellow,
    borderWidth: 3,
    transform: [{ scale: 1.05 }],
  },
  avatarChoiceText: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: '800',
  },
  avatarEditorButtons: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 6,
  },
  avatarEditorBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 13,
    alignItems: 'center',
  },
  avatarEditorCancelText: {
    color: COLORS.text,
    fontWeight: '800',
  },
  avatarEditorSaveText: {
    color: COLORS.white,
    fontWeight: '900',
  },

  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: COLORS.bgSec,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  navItem: {
    color: COLORS.text,
    fontSize: 12,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionHeader: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridCard: {
    backgroundColor: COLORS.card,
    width: '48%',
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gridCardTitle: {
    color: COLORS.text,
    fontWeight: 'bold',
    marginTop: 8,
  },
  gridCardSub: {
    color: COLORS.textSec,
    fontSize: 11,
    marginTop: 4,
  },
  progressBg: {
    height: 10,
    backgroundColor: COLORS.bgSec,
    borderRadius: 5,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressFill: {
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  filterChip: {
    backgroundColor: COLORS.card,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterActive: {
    backgroundColor: COLORS.cardLight,
    borderColor: COLORS.yellow,
  },
  label: {
    color: COLORS.textSec,
    marginBottom: 6,
    fontWeight: 'bold',
  },
  
  // Estilos da Leitura por Voz
  audioBar: {
    marginVertical: 10,
    alignItems: 'flex-start',
  },
  audioBtn: {
    backgroundColor: COLORS.blue,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderBottomWidth: 3,
    borderBottomColor: '#1182B8',
  },
  audioBtnActive: {
    backgroundColor: COLORS.red,
    borderBottomColor: '#B82828',
  },
  audioBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 13,
  },

  statementText: {
    color: COLORS.text,
    fontSize: 16,
    marginVertical: 15,
    lineHeight: 22,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  optionLetter: {
    color: COLORS.yellow,
    fontWeight: 'bold',
    marginRight: 10,
  },
  optionText: {
    color: COLORS.text,
    flex: 1,
  },
  feedbackBox: {
    backgroundColor: COLORS.cardLight,
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  resultCard: {
    backgroundColor: COLORS.card,
    padding: 25,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  // ESTILOS DE AVATAR APRIMORADO E MAIS BONITO
  avatarStage: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarShadow: {
    position: 'absolute',
    width: 90,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    bottom: -2,
  },
  avatarHead: {
    position: 'absolute',
    top: 6,
    zIndex: 5,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  avatarEar: {
    position: 'absolute',
    width: 22,
    height: 28,
    borderRadius: 11,
    top: 38,
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  avatarEarLeft: { left: 12 },
  avatarEarRight: { right: 12 },
  avatarNeck: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 8,
    bottom: 30,
    zIndex: 2,
  },
  avatarBodyNew: {
    position: 'absolute',
    width: 76,
    height: 48,
    bottom: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    zIndex: 3,
  },
  avatarShirtHighlight: {
    position: 'absolute',
    width: 44,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    top: 8,
    left: 16,
  },
  avatarArm: {
    position: 'absolute',
    width: 18,
    height: 38,
    borderRadius: 9,
    bottom: 5,
    zIndex: 2,
  },
  avatarArmLeft: { left: 8, transform: [{ rotate: '12deg' }] },
  avatarArmRight: { right: 8, transform: [{ rotate: '-12deg' }] },
  avatarHairCap: {
    position: 'absolute',
    width: '100%',
    height: 32,
    top: 0,
  },
  hairStrandLeft: {
    position: 'absolute',
    width: 20,
    height: 18,
    borderRadius: 10,
    left: -2,
    top: 15,
  },
  hairStrandRight: {
    position: 'absolute',
    width: 20,
    height: 18,
    borderRadius: 10,
    right: -2,
    top: 15,
  },
  avatarEyebrowLeft: {
    position: 'absolute',
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#261710',
    left: 20,
    top: 32,
  },
  avatarEyebrowRight: {
    position: 'absolute',
    width: 14,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#261710',
    right: 20,
    top: 32,
  },
  avatarEyeLeft: {
    position: 'absolute',
    width: 16,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    left: 18,
    top: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEyeRight: {
    position: 'absolute',
    width: 16,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF',
    right: 18,
    top: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEyePupil: {
    width: 8,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1E120B',
  },
  avatarEyeSparkle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFF',
    top: 3,
    right: 3,
  },
  avatarPaintMark: {
    position: 'absolute',
    width: 5,
    height: 16,
    borderRadius: 2,
    left: 8,
    top: 45,
  },
  avatarCheekLeft: {
    position: 'absolute',
    width: 12,
    height: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(232,93,93,0.35)',
    left: 12,
    top: 58,
  },
  avatarCheekRight: {
    position: 'absolute',
    width: 12,
    height: 7,
    borderRadius: 6,
    backgroundColor: 'rgba(232,93,93,0.35)',
    right: 12,
    top: 58,
  },
  avatarSmile: {
    position: 'absolute',
    width: 18,
    height: 9,
    borderBottomWidth: 2.5,
    borderBottomColor: '#261710',
    borderRadius: 10,
    left: 32,
    top: 60,
  },

  // Óculos
  glassesContainer: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    top: 40,
    zIndex: 12,
  },
  glassFrame: {
    width: 24,
    height: 18,
    borderWidth: 2.5,
    borderColor: '#111',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  glassBridge: {
    width: 8,
    height: 2.5,
    backgroundColor: '#111',
  },

  featherCrown: {
    position: 'absolute',
    width: 80,
    height: 40,
    top: -12,
    zIndex: 10,
    alignItems: 'center',
  },
  feather: {
    position: 'absolute',
    width: 10,
    height: 30,
    borderRadius: 5,
  },
  feather1: { left: 10, transform: [{ rotate: '-30deg' }], backgroundColor: '#E85D5D' },
  feather2: { left: 24, transform: [{ rotate: '-15deg' }], backgroundColor: '#F5C542' },
  feather3: { left: 36, transform: [{ rotate: '0deg' }], backgroundColor: '#49B675' },
  feather4: { left: 48, transform: [{ rotate: '15deg' }], backgroundColor: '#4EA8DE' },
  feather5: { left: 60, transform: [{ rotate: '30deg' }], backgroundColor: '#9B72CF' },
  crownBand: {
    position: 'absolute',
    width: 60,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7A4D2A',
    bottom: 2,
  },
  necklace: {
    position: 'absolute',
    width: 50,
    height: 25,
    bottom: 28,
    zIndex: 8,
  },
  necklaceLine: {
    position: 'absolute',
    width: 48,
    height: 20,
    borderBottomWidth: 2,
    borderColor: '#F5C542',
    borderRadius: 25,
  },
  necklaceBead: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // ============================================================
  // NOVOS ESTILOS: início, metas diárias, perfil, gabarito
  // ============================================================
  heroCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  heroName: { color: COLORS.white, fontSize: 19, fontWeight: 'bold' },
  heroSub: { color: COLORS.textSec, fontSize: 12, marginTop: 2 },
  heroLevelPill: {
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    alignSelf: 'center',
  },
  heroLevelPillText: { color: COLORS.black, fontWeight: 'bold', fontSize: 12 },
  heroXpText: { color: COLORS.textSec, fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
  chipRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 8 },
  statChip: {
    flex: 1,
    backgroundColor: COLORS.bgSec,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statChipValue: { color: COLORS.white, fontWeight: 'bold', fontSize: 15 },
  statChipLabel: { color: COLORS.textSec, fontSize: 10, marginTop: 2 },
  startNowBtn: { backgroundColor: COLORS.green, marginBottom: 14, paddingVertical: 16 },
  startNowText: { color: COLORS.white, fontWeight: 'bold', fontSize: 18 },
  startNowSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 2 },
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 6 },
  quickChip: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickChipText: { fontWeight: 'bold', fontSize: 15 },

  // Metas diárias
  dailyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  dailyHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  dailyTitle: { color: COLORS.white, fontSize: 17, fontWeight: 'bold' },
  dailySub: { color: COLORS.textSec, fontSize: 12, marginTop: 2 },
  dailyAllDone: { fontSize: 28 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSec,
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  taskRowDone: { borderColor: COLORS.green, backgroundColor: 'rgba(88,204,2,0.10)' },
  taskCheck: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.cardLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  taskCheckDone: { backgroundColor: COLORS.green },
  taskCheckText: { fontSize: 18, color: COLORS.white, fontWeight: 'bold' },
  taskTitle: { color: COLORS.text, fontSize: 13, fontWeight: 'bold' },
  taskTitleDone: { color: COLORS.textSec, textDecorationLine: 'line-through' },
  taskStatusDone: { color: COLORS.green, fontSize: 11, fontWeight: 'bold', marginTop: 3 },
  taskProgText: { color: COLORS.textSec, fontSize: 10, marginTop: 2 },
  taskXpBadge: {
    backgroundColor: COLORS.yellow,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
  },
  taskXpBadgeDone: { backgroundColor: COLORS.green },
  taskXpText: { color: COLORS.black, fontWeight: 'bold', fontSize: 11 },

  // Perfil
  sectionTitleSmall: {
    color: COLORS.yellow,
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 10,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  statBox: {
    width: '31.5%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statBoxValue: { color: COLORS.white, fontWeight: 'bold', fontSize: 16 },
  statBoxLabel: { color: COLORS.textSec, fontSize: 10, marginTop: 3 },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 14 },
  achItem: {
    width: '48.5%',
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.yellow,
  },
  achItemLocked: { opacity: 0.45, borderColor: COLORS.border },
  achIcon: { fontSize: 26 },
  achTitle: { color: COLORS.white, fontWeight: 'bold', fontSize: 13, marginTop: 4, textAlign: 'center' },
  achDesc: { color: COLORS.textSec, fontSize: 10, marginTop: 2, textAlign: 'center' },

  // Questão: origem/caderno
  sourceRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  sourceChip: {
    backgroundColor: COLORS.cardLight,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    overflow: 'hidden',
  },
  sourceText: { color: COLORS.textSec, fontSize: 11, marginTop: 6 },

  // Resultado + gabarito
  resultHero: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 14,
  },
  resultEmoji: { fontSize: 48 },
  resultTitle: { color: COLORS.yellow, fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  resultMessage: { color: COLORS.textSec, marginTop: 4, marginBottom: 14, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, width: '100%' },
  scoreBox: {
    flex: 1,
    backgroundColor: COLORS.bgSec,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreValue: { fontSize: 24, fontWeight: 'bold' },
  scoreLabel: { color: COLORS.textSec, fontSize: 11, marginTop: 2 },
  xpText: { color: COLORS.green, fontSize: 16, fontWeight: 'bold', marginTop: 10 },
  levelUpText: { color: COLORS.yellow, fontSize: 16, fontWeight: 'bold', marginTop: 8 },
  bonusBox: {
    backgroundColor: 'rgba(88,204,2,0.12)',
    borderColor: COLORS.green,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  bonusTitle: { color: COLORS.green, fontWeight: 'bold', fontSize: 15, marginBottom: 6 },
  bonusLine: { color: COLORS.text, fontSize: 13, marginTop: 2 },
  gabaritoTitle: { color: COLORS.yellow, fontSize: 17, fontWeight: 'bold', marginBottom: 10 },
  markRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  markChip: {
    minWidth: 54,
    alignItems: 'center',
    backgroundColor: COLORS.bgSec,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  markChipRight: { backgroundColor: COLORS.green, borderColor: COLORS.green },
  markChipWrong: { backgroundColor: COLORS.red, borderColor: COLORS.red },
  markChipText: { color: COLORS.white, fontWeight: 'bold', fontSize: 13 },
  reviewCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: COLORS.border,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  reviewQ: { color: COLORS.yellow, fontWeight: 'bold', fontSize: 13 },
  reviewStatus: { fontWeight: 'bold', fontSize: 13 },
  reviewLine: { color: COLORS.textSec, fontSize: 12, marginTop: 3 },
  reviewExplain: { color: COLORS.text, fontSize: 12, marginTop: 6 },
  reviewFonte: { color: COLORS.textSec, fontSize: 10, marginTop: 6 },
  historyMarks: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, marginBottom: 2 },
});