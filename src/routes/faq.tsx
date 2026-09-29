import { createFileRoute, Link } from '@tanstack/react-router'
import { pageMeta, toJsonLd } from '../lib/seo'
import BrandWordmark from '../components/BrandWordmark'

const FAQ_ITEMS = [
  {
    question: 'Como criar uma lista de presentes online?',
    answer:
      'Entre com sua conta Google, escolha a ocasião e personalize o evento. Adicione presentes com descrição, imagem e links de referência. Você pode montar e editar gratuitamente e liberar o compartilhamento quando a lista estiver pronta.',
  },
  {
    question: 'Quanto custa compartilhar uma lista?',
    answer:
      'O pagamento é único, via Pix: R$ 9,90 para aniversários, chá de bebê, chá de panela, casa nova e outras ocasiões comuns; R$ 29,90 para casamento, noivado e bodas. Há também acesso vitalício para a conta, por R$ 29,90 ou R$ 59,90 conforme a categoria do evento em que ele é contratado. Não há mensalidade.',
  },
  {
    question: 'Posso incluir presentes de qualquer loja?',
    answer:
      'Sim. Cada presente pode ter um link de referência de uma loja diferente. O convidado compra diretamente onde preferir; o MyWish não vende nem entrega os produtos.',
  },
  {
    question: 'Como funciona a reserva de presentes?',
    answer:
      'O convidado entra com Google e reserva o item que pretende presentear. A lista mostra que ele já foi escolhido, ajudando a evitar duplicidades. A reserva não efetua a compra. Se mudar de ideia, o convidado pode cancelar a reserva.',
  },
  {
    question: 'É possível receber o valor dos presentes em dinheiro?',
    answer:
      'Não. O MyWish organiza listas e reservas de presentes físicos. O Pix cobrado na plataforma é para liberar a lista do anfitrião, não para pagar os produtos nem transferir dinheiro aos anfitriões.',
  },
  {
    question: 'Qual é a diferença entre lista pública e não listada?',
    answer:
      'Uma lista pública pode aparecer na busca e na vitrine do MyWish. A não listada é acessível pelo link, mas não aparece nessas áreas de descoberta. Ela não tem senha: quem obtiver o endereço pode acessá-la. Antes de liberar o compartilhamento, o evento fica como rascunho.',
  },
  {
    question: 'Outra pessoa pode me ajudar a organizar?',
    answer:
      'Sim. O anfitrião pode gerar um convite para adicionar outro anfitrião à lista. Compartilhe esse convite apenas com quem você quer autorizar a gerenciar o evento.',
  },
  {
    question: 'Posso editar minha lista depois de compartilhar?',
    answer:
      'Sim. Você pode adicionar e editar presentes e acompanhar os recebidos. Se precisar alterar um presente reservado, combine a mudança com o convidado que o escolheu.',
  },
  {
    question: 'Como libero a lista depois de pagar o Pix?',
    answer:
      'Após a confirmação do Pix, a lista é liberada automaticamente. Se a tela ainda estiver aguardando, use a opção de verificar o pagamento. Não faça um segundo pagamento antes de conferir o primeiro.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
}

export const Route = createFileRoute('/faq')({
  head: () => ({
    meta: pageMeta(
      'Dúvidas sobre listas, reservas e pagamentos',
      'Entenda os preços do MyWish, como reservar presentes, escolher a visibilidade e compartilhar sua lista. Veja o que é gratuito e quando há pagamento.',
    ),
  }),
  component: FaqPage,
})

function FaqPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-14 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLd(faqJsonLd) }}
      />

      <header className="space-y-3">
        <p className="font-accent text-2xl text-muted-rose">faq</p>
        <h1 className="font-display italic text-4xl text-espresso">
          Perguntas frequentes
        </h1>
        <p className="text-warm-gray leading-relaxed max-w-3xl">
          O <BrandWordmark casing="title" /> é uma plataforma para criar e
          compartilhar lista de presentes online de forma simples. Abaixo estão
          respostas diretas para as dúvidas mais comuns sobre cadastro,
          privacidade, tipos de evento e compartilhamento.
        </p>
      </header>

      <div className="space-y-4">
        {FAQ_ITEMS.map((item) => (
          <article
            key={item.question}
            className="rounded-2xl border border-border/50 bg-warm-white p-6"
          >
            <h2 className="text-lg font-medium text-espresso">
              {item.question}
            </h2>
            <p className="text-warm-gray mt-2 leading-relaxed">{item.answer}</p>
          </article>
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-warm-white p-6">
        <h2 className="text-xl font-medium text-espresso">
          Não encontrou sua dúvida?
        </h2>
        <p className="text-warm-gray mt-2">
          Veja o passo a passo de criação e os preços antes de preparar seu
          evento.
        </p>
        <Link
          to="/events/create"
          className="inline-flex mt-4 text-sm text-muted-rose hover:underline"
        >
          Criar minha lista agora
        </Link>
      </div>
    </div>
  )
}
