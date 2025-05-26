import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsuarioService } from '../usuario/usuario.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private usuarioService: UsuarioService,
    private jwtService: JwtService
  ) {}

  async validarUsuario(email: string, senha: string): Promise<any> {
  const usuario = await this.usuarioService.encontrarPorEmail(email);

  console.log('Senha recebida:', senha);
  console.log('Hash armazenado:', usuario!.senha);
  console.log('Comparação:', await bcrypt.compare(senha, usuario!.senha));
  
  if (!usuario) {
    throw new UnauthorizedException('Usuário não encontrado');
  }

  if (!usuario.status) {
    throw new UnauthorizedException('Usuário desativado');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  
  if (!senhaValida) {
    throw new UnauthorizedException('Credenciais inválidas');
  }

  const { senha: _, ...result } = usuario;
  return result;
}

  async login(usuario: any) {
    const payload = { email: usuario.email, sub: usuario.id, papel: usuario.papel };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}