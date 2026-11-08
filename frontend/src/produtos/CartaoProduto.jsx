import { Button } from '@mantine/core'
import { IconPencil, IconPhotoOff, IconTrash } from '@tabler/icons-react'
import { Link } from 'react-router'
import { nomeCompleto, precoParaTela, UNIDADES } from './regrasProdutos'
import classes from './Produtos.module.css'

// Cartão de um produto do cardápio (ZAP-41): foto com texto alternativo (NBR 17225 5.9.1),
// tipo, sabor em destaque, preço com a unidade e as ações de editar e excluir.
export function CartaoProduto({ produto, destaque, aoExcluir }) {
  const nome = nomeCompleto(produto)
  return (
    <article className={`${classes.produto} ${destaque ? classes.chegou : ''}`} aria-labelledby={`produto-${produto.id}`}>
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
        <span className={classes.tipo}>{produto.nome}</span>
        <h2 id={`produto-${produto.id}`} className={classes.sabor} tabIndex={-1}>
          {produto.sabor}
        </h2>
        {produto.descricao ? <p className={classes.descricao}>{produto.descricao}</p> : null}
        <p className={classes.preco}>
          <strong>R$ {precoParaTela(produto.preco)}</strong>
          <span className={classes.selo}>{UNIDADES[produto.unidade].selo}</span>
        </p>
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
        <Button variant="subtle" color="#b42318" className={classes.excluir} onClick={() => aoExcluir(produto)} leftSection={<IconTrash size={22} aria-hidden />} aria-label={`Excluir ${nome}`}>
          Excluir
        </Button>
      </div>
    </article>
  )
}
