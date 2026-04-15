// ============================================================
// RADAR VEON — Missão, Visão e Valores do Instituto Veon
// Frases rotativas exibidas no cabeçalho a cada refresh
// ============================================================

export interface Quote {
  categoria: "Missão" | "Visão" | "Valor";
  numero?: string;
  texto: string;
}

export const QUOTES: Quote[] = [
  // --- MISSÃO ---
  {
    categoria: "Missão",
    texto: "Guiar até a terra da prosperidade empresários presos na ilha da escassez.",
  },

  // --- VISÃO ---
  {
    categoria: "Visão",
    texto: "Ser a empresa mais falada e desejada do mercado.",
  },
  {
    categoria: "Visão",
    texto: "Desenvolver e aplicar um processo vitorioso capaz de gerar resultados aos nossos parceiros em tempo recorde.",
  },
  {
    categoria: "Visão",
    texto: "Ter 300 unidades franqueadas até 2030.",
  },

  // --- VALOR 1 — CUMPRIR A MISSÃO ---
  { categoria: "Valor", numero: "1.1", texto: "Missão dada é missão cumprida e aqui é com excelência." },
  { categoria: "Valor", numero: "1.2", texto: "Elimine o problema que nem mesmo o Tripulante sabia que existia." },
  { categoria: "Valor", numero: "1.3", texto: "Poupe o tempo do Tripulante, seja ágil e eficiente." },
  { categoria: "Valor", numero: "1.4", texto: "Seja a terceira pessoa mais importante para a empresa do Tripulante." },

  // --- VALOR 2 — RELACIONAMENTO ---
  { categoria: "Valor", numero: "2.1", texto: "Seja um bom ouvinte." },
  { categoria: "Valor", numero: "2.2", texto: "Transmita uma imagem de autoridade." },
  { categoria: "Valor", numero: "2.3", texto: "Comunique-se com clareza." },
  { categoria: "Valor", numero: "2.4", texto: "Fale e mostre ao Tripulante a missão que ele não viu você cumprir." },
  { categoria: "Valor", numero: "2.5", texto: "Faça as perguntas certas para obter as respostas que precisa." },
  { categoria: "Valor", numero: "2.6", texto: "Convença o Tripulante a fazer o próprio bem." },
  { categoria: "Valor", numero: "2.7", texto: "Reconheça que aqui nenhum de nós é tão bom quanto todos nós juntos." },

  // --- VALOR 3 — BRILHO NOS OLHOS ---
  { categoria: "Valor", numero: "3.1", texto: "Sinto orgulho de fazer parte da Tripulação Veon." },
  { categoria: "Valor", numero: "3.2", texto: "Se estou aqui é porque eu quero estar aqui." },
  { categoria: "Valor", numero: "3.3", texto: "Tenho a missão da empresa como meu propósito de vida." },
  { categoria: "Valor", numero: "3.4", texto: "Eu sou EPP (Evolução Pessoal Permanente)." },
  { categoria: "Valor", numero: "3.5", texto: "Sou um guardião da imagem da Tripulação, tanto dentro quanto fora dela." },

  // --- VALOR 4 — OBSESSÃO PELO ÊXITO ---
  { categoria: "Valor", numero: "4.1", texto: "Quando a Tripulação vence, você vence." },
  { categoria: "Valor", numero: "4.2", texto: "Tenha impecabilidade na palavra. Se eu falo eu faço." },
  { categoria: "Valor", numero: "4.3", texto: "Seja persistente e não teimoso." },
  { categoria: "Valor", numero: "4.4", texto: "Não dependa da motivação, tenha a disciplina e a rotina como sua melhor amiga." },
  { categoria: "Valor", numero: "4.5", texto: "Deixe o seu resultado falar por si, isso basta." },
  { categoria: "Valor", numero: "4.6", texto: "Adote esse lema: Eu sou a bússola que aponta para o sucesso, meu e de meus companheiros." },

  // --- VALOR 5 — A BUSCA INCESSANTE PELO CONHECIMENTO ---
  { categoria: "Valor", numero: "5.1", texto: "A missão não cumprida revela o conhecimento que ainda te falta." },
  { categoria: "Valor", numero: "5.2", texto: "Saiba 40 vezes mais sobre o seu negócio e de seus Tripulantes do que seus concorrentes." },
  { categoria: "Valor", numero: "5.3", texto: "Se houver dúvidas, busque as respostas, fale somente aquilo que tiver certeza." },
  { categoria: "Valor", numero: "5.4", texto: "A repetição é a mãe da didática." },

  // --- VALOR 6 — ENTREGAR MAIS QUE O COMBINADO ---
  { categoria: "Valor", numero: "6.1", texto: "Faça além do dever." },
  { categoria: "Valor", numero: "6.2", texto: "Entregue o resultado que ninguém esperava." },
  { categoria: "Valor", numero: "6.3", texto: "Se você fizer somente aquilo que foi contratado para fazer, logo estará ancorado." },
  { categoria: "Valor", numero: "6.4", texto: "Se alguém lhe pedir um favor, ofereça também um bônus." },
  { categoria: "Valor", numero: "6.5", texto: "Se um companheiro está com dificuldades, ensine-o a resolver." },
  { categoria: "Valor", numero: "6.6", texto: "Seja mais que um guia, seja também, a luz que ilumina o caminho." },

  // --- VALOR 7 — LEALDADE ---
  { categoria: "Valor", numero: "7.1", texto: "Lealdade à Missão: comprometa-se com o propósito de guiar empresários da escassez à prosperidade." },
  { categoria: "Valor", numero: "7.2", texto: "Lealdade à Cultura: defenda e pratique os valores do Instituto em todas as situações. Seja um guardião da cultura Veon." },
  { categoria: "Valor", numero: "7.3", texto: "Lealdade aos Processos: execute os processos e metodologias desenvolvidos." },
  { categoria: "Valor", numero: "7.4", texto: "Lealdade à Hierarquia: honre a estrutura de liderança." },
];

export function getRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}
