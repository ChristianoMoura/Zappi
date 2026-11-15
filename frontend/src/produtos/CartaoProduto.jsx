import { Button, VisuallyHidden } from '@mantine/core'
import { IconEye, IconEyeOff, IconPencil, IconPhotoOff, IconTrash } from '@tabler/icons-react'
import { Link } from 'react-router'
import { DescontoCurto } from './DescontoCurto'
import { emPromocao, precoParaTela, textoPrecoPromocao, UNIDADES } from './regrasProdutos'
import classes from './Produtos.module.css'

// Cartão de um produto do cardápio (ZAP-41): foto com texto alternativo (NBR 17225 5.9.1), o nome
// do produto (ZAP-139, sem o sabor), preço com a unidade, os alérgenos (ZAP-132) e as ações de
// editar, tirar ou voltar ao cardápio (ZAP-155) e excluir. Fica dentro da seção da categoria, por
// isso o nome é um título de nível 3. Fora do cardápio, o estado aparece em texto, no selo, e não
// só pela foto apagada (NBR 17225 5.11.2).
export function CartaoProduto({ produto, destaque, aoExcluir, aoTirar, aoVoltar, ocupado }) {
  const nome = produto.nome
  const fora = produto.noCardapio === false
  return (
    <article
      className={`${classes.produto} ${destaque ? classes.chegou : ''} ${fora ? classes.foraDoCardapio : ''}`}
      aria-labelledby={`produto-${produto.id}`}
    >
      {produto.foto ? (
        <div className={classes.foto}>
          <img src={produto.foto} alt={produto.textoAlternativo} />
        </div>
      ) : (
        <div className={`${classes.foto} ${classes.semFoto}`}>
          <IconPhotoOff size={40} stroke={1.5} aria-hidden />
          <span>Sem foto</span>
        </div>
      )}
      <div className={classes.info}>
        {fora && (
          <span className={classes.seloFora}>
            <IconEyeOff size={16} aria-hidden />
            Fora do cardápio
          </span>
        )}
        <h3 id={`produto-${produto.id}`} className={classes.sabor} tabIndex={-1}>
          {nome}
        </h3>
        {produto.descricao ? <p className={classes.descricao}>{produto.descricao}</p> : null}
        {emPromocao(produto) ? (
          // Promoção (ZAP-161): o risco não é lido pelo leitor de tela, então o "De ... por ..." vai em texto
          <p className={classes.preco}>
            <VisuallyHidden>{textoPrecoPromocao(produto)}</VisuallyHidden>
            <s className={classes.precoAntigo} aria-hidden="true">
              R$ {precoParaTela(produto.preco)}
            </s>
            <strong className={classes.precoComDesconto} aria-hidden="true">
              R$ {precoParaTela(produto.precoPromocional)}
            </strong>
            <span className={classes.unidadeEDesconto}>
              <span className={classes.selo}>{UNIDADES[produto.unidade].selo}</span>
              <DescontoCurto produto={produto} lido={false} />
            </span>
          </p>
        ) : (
          <p className={classes.preco}>
            <strong>R$ {precoParaTela(produto.preco)}</strong>
            <span className={classes.selo}>{UNIDADES[produto.unidade].selo}</span>
          </p>
        )}
      </div>
      <div className={classes.acoes}>
        <Button
          component={Link}
          to={`/produtos/${produto.id}`}
          variant="outline"
          className={classes.editar}
          leftSection={<IconPencil size={22} aria-hidden />}
          aria-label={`Editar ${nome}`}
        >
          Editar
        </Button>
        {fora ? (
          <Button
            id={`estado-${produto.id}`}
            className={classes.editar}
            onClick={() => aoVoltar(produto)}
            loading={ocupado}
            loaderProps={{ type: 'dots' }}
            leftSection={<IconEye size={22} aria-hidden />}
            aria-label={`Voltar ${nome} ao cardápio`}
          >
            Voltar ao cardápio
          </Button>
        ) : (
          <Button
            id={`estado-${produto.id}`}
            variant="outline"
            color="#5c5048"
            className={classes.editar}
            onClick={() => aoTirar(produto)}
            leftSection={<IconEyeOff size={22} aria-hidden />}
            aria-label={`Tirar ${nome} do cardápio`}
          >
            Tirar do cardápio
          </Button>
        )}
        <Button variant="subtle" color="#b42318" className={`${classes.excluir} ${classes.excluirLinha}`} onClick={() => aoExcluir(produto)} leftSection={<IconTrash size={22} aria-hidden />} aria-label={`Excluir ${nome}`}>
          Excluir
        </Button>
      </div>
    </article>
  )
}
