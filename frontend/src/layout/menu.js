import { IconBuildingStore, IconCake, IconCategory, IconClipboardList } from '@tabler/icons-react'

// Menu principal do painel. `filhos` vira um grupo que abre e fecha no menu lateral do
// computador (ZAP-139: Produtos com Produtos e Categorias). A barra de baixo do celular mostra
// só os itens de primeiro nível; lá, Categorias abre pelo botão da tela de Produtos.
export const itensMenu = [
  { caminho: '/pedidos', rotulo: 'Pedidos', Icone: IconClipboardList },
  {
    caminho: '/produtos',
    rotulo: 'Produtos',
    Icone: IconCake,
    filhos: [
      { caminho: '/produtos', rotulo: 'Produtos', Icone: IconCake },
      { caminho: '/categorias', rotulo: 'Categorias', Icone: IconCategory },
    ],
  },
  { caminho: '/estabelecimento', rotulo: 'Meu estabelecimento', Icone: IconBuildingStore },
]

// O item (ou grupo) está ativo quando a página aberta é ele ou um dos filhos
export const caminhosDoItem = (item) => (item.filhos ? item.filhos.map((f) => f.caminho) : [item.caminho])
