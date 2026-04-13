// Base de dados inteligente de sugestões para Persona
// Tags de alinhamento: Bom, Mal, Leal, Caótico, Neutro
// Tags de background: Acólito, Criminoso, Herói do Povo, Nobre, Sábio, Soldado, Forasteiro, etc. (Usamos termos abertos para dar match flexível).

const rawData = {
  personality_traits: [
    { text: "Eu sempre sou calmo e educado, não importa a situação.", tags: ["Leal", "Bom", "Acólito", "Nobre", "Sábio"] },
    { text: "Eu evito sempre olhar os outros nos olhos.", tags: ["Caótico", "Criminoso", "Órfão", "Forasteiro"] },
    { text: "Eu tenho uma citação ou provérbio para cada situação.", tags: ["Sábio", "Acólito", "Leal"] },
    { text: "Eu sou muito crítico, especialmente contra mim mesmo.", tags: ["Leal", "Soldado", "Bom"] },
    { text: "Minha curiosidade não tem limites, muitas vezes me colocando em apuros.", tags: ["Caótico", "Sábio", "Criança de Rua", "Neutro"] },
    { text: "Eu sou movido pela minha sede de provar o meu valor.", tags: ["Soldado", "Herói do Povo", "Caótico"] },
    { text: "Eu mudo de humor muito rápido e não escondo minhas emoções.", tags: ["Caótico", "Artista", "Forasteiro"] },
    { text: "Eu sempre falo o que penso, mesmo que as verdades sejam duras.", tags: ["Neutro", "Soldado", "Forasteiro", "Mal"] },
    { text: "Ninguém sabe a minha verdadeira história; conto uma versão diferente para todos.", tags: ["Criminoso", "Charlatão", "Caótico", "Mal"] },
    { text: "Sinto-me pouco à vontade em cidades e grandes multidões.", tags: ["Forasteiro", "Eremita", "Neutro"] },
    { text: "Gosto de colecionar pequenos troféus e bugigangas brilhantes das minhas vitórias.", tags: ["Soldado", "Caótico", "Nobre"] },
    { text: "Falo de forma majestosa, usando palavras longas que muitas vezes estão erradas.", tags: ["Nobre", "Charlatão", "Artista"] },
    { text: "Eu sou muito prestativo, de uma maneira quase submissa.", tags: ["Leal", "Bom", "Eremita", "Acólito"] },
    { text: "Levo a vida na esportiva. Afinal, um dia todos vamos morrer.", tags: ["Caótico", "Criminoso", "Neutro"] },
    { text: "Fico impaciente muito fácil e gosto que tudo ande num ritmo acelerado.", tags: ["Caótico", "Herói do Povo"] },
    { text: "Julgo as pessoas por suas ações, não por suas palavras.", tags: ["Leal", "Bom", "Soldado", "Sábio"] },
    { text: "Se alguém me faz um mal, não descansarei até dar o troco.", tags: ["Mal", "Criminoso", "Soldado"] },
    { text: "Sou muito supersticioso e vejo sinais ruins em pequenas coisas.", tags: ["Acólito", "Forasteiro", "Marinheiro"] },
    { text: "Sempre que vejo alguém em perigo ou necessitado, eu corro para ajudar.", tags: ["Bom", "Herói do Povo", "Leal e Bom"] },
    { text: "Tudo o que eu faço, calculo o lucro em potencial.", tags: ["Mal", "Neutro", "Criminoso", "Charlatão"] }
  ],
  ideals: [
    { text: "Justiça: A lei serve para todos da mesma forma.", tags: ["Leal", "Bom", "Soldado", "Leal e Bom"] },
    { text: "Independência: Eu sou uma alma livre e não devo satisfação a ninguém.", tags: ["Caótico", "Forasteiro", "Marinheiro"] },
    { text: "Poder: Com grande força, é possível mudar e controlar o mundo.", tags: ["Mal", "Nobre", "Sábio"] },
    { text: "Respeito: Todos merecem ser tratados com dignidade humana.", tags: ["Bom", "Herói do Povo", "Acólito"] },
    { text: "Ganância: Só faço o que traz riquezas; de graça nem injeção na testa.", tags: ["Mal", "Criminoso", "Charlatão", "Nobre"] },
    { text: "Autoconhecimento: Explorar o universo interior é mais importante que o mundo ao redor.", tags: ["Neutro", "Eremita", "Acólito"] },
    { text: "Lógica: A emoção não deve atrapalhar o pensamento claro e calculista.", tags: ["Leal", "Sábio", "Neutro"] },
    { text: "Compaixão: Se houver dor e sofrimento, é meu dever agir para aliviar.", tags: ["Bom", "Acólito", "Herói do Povo"] },
    { text: "Retribuição: Os fracos merecem ajuda; os tiranos merecem a fúria.", tags: ["Neutro", "Caótico", "Soldado"] },
    { text: "Natureza: O mundo silvestre deve ser preservado a qualquer custo.", tags: ["Neutro", "Forasteiro", "Eremita"] },
    { text: "Tradição: Os laços do passado e meus ancestrais devem ser sempre honrados.", tags: ["Leal", "Nobre", "Acólito"] },
    { text: "Glória: Quero que o meu nome seja lembrado na história pelos bardos.", tags: ["Qualquer", "Soldado", "Artista", "Nobre"] },
    { text: "Proteção: Darei a minha vida pelos que não podem se proteger.", tags: ["Bom", "Leal", "Soldado", "Herói do Povo"] },
    { text: "Caos: Adoro semear o caos só para ver como a sociedade reage.", tags: ["Caótico", "Mal", "Criminoso"] },
    { text: "Beleza: Ao espalhar a beleza e observar a arte, me sinto completo.", tags: ["Neutro", "Bom", "Artista", "Nobre"] },
    { text: "Dever: As ordens dos meus superiores jamais devem ser ignoradas.", tags: ["Leal", "Soldado"] },
    { text: "Conhecimento: O caminho para o poder e melhoria do mundo está nas antigas páginas de livros esquecidos.", tags: ["Sábio", "Neutro", "Acólito"] },
    { text: "Mudança: Como a natureza, o mundo e a sociedade têm que evoluir através da morte e renascimento.", tags: ["Caótico", "Forasteiro", "Neutro"] },
    { text: "Lealdade: Não ligo pro que a lei diz, minha família e amigos vêm em primeiro lugar.", tags: ["Caótico", "Criminoso", "Herói do Povo"] },
    { text: "Dominação: A ordem verdadeira só será alcançada quando todos se curvarem a vontade superior.", tags: ["Mal", "Leal"] }
  ],
  bonds: [
    { text: "Darei a minha vida para proteger as pessoas da minha ordem.", tags: ["Leal", "Acólito", "Soldado"] },
    { text: "Fui enganado antigamente e dediquei a minha vida a ter a minha vingança.", tags: ["Caótico", "Mal", "Criminoso", "Nobre"] },
    { text: "Um monstro destruiu a minha aldeia, devo caçar criaturas como ele até o fim dos dias.", tags: ["Herói do Povo", "Forasteiro", "Neutro"] },
    { text: "Eu faria qualquer coisa para recuperar uma herança que foi roubada da minha família.", tags: ["Nobre", "Leal", "Charlatão"] },
    { text: "Eu não desisto jamais de procurar um amor perdido no passado.", tags: ["Bom", "Herói do Povo", "Marinheiro"] },
    { text: "Devo a vida do meu melhor amigo a quem me salvou e cuidou de nós.", tags: ["Bom", "Herói do Povo", "Soldado"] },
    { text: "Trabalho lealmente para uma guilda sombria que controla grande influência.", tags: ["Criminoso", "Charlatão", "Mal"] },
    { text: "Uma lenda misteriosa dita o meu caminho; busco comprovar a sua veracidade.", tags: ["Sábio", "Acólito", "Forasteiro"] },
    { text: "Proteger o fraco e os inocentes é um vínculo com a minha própria alma.", tags: ["Bom", "Leal", "Herói do Povo"] },
    { text: "Um objeto mágico místico sussurra na minha mente e eu não sei como me libertar.", tags: ["Místico", "Caótico", "Neutro", "Sábio"] },
    { text: "Prometi sempre carregar a espada do meu mestre morto com honra e orgulho.", tags: ["Soldado", "Bom", "Eremita"] },
    { text: "Fui criado nas ruas por órfãos. É por eles que luto para não deixar que outros passem fome.", tags: ["Bom", "Órfão", "Herói do Povo", "Criminoso"] },
    { text: "Eu tenho uma dívida de honra com um dragão que poupou minha vida.", tags: ["Neutro", "Leal", "Forasteiro"] },
    { text: "Fiz um feito heroico que não me pertencia, o medo da farsa vir à tona é o que me move.", tags: ["Charlatão", "Artista", "Caótico"] },
    { text: "Há um lugar secreto no meio da floresta selvagem que jurei guardar com minha alma.", tags: ["Forasteiro", "Eremita", "Neutro"] },
    { text: "Meu instrumento musical é a minha vida; foi o último presente do meu companheiro falecido.", tags: ["Artista", "Bom"] },
    { text: "Defendo os servos comuns porque eu já fui um deles.", tags: ["Bom", "Herói do Povo"] },
    { text: "A cidade em que cresci é o melhor lugar do mundo para mim e a protegerei com minha vida.", tags: ["Leal", "Soldado"] },
    { text: "Uma pessoa muito poderosa me caça silenciosamente; preciso continuar fugindo ou destruí-la.", tags: ["Criminoso", "Forasteiro", "Nobre"] },
    { text: "Tudo que faço é por glória e reconhecimento; almejo ser coroado por minhas vitórias.", tags: ["Nobre", "Mal", "Caótico"] }
  ],
  flaws: [
    { text: "Tenho um vício ou compulsão difícil de esconder, como jogos de azar ou bebidas.", tags: ["Caótico", "Criminoso", "Marinheiro", "Nobre"] },
    { text: "Meu orgulho excessivo diz que não preciso pedir ajuda para nada.", tags: ["Nobre", "Soldado", "Leal", "Mal"] },
    { text: "Possuo uma dívida mortal com um sindicato do crime muito perigoso.", tags: ["Criminoso", "Charlatão", "Artista"] },
    { text: "Nunca resisto à ideia de enganar para ter vantagem, mesmo que não seja necessário.", tags: ["Mal", "Charlatão", "Caótico"] },
    { text: "Eu confio muito facilmente; meu coração ingênuo pensa que todos têm seu lado bom.", tags: ["Bom", "Herói do Povo", "Acólito"] },
    { text: "Ajo como líder incontestável, ignorando que muitas vezes não tenho a razão.", tags: ["Nobre", "Soldado", "Leal"] },
    { text: "Sinto ciúmes doentios com minhas posses e sou ciumento por amizades.", tags: ["Mal", "Criminoso"] },
    { text: "Detesto receber críticas e fico agressivo quando meu julgamento é questionado.", tags: ["Caótico", "Mal", "Forasteiro", "Sábio"] },
    { text: "Tenho medos incapacitantes de ambientes com pouca luz e espaços escuros pequenos.", tags: ["Qualquer"] },
    { text: "Sigo dogmas com extremismo e não entendo o conceito do 'meio-termo'.", tags: ["Acólito", "Leal"] },
    { text: "Posso me esconder ou fugir da batalha na primeira oportunidade se as coisas fugirem do controle.", tags: ["Covarde", "Neutro", "Criminoso"] },
    { text: "Minha linguagem agressiva e rude facilmente ofende nobres ou a autoridade superior local.", tags: ["Caótico", "Marinheiro", "Forasteiro", "Criminoso"] },
    { text: "Uma distração rápida logo leva todo o meu foco e uma atenção embaraçosa.", tags: ["Caótico", "Sábio"] },
    { text: "Sou possessivo a certos pertences beirando a paranoia e agressividade em perdê-los de vista.", tags: ["Sábio", "Mal", "Neutro"] },
    { text: "Nunca perdoo ninguém que tenha quebrado até uma pequena ou irrelevante promessa.", tags: ["Leal", "Acólito", "Nobre"] },
    { text: "Desprezo as leis e regulamentos se acho que só servem para os fracos se protegerem.", tags: ["Caótico", "Mal", "Criminoso"] },
    { text: "Quando estou embriagado conto todos os meus segredos mortais.", tags: ["Marinheiro", "Caótico", "Artista"] },
    { text: "Costumo subestimar as habilidades das raças e culturas diferentes da minha.", tags: ["Nobre", "Eremita", "Mal"] },
    { text: "Minto compulsivamente para me engrandecer, mesmo que isso piore a situação magicamente.", tags: ["Charlatão", "Artista"] },
    { text: "Sou insaciável nos prazeres da carne, muitas vezes me distraindo da missão com promessas libidinosas.", tags: ["Caótico", "Artista", "Nobre"] }
  ]
};

/**
 * Função inteligente que filtra sugestões dando match no seu Alinhamento e Antecedente
 * Retorna no mínimo 15 sugestões para garantir a meta de paginação (3 páginas de 5).
 */
export function getFilteredSuggestions(categoryKey, alignmentString = "", backgroundString = "") {
  const al = (alignmentString || "").toLowerCase();
  const bg = (backgroundString || "").toLowerCase();

  const allItems = rawData[categoryKey] || [];
  
  // Função para checar o match das palavras
  const hasMatch = (tags) => {
    return tags.some(tag => {
      const t = tag.toLowerCase();
      // Match por palavras parciais, por ex "Leal" acha "Leal e Bom"
      return al.includes(t) || bg.includes(t);
    });
  };

  const perfectMatches = [];
  const genericMatches = [];

  for (const item of allItems) {
    if (hasMatch(item.tags)) {
      perfectMatches.push(item.text);
    } else {
      genericMatches.push(item.text);
    }
  }

  // Embaralhamos ambos para variação legal
  const shuffle = (array) => [...array].sort(() => 0.5 - Math.random());
  
  const shuffledPerfect = shuffle(perfectMatches);
  const shuffledGeneric = shuffle(genericMatches);

  let finalArray = [...shuffledPerfect];

  // Se os perfeitos não derem 15 sugestões, completamos com genéricas até atingir
  if (finalArray.length < 15) {
    const missing = 15 - finalArray.length;
    finalArray = finalArray.concat(shuffledGeneric.slice(0, missing));
  } else {
    // Manter o limite amigável se batermos mais de 15 no match perfeito!
    finalArray = finalArray.slice(0, 15);
  }

  // Double check se os dados forem baixos, para ter certeza que completa 15. E se não houver na base? Envia o que tem.
  return finalArray;
}
