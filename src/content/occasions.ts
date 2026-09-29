export type Occasion = {
  slug: string
  name: string
  title: string
  description: string
  intro: string
  price: string
  sections: Array<{ title: string; text: string; items?: string[] }>
  faq: Array<{ question: string; answer: string }>
}

export const occasions: Occasion[] = [
  {
    slug: 'casamento',
    name: 'Casamento',
    title: 'Lista de presentes de casamento online',
    description:
      'Monte sua lista de casamento com presentes de diferentes lojas, organize as reservas e compartilhe um link com os convidados. Veja ideias e como funciona.',
    intro:
      'Uma lista de casamento ajuda os convidados a escolher algo que faça sentido para a vida do casal. No MyWish, vocês reúnem os presentes desejados em uma página e acompanham quais itens foram reservados, mesmo quando os produtos são de lojas diferentes.',
    price: '29,90',
    sections: [
      {
        title: 'Comecem pelo que falta na casa de vocês',
        text: 'Antes de escolher os presentes, façam um inventário do que já possuem. Quem está montando a primeira casa pode priorizar os itens usados todos os dias. Para quem já mora junto, vale incluir peças que precisam ser substituídas ou que combinam com um hobby do casal.',
        items: [
          'Cozinha: panelas, travessas, talheres e utensílios que vocês realmente usam.',
          'Mesa: pratos, copos, taças e uma toalha no tamanho certo.',
          'Quarto e banho: roupa de cama na medida do colchão e jogos de toalhas.',
          'Casa: ferramentas básicas, luminárias e organizadores.',
        ],
      },
      {
        title: 'Ofereçam opções para diferentes orçamentos',
        text: 'Misturem presentes simples com itens maiores, sem transformar a lista em uma obrigação. Descrevam medidas, cores e quantidades para evitar dúvidas. Se houver preferência por um modelo, incluam o link de referência e expliquem o motivo; o convidado pode comprar onde preferir.',
      },
      {
        title: 'Organizem a lista a dois',
        text: 'Um anfitrião cria a lista e pode convidar o outro para ajudar na organização. Adicionem os nomes, a data e uma mensagem de boas-vindas. Depois de preparar os presentes, liberem o compartilhamento com um pagamento único e enviem o link junto do convite.',
      },
      {
        title: 'Reserva, compra e entrega são etapas diferentes',
        text: 'O convidado entra com Google e reserva o presente para sinalizar sua escolha aos demais. A compra acontece diretamente na loja escolhida, fora do MyWish. Combinem no convite se os presentes serão entregues no evento ou em outro local. A reserva não é uma confirmação de compra ou de entrega.',
      },
    ],
    faq: [
      {
        question: 'A lista fica vinculada a uma loja?',
        answer:
          'Não. Você adiciona presentes e links de referência de diferentes lojas. O convidado escolhe onde comprar, e o MyWish organiza a lista e as reservas.',
      },
      {
        question: 'Os presentes viram dinheiro para o casal?',
        answer:
          'Não. O MyWish organiza presentes físicos e suas reservas. O pagamento no site libera o compartilhamento da lista; ele não é o pagamento dos presentes.',
      },
    ],
  },
  {
    slug: 'aniversario',
    name: 'Aniversário',
    title: 'Lista de presentes de aniversário online',
    description:
      'Crie uma lista de aniversário com ideias de presentes, tamanhos e links de referência. Compartilhe com amigos e acompanhe as reservas em um só lugar.',
    intro:
      'Responder “o que você quer ganhar?” fica mais fácil quando suas ideias estão organizadas. Uma lista de aniversário online reúne preferências, tamanhos e referências em um link que você pode compartilhar com amigos e família.',
    price: '9,90',
    sections: [
      {
        title: 'Escolha presentes que tenham a ver com você',
        text: 'Pense em atividades que já fazem parte da sua rotina e em coisas que gostaria de experimentar. Uma lista curta e bem descrita costuma orientar melhor do que dezenas de itens sem contexto. Inclua opções acessíveis para que cada pessoa escolha dentro do próprio orçamento.',
        items: [
          'Leitura: título, autor e edição do livro desejado.',
          'Roupas: tamanho, cor e modelo, com uma referência quando possível.',
          'Hobbies: materiais de desenho, jogos, itens de jardinagem ou acessórios esportivos.',
          'Dia a dia: garrafa, mochila, fones ou organizadores que estejam fazendo falta.',
        ],
      },
      {
        title: 'Como montar a lista de aniversário',
        text: 'Entre com sua conta Google, escolha aniversário como ocasião e dê um nome fácil de reconhecer ao evento. Adicione uma imagem e uma descrição a cada presente. Um link de referência ajuda a mostrar o modelo, mas não prende o convidado a uma loja específica.',
      },
      {
        title: 'Como compartilhar sem parecer uma cobrança',
        text: 'Envie a lista para quem pedir sugestões ou inclua uma mensagem delicada no convite. Por exemplo: “Sua presença já é um presente. Se quiser uma ideia, reuni algumas coisas de que gosto nesta lista.” Evite mensagens insistentes e mantenha os preços variados.',
      },
      {
        title: 'Ajude a evitar presentes repetidos',
        text: 'Peça aos convidados que reservem o item escolhido antes de comprar. A reserva avisa aos demais que alguém pretende dar aquele presente. Se os planos mudarem, a pessoa pode cancelar a reserva. Depois da festa, você pode marcar os itens que recebeu.',
      },
    ],
    faq: [
      {
        question: 'Posso usar para aniversário infantil?',
        answer:
          'Sim. Um adulto pode organizar a lista, informando idade, tamanhos e preferências da criança. Evite divulgar informações pessoais desnecessárias e compartilhe o link com os convidados.',
      },
      {
        question: 'Posso atualizar os presentes depois de criar a lista?',
        answer:
          'Sim. O anfitrião pode adicionar e editar presentes. Ao alterar um item reservado, combine a mudança com quem o escolheu para evitar uma compra diferente do esperado.',
      },
    ],
  },
  {
    slug: 'cha-de-bebe',
    name: 'Chá de bebê',
    title: 'Lista de presentes para chá de bebê',
    description:
      'Organize sua lista de chá de bebê com roupas, itens de banho e acessórios. Inclua tamanhos e quantidades e acompanhe o que os convidados reservaram.',
    intro:
      'Uma lista de chá de bebê ajuda a organizar o enxoval sem concentrar todos os presentes nos mesmos itens. No MyWish, você descreve o que precisa, indica tamanhos e compartilha as opções com os convidados em uma página.',
    price: '9,90',
    sections: [
      {
        title: 'Revise o enxoval antes de pedir presentes',
        text: 'Separe o que já foi comprado ou recebido e monte a lista a partir do que ainda falta. Considere a estação do ano e o espaço disponível em casa. Para produtos com orientações específicas de uso, confira as informações do fabricante e as recomendações do profissional que acompanha a família.',
        items: [
          'Roupas: bodies e macacões com tamanho e quantidade desejados.',
          'Banho: toalhas, panos e organizadores para os itens do bebê.',
          'Passeio: bolsa, trocador portátil e acessórios adequados à rotina da família.',
          'Organização: cestos e divisórias para guardar o enxoval.',
        ],
      },
      {
        title: 'Explique tamanhos, quantidades e preferências',
        text: 'Não deixe apenas “roupinha” na descrição. Escreva o tamanho e a estação de uso. Quando precisar de várias unidades, organize os pedidos de forma que cada presente tenha uma reserva clara, por exemplo “kit com três bodies tamanho M”. Assim os convidados entendem melhor o que escolher.',
      },
      {
        title: 'Compartilhe com família e amigos',
        text: 'Crie um evento do tipo chá de bebê e prepare os presentes antes de publicar. A montagem é gratuita; para liberar o compartilhamento dessa lista, o pagamento único começa em R$ 9,90. Você pode usar a visibilidade não listada para que o evento não apareça na vitrine do site e enviar o link aos convidados.',
      },
      {
        title: 'Acompanhe as escolhas sem controlar onde compram',
        text: 'Os convidados entram com Google e reservam os presentes. Você pode incluir links de diferentes lojas como referência, mas a compra e a entrega são combinadas fora do MyWish. Confira as reservas antes de completar o enxoval por conta própria.',
      },
    ],
    faq: [
      {
        question: 'Serve para chá de fraldas?',
        answer:
          'Sim. Você pode cadastrar kits de fraldas como presentes, descrevendo tamanho, quantidade e preferências. Organize cada kit como uma opção de reserva para deixar claro o que cada convidado escolheu.',
      },
      {
        question: 'Preciso escolher uma loja para todo o enxoval?',
        answer:
          'Não. Cada presente pode ter seu próprio link de referência. A compra é feita pelo convidado na loja que ele escolher.',
      },
    ],
  },
  {
    slug: 'cha-de-panela',
    name: 'Chá de panela',
    title: 'Lista de presentes para chá de panela',
    description:
      'Veja o que pedir no chá de panela e monte uma lista online com utensílios úteis, opções acessíveis e reservas para ajudar a evitar presentes repetidos.',
    intro:
      'A melhor lista de chá de panela acompanha a rotina de quem vai usar a cozinha. Reúna os utensílios que faltam, explique suas preferências e deixe os convidados escolherem um presente que caiba no orçamento.',
    price: '9,90',
    sections: [
      {
        title: 'O que colocar na lista de chá de panela',
        text: 'Comece pelos utensílios usados com frequência. Pense no número de pessoas da casa, no espaço dos armários e no tipo de fogão antes de pedir panelas ou peças maiores. Uma descrição prática evita que o convidado tenha de adivinhar o tamanho ou o material.',
        items: [
          'Preparo: tábua, peneira, ralador, medidores e tigelas.',
          'Fogão e forno: assadeiras, formas e panelas compatíveis com o fogão.',
          'Mesa: pratos de sobremesa, jarras, xícaras e porta-guardanapos.',
          'Organização: potes com tampa, escorredor e panos de prato.',
        ],
      },
      {
        title: 'Como dividir a lista em opções acessíveis',
        text: 'Inclua utensílios individuais e pequenos kits, com referências de preço variadas. Não é preciso escolher tudo de uma mesma marca. Se uma característica for indispensável, como uma panela compatível com indução, escreva isso na descrição do presente.',
      },
      {
        title: 'Crie a lista e envie junto do convite',
        text: 'Escolha chá de panela no cadastro do evento, personalize a mensagem e adicione os presentes. Depois de liberar o compartilhamento, envie o link por WhatsApp ou no convite digital. Os convidados podem ver os itens e entrar com Google para reservar a opção escolhida.',
      },
      {
        title: 'Separe o chá de panela da lista de casamento',
        text: 'Se houver duas celebrações, evite repetir os mesmos pedidos nas duas listas. Use o chá para utensílios menores e deixe outros presentes na lista de casamento. As reservas pertencem a cada evento, então a organização entre listas deve ser feita pelos anfitriões.',
      },
    ],
    faq: [
      {
        question: 'Chá de cozinha e chá de panela usam a mesma lista?',
        answer:
          'Sim. Você pode dar ao evento o nome que preferir e selecionar os utensílios adequados à celebração.',
      },
      {
        question: 'O convidado paga o presente no MyWish?',
        answer:
          'Não. Ele reserva o item no MyWish e faz a compra diretamente na loja. A cobrança do MyWish é para o anfitrião liberar o compartilhamento da lista.',
      },
    ],
  },
  {
    slug: 'casa-nova',
    name: 'Casa nova',
    title: 'Lista de presentes para chá de casa nova',
    description:
      'Monte uma lista de casa nova com itens úteis para cozinha, quarto e organização. Compartilhe um link e acompanhe as escolhas dos seus convidados.',
    intro:
      'Mudar de casa revela pequenas coisas que fazem falta: uma lixeira, um jogo de toalhas, uma ferramenta. A lista de chá de casa nova reúne essas necessidades e facilita a escolha de quem quer participar dessa fase.',
    price: '9,90',
    sections: [
      {
        title: 'Faça uma lista por cômodo',
        text: 'Passe pela casa e anote o que falta antes de escolher os presentes. Priorize o que será usado desde os primeiros dias. Para quem já tem móveis e eletrodomésticos, utensílios, roupa de cama e organizadores podem ser mais úteis do que peças grandes.',
        items: [
          'Cozinha: potes, talheres, escorredor e utensílios de preparo.',
          'Quarto: lençóis e fronhas nas medidas da cama.',
          'Banheiro: toalhas, tapete e organizadores.',
          'Área de serviço: cesto, varal e acessórios de organização.',
        ],
      },
      {
        title: 'Inclua medidas e compatibilidade',
        text: 'Informe o tamanho do colchão, as dimensões disponíveis e as cores preferidas. Para um eletrodoméstico, confira a voltagem antes de publicar a referência. Esses detalhes ajudam o convidado a comprar algo que funcione na nova casa.',
      },
      {
        title: 'Organize o chá de casa nova no MyWish',
        text: 'Crie o evento, adicione uma mensagem de boas-vindas e monte os presentes gratuitamente. Cada item pode incluir imagem, descrição e link de uma loja. Quando estiver pronto, libere o compartilhamento por R$ 9,90 nessa categoria e envie o link para seus convidados.',
      },
      {
        title: 'Combine a entrega dos presentes',
        text: 'Explique se prefere receber no dia da comemoração ou combinar a entrega diretamente com cada pessoa. O MyWish não vende nem entrega os produtos. Ele organiza as escolhas: o convidado reserva o item, compra fora do site e você pode marcá-lo como recebido.',
      },
    ],
    faq: [
      {
        question: 'Posso fazer uma lista para morar sozinho?',
        answer:
          'Sim. A lista pode ter um único anfitrião e ser personalizada para a sua mudança, sem precisar ser uma celebração de casal.',
      },
      {
        question: 'A lista precisa aparecer na página inicial?',
        answer:
          'Não. Depois de liberar a lista, você pode escolher a visibilidade não listada e compartilhar o link diretamente. Quem receber ou obtiver esse link poderá acessá-la.',
      },
    ],
  },
]

export const getOccasion = (slug: string) =>
  occasions.find((item) => item.slug === slug)
