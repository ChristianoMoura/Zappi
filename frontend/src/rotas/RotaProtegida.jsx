import { Navigate, Outlet, useLocation } from 'react-router'
import { useAutenticacao } from '../autenticacao/AutenticacaoContexto'

// Sem login, manda para a tela de login e guarda a página pedida,
// para voltar a ela depois de entrar (ISO 27002 5.15).
export function RotaProtegida() {
  const { autenticado } = useAutenticacao()
  const local = useLocation()

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ voltarPara: local.pathname }} />
  }

  return <Outlet />
}
