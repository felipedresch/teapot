// Ilustrações de produto para a página /dev/sugestoes (só desenvolvimento).
// Em produção as fotos vêm da Shopee; aqui são desenhos simples, num fundo
// branco como o das fotos de loja.

const svg = (body: string) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect width="400" height="400" fill="#ffffff"/><ellipse cx="200" cy="338" rx="150" ry="14" fill="#000" opacity="0.06"/>${body}</svg>`,
  )}`

function jar(x: number, w: number, h: number, fill: string, lid: string) {
  const top = 330 - h
  return `
    <rect x="${x}" y="${top}" width="${w}" height="${h}" rx="${w * 0.16}" fill="#eef3f5" stroke="#c9d6dc" stroke-width="3"/>
    <rect x="${x + 8}" y="${top + h * 0.38}" width="${w - 16}" height="${h * 0.58}" rx="${w * 0.12}" fill="${fill}"/>
    <rect x="${x + 10}" y="${top + 14}" width="8" height="${h * 0.5}" rx="4" fill="#fff" opacity="0.7"/>
    <rect x="${x - 4}" y="${top - 18}" width="${w + 8}" height="24" rx="8" fill="${lid}"/>
    <rect x="${x - 4}" y="${top - 18}" width="${w + 8}" height="6" rx="3" fill="#000" opacity="0.06"/>`
}

function plates(rim: string, body: string, count: number) {
  let out = ''
  for (let i = 0; i < count; i++) {
    const y = 300 - i * 16
    out += `<ellipse cx="200" cy="${y}" rx="140" ry="40" fill="${body}" stroke="${rim}" stroke-width="5"/>`
  }
  const topY = 300 - (count - 1) * 16
  out += `<ellipse cx="200" cy="${topY}" rx="88" ry="24" fill="none" stroke="${rim}" stroke-opacity="0.45" stroke-width="2"/>`
  return out
}

function bowl(x: number, y: number, color: string, rim: string) {
  return `<path d="M${x - 60} ${y} Q${x} ${y + 80} ${x + 60} ${y} Z" fill="${color}"/><ellipse cx="${x}" cy="${y}" rx="60" ry="14" fill="${rim}"/>`
}

function towels(colors: string[], stripe: string) {
  return colors
    .map((color, i) => {
      const y = 290 - i * 46
      const w = 250 - i * 14
      const x = 200 - w / 2
      return `<rect x="${x}" y="${y}" width="${w}" height="44" rx="16" fill="${color}"/><rect x="${x}" y="${y + 28}" width="${w}" height="5" fill="${stripe}" opacity="0.55"/><rect x="${x}" y="${y}" width="${w}" height="10" rx="5" fill="#fff" opacity="0.25"/>`
    })
    .join('')
}

export const FIXTURE_IMAGES: Record<string, string> = {
  // Potes
  '101': svg(
    jar(70, 80, 170, '#e9d9b8', '#c99b6b') +
      jar(160, 80, 130, '#d9c3a0', '#c99b6b') +
      jar(250, 80, 95, '#f1e6cf', '#c99b6b'),
  ),
  '102': svg(
    jar(60, 70, 120, '#fbe3cf', '#9fb7c8') +
      jar(140, 70, 120, '#e7efd9', '#9fb7c8') +
      jar(220, 70, 120, '#fde9e9', '#9fb7c8') +
      jar(110, 70, 60, '#fff', '#9fb7c8'),
  ),
  '103': svg(
    jar(85, 90, 190, '#efe2c4', '#7a8f7a') +
      jar(195, 90, 140, '#e3d0a8', '#7a8f7a') +
      jar(150, 60, 60, '#fff3dd', '#7a8f7a'),
  ),
  '105': svg(
    jar(80, 110, 120, '#e6d4b0', '#555') +
      jar(210, 110, 120, '#d8c7a2', '#555'),
  ),
  '107': svg(
    jar(90, 100, 150, '#f3c9b6', '#d98f7a') +
      jar(210, 100, 110, '#bfd8c9', '#7fa892'),
  ),
  // Pratos
  '201': svg(
    plates('#e6e1da', '#fbfaf8', 5) + bowl(310, 140, '#f6f3ee', '#ffffff'),
  ),
  '202': svg(plates('#e8dccc', '#f7f1e8', 6)),
  '203': svg(
    plates('#8fa98f', '#c3d3c1', 5) + bowl(300, 130, '#a9bfa8', '#c9d8c7'),
  ),
  '205': svg(
    bowl(140, 220, '#dfeaf0', '#eef5f8') + bowl(260, 230, '#dfeaf0', '#eef5f8'),
  ),
  // Toalhas
  '301': svg(towels(['#e8e2d8', '#d9d2c7', '#e8e2d8', '#cfc6b9'], '#ffffff')),
  '302': svg(towels(['#c9cfd6', '#dfe4e8'], '#ffffff')),
  '303': svg(
    towels(['#e7c9c2', '#f0dcd6', '#e7c9c2', '#f5e7e3', '#e0bdb5'], '#c79f94'),
  ),
}
