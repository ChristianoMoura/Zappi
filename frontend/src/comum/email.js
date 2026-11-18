// Confere o formato do e-mail, no login e no Estabelecimento. Antes era só "algo@algo.algo", e
// passavam e-mails como "lucas@gmail.com." e "lucas@gmail..com". Agora:
// - antes do @: sem espaços e sem ponto no começo, no fim ou dois seguidos;
// - depois do @: partes de letras, números e hífen (sem hífen nas pontas), separadas por um ponto;
// - termina com 2 letras ou mais (.com, .br).
const EMAIL = /^[^\s@.]+(\.[^\s@.]+)*@([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i

export const emailValido = (texto) => EMAIL.test(String(texto ?? '').trim())
